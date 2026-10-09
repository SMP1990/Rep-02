import React, { useEffect, useState } from 'react';
import { ExternalLink, RotateCcw } from 'lucide-react';
import { PAGE_LIST, isCustomPage, defaultPage, type PageKey } from './pageList';
import { SaveBar } from './SaveBar';
import { AboutPageEditor } from './AboutPageEditor';
import { ContactPageEditor } from './ContactPageEditor';
import { LegalPageEditor } from '../LegalPagesEditor';

interface Props {
  pagesForm: any;
  /** Pages with unsaved changes (worked out by the Content Editor). */
  dirtyKeys: PageKey[];
  onChange: (next: any) => void;
  onSave: () => void;
  /** Puts every page back to what is saved. */
  onDiscard: () => void;
}

/**
 * Content Editor -> Pages: the pages on the left, the chosen page's editor
 * on the right, so only one page is on screen at a time.
 */
export const PagesWorkspace: React.FC<Props> = ({ pagesForm, dirtyKeys, onChange, onSave, onDiscard }) => {
  const [active, setActive] = useState<PageKey>('about');
  const page = PAGE_LIST.find((p) => p.key === active)!;
  const dirty = dirtyKeys.length > 0;

  // Ctrl+S / Cmd+S saves (and never opens the browser's "Save page" dialog here).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (dirty) onSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dirty, onSave]);

  // Only this page goes back to its built-in text — and only in the form:
  // nothing is saved until Save, so Discard can still undo it.
  const resetPage = () => {
    if (window.confirm(`Reset "${page.name}" to its built-in text? This page only. Nothing is saved until you click Save — Discard still brings your text back.`)) {
      onChange({ ...pagesForm, [active]: defaultPage(active) });
    }
  };
  const activeIsCustom = isCustomPage(active, pagesForm);

  const discard = () => {
    if (window.confirm(`Discard unsaved changes to ${dirtyKeys.length} page${dirtyKeys.length > 1 ? 's' : ''}? This cannot be undone.`)) onDiscard();
  };

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-[264px_minmax(0,1fr)] gap-5 items-start">
      {/* Phones: a slim strip that scrolls sideways, so the editor stays near the top.
          Wider screens: a full list beside the editor. */}
      <nav aria-label="Pages" className="bg-white dark:bg-[#181224] rounded-2xl border border-[#eae3ee] dark:border-[#2e1d4d] p-1.5 md:p-2 shadow-xs md:sticky md:top-4 min-w-0">
        <p className="hidden md:block px-2.5 pt-1.5 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-[#a29cb2]">Pages</p>
        <ul className="flex md:block gap-1 md:space-y-1 overflow-x-auto md:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PAGE_LIST.map(({ key, name, path, icon: Icon }) => {
            const on = key === active;
            const custom = isCustomPage(key, pagesForm);
            return (
              <li key={key} className="shrink-0 md:shrink">
                <button type="button" onClick={() => setActive(key)} aria-current={on ? 'page' : undefined}
                  className={`w-full flex items-center gap-2 md:gap-2.5 px-2.5 py-1.5 md:py-2 rounded-xl text-left cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#6d46b8]/50 ${
                    on ? 'bg-[#f1e9fb] dark:bg-[#261b3b]' : 'hover:bg-[#f6f0f4] dark:hover:bg-[#201538]'
                  }`}>
                  <span className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    on ? 'bg-gradient-to-br from-[#4b2e83] to-[#6d46b8] text-white' : 'bg-[#f6f0f4] dark:bg-[#201538] text-[#6d46b8] dark:text-[#d1b9f7]'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[#2e2440] dark:text-white min-w-0 whitespace-nowrap">
                      <span className="md:truncate">{name}</span>
                      {dirtyKeys.includes(key) && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" aria-label="Unsaved changes" />}
                    </span>
                    <span className="hidden md:block text-[10px] font-mono text-[#a29cb2] truncate">{path}</span>
                  </span>
                  <span className={`hidden md:inline text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded-md shrink-0 ${
                    custom ? 'bg-[#6d46b8]/10 text-[#6d46b8] dark:text-[#d1b9f7]' : 'bg-[#eae3ee] dark:bg-white/10 text-[#726c85] dark:text-[#b5a9cd]'
                  }`}>
                    {custom ? 'Custom' : 'Built-in'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <section aria-label={`${page.name} page`} className="bg-white dark:bg-[#181224] rounded-2xl border border-[#eae3ee] dark:border-[#2e1d4d] shadow-xs min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-[#eae3ee] dark:border-[#2e1d4d]">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-base font-extrabold text-[#2e2440] dark:text-white">
              {page.name}
              <span className={`md:hidden text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${
                activeIsCustom ? 'bg-[#6d46b8]/10 text-[#6d46b8] dark:text-[#d1b9f7]' : 'bg-[#eae3ee] dark:bg-white/10 text-[#726c85] dark:text-[#b5a9cd]'
              }`}>{activeIsCustom ? 'Custom' : 'Built-in'}</span>
            </h3>
            <a href={page.path} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-mono text-[#6d46b8] dark:text-[#d1b9f7] hover:underline">
              {page.path} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <button type="button" onClick={resetPage} disabled={!activeIsCustom}
            title={activeIsCustom ? `Put ${page.name} back to its built-in text` : 'This page already shows its built-in text'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg border border-[#eae3ee] dark:border-[#2e1d4d] text-[#726c85] dark:text-[#b5a9cd] hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#726c85]">
            <RotateCcw className="w-3.5 h-3.5" /> Reset to default
          </button>
        </header>

        <div className="p-5">
          {active === 'about' && (
            <AboutPageEditor value={pagesForm.about} onChange={(about) => onChange({ ...pagesForm, about })} />
          )}
          {active === 'contact' && (
            <ContactPageEditor value={pagesForm.contact} onChange={(contact) => onChange({ ...pagesForm, contact })} />
          )}
          {(active === 'privacy' || active === 'terms' || active === 'legal') && (
            <LegalPageEditor key={active} pageKey={active} pagesForm={pagesForm} onChange={onChange} />
          )}
        </div>

      </section>
    </div>
    <SaveBar dirtyNames={PAGE_LIST.filter((p) => dirtyKeys.includes(p.key)).map((p) => p.name)} onSave={onSave} onDiscard={discard} />
    </>
  );
};
