/**
 * Translations of the text the admin writes in Content Editor — the Pages
 * tab (About, Contact, Privacy, Terms, Legal) and the home page's Hero and
 * FAQs — into every site language.
 *
 * Two tables, both { [original text]: { [language]: translation } }:
 *  - pageTranslations      machine translations (MyMemory)
 *  - pageTranslationEdits  the admin's own corrections, never overwritten
 * Visitors get the correction where there is one, else the machine version.
 *
 * Text that still holds the shipped wording is skipped — the dictionaries
 * already translate it. Translating happens once, after the admin saves;
 * visitors only read what is stored, so traffic never touches the
 * translation service. Only text that is new since the last save is sent.
 */
import * as store from './store.ts';
import { translateText } from './translator.ts';
import { INITIAL_SITE_PAGES, INITIAL_LANDING_CONTENT } from '../src/data/mockAdminData.ts';
import { TOOL_PAGE_LIST } from '../src/config/toolPages.ts';
import { defaultToolFaqs } from '../src/tools/defaultFaqs.ts';

export const SITE_LANGUAGES = ['en', 'ur', 'ar', 'hi', 'es', 'pt', 'fr', 'de', 'id', 'ru', 'ja'];
const MACHINE = 'pageTranslations';
const EDITS = 'pageTranslationEdits';

type Table = Record<string, Record<string, string>>;

const readMachine = (): Table => store.read<Table>(MACHINE, {});
const readEdits = (): Table => store.read<Table>(EDITS, {});

/** A piece of admin-written text and where it appears, for the editor. */
export interface PageTextEntry { text: string; page: string; label: string; }

const own = (value: unknown, shipped?: unknown): string | null => {
  const v = String(value ?? '').trim();
  return v && v !== String(shipped ?? '').trim() ? v : null;
};

/** Every piece of admin-written text, in the order it appears on the site. */
export function authoredEntries(pages: any, landing: any, tools: any = {}): PageTextEntry[] {
  const d: any = INITIAL_SITE_PAGES;
  const out: PageTextEntry[] = [];
  const seen = new Set<string>();
  const add = (text: string | null, page: string, label: string) => {
    if (!text || seen.has(text)) return;
    seen.add(text);
    out.push({ text, page, label });
  };

  const hero = landing?.hero || {};
  const h0: any = INITIAL_LANDING_CONTENT.hero;
  const heroFields: Array<[string, string]> = [
    ['trustBadge', 'Top badge'], ['heading', 'Main heading'], ['subtitle', 'Subtitle'],
    ['inputPlaceholder', 'Link box placeholder'], ['ctaText', 'Button text'], ['noticeText', 'Note under the button'],
  ];
  for (const [k, label] of heroFields) add(own(hero[k], h0[k]), 'Home page — Hero', label);

  // The feature cards: the home page shows the admin's list once it differs
  // from the shipped one, so only then is there anything to translate.
  const feats = (Array.isArray(landing?.features) ? landing.features : []).filter((f: any) => f?.title || f?.description);
  const featKey = (list: any[]) => JSON.stringify(list.map((f) => [String(f.title ?? '').trim(), String(f.description ?? '').trim(), f.iconName]));
  if (featKey(feats) !== featKey(INITIAL_LANDING_CONTENT.features)) {
    feats.forEach((f: any, i: number) => {
      add(own(f.title), 'Home page — Features', `Feature ${i + 1} — title`);
      add(own(f.description), 'Home page — Features', `Feature ${i + 1} — description`);
    });
  }

  // The FAQs are the admin's only once the list differs from the shipped one
  // (the same rule the FAQ section uses); until then the dictionaries show it.
  const faqs = (Array.isArray(landing?.faqs) ? landing.faqs : []).filter((f: any) => f?.question && f?.answer);
  const faqKey = (list: any[]) => JSON.stringify(list.map((f) => [String(f.question).trim(), String(f.answer).trim()]));
  if (faqKey(faqs) !== faqKey(INITIAL_LANDING_CONTENT.faqs.filter((f: any) => f?.question && f?.answer))) {
    // A built-in FAQ left as it was already has a human translation in the
    // dictionaries, so only new or changed ones are sent for translation.
    const shipped = new Set(INITIAL_LANDING_CONTENT.faqs.map((f: any) => faqKey([f])));
    faqs.forEach((f: any, i: number) => {
      if (shipped.has(faqKey([f]))) return;
      add(own(f.question), 'Home page — FAQs', `Question ${i + 1}`);
      add(own(f.answer), 'Home page — FAQs', `Answer ${i + 1}`);
    });
  }

  const about = pages?.about || {};
  add(own(about.heading, d.about.heading), 'About Us', 'Page heading');
  add(own(about.intro, d.about.intro), 'About Us', 'Intro paragraph');
  (Array.isArray(about.highlights) ? about.highlights : []).forEach((h: any, i: number) => {
    add(own(h?.title, d.about.highlights[i]?.title), 'About Us', `Highlight ${i + 1} — title`);
    add(own(h?.desc, d.about.highlights[i]?.desc), 'About Us', `Highlight ${i + 1} — description`);
  });
  add(own(about.ctaHeading, d.about.ctaHeading), 'About Us', 'Call-to-action heading');
  add(own(about.ctaText, d.about.ctaText), 'About Us', 'Call-to-action text');

  const contact = pages?.contact || {};
  add(own(contact.heading, d.contact.heading), 'Contact', 'Page heading');
  add(own(contact.intro, d.contact.intro), 'Contact', 'Intro paragraph');
  add(own(contact.responseTime, d.contact.responseTime), 'Contact', 'Response time note');
  add(own(contact.officeNote, d.contact.officeNote), 'Contact', 'Extra note');

  const legal: Array<[string, string]> = [['privacy', 'Privacy Policy'], ['terms', 'Terms of Use'], ['legal', 'Legal & DMCA']];
  for (const [key, name] of legal) {
    (Array.isArray(pages?.[key]?.sections) ? pages[key].sections : []).forEach((s: any, i: number) => {
      add(own(s?.title), name, `Section ${i + 1} — heading`);
      add(own(s?.body), name, `Section ${i + 1} — text`);
    });
  }

  // Tool pages (Admin -> Tools SEO & FAQ). A FAQ list exists only once the
  // admin changed the built-in one, which the tool's dictionaries translate.
  for (const tool of TOOL_PAGE_LIST) {
    const c = tools?.[tool.id] || {};
    const page = `Tool — ${tool.name}`;
    add(own(c.metaTitle), page, 'SEO title');
    add(own(c.metaDescription), page, 'SEO description');
    const builtIn = new Set(defaultToolFaqs(tool.id).map((f) => `${f.question.trim()}\n${f.answer.trim()}`));
    (Array.isArray(c.faqs) ? c.faqs : []).forEach((f: any, i: number) => {
      if (builtIn.has(`${String(f?.question).trim()}\n${String(f?.answer).trim()}`)) return; // has its human translation
      add(own(f?.question), page, `FAQ ${i + 1} — question`);
      add(own(f?.answer), page, `FAQ ${i + 1} — answer`);
    });
  }
  return out;
}

const currentEntries = () => authoredEntries(
  store.read<any>('sitePages', INITIAL_SITE_PAGES),
  store.read<any>('landingContent', INITIAL_LANDING_CONTENT),
  store.read<any>('toolsContent', {}),
);

/** What visitors get: the admin's correction, else the machine translation. */
export function readTranslations(): Table {
  const machine = readMachine();
  const edits = readEdits();
  const out: Table = {};
  for (const text of new Set([...Object.keys(machine), ...Object.keys(edits)])) {
    out[text] = { ...(machine[text] || {}), ...(edits[text] || {}) };
  }
  return out;
}

/** Everything the Translations tab shows. */
export function translationsForEditor() {
  const machine = readMachine();
  const edits = readEdits();
  return {
    running,
    languages: SITE_LANGUAGES,
    entries: currentEntries().map((e) => ({ ...e, machine: machine[e.text] || {}, edited: edits[e.text] || {} })),
  };
}

/**
 * Saves the admin's corrections for one language. A value of null removes
 * the correction, so the machine translation shows again. Text that is no
 * longer on any page is ignored.
 */
export function saveTranslationEdits(lang: string, changes: Record<string, unknown>): number {
  if (!SITE_LANGUAGES.includes(lang)) throw new Error('UNKNOWN_LANGUAGE');
  const valid = new Set(currentEntries().map((e) => e.text));
  const edits = readEdits();
  let saved = 0;
  for (const [text, value] of Object.entries(changes || {})) {
    if (!valid.has(text)) continue;
    const next = { ...(edits[text] || {}) };
    const v = typeof value === 'string' ? value.trim().slice(0, 20000) : '';
    if (v) next[lang] = v; else delete next[lang];
    if (Object.keys(next).length) edits[text] = next; else delete edits[text];
    saved++;
  }
  store.write(EDITS, edits);
  return saved;
}

let running = false;
let again = false;

/**
 * Fills in whatever machine translations are missing for the current pages
 * and drops both tables' entries for text that no longer exists. Runs in the
 * background; a save that arrives meanwhile queues one more pass.
 */
export async function syncPageTranslations(): Promise<void> {
  if (running) { again = true; return; }
  running = true;
  try {
    do {
      again = false;
      const texts = currentEntries().map((e) => e.text);
      const keep = <T>(table: Record<string, T>) =>
        Object.fromEntries(texts.filter((t) => table[t]).map((t) => [t, table[t]]));
      const table: Table = keep(readMachine());
      for (const t of texts) table[t] = { ...(table[t] || {}) };
      store.write(MACHINE, table);
      store.write(EDITS, keep(readEdits()));

      for (const text of texts) {
        for (const lang of SITE_LANGUAGES) {
          // The admin's own correction makes a machine version unnecessary.
          if (table[text][lang] || readEdits()[text]?.[lang]) continue;
          const result = await translateText(text, lang);
          if (result === null) continue; // retried on the next save or restart
          const latest = readMachine();
          if (!latest[text]) break; // text removed while translating
          latest[text] = { ...latest[text], [lang]: result };
          store.write(MACHINE, latest);
          table[text][lang] = result;
        }
      }
    } while (again);
  } catch (err) {
    console.warn('[translate] sync failed:', err);
  } finally {
    running = false;
  }
}
