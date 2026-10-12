// One image in the list: name, before -> after, and its buttons.
import { AlertCircle, ArrowRight, Columns2, Download, FileImage, Loader2, X } from 'lucide-react';
import { fill, type Strings } from '../i18n/en';
import { formatBytes, MAX_FILE_MB, saved } from '../lib/files';
import { MAX_MEGAPIXELS } from '../lib/limits';
import type { Item } from '../lib/useCompressor';

const iconBtn = 'inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#6d46b8] transition-colors hover:bg-[#f1e9fb] dark:text-[#d1b9f7] dark:hover:bg-[#261b3b]';

function errorText(t: Strings, it: Item): string {
  switch (it.error) {
    case 'unsupported': return t.errUnsupported;
    case 'tooLarge': return fill(t.errTooLarge, { n: MAX_MEGAPIXELS });
    case 'fileSize': return fill(t.errFileSize, { mb: MAX_FILE_MB });
    case 'notImage': return t.errNotImage;
    default: return t.errFailed;
  }
}

interface Props {
  t: Strings;
  lang: string;
  item: Item;
  onDownload: () => void;
  onCompare: () => void;
  onRemove: () => void;
}

export default function FileRow({ t, lang, item, onDownload, onCompare, onRemove }: Props) {
  const { file, status, done } = item;
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-3 sm:px-4 dark:border-slate-800/80 dark:bg-[#181224]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f1e9fb] text-[#6d46b8] dark:bg-[#261b3b] dark:text-[#d1b9f7]">
        {status === 'working' ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : status === 'error' ? <AlertCircle className="h-5 w-5 text-red-600" aria-hidden="true" /> : <FileImage className="h-5 w-5" aria-hidden="true" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white" dir="auto" title={file.name}>{file.name}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-600 dark:text-slate-400">
          <span>{formatBytes(file.size, lang)}</span>
          {status === 'done' && done && (
            <>
              <ArrowRight className="h-3 w-3 rtl:rotate-180" aria-hidden="true" />
              <strong className="text-slate-900 dark:text-white">{formatBytes(done.blob.size, lang)}</strong>
              {done.kept ? (
                <span className="text-slate-500">· {t.kept}</span>
              ) : (
                <span className="rounded-full bg-emerald-100 px-1.5 font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {fill(t.smaller, { p: saved(file.size, done.blob.size) })}
                </span>
              )}
            </>
          )}
          {status === 'waiting' && <span>· {t.waiting}</span>}
          {status === 'working' && <span>· {t.working}</span>}
        </p>
        {status === 'error' && <p className="mt-0.5 text-xs text-red-700 dark:text-red-300">{errorText(t, item)}</p>}
      </div>
      {status === 'done' && (
        <>
          <button type="button" onClick={onCompare} className={iconBtn} aria-label={t.compare} title={t.compare}>
            <Columns2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={onDownload} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] px-3 py-2 text-xs font-bold text-white shadow-md shadow-[#6d46b8]/25 hover:brightness-110 active:scale-95">
            <Download className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t.download}</span>
          </button>
        </>
      )}
      <button type="button" onClick={onRemove} className={iconBtn} aria-label={t.remove} title={t.remove}>
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </li>
  );
}
