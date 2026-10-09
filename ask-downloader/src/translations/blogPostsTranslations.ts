import { CategoryTranslationMap, LanguagePostMap } from './blog/types.ts';
import { UR_CATEGORIES, UR_POSTS } from './blog/ur.ts';
import { AR_CATEGORIES, AR_POSTS } from './blog/ar.ts';
import { ES_CATEGORIES, ES_POSTS } from './blog/es.ts';
import { HI_CATEGORIES, HI_POSTS } from './blog/hi.ts';
import { JA_CATEGORIES, JA_POSTS } from './blog/ja.ts';
import { EXTRA_CATEGORIES } from './blog/categoriesExtra.ts';

export const CATEGORY_TRANSLATIONS: Record<string, CategoryTranslationMap> = {
  ur: UR_CATEGORIES,
  ar: AR_CATEGORIES,
  es: ES_CATEGORIES,
  hi: HI_CATEGORIES,
  ja: JA_CATEGORIES,
};

export const POST_TRANSLATIONS: Record<string, LanguagePostMap> = {
  ur: UR_POSTS,
  ar: AR_POSTS,
  es: ES_POSTS,
  hi: HI_POSTS,
  ja: JA_POSTS,
};

export function getLocalizedCategory(category: string, lang: string): string {
  return CATEGORY_TRANSLATIONS[lang]?.[category] || EXTRA_CATEGORIES[lang]?.[category] || category;
}

/**
 * Label for a post's category, written in the POST's own language.
 *
 * Posts store the canonical (English) category so one admin-managed list
 * works across every language; only the label shown to a reader is localized.
 */
export function postCategoryLabel(category: string, postLanguage?: string): string {
  return getLocalizedCategory(category, postLanguage || 'en');
}
