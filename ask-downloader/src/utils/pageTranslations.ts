import { INITIAL_SITE_PAGES, INITIAL_LANDING_CONTENT } from '../data/mockAdminData';
import type { LegalSection } from '../types/admin';

/**
 * Shows the admin's text (Content Editor: the Pages tab, the home page Hero
 * and FAQs) in the visitor's language, using the machine translations the server makes when the admin
 * saves (see server/pageTranslations.ts).
 *
 * For each piece of text the admin wrote:
 *  - translated into this language   -> the translation
 *  - not translated into any language yet (just saved, or the service
 *    is unavailable)                 -> the text as written, as before
 *  - translated into other languages
 *    but not this one                -> the built-in wording, which the
 *                                       dictionaries show in this language
 */
export type TranslationTable = Record<string, Record<string, string>>;

const MISSING = Symbol('missing');

function lookup(value: unknown, lang: string, table: TranslationTable | undefined): string | null | typeof MISSING {
  const v = String(value ?? '').trim();
  const entry = v ? table?.[v] : undefined;
  // Nothing translated yet — just saved, or the service is unavailable
  // today: show the admin's words rather than hide their change.
  if (!entry || !Object.keys(entry).length) return null;
  return entry[lang] ?? MISSING;
}

/** One field: the translation, the text as written, or the shipped wording. */
function field(value: unknown, shipped: unknown, lang: string, table: TranslationTable | undefined): any {
  const r = lookup(value, lang, table);
  if (r === null) return value;
  if (r === MISSING) return shipped ?? value;
  return r;
}

export function localizeAbout(about: any, lang: string, table: TranslationTable | undefined): any {
  if (!about) return about;
  const d = INITIAL_SITE_PAGES.about as any;
  const out: any = { ...about };
  for (const k of ['heading', 'intro', 'ctaHeading', 'ctaText']) out[k] = field(about[k], d[k], lang, table);
  if (Array.isArray(about.highlights)) {
    out.highlights = about.highlights.map((h: any, i: number) => ({
      ...h,
      title: field(h?.title, d.highlights[i]?.title, lang, table),
      desc: field(h?.desc, d.highlights[i]?.desc, lang, table),
    }));
  }
  return out;
}

export function localizeContact(contact: any, lang: string, table: TranslationTable | undefined): any {
  if (!contact) return contact;
  const d = INITIAL_SITE_PAGES.contact as any;
  const out: any = { ...contact };
  for (const k of ['heading', 'intro', 'responseTime', 'officeNote']) out[k] = field(contact[k], d[k], lang, table);
  return out;
}

/**
 * A legal page is shown whole in one voice: translated if every section is,
 * as written while translation is still pending, or — if any section could
 * not be translated into this language — the built-in page (empty list).
 */
export function localizeLegalSections(sections: LegalSection[], lang: string, table: TranslationTable | undefined): LegalSection[] {
  let pending = false;
  const out: LegalSection[] = [];
  for (const s of sections) {
    const title = s.title ? lookup(s.title, lang, table) : '';
    const body = s.body ? lookup(s.body, lang, table) : '';
    if (title === MISSING || body === MISSING) return [];
    if (title === null || body === null) pending = true;
    out.push({ title: (title || s.title) as string, body: (body || s.body) as string });
  }
  return pending ? sections : out;
}

/** The home page hero; each field follows the same rule as the pages. */
export function localizeHero(hero: any, lang: string, table: TranslationTable | undefined): any {
  if (!hero) return hero;
  const d = INITIAL_LANDING_CONTENT.hero as any;
  const out: any = { ...hero };
  for (const k of Object.keys(d)) out[k] = field(hero[k], d[k], lang, table);
  return out;
}

/** Index of the built-in FAQ this item still matches word for word, else -1. */
export function shippedFaqIndex(f: { question: string; answer: string }): number {
  return INITIAL_LANDING_CONTENT.faqs.findIndex(
    (s) => s.question.trim() === String(f.question).trim() && s.answer.trim() === String(f.answer).trim()
  );
}

/**
 * The admin's FAQ list, shown whole in one language like a legal page:
 * translated, as written while pending, or — if any question or answer
 * could not be translated — the shipped list, which the FAQ section shows
 * from the dictionaries in the visitor's language. Built-in FAQs left
 * unchanged are passed through; the FAQ section shows them translated.
 */
export function localizeFaqs<T extends { question: string; answer: string }>(
  faqs: T[] | undefined,
  lang: string,
  table: TranslationTable | undefined
): T[] {
  const list = (faqs || []).filter((f) => f?.question && f?.answer);
  let pending = false;
  const out: T[] = [];
  for (const f of list) {
    if (shippedFaqIndex(f) >= 0) { out.push(f); continue; }
    const q = lookup(f.question, lang, table);
    const a = lookup(f.answer, lang, table);
    if (q === MISSING || a === MISSING) return INITIAL_LANDING_CONTENT.faqs as unknown as T[];
    if (q === null || a === null) pending = true;
    out.push({ ...f, question: (q || f.question) as string, answer: (a || f.answer) as string });
  }
  return pending ? list : out;
}

/** True when the admin's feature cards are still exactly the shipped ones. */
export function featuresAreShipped(features: any[] | undefined): boolean {
  const key = (list: any[]) => JSON.stringify(
    list.filter((f) => f?.title || f?.description)
      .map((f) => [String(f.title ?? '').trim(), String(f.description ?? '').trim(), f.iconName])
  );
  return key(features || []) === key(INITIAL_LANDING_CONTENT.features);
}

/**
 * The admin's feature cards in the visitor's language, or null when the home
 * page should show its built-in cards (translated by the dictionaries):
 * the list is unchanged, or a card could not be translated into this
 * language. While translation is pending the cards show as written.
 */
export function localizeFeatures<T extends { title: string; description: string }>(
  features: T[] | undefined,
  lang: string,
  table: TranslationTable | undefined
): T[] | null {
  if (featuresAreShipped(features)) return null;
  const list = (features || []).filter((f) => f?.title || f?.description);
  if (!list.length) return null;
  let pending = false;
  const out: T[] = [];
  for (const f of list) {
    const ti = f.title ? lookup(f.title, lang, table) : '';
    const de = f.description ? lookup(f.description, lang, table) : '';
    if (ti === MISSING || de === MISSING) return null;
    if (ti === null || de === null) pending = true;
    out.push({ ...f, title: (ti || f.title) as string, description: (de || f.description) as string });
  }
  return pending ? list : out;
}
