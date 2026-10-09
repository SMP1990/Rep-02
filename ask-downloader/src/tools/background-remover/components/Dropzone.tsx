import { useRef, useState } from 'react';
import { ImagePlus, ShieldCheck } from 'lucide-react';
import { fill, type Strings } from '../i18n/en';
import { MAX_FILE_MB } from '../lib/image';

interface Props {
  t: Strings;
  onFile: (file: File) => void;
  /** First sign the user is about to upload: start fetching the AI. */
  onWarmUp: () => void;
}

export default function Dropzone({ t, onFile, onWarmUp }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onPointerEnter={onWarmUp}
      onTouchStart={onWarmUp}
      onFocus={onWarmUp}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
      onDragEnter={onWarmUp}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      className={`group cursor-pointer rounded-3xl border-2 border-dashed px-6 py-12 sm:py-16 text-center transition-all
        ${over
          ? 'border-[#6d46b8] bg-[#f1e9fb] dark:bg-[#261b3b] scale-[1.01]'
          : 'border-[#a78bda]/60 bg-white/80 dark:bg-[#17112a] hover:border-[#6d46b8] hover:bg-[#f9f5fd] dark:hover:bg-[#1d1531]'}`}
    >
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = ''; // same file can be picked again
        }}
      />
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6d46b8] to-[#e6799f] text-white shadow-lg shadow-[#6d46b8]/25 transition-transform group-hover:scale-105">
        <ImagePlus className="h-8 w-8" />
      </div>
      <p className="font-heading text-xl sm:text-2xl font-bold text-[#2e2440] dark:text-[#f4eefb]">
        {t.dropTitle}
      </p>
      <p className="my-3 text-sm text-slate-500 dark:text-slate-400">{t.dropOr}</p>
      <span className="inline-flex items-center gap-2 rounded-xl bg-[#6d46b8] px-6 py-3 text-sm font-bold text-white shadow-md shadow-[#6d46b8]/30 transition-all group-hover:bg-[#5a37a0] active:scale-95">
        {t.chooseButton}
      </span>
      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        {fill(t.formats, { n: MAX_FILE_MB })}
      </p>
      <p className="mt-1 hidden text-xs text-slate-500 dark:text-slate-400 sm:block">{t.pasteHint}</p>
      <p className="mt-5 inline-flex items-start gap-1.5 rounded-2xl bg-amber-50 px-3 py-1.5 text-left text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
        <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" />
        {t.privacy}
      </p>
    </div>
  );
}
