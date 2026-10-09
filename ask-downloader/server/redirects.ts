/**
 * 301 redirect store.
 *
 * When a published post's slug changes, the old address keeps its
 * backlinks and Google ranking by pointing permanently at the new one.
 * Paths are stored lower-case, without a trailing slash: "/blog/old-slug".
 */
import * as store from './store.ts';

export interface Redirect {
  from: string;
  to: string;
  createdAt: string;
  hits: number;
}

const KEY = 'redirects';

export const normalizePath = (p: string) =>
  ('/' + String(p || '').trim().replace(/^https?:\/\/[^/]+/i, ''))
    .replace(/\/{2,}/g, '/')
    .toLowerCase()
    .replace(/\/+$/, '') || '/';

/** A target may be another site (kept as typed) or a path on this one. */
export const normalizeTarget = (t: string) =>
  /^https?:\/\//i.test(String(t).trim()) && !isOwnUrl(t) ? String(t).trim() : normalizePath(t);

// Set by the server so "https://our-site.com/x" is stored as "/x".
let ownHost = '';
export const setOwnHost = (h: string) => { ownHost = h.toLowerCase(); };
const isOwnUrl = (t: string) => {
  try { return !!ownHost && new URL(t).host.toLowerCase() === ownHost; } catch { return false; }
};

/** Paths the site itself needs — never redirectable. */
export const isProtectedPath = (p: string) =>
  /^\/(api|admin|assets|uploads|wp-admin)(\/|$)/.test(p) || ['/', '/robots.txt', '/sitemap.xml', '/login'].includes(p);

export const listRedirects = (): Redirect[] => store.read<Redirect[]>(KEY, []);

/** Adds from → to, keeping the table free of chains and loops. */
export function addRedirect(fromRaw: string, toRaw: string): void {
  const from = normalizePath(fromRaw);
  const to = normalizeTarget(toRaw);
  if (from === to) return;
  const list = listRedirects()
    // The new address is live again, so nothing may redirect away from it.
    .filter((r) => r.from !== to && r.from !== from)
    // Old redirects that ended at `from` now jump straight to `to`.
    .map((r) => (r.to === from ? { ...r, to } : r));
  list.push({ from, to, createdAt: new Date().toISOString(), hits: 0 });
  store.write(KEY, list);
}

/** Returns the target for a path, or null. Counts the hit. */
export function findRedirect(pathRaw: string): string | null {
  const from = normalizePath(pathRaw);
  const list = listRedirects();
  const hit = list.find((r) => r.from === from);
  if (!hit) return null;
  hit.hits = (hit.hits || 0) + 1;
  store.write(KEY, list);
  return hit.to;
}

/** A path that is a live page again must not redirect away. */
export function clearRedirectFrom(pathRaw: string): void {
  const from = normalizePath(pathRaw);
  const list = listRedirects();
  const next = list.filter((r) => r.from !== from);
  if (next.length !== list.length) store.write(KEY, next);
}

export function deleteRedirect(fromRaw: string): boolean {
  const from = normalizePath(fromRaw);
  const list = listRedirects();
  const next = list.filter((r) => r.from !== from);
  store.write(KEY, next);
  return next.length !== list.length;
}
