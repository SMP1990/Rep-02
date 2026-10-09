import React from 'react';
import type { LegalSection } from '../types/admin';
import { legalBodyBlocks } from '../utils/legalContent';
import { withBrand } from '../config/brand';
import { useLanguage } from '../context/LanguageContext';

interface LegalSectionsProps {
  sections: LegalSection[];
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * The admin's own Privacy / Terms / Legal text, in the same cards the
 * built-in text uses. `{brand}` in their text becomes the site name.
 */
export const LegalSections: React.FC<LegalSectionsProps> = ({ sections, icon: Icon }) => {
  const { brand: siteName } = useLanguage();
  const brand = (s: string) => withBrand(s, siteName);
  return (
    <>
      {sections.map((section, idx) => (
        <div
          key={idx}
          className="bg-white dark:bg-[#181224] rounded-2xl p-6 sm:p-7 border border-[#eae3ee] dark:border-[#2e1d4d] shadow-sm"
        >
          {section.title && (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#f1e9fb] dark:bg-[#261b3b] text-[#6d46b8] dark:text-[#d1b9f7] flex items-center justify-center shrink-0">
                <Icon className="w-4.5 h-4.5" />
              </div>
              <h2 className="text-base font-bold">{brand(section.title)}</h2>
            </div>
          )}
          <div className="space-y-2.5 text-sm text-[#635373] dark:text-[#b8a9cc] leading-relaxed">
            {legalBodyBlocks(section.body).map((block, i) =>
              block.list ? (
                <ul key={i} className="space-y-2 list-disc list-inside">
                  {block.lines.map((line, j) => <li key={j}>{brand(line)}</li>)}
                </ul>
              ) : (
                <p key={i} className="whitespace-pre-line">{brand(block.lines[0])}</p>
              )
            )}
          </div>
        </div>
      ))}
    </>
  );
};
