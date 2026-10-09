/**
 * The site's name, in one place.
 *
 * Interface text never spells the brand out. It writes `{brand}` instead, and
 * this module swaps in whatever the admin has saved in Settings → Site Name.
 * Rename the site once in the dashboard and every heading, FAQ, button and
 * meta tag follows — nothing to hunt down in the code.
 *
 * It lives outside React because the language provider sits *above* the admin
 * provider, so it cannot read site settings through a hook. AdminContext
 * pushes the current name in here; anything that renders brand text
 * subscribes.
 */

import { INITIAL_SITE_SETTINGS } from '../data/mockAdminData';

const FALLBACK = INITIAL_SITE_SETTINGS.siteName;

let current: string = FALLBACK;
const listeners = new Set<() => void>();

export const getBrandName = (): string => current;

/** Called by AdminContext whenever site settings load or change. */
export function setBrandName(name?: string | null): void {
  const next = (name || '').trim() || FALLBACK;
  if (next === current) return;
  current = next;
  listeners.forEach((l) => l());
}

export function subscribeBrand(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Replaces every `{brand}` placeholder in a string. */
export const withBrand = (text: string, name: string = current): string =>
  text.includes('{brand}') ? text.split('{brand}').join(name) : text;

/** Deep-copies a dictionary, substituting `{brand}` in every string it holds. */
export function applyBrand<T>(value: T, name: string = current): T {
  if (typeof value === 'string') return withBrand(value, name) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => applyBrand(v, name)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = applyBrand(v, name);
    }
    return out as unknown as T;
  }
  return value;
}
