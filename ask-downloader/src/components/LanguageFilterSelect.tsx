import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { FlagIcon } from './FlagIcon.tsx';
import type { BlogLanguageInfo, BlogLanguage } from '../config/blogLanguages.ts';

/**
 * Language picker for the blog archive.
 *
 * A native <select> cannot hold an <img> or <svg>, only text — which is why
 * the previous version fell back to emoji flags and showed "PK" on Windows.
 * This is a listbox built out of buttons so each row can carry a real drawn
 * flag, while keeping the keyboard behaviour people expect from a select.
 */

interface Props {
  /** Languages that actually have posts, with their counts. */
  options: (BlogLanguageInfo & { count: number })[];
  /** Currently open archive, or null for "All Languages". */
  value: BlogLanguage | null;
  totalCount: number;
  allLabel: string;
  onChange: (code: BlogLanguage | null) => void;
  id?: string;
}

export const LanguageFilterSelect: React.FC<Props> = ({
  options,
  value,
  totalCount,
  allLabel,
  onChange,
  id = 'blog-language-filter',
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = value ? options.find((o) => o.code === value) : null;

  // Close on an outside click or Escape — the two ways anyone expects to
  // dismiss a dropdown.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        wrapRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (code: BlogLanguage | null) => {
    setOpen(false);
    onChange(code);
  };

  const Row = ({
    code,
    label,
    count,
    active,
  }: { code: BlogLanguage | null; label: string; count: number; active: boolean; key?: React.Key }) => (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={() => pick(code)}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
        active
          ? 'bg-[#f1e9fb] dark:bg-[#261b3b] text-[#6d46b8] dark:text-[#d1b9f7]'
          : 'text-[#2e2440] dark:text-[#e7e1f2] hover:bg-[#faf7fd] dark:hover:bg-[#241a3a]'
      }`}
    >
      <span className="w-6 h-4 rounded-[3px] overflow-hidden ring-1 ring-black/10 dark:ring-white/15 shrink-0 flex items-center justify-center bg-white dark:bg-[#1c152a]">
        {code ? (
          <FlagIcon code={code} className="w-full h-full block" />
        ) : (
          <Globe className="w-3 h-3 text-[#6d46b8] dark:text-[#d1b9f7]" />
        )}
      </span>
      <span className="flex-1 truncate">{label}</span>
      <span className="text-[11px] font-bold text-[#a29cb2] tabular-nums shrink-0">{count}</span>
      {active && <Check className="w-3.5 h-3.5 shrink-0" />}
    </button>
  );

  return (
    <div ref={wrapRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-bold text-[#4b2e83] dark:text-[#d1b9f7] bg-white dark:bg-[#1c152a] border border-[#eae3ee] dark:border-[#382b4f] rounded-xl shadow-xs hover:border-[#a78bda] focus:border-[#7c4fd1] outline-hidden cursor-pointer transition-colors"
      >
        <span className="w-6 h-4 rounded-[3px] overflow-hidden ring-1 ring-black/10 dark:ring-white/15 shrink-0 flex items-center justify-center">
          {selected ? (
            <FlagIcon code={selected.code} className="w-full h-full block" />
          ) : (
            <Globe className="w-3.5 h-3.5" />
          )}
        </span>
        <span className="truncate max-w-[10rem]">
          {selected ? selected.nativeName : allLabel}
        </span>
        <span className="text-[11px] font-bold text-[#a29cb2] tabular-nums">
          ({selected ? selected.count : totalCount})
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-labelledby={id}
          className="absolute z-40 mt-1.5 min-w-[15rem] max-h-72 overflow-y-auto py-1 bg-white dark:bg-[#1c152a] border border-[#eae3ee] dark:border-[#382b4f] rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-150 start-0"
        >
          <Row code={null} label={allLabel} count={totalCount} active={!value} />
          <div className="my-1 border-t border-[#f1e9fb] dark:border-white/10" />
          {options.map((l) => (
            <Row
              key={l.code}
              code={l.code}
              label={l.nativeName}
              count={l.count}
              active={value === l.code}
            />
          ))}
        </div>
      )}
    </div>
  );
};
