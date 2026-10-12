// The Word Counter: a big text box with Paste / Copy / Clear, and the live
// numbers. Everything runs here in the browser (lib/count.ts); the text is
// never sent or stored.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { Strings } from '../i18n/en';
import { countAll } from '../lib/count';
import { useSettled } from '../lib/useSettled';
import { copyText } from '../../password-generator/lib/clipboard';
import Stats from './Stats';
import Toolbar from './Toolbar';

type Notice = { text: string; undo?: string } | null;

export default function WordCounter({ t, lang }: { t: Strings; lang: string }) {
  const [text, setText] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [copied, setCopied] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const settled = useSettled(text);
  const counts = useMemo(() => countAll(settled), [settled]);

  // Notices and the "Copied!" label go away on their own.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), notice.undo !== undefined ? 8000 : 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  const paste = async () => {
    const el = area.current;
    try {
      const clip = await navigator.clipboard.readText();
      const start = el?.selectionStart ?? text.length;
      const end = el?.selectionEnd ?? text.length;
      setText(text.slice(0, start) + clip + text.slice(end));
      setNotice({ text: t.pasted });
      requestAnimationFrame(() => {
        el?.focus();
        el?.setSelectionRange(start + clip.length, start + clip.length);
      });
    } catch {
      // No Clipboard API, or the browser/visitor said no: Ctrl+V still works.
      setNotice({ text: t.pasteHint });
      el?.focus();
    }
  };

  const copy = async () => {
    if (text && (await copyText(text))) setCopied(true);
  };

  const clear = () => {
    setNotice({ text: t.cleared, undo: text });
    setText('');
    area.current?.focus();
  };

  return (
    <section className="mx-auto w-full max-w-5xl px-4" aria-label={t.title}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
        <div className="order-first lg:order-last lg:sticky lg:top-24">
          <Stats t={t} lang={lang} counts={counts} />
        </div>

        <div className="rounded-3xl bg-white/90 p-4 sm:p-6 shadow-xl shadow-[#6d46b8]/10 dark:bg-[#17112a]">
          <label htmlFor="wc-text" className="mb-2 block font-bold text-slate-900 dark:text-white">
            {t.inputLabel}
          </label>
          <textarea
            id="wc-text"
            ref={area}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.placeholder}
            dir="auto"
            spellCheck
            className="block min-h-[16rem] sm:min-h-[24rem] w-full resize-y rounded-2xl border-2 border-[#e9dcf7] bg-[#faf6fd] px-4 py-3 text-base leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-[#a78bda] focus:outline-none dark:border-[#2c2142] dark:bg-[#120d1f] dark:text-white"
          />
          <Toolbar t={t} empty={!text} copied={copied} onPaste={paste} onCopy={copy} onClear={clear} />

          <div role="status" aria-live="polite" className="min-h-[1.5rem]">
            {notice && (
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-[#f1e9fb] px-3 py-2 text-sm text-[#4b2e83] dark:bg-[#261b3b] dark:text-[#d1b9f7]">
                <span>{notice.text}</span>
                {notice.undo !== undefined && (
                  <button
                    type="button"
                    onClick={() => {
                      setText(notice.undo!);
                      setNotice(null);
                    }}
                    className="font-bold underline underline-offset-2"
                  >
                    {t.undo}
                  </button>
                )}
              </p>
            )}
          </div>

          <p className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            {t.privacy}
          </p>
        </div>
      </div>
    </section>
  );
}
