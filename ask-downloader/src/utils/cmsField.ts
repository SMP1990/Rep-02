import { INITIAL_LANDING_CONTENT, INITIAL_SITE_PAGES } from '../data/mockAdminData';

/**
 * Chooses between copy the admin authored and the translated default.
 *
 * Content Editor fields are authored once, in one language. Showing them
 * verbatim to every visitor meant the most prominent text on a page stayed
 * English no matter which language the header was set to.
 *
 * The rule: if the admin has actually rewritten a field, their words win in
 * every language — they chose that message deliberately. If the field still
 * holds the value the app shipped with, it is not a decision, just a
 * placeholder, so the visitor gets it in their own language instead.
 */
export function pickAuthored(
  authoredValue: unknown,
  shippedValue: unknown,
  translated: string | undefined
): string {
  const authored = String(authoredValue ?? '').trim();
  const shipped = String(shippedValue ?? '').trim();
  if (authored && authored !== shipped) return authored;
  // An empty translation is a decision, not a gap: Japanese leaves the About
  // heading blank and puts the word after the site name instead. Since the
  // dictionary merge fills every key from English, a defined value — even an
  // empty one — is always the translator's, so it wins over the shipped copy.
  if (typeof translated === 'string') return translated;
  return shipped || authored;
}

/** True when the admin has replaced a field's shipped wording with their own. */
export function isAuthored(authoredValue: unknown, shippedValue: unknown): boolean {
  const authored = String(authoredValue ?? '').trim();
  return !!authored && authored !== String(shippedValue ?? '').trim();
}

/** True when the About page's heading is the admin's own words. */
export function aboutHeadingIsAuthored(about: Record<string, any> | undefined | null): boolean {
  return isAuthored(about?.heading, INITIAL_SITE_PAGES.about.heading);
}

/** `pickAuthored` for a field of Content Editor -> Pages -> About. */
export function aboutField(
  about: Record<string, any> | undefined | null,
  field: keyof typeof INITIAL_SITE_PAGES.about,
  translated: string | undefined
): string {
  return pickAuthored(about?.[field], (INITIAL_SITE_PAGES.about as any)[field], translated);
}

/** `pickAuthored` for a field of Content Editor -> Pages -> Contact. */
export function contactField(
  contact: Record<string, any> | undefined | null,
  field: keyof typeof INITIAL_SITE_PAGES.contact,
  translated: string | undefined
): string {
  return pickAuthored(contact?.[field], (INITIAL_SITE_PAGES.contact as any)[field], translated);
}

/**
 * The About page's highlight cards. Each card's title and description follow
 * the same authored-wins rule, matched against the shipped card in the same
 * position. Cards the admin added beyond the shipped three are entirely their
 * own words, so they pass through untouched.
 */
export function aboutHighlights(
  about: Record<string, any> | undefined | null,
  translatedPairs: Array<{ title?: string; desc?: string }>
): Array<{ title: string; desc: string }> {
  const authored: any[] = Array.isArray(about?.highlights) ? about!.highlights : [];
  const shipped = INITIAL_SITE_PAGES.about.highlights;
  return authored.map((card, i) => ({
    title: pickAuthored(card?.title, shipped[i]?.title, translatedPairs[i]?.title),
    desc: pickAuthored(card?.desc, shipped[i]?.desc, translatedPairs[i]?.desc),
  }));
}

export { INITIAL_LANDING_CONTENT };
