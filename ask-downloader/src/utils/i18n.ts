/** Fills {name} placeholders in a translated string. */
export const fill = (text: string, vars: Record<string, string | number>) =>
  String(text || '').replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

/** A language's name written in the reader's language: "Spanish" -> "ہسپانوی". */
export function langName(code: string, uiLang: string, fallback = code): string {
  try {
    return new Intl.DisplayNames([uiLang], { type: 'language' }).of(code) || fallback;
  } catch {
    return fallback;
  }
}

/** A YYYY-MM-DD date in the reader's language. */
export function uiDate(value: string, uiLang: string): string {
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (isNaN(d.getTime())) return value;
  try {
    return d.toLocaleDateString(uiLang, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return value;
  }
}

/** An author shown as the default "Admin" reads as the reader's word for it;
 *  a real name is never changed. */
export const authorLabel = (name: string | undefined, t: any) =>
  !name || name.trim().toLowerCase() === 'admin' ? t.header?.admin || 'Admin' : name;

/** "4 min read" stored on a post -> the reader's wording; text without a number stays as written. */
export const readTimeLabel = (value: string | undefined, t: any) => {
  const n = String(value || '').match(/\d+/)?.[0];
  return n ? fill(t.ui.minRead, { n }) : value || '';
};
