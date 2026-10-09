import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Languages, Loader2, RotateCcw, RefreshCw } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { LANGUAGES } from '../context/LanguageContext';
import { TranslationsHelp } from './TranslationsHelp';

interface Entry {
  text: string;
  page: string;
  label: string;
  machine: Record<string, string>;
  edited: Record<string, string>;
}

/** Unsaved changes for the selected language. null = remove my correction. */
type Drafts = Record<string, string | null>;

const card = 'bg-white dark:bg-[#181224] rounded-2xl border border-[#eae3ee] dark:border-[#2e1d4d] p-5 shadow-xs';
const btn = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg border border-[#eae3ee] dark:border-[#2e1d4d] text-[#2e2440] dark:text-white cursor-pointer hover:bg-[#f6f0f4] dark:hover:bg-[#201538] disabled:opacity-50 disabled:cursor-not-allowed';

const BADGES = {
  edited: { text: 'Edited by you', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' },
  machine: { text: 'Machine', cls: 'bg-[#f1e9fb] text-[#6d46b8] dark:bg-[#261b3b] dark:text-[#d1b9f7]' },
  pending: { text: 'Not translated yet', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' },
};

/**
 * Content Editor -> Translations: review and correct the machine
 * translations of the text the admin wrote (Hero, Features, FAQs, Pages).
 */
export const PageTranslationsEditor: React.FC<{ onGoToPages: () => void }> = ({ onGoToPages }) => {
  const { showToast, refreshPageTranslations } = useAdmin();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [running, setRunning] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [lang, setLang] = useState('ur');
  const [drafts, setDrafts] = useState<Drafts>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/page-translations', { credentials: 'same-origin' });
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      setEntries(d.entries || []);
      setRunning(!!d.running);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // While new text is being translated, refresh every few seconds.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(load, 5000);
    return () => window.clearInterval(id);
  }, [running, load]);

  const langInfo = LANGUAGES.find((l) => l.code === lang);
  const dirty = Object.keys(drafts).length;

  const missingByLang = useMemo(() => {
    const out: Record<string, number> = {};
    for (const l of LANGUAGES) {
      out[l.code] = (entries || []).filter((e) => !e.edited[l.code] && !e.machine[l.code]).length;
    }
    return out;
  }, [entries]);

  const groups = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of entries || []) map.set(e.page, [...(map.get(e.page) || []), e]);
    return [...map.entries()];
  }, [entries]);

  const pickLanguage = (code: string) => {
    if (code === lang) return;
    if (dirty && !window.confirm(`You have ${dirty} unsaved change(s) in ${langInfo?.name}. Discard them?`)) return;
    setDrafts({});
    setLang(code);
  };

  const setDraft = (e: Entry, value: string | null) => {
    setDrafts((prev) => {
      const next = { ...prev };
      const saved = e.edited[lang] ?? null;
      // Typing back the value that is already saved is not a change.
      if (value === saved || (value !== null && saved === null && value === (e.machine[lang] ?? ''))) delete next[e.text];
      else next[e.text] = value;
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch('/api/admin/page-translations', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang, changes: drafts }),
      });
      if (!r.ok) throw new Error(String(r.status));
      setDrafts({});
      await load();
      refreshPageTranslations();
      showToast(`${langInfo?.name} translations saved`, 'success');
    } catch {
      showToast('Could not save the translations. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loadError && !entries) {
    return (
      <div className={card}>
        <p className="text-xs text-rose-600 mb-3">The translations could not be loaded.</p>
        <button type="button" className={btn} onClick={load}><RefreshCw className="w-3.5 h-3.5" /> Try again</button>
      </div>
    );
  }
  if (!entries) {
    return <div className={`${card} flex items-center gap-2 text-xs text-[#726c85]`}><Loader2 className="w-4 h-4 animate-spin" /> Loading translations…</div>;
  }

  return (
    <div className="space-y-5">
      <div className={card}>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#f1e9fb] dark:bg-[#261b3b] text-[#6d46b8] dark:text-[#d1b9f7] flex items-center justify-center shrink-0">
            <Languages className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[#2e2440] dark:text-white">Page Translations</h3>
            <p className="text-[11px] text-[#726c85] dark:text-[#b5a9cd] mt-0.5">
              Check and correct the translations of the text you wrote yourself — the home page Hero, Features and FAQs,
              and the About Us, Contact, Privacy Policy, Terms of Use and Legal &amp; DMCA pages. Blog posts are
              managed separately in Blog Manager.
            </p>
          </div>
        </div>
      </div>

      <TranslationsHelp />

      {running && (
        <div className="flex items-center gap-2 rounded-xl border border-[#e1d5f3] dark:border-[#2e1d4d] bg-[#f1e9fb]/60 dark:bg-[#201538] px-4 py-3 text-xs text-[#4b2e83] dark:text-[#d1b9f7]" role="status">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          New text is being translated. This list updates by itself.
        </div>
      )}

      {entries.length === 0 ? (
        <div className={`${card} text-center`}>
          <p className="text-sm font-bold text-[#2e2440] dark:text-white mb-1">Nothing to translate yet</p>
          <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] mb-4 max-w-md mx-auto">
            Text you write yourself in the Hero Section, Features, FAQs or Pages tabs appears here after you save it. The
            built-in text is already translated into every language.
          </p>
          <button type="button" className={btn} onClick={onGoToPages}>Go to the Pages tab</button>
        </div>
      ) : (
        <>
          <div className={card}>
            <p className="text-xs font-bold text-[#2e2440] dark:text-white mb-2.5">Choose a language</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Language">
              {LANGUAGES.map((l) => {
                const active = l.code === lang;
                const missing = missingByLang[l.code];
                return (
                  <button
                    key={l.code}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => pickLanguage(l.code)}
                    className={`relative px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      active
                        ? 'bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] text-white border-transparent'
                        : 'border-[#eae3ee] dark:border-[#2e1d4d] text-[#2e2440] dark:text-white hover:bg-[#f6f0f4] dark:hover:bg-[#201538]'
                    }`}
                  >
                    <span dir={l.dir}>{l.nativeName}</span>
                    {l.nativeName !== l.name && <span className={`ml-1 font-semibold ${active ? 'text-white/70' : 'text-[#a29cb2]'}`}>· {l.name}</span>}
                    {missing > 0 && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-white dark:ring-[#181224]" title={`${missing} not translated yet`} />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-[#726c85] dark:text-[#b5a9cd] mt-2.5">
              {missingByLang[lang] > 0
                ? `${entries.length - missingByLang[lang]} of ${entries.length} parts translated. An amber dot marks a language with parts still missing.`
                : `All ${entries.length} parts are translated into ${langInfo?.name}.`}
            </p>
          </div>

          {groups.map(([page, list]) => (
            <div key={page} className={card}>
              <h3 className="text-sm font-extrabold text-[#2e2440] dark:text-white mb-3">{page}</h3>
              <div className="space-y-3">
                {list.map((e) => {
                  const draft = drafts[e.text];
                  const hasDraft = e.text in drafts;
                  const machine = e.machine[lang] ?? '';
                  const value = hasDraft ? (draft ?? machine) : (e.edited[lang] ?? machine);
                  const status = hasDraft ? (draft === null ? (machine ? 'machine' : 'pending') : 'edited') : e.edited[lang] ? 'edited' : machine ? 'machine' : 'pending';
                  const badge = BADGES[status];
                  const canRevert = (hasDraft ? draft !== null : !!e.edited[lang]) && !!machine;
                  return (
                    <div key={e.text} className={`rounded-xl border p-3.5 ${hasDraft ? 'border-[#7c4fd1]/60' : 'border-[#eae3ee] dark:border-[#2e1d4d]'}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#a29cb2]">{e.label}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{hasDraft ? `${badge.text} · unsaved` : badge.text}</span>
                      </div>
                      <p className="text-[10px] font-bold text-[#726c85] dark:text-[#b5a9cd] mb-1">Original</p>
                      <p dir="auto" className="text-xs text-[#4a3d5c] dark:text-[#cfc3e3] bg-[#f6f0f4] dark:bg-[#201538] rounded-lg px-3 py-2 mb-2.5 whitespace-pre-line">{e.text}</p>
                      <label className="block text-[10px] font-bold text-[#726c85] dark:text-[#b5a9cd] mb-1">{langInfo?.name} translation</label>
                      <textarea
                        dir={langInfo?.dir || 'ltr'}
                        lang={lang}
                        rows={Math.min(10, Math.max(2, Math.ceil((value || e.text).length / 80) + (value || e.text).split('\n').length - 1))}
                        value={value}
                        placeholder={status === 'pending' ? 'Not translated yet — visitors see the built-in text. Type your own translation here, or wait for the automatic one.' : ''}
                        onChange={(ev) => setDraft(e, ev.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-[#eae3ee] dark:border-[#2e1d4d] bg-white dark:bg-[#181224] text-[#2e2440] dark:text-white outline-hidden focus:border-[#7c4fd1]"
                      />
                      {canRevert && (
                        <button type="button" className={`${btn} mt-2`} onClick={() => setDraft(e, null)}>
                          <RotateCcw className="w-3.5 h-3.5" /> Use machine translation
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Stays in view only while there is something to save. */}
          <div className={dirty ? 'sticky bottom-3 z-10' : ''}>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#eae3ee] dark:border-[#2e1d4d] bg-white/95 dark:bg-[#181224]/95 backdrop-blur px-4 py-3 shadow-lg">
              <span className="text-xs text-[#726c85] dark:text-[#b5a9cd]">
                {dirty ? `${dirty} unsaved change${dirty > 1 ? 's' : ''} in ${langInfo?.name}` : 'No unsaved changes'}
              </span>
              <div className="flex items-center gap-2">
                <button type="button" className={btn} disabled={!dirty || saving} onClick={() => setDrafts({})}>Discard</button>
                <button
                  type="button"
                  disabled={!dirty || saving}
                  onClick={save}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save translations
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
