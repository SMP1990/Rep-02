/**
 * Turns the hand-written translations in src/translations/blog/* into real,
 * standalone blog posts — one record per language, each with its own id,
 * slug and `language`.
 *
 * Why derive instead of hand-writing 50+ records: the translations only carry
 * the text (title, excerpt, category, readTime, content). Everything else —
 * cover image, publish date, author, SEO — comes from the English post they
 * were translated from, so the two never drift apart.
 */

import type { BlogPost } from '../types/admin.ts';
import type { BlogLanguage } from '../config/blogLanguages.ts';
import { POST_TRANSLATIONS } from '../translations/blogPostsTranslations.ts';
import { BASE_BLOG_POSTS } from './mockAdminData.ts';

/** Only languages that actually have translated content. */
const TRANSLATED_LANGUAGES: BlogLanguage[] = ['ur', 'ar', 'es', 'hi', 'ja'];

/** `post_1` + `ur` -> `post_1__ur`. Stable, so re-seeding never duplicates. */
export const translatedPostId = (baseId: string, lang: BlogLanguage) => `${baseId}__${lang}`;

/** Keeps URLs ASCII — an Urdu or Arabic slug turns into percent-encoded soup. */
export const translatedPostSlug = (baseSlug: string, lang: BlogLanguage) => `${baseSlug}-${lang}`;

function derive(base: BlogPost, lang: BlogLanguage): BlogPost | null {
  const t = POST_TRANSLATIONS[lang]?.[base.id] || POST_TRANSLATIONS[lang]?.[base.slug];
  if (!t?.title || !t?.content) return null;

  return {
    ...base,
    id: translatedPostId(base.id, lang),
    slug: translatedPostSlug(base.slug, lang),
    language: lang,
    title: t.title,
    excerpt: t.excerpt || base.excerpt,
    content: t.content,
    // Category stays canonical (English) on every post so one admin-managed
    // category list keeps working across languages. The translated label is
    // looked up at render time from the post's own language.
    category: base.category,
    readTime: t.readTime || base.readTime,
    authorRole: t.authorRole || base.authorRole,
    // SEO text is language-specific; fall back to the translated title/excerpt
    // rather than inheriting English meta tags onto a non-English page.
    metaTitle: t.title,
    metaDescription: t.excerpt || base.metaDescription,
    metaKeywords: base.metaKeywords,
    // Each language is its own canonical page — no duplicate-content clash.
    canonicalUrl: undefined,
    // Views are per-post, not inherited.
    views: 0,
  };
}

export const TRANSLATED_BLOG_POSTS: BlogPost[] = TRANSLATED_LANGUAGES.flatMap((lang) =>
  BASE_BLOG_POSTS.map((base) => derive(base, lang)).filter((p): p is BlogPost => p !== null)
);

/**
 * The full seed set: English originals (explicitly tagged `en`) followed by
 * every translated sibling. This is what the app falls back to when no posts
 * have been saved yet, and what the merge step tops up existing stores with.
 */
export const INITIAL_BLOG_POSTS: BlogPost[] = [
  ...BASE_BLOG_POSTS.map((p) => ({ ...p, language: (p.language || 'en') as BlogLanguage })),
  ...TRANSLATED_BLOG_POSTS,
];
