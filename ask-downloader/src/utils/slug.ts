/**
 * URL slug rules (SEO):
 *  - lower-case a-z, 0-9 and single hyphens only
 *  - auto slugs drop filler words ("how", "to", "the") and bare numbers
 *    (years, list counts), keep at most 6 keywords and 60 characters
 *  - keyword-like tokens with digits stay ("mp3", "1080p", "4k"), and meaning
 *    words stay ("without", "no", "not", "vs")
 */

const STOP_WORDS = new Set(
  ('a an the and or but nor of to in on at by for from with into onto about as is are was were be been ' +
    'being am do does did can could will would should shall may might must this that these those it its your you ' +
    'our we my me i he she they them their his her how what why when where which who whom best top ultimate ' +
    'complete easy simple quick step steps way ways using use new via just also any all some ' +
    'more most very your than then so if yes here there get got make made full latest')
    .split(' ')
);

export const MAX_SLUG_LENGTH = 60;
const MAX_WORDS = 6;

/** Basic cleanup for a slug the admin typed — no words removed. */
export function cleanSlug(text: string, maxLen = 75): string {
  const s = String(text || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (s.length <= maxLen) return s;
  const cut = s.slice(0, maxLen);
  return cut.slice(0, cut.lastIndexOf('-') > 20 ? cut.lastIndexOf('-') : maxLen).replace(/-+$/, '');
}

/** Short keyword slug built from a title. Empty if the title has no Latin words. */
export function smartSlug(title: string): string {
  const words = cleanSlug(title, 500).split('-').filter(Boolean);
  const seen = new Set<string>();
  const keep = words.filter((w) => {
    if (/^\d+$/.test(w)) return false; // bare numbers: years, "10 ways"
    if (STOP_WORDS.has(w)) return false;
    if (seen.has(w)) return false;
    seen.add(w);
    return true;
  });
  const picked = (keep.length ? keep : words.filter((w) => !/^\d+$/.test(w))).slice(0, MAX_WORDS);
  return cleanSlug(picked.join('-'), MAX_SLUG_LENGTH);
}

/** Plain-language problems with a slug, for the editor to show. */
export function slugWarnings(slug: string): string[] {
  const out: string[] = [];
  const parts = slug.split('-').filter(Boolean);
  if (parts.some((p) => /^\d+$/.test(p))) out.push('Contains a number (e.g. a year) — it will look outdated later.');
  if (slug.length > MAX_SLUG_LENGTH) out.push(`Long (${slug.length} characters) — aim for under ${MAX_SLUG_LENGTH}.`);
  if (parts.length > MAX_WORDS) out.push(`${parts.length} words — 3 to ${MAX_WORDS} keywords work best.`);
  return out;
}

/**
 * A slug nobody else uses. Adds a meaningful word (category, language)
 * before falling back to a number, so URLs stay keyword-only.
 */
export function uniqueSlug(base: string, isTaken: (s: string) => boolean, extras: string[] = []): string {
  if (!isTaken(base)) return base;
  const words = base.split('-');
  for (const extra of [...extras, 'guide', 'tips', 'tutorial']) {
    const e = cleanSlug(extra);
    if (!e || words.includes(e)) continue;
    const s = `${base}-${e}`;
    if (!isTaken(s)) return s;
  }
  let n = 2;
  while (isTaken(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
