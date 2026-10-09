/**
 * Month grouping for the blog ("2026-09" -> "September 2026").
 * Used as an in-page filter, not as separate URLs: date archives are thin,
 * duplicate pages to search engines, so they are never indexed.
 */

/** "2026-09-08" -> "2026-09"; '' when the date is missing or malformed. */
export const monthKey = (date?: string): string =>
  /^\d{4}-\d{2}/.test(String(date || '')) ? String(date).slice(0, 7) : '';

export function monthLabel(key: string, lang = 'en'): string {
  const d = new Date(`${key}-01T00:00:00`);
  if (isNaN(d.getTime())) return key;
  try {
    return d.toLocaleDateString(lang, { month: 'long', year: 'numeric' });
  } catch {
    return key;
  }
}

/** Newest month first, with how many posts fall in each. */
export function monthCounts(posts: { publishedAt?: string }[]): { key: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const p of posts) {
    const k = monthKey(p.publishedAt);
    if (k) counts[k] = (counts[k] || 0) + 1;
  }
  return Object.keys(counts)
    .sort()
    .reverse()
    .map((key) => ({ key, count: counts[key] }));
}

/** ?month=2026-09 from the address bar, if valid. */
export function monthFromUrl(): string {
  if (typeof window === 'undefined') return '';
  const m = new URLSearchParams(window.location.search).get('month') || '';
  return /^\d{4}-\d{2}$/.test(m) ? m : '';
}
