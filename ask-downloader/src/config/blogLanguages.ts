/**
 * Central configuration for BLOG CONTENT languages.
 *
 * This is deliberately separate from `LANGUAGES` in context/LanguageContext.tsx:
 *   - LanguageContext  -> translates the SITE INTERFACE (header, home page, buttons).
 *   - This file        -> the language a BLOG POST is written in.
 *
 * A post is authored once, in one language. The interface language never
 * rewrites a post; it only changes the chrome around it.
 */

export type BlogLanguage =
  | 'en' | 'es' | 'ar' | 'pt' | 'id'
  | 'ja' | 'fr' | 'ru' | 'de' | 'ur' | 'hi';

export interface BlogLanguageInfo {
  code: BlogLanguage;
  /** English name, used in the admin UI and for sorting. */
  name: string;
  /** Name as written by its own speakers — shown to visitors. */
  nativeName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
  /** "English Blogs" — the card heading, in that language. */
  blogsLabel: string;
  /** Call to action on the home-page language card, in that language. */
  viewLabel: string;
  /** Shown on an archive that has no posts yet, in that language. */
  emptyLabel: string;
  /** BCP-47 tag for <html lang> / og:locale. */
  locale: string;
}

export const BLOG_LANGUAGES: BlogLanguageInfo[] = [
  {
    code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', dir: 'ltr',
    blogsLabel: 'English Blogs', viewLabel: 'View English Blogs',
    emptyLabel: 'No blog posts available in this language yet.', locale: 'en_US',
  },
  {
    code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr',
    blogsLabel: 'Blogs en Español', viewLabel: 'Ver Blogs en Español',
    emptyLabel: 'Todavía no hay entradas de blog en este idioma.', locale: 'es_ES',
  },
  {
    code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl',
    blogsLabel: 'المدونة العربية', viewLabel: 'عرض المدونة العربية',
    emptyLabel: 'لا توجد مقالات بهذه اللغة حتى الآن.', locale: 'ar_AR',
  },
  {
    code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', dir: 'ltr',
    blogsLabel: 'Blogs em Português', viewLabel: 'Ver Blogs em Português',
    emptyLabel: 'Ainda não há publicações neste idioma.', locale: 'pt_PT',
  },
  {
    code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', dir: 'ltr',
    blogsLabel: 'Blog Indonesia', viewLabel: 'Lihat Blog Indonesia',
    emptyLabel: 'Belum ada artikel dalam bahasa ini.', locale: 'id_ID',
  },
  {
    code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', dir: 'ltr',
    blogsLabel: '日本語のブログ', viewLabel: '日本語のブログを見る',
    emptyLabel: 'この言語の記事はまだありません。', locale: 'ja_JP',
  },
  {
    code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr',
    blogsLabel: 'Blogs en Français', viewLabel: 'Voir les blogs français',
    emptyLabel: 'Aucun article disponible dans cette langue pour le moment.', locale: 'fr_FR',
  },
  {
    code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', dir: 'ltr',
    blogsLabel: 'Русские блоги', viewLabel: 'Смотреть русские блоги',
    emptyLabel: 'На этом языке пока нет статей.', locale: 'ru_RU',
  },
  {
    code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', dir: 'ltr',
    blogsLabel: 'Deutsche Blogs', viewLabel: 'Deutsche Blogs ansehen',
    emptyLabel: 'In dieser Sprache sind noch keine Beiträge vorhanden.', locale: 'de_DE',
  },
  {
    code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', dir: 'rtl',
    blogsLabel: 'اردو بلاگز', viewLabel: 'اردو بلاگز دیکھیں',
    emptyLabel: 'اس زبان میں ابھی کوئی مضمون موجود نہیں۔', locale: 'ur_PK',
  },
  {
    code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', dir: 'ltr',
    blogsLabel: 'हिन्दी ब्लॉग', viewLabel: 'हिन्दी ब्लॉग देखें',
    emptyLabel: 'इस भाषा में अभी कोई लेख उपलब्ध नहीं है।', locale: 'hi_IN',
  },
];

/** Every supported code, for validation. */
export const BLOG_LANGUAGE_CODES: BlogLanguage[] = BLOG_LANGUAGES.map((l) => l.code);

/** The language a post gets when it has none — keeps old posts working. */
export const DEFAULT_BLOG_LANGUAGE: BlogLanguage = 'en';

export const isBlogLanguage = (value: unknown): value is BlogLanguage =>
  typeof value === 'string' && (BLOG_LANGUAGE_CODES as string[]).includes(value);

/** Never throws — unknown input falls back to English. */
export const normalizeBlogLanguage = (value: unknown): BlogLanguage =>
  isBlogLanguage(value) ? value : DEFAULT_BLOG_LANGUAGE;

export const blogLanguageInfo = (code: unknown): BlogLanguageInfo =>
  BLOG_LANGUAGES.find((l) => l.code === normalizeBlogLanguage(code)) || BLOG_LANGUAGES[0];

export const isRtlBlogLanguage = (code: unknown): boolean =>
  blogLanguageInfo(code).dir === 'rtl';
