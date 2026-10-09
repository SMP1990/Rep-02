/**
 * Picks the posts most related to the one being read, for internal linking.
 *
 * Score = same focus-keyword phrase (strongest) + same category + shared
 * topic words (from titles and keywords). Only the reader's language is
 * offered; newer posts break ties. Empty slots are filled with the newest
 * posts in that language, so every article links onward.
 */
import type { BlogPost } from '../types/admin';
import { smartSlug } from './slug.ts';
import { normalizeBlogLanguage } from '../config/blogLanguages.ts';

// Topic words: keywords only (no filler), min 3 letters. smartSlug keeps 6, so
// each word is run through it separately to cover the whole list.
const words = (s: string) =>
  new Set(s.split(/[\s,]+/).flatMap((w) => smartSlug(w).split('-')).filter((w) => w.length > 2));
const baseId = (id: string) => String(id).split('__')[0];

export function relatedPosts(current: BlogPost, all: BlogPost[], limit = 3): BlogPost[] {
  const lang = normalizeBlogLanguage(current.language);
  const keys = new Set((current.metaKeywords || []).map((k) => k.toLowerCase().trim()));
  const topic = (p: BlogPost) => words([p.title, ...(p.metaKeywords || [])].join(' '));
  const mine = topic(current);

  const pool = all.filter((p) =>
    p.status === 'published' &&
    p.id !== current.id &&
    baseId(p.id) !== baseId(current.id) && // not the same article in another language
    normalizeBlogLanguage(p.language) === lang
  );
  // Words found in a third or more of the posts ("video" on a video site)
  // say little about the topic: they only break ties.
  const df: Record<string, number> = {};
  pool.forEach((p) => topic(p).forEach((w) => (df[w] = (df[w] || 0) + 1)));
  const common = (w: string) => pool.length >= 6 && df[w] >= pool.length / 3;

  const newest = (a: BlogPost, b: BlogPost) => String(b.publishedAt).localeCompare(String(a.publishedAt));

  const scored = pool
    .map((p) => {
      let score = 0;
      for (const k of p.metaKeywords || []) if (keys.has(k.toLowerCase().trim())) score += 3;
      if (p.category === current.category) score += 2;
      for (const w of topic(p)) if (mine.has(w)) score += common(w) ? 0.25 : 1;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || newest(a.p, b.p))
    .map((x) => x.p);

  const picked = scored.slice(0, limit);
  for (const p of [...pool].sort(newest)) {
    if (picked.length >= limit) break;
    if (!picked.includes(p)) picked.push(p);
  }
  return picked;
}
