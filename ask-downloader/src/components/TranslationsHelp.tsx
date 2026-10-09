import React, { useId, useState } from 'react';
import { HelpCircle, ChevronDown, X } from 'lucide-react';

/** "How to use" box for Content Editor -> Translations. Opens in place. */
export const TranslationsHelp: React.FC = () => {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="bg-white dark:bg-[#181224] rounded-2xl border border-[#eae3ee] dark:border-[#2e1d4d] shadow-xs overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left cursor-pointer hover:bg-[#f6f0f4] dark:hover:bg-[#201538] transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-extrabold text-[#2e2440] dark:text-white">
          <HelpCircle className="w-4 h-4 text-[#6d46b8] dark:text-[#d1b9f7]" />
          How to use
        </span>
        <ChevronDown className={`w-4 h-4 text-[#726c85] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div
        id={panelId}
        role="region"
        inert={!open}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pt-1 text-xs leading-relaxed text-[#4a3d5c] dark:text-[#cfc3e3] space-y-4">
            <ol className="space-y-2 list-decimal list-inside">
              <li>
                Write your text in the <b>Hero Section</b>, <b>Features</b>, <b>FAQs</b> or <b>Pages</b> tab and save it. It is
                translated into all 11 languages automatically, usually within a minute.
              </li>
              <li>Come back here and pick a language at the top.</li>
              <li>Read each translation. If one is wrong, correct it in its box.</li>
              <li>
                Click <b>Save translations</b>. The website shows your version straight away.
              </li>
            </ol>

            <div className="rounded-xl bg-[#f6f0f4] dark:bg-[#201538] p-3.5 space-y-1.5">
              <p className="font-bold text-[#2e2440] dark:text-white">Good to know</p>
              <ul className="space-y-1.5 list-disc list-inside">
                <li><b>Machine</b> means translated automatically. <b>Edited by you</b> is your correction — it is never replaced automatically.</li>
                <li><b>Use machine translation</b> brings the automatic version back.</li>
                <li>If you change the original text in its own tab, that part is translated again and your old correction for it is removed, because it no longer matches.</li>
                <li>Until a translation is ready, visitors in that language see the site's built-in text.</li>
                <li>Only text you wrote yourself appears here. Menus, buttons and the built-in page text are already translated.</li>
                <li><b>Blog posts are not translated here.</b> Each language has its own posts in Blog Manager.</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg border border-[#eae3ee] dark:border-[#2e1d4d] text-[#2e2440] dark:text-white cursor-pointer hover:bg-[#f6f0f4] dark:hover:bg-[#201538]"
            >
              <X className="w-3.5 h-3.5" /> Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
