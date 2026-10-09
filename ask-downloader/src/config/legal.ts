/**
 * "Last updated" on Privacy / Terms / Legal pages.
 *
 * Must be the date the policy text really changed — showing today's date
 * on every visit is a fake freshness signal. Admins set it in Settings when
 * they change a policy; LEGAL_TEXT_DATE is the date the shipped text was written.
 */
export const LEGAL_TEXT_DATE = '2026-09-28';

export function legalUpdatedLabel(settingsDate: string | undefined, lang: string): string {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(settingsDate || '') ? settingsDate! : LEGAL_TEXT_DATE;
  const d = new Date(`${iso}T00:00:00`);
  try {
    return d.toLocaleDateString(lang, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return iso;
  }
}
