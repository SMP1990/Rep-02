import { INITIAL_LANDING_CONTENT } from '../data/mockAdminData';

/**
 * Chooses between the admin's hero copy and the translated default.
 *
 * The hero lives in the Content Editor, so it is authored once, in one
 * language. Showing it verbatim to every visitor meant the headline and
 * subtitle stayed English no matter which language the header was set to —
 * the most prominent text on the site was the only part that never
 * translated.
 *
 * The rule: if the admin has actually rewritten a field, their words win in
 * every language — they chose that message deliberately. If the field is
 * still the value the app shipped with, it is not a decision, just a
 * placeholder, so the visitor gets it in their own language instead.
 */
export function heroField(
  landingHero: Record<string, any> | undefined | null,
  field: keyof typeof INITIAL_LANDING_CONTENT.hero,
  translated: string | undefined
): string {
  const authored = String(landingHero?.[field] ?? '').trim();
  const shipped = String((INITIAL_LANDING_CONTENT.hero as any)[field] ?? '').trim();
  if (authored && authored !== shipped) return authored;
  return translated || shipped || authored;
}
