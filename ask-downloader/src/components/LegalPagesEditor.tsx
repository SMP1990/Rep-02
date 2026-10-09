import React from 'react';
import { AccordionItem, ExpandAll, useOpenItems } from './pagesEditor/AccordionItem';
import { enTranslation } from '../context/LanguageContext';
import { builtInLegalSections, isUnchangedBuiltIn, type LegalPageKey } from '../utils/legalContent';
import type { LegalSection } from '../types/admin';

const LEGAL_KEYS: LegalPageKey[] = ['privacy', 'terms', 'legal'];

const inputCls = 'w-full px-3 py-1.5 text-xs rounded-lg border border-[#eae3ee] dark:border-[#2e1d4d] bg-white dark:bg-[#181224] text-[#2e2440] dark:text-white outline-hidden focus:border-[#7c4fd1]';
const smallBtn = 'px-3 py-1.5 text-[11px] font-bold rounded-lg border border-[#eae3ee] dark:border-[#2e1d4d] text-[#2e2440] dark:text-white cursor-pointer';

/** Text the admin left exactly as the built-in English is not saved, so
 * visitors keep getting that page in their own language. */
export function normalizeLegalPages(pages: any): any {
  const next = { ...pages };
  for (const key of LEGAL_KEYS) {
    const sections: LegalSection[] = next[key]?.sections || [];
    if (sections.length && isUnchangedBuiltIn(key, enTranslation, sections)) next[key] = { sections: [] };
  }
  return next;
}

interface Props {
  pagesForm: any;
  onChange: (next: any) => void;
}

/** One of Privacy Policy, Terms of Use, Legal & DMCA (Content Editor -> Pages). */
export const LegalPageEditor: React.FC<Props & { pageKey: LegalPageKey }> = ({ pageKey: key, pagesForm, onChange }) => {
  const sections: LegalSection[] = pagesForm[key]?.sections || [];
  const items = useOpenItems();
  const setSections = (next: LegalSection[]) => onChange({ ...pagesForm, [key]: { sections: next } });
  const update = (i: number, field: keyof LegalSection, value: string) => {
    const next = [...sections];
    next[i] = { ...next[i], [field]: value };
    setSections(next);
  };

  if (sections.length === 0) {
    return (
      <div className="rounded-xl bg-[#f6f0f4] dark:bg-[#201538] p-4">
        <p className="text-xs text-[#2e2440] dark:text-white mb-3">
          Showing the <b>built-in text</b>, translated into all 11 languages.
        </p>
        <button type="button" className={smallBtn} onClick={() => setSections(builtInLegalSections(key, enTranslation))}>
          Write my own text
        </button>
      </div>
    );
  }

  return (
    <>
      <p className="text-[11px] text-amber-700 dark:text-amber-400 mb-3">
        Your own text is shown exactly as written, in every language. Leave a blank line
        between paragraphs; start a line with "- " for a bullet point. {'{brand}'} becomes
        the site name. After changing a policy, update "Legal Pages — Last Updated" in Settings.
      </p>
      <div className="flex justify-end mb-2">
        <ExpandAll anyOpen={items.count > 0} onExpand={() => items.all(sections.length)} onCollapse={items.none} />
      </div>
      {sections.map((s, i) => (
        <AccordionItem key={i} label={`Section ${i + 1}`} preview={s.title} open={items.isOpen(i)} onToggle={() => items.toggle(i)}
          onRemove={() => { setSections(sections.filter((_, x) => x !== i)); items.removed(i); }}>
          <input value={s.title} placeholder="Section heading (optional)" aria-label={`Section ${i + 1} heading`}
            onChange={(e) => update(i, 'title', e.target.value)} className={`${inputCls} mb-2`} />
          <textarea rows={6} value={s.body} placeholder="Section text" aria-label={`Section ${i + 1} text`}
            onChange={(e) => update(i, 'body', e.target.value)} className={inputCls} />
        </AccordionItem>
      ))}
      <div className="flex flex-wrap gap-2 mt-2">
        <button type="button" className={smallBtn} onClick={() => { setSections([...sections, { title: '', body: '' }]); items.show(sections.length); }}>+ Add section</button>
        <button type="button" className={`${smallBtn} text-rose-600 dark:text-rose-400`} onClick={() => setSections([])}>Go back to built-in text</button>
      </div>
    </>
  );
};
