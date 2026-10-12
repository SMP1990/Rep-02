// Drop, choose or (see Compressor) paste images; several at once.
import { useRef, useState } from 'react';
import { ImagePlus, ShieldCheck } from 'lucide-react';
import { fill, type Strings } from '../i18n/en';
import { ACCEPT, MAX_FILE_MB, MAX_FILES } from '../lib/files';

export default function Dropzone({ t, compact, onFiles }: { t: Strings; compact: boolean; onFiles: (files: File[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), input.current?.click())}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onFiles([...e.dataTransfer.files]); }}
      className={`group cursor-pointer rounded-3xl border-2 border-dashed px-6 text-center transition-all ${compact ? 'py-6' : 'py-12 sm:py-16'}
        ${over
          ? 'scale-[1.01] border-[#6d46b8] bg-[#f1e9fb] dark:bg-[#261b3b]'
          : 'border-[#a78bda]/60 bg-white/80 hover:border-[#6d46b8] hover:bg-[#f9f5fd] dark:bg-[#17112a] dark:hover:bg-[#1d1531]'}`}
    >
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => { onFiles([...(e.target.files || [])]); e.target.value = ''; }}
      />
      {!compact && (
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6d46b8] to-[#e6799f] text-white shadow-lg shadow-[#6d46b8]/25 transition-transform group-hover:scale-105">
          <ImagePlus className="h-8 w-8" aria-hidden="true" />
        </div>
      )}
      <p className={`font-heading font-bold text-[#2e2440] dark:text-[#f4eefb] ${compact ? 'text-base' : 'text-xl sm:text-2xl'}`}>{t.dropTitle}</p>
      <p className="my-2 text-sm text-slate-500 dark:text-slate-400">{t.dropOr}</p>
      <span className="inline-flex items-center gap-2 rounded-xl bg-[#6d46b8] px-6 py-3 text-sm font-bold text-white shadow-md shadow-[#6d46b8]/30 transition-all group-hover:bg-[#5a37a0] active:scale-95">
        {compact && <ImagePlus className="h-4 w-4" aria-hidden="true" />}
        {t.choose}
      </span>
      {!compact && (
        <>
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">{fill(t.dropHint, { n: MAX_FILES, mb: MAX_FILE_MB })}</p>
          <p className="mt-1 hidden text-xs text-slate-500 dark:text-slate-400 sm:block">{t.pasteHint}</p>
          <p className="mt-5 inline-flex items-start gap-1.5 rounded-2xl bg-amber-50 px-3 py-1.5 text-start text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t.privacy}
          </p>
        </>
      )}
    </div>
  );
}
