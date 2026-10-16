/**
 * Loads one interface language on demand.
 *
 * All eleven dictionaries used to sit in the first JavaScript file, so every
 * visitor downloaded ~400 KB of words in languages they never read. Now
 * English stays built in and each other language is its own small file,
 * fetched only when a visitor picks it (or had picked it on a past visit).
 *
 * The words themselves are unchanged — this file only changes *when* they load.
 */
import { EXTRA_TRANSLATIONS } from './extra/index.ts';

export interface LanguagePack {
  /** The main dictionary (src/translations/<lang>.ts). */
  dict: any;
  /** About/Contact/Privacy/Terms/Legal/404 copy (src/translations/legalPages.ts). */
  pageDict: any;
}

const dictLoaders: Record<string, () => Promise<any>> = {
  es: () => import('./es.ts').then((m) => m.esTranslation),
  ar: () => import('./ar.ts').then((m) => m.arTranslation),
  pt: () => import('./pt.ts').then((m) => m.ptTranslation),
  id: () => import('./id.ts').then((m) => m.idTranslation),
  ja: () => import('./ja.ts').then((m) => m.jaTranslation),
  fr: () => import('./fr.ts').then((m) => m.frTranslation),
  ru: () => import('./ru.ts').then((m) => m.ruTranslation),
  de: () => import('./de.ts').then((m) => m.deTranslation),
  ur: () => import('./ur.ts').then((m) => m.urTranslation),
  hi: () => import('./hi.ts').then((m) => m.hiTranslation),
};

const extraLoaders: Record<string, () => Promise<any>> = {
  es: () => import('./extra/es.ts').then((m) => m.es),
  ar: () => import('./extra/ar.ts').then((m) => m.ar),
  pt: () => import('./extra/pt.ts').then((m) => m.pt),
  id: () => import('./extra/id.ts').then((m) => m.id),
  ja: () => import('./extra/ja.ts').then((m) => m.ja),
  fr: () => import('./extra/fr.ts').then((m) => m.fr),
  ru: () => import('./extra/ru.ts').then((m) => m.ru),
  de: () => import('./extra/de.ts').then((m) => m.de),
  ur: () => import('./extra/ur.ts').then((m) => m.ur),
  hi: () => import('./extra/hi.ts').then((m) => m.hi),
};

const packs: Record<string, LanguagePack> = {};
const pending: Record<string, Promise<LanguagePack | undefined>> = {};

/** The pack for `lang` if it has been loaded already. */
export function getLanguagePack(lang: string): LanguagePack | undefined {
  return packs[lang];
}

/** True when `lang` can be shown right now without waiting for a download.
 * English and unknown codes (which fall back to English) are always ready. */
export function isLanguageReady(lang: string): boolean {
  return !dictLoaders[lang] || !!packs[lang];
}

/** Downloads `lang` once; later calls reuse the same result. */
export function loadLanguage(lang: string): Promise<LanguagePack | undefined> {
  if (isLanguageReady(lang)) return Promise.resolve(packs[lang]);
  if (!pending[lang]) {
    pending[lang] = Promise.all([
      dictLoaders[lang](),
      extraLoaders[lang](),
      import('./legalPages.ts'),
    ]).then(([dict, extra, legal]) => {
      // ErrorBoundary and notificationManager read this registry directly.
      EXTRA_TRANSLATIONS[lang] = extra;
      packs[lang] = { dict, pageDict: legal.LEGAL_PAGE_TRANSLATIONS[lang] || {} };
      return packs[lang];
    }).catch((err) => {
      delete pending[lang]; // allow a retry (e.g. after a network blip)
      throw err;
    });
  }
  return pending[lang];
}
