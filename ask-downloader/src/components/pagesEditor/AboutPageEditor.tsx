import React from 'react';
import { AccordionItem, ExpandAll, useOpenItems } from './AccordionItem';

const field = 'w-full px-3 py-2 text-xs rounded-xl border border-[#eae3ee] dark:border-[#2e1d4d] bg-white dark:bg-[#181224] text-[#2e2440] dark:text-white outline-hidden focus:border-[#7c4fd1]';
const small = 'w-full px-3 py-1.5 text-xs rounded-lg border border-[#eae3ee] dark:border-[#2e1d4d] bg-white dark:bg-[#181224] text-[#2e2440] dark:text-white outline-hidden focus:border-[#7c4fd1]';
const label = 'block text-xs font-bold text-[#2e2440] dark:text-white mb-1';

/** Content Editor -> Pages -> About Us: every field the page has. */
export const AboutPageEditor: React.FC<{ value: any; onChange: (next: any) => void }> = ({ value, onChange }) => {
  const set = (patch: any) => onChange({ ...value, ...patch });
  const highlights: any[] = value.highlights || [];
  const items = useOpenItems();
  const setHighlight = (i: number, patch: any) => {
    const next = [...highlights];
    next[i] = { ...next[i], ...patch };
    set({ highlights: next });
  };

  return (
    <div>
      <div className="mb-3">
        <label htmlFor="about-heading" className={label}>Page heading</label>
        <input id="about-heading" value={value.heading} onChange={(e) => set({ heading: e.target.value })} className={field} />
      </div>
      <div className="mb-3">
        <label htmlFor="about-intro" className={label}>Intro paragraph</label>
        <textarea id="about-intro" rows={3} value={value.intro} onChange={(e) => set({ intro: e.target.value })} className={field} />
      </div>

      <div className="flex items-center justify-between mt-4 mb-2">
        <p className="text-xs font-bold text-[#2e2440] dark:text-white">Highlights <span className="font-normal text-[#a29cb2]">({highlights.length})</span></p>
        {highlights.length > 0 && (
          <ExpandAll anyOpen={items.count > 0} onExpand={() => items.all(highlights.length)} onCollapse={items.none} />
        )}
      </div>
      {highlights.map((h, i) => (
        <AccordionItem key={i} label={`Highlight ${i + 1}`} preview={h.title} open={items.isOpen(i)} onToggle={() => items.toggle(i)}
          onRemove={() => { set({ highlights: highlights.filter((_, x) => x !== i) }); items.removed(i); }}>
          <input value={h.title} placeholder="Title" aria-label={`Highlight ${i + 1} title`} onChange={(e) => setHighlight(i, { title: e.target.value })} className={`${small} mb-2`} />
          <textarea rows={2} value={h.desc} placeholder="Description" aria-label={`Highlight ${i + 1} description`} onChange={(e) => setHighlight(i, { desc: e.target.value })} className={small} />
        </AccordionItem>
      ))}
      <button type="button" onClick={() => { set({ highlights: [...highlights, { title: '', desc: '' }] }); items.show(highlights.length); }}
        className="px-3 py-1.5 text-[11px] font-bold rounded-lg border border-[#eae3ee] dark:border-[#2e1d4d] text-[#2e2440] dark:text-white cursor-pointer">
        + Add highlight
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        <div>
          <label htmlFor="about-cta-heading" className={label}>Call-to-action heading</label>
          <input id="about-cta-heading" value={value.ctaHeading} onChange={(e) => set({ ctaHeading: e.target.value })} className={field} />
        </div>
        <div>
          <label htmlFor="about-cta-text" className={label}>Call-to-action text</label>
          <input id="about-cta-text" value={value.ctaText} onChange={(e) => set({ ctaText: e.target.value })} className={field} />
        </div>
      </div>
    </div>
  );
};
