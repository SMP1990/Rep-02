import type { LegalSection } from '../types/admin';

/**
 * Privacy Policy, Terms of Use and Legal & DMCA pages, editable from
 * Content Editor -> Pages.
 *
 * While the admin has not written their own text, the page shows the
 * built-in text in the visitor's language. Once they have, their sections
 * are shown as written, in every language — the same authored-wins rule
 * the About and Contact pages use (see `cmsField.ts`).
 */
export type LegalPageKey = 'privacy' | 'terms' | 'legal';

/** The admin's own sections, ignoring blocks left completely empty. */
export function customLegalSections(page: { sections?: unknown } | undefined | null): LegalSection[] {
  const list = Array.isArray(page?.sections) ? (page!.sections as any[]) : [];
  return list
    .map((s) => ({ title: String(s?.title ?? '').trim(), body: String(s?.body ?? '').trim() }))
    .filter((s) => s.title || s.body);
}

const bullets = (items: string[]) => items.map((i) => `- ${i}`).join('\n');

/**
 * The built-in text of a page as editable sections. The editor starts from
 * the English version so the admin edits the current wording instead of a
 * blank page.
 */
export function builtInLegalSections(page: LegalPageKey, dict: any): LegalSection[] {
  if (page === 'privacy') {
    const p = dict.privacyPage || {};
    return [
      { title: p.s1Title, body: `${p.s1p1}\n\n${p.s1p2}` },
      { title: p.s2Title, body: `${p.s2p1}\n\n${p.s2p2}` },
      { title: p.s3Title, body: `${p.s3p1}\n\n${p.s3p2}` },
      { title: p.s4Title, body: p.s4p1 },
    ];
  }
  if (page === 'terms') {
    const tp = dict.termsPage || {};
    return [
      { title: '', body: tp.intro },
      { title: tp.allowedTitle, body: bullets([tp.allowed1, tp.allowed2, tp.allowed3]) },
      { title: tp.notAllowedTitle, body: bullets([tp.notAllowed1, tp.notAllowed2, tp.notAllowed3]) },
      { title: tp.availabilityTitle, body: tp.availabilityBody },
    ];
  }
  const lp = dict.legalPage || {};
  return [
    { title: lp.affiliationTitle, body: lp.affiliationBody },
    { title: lp.downloadsTitle, body: lp.downloadsBody },
    { title: lp.dmcaTitle, body: lp.dmcaBody },
  ];
}

/** True when the sections are exactly the built-in English text, unedited. */
export function isUnchangedBuiltIn(page: LegalPageKey, dict: any, sections: LegalSection[]): boolean {
  return JSON.stringify(customLegalSections({ sections })) ===
    JSON.stringify(customLegalSections({ sections: builtInLegalSections(page, dict) }));
}

/**
 * Splits a section body into blocks for display: paragraphs are separated by
 * a blank line, and a run of lines starting with "- " becomes a bullet list.
 */
export function legalBodyBlocks(body: string): Array<{ list: boolean; lines: string[] }> {
  const blocks: Array<{ list: boolean; lines: string[] }> = [];
  for (const chunk of body.split(/\n\s*\n/)) {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    if (lines.every((l) => /^[-•]\s+/.test(l))) {
      blocks.push({ list: true, lines: lines.map((l) => l.replace(/^[-•]\s+/, '')) });
    } else {
      blocks.push({ list: false, lines: [lines.join('\n')] });
    }
  }
  return blocks;
}
