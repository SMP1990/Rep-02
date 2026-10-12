// The Image Compressor: settings, drop zone, the list, and the totals.
// Compression runs in workers (lib/queue.ts); nothing leaves the device.
import { Fragment, useEffect, useMemo, useState } from 'react';
import { Archive, RefreshCw, Trash2 } from 'lucide-react';
import { fill, type Strings } from '../i18n/en';
import { DEFAULT_SETTINGS, type Settings } from '../lib/types';
import { useCompressor, type Item } from '../lib/useCompressor';
import { download, formatBytes, MAX_FILES, outName, saved, uniqueNames } from '../lib/files';
import { makeZip } from '../lib/zip';
import SettingsPanel from './SettingsPanel';
import Dropzone from './Dropzone';
import FileRow from './FileRow';
import Compare from './Compare';

const same = (a: Settings, b: Settings) => a.format === b.format && a.quality === b.quality && a.maxSide === b.maxSide && a.targetKB === b.targetKB;
const light = 'inline-flex items-center gap-2 rounded-xl border border-[#d9c7f2] bg-white px-4 py-2.5 text-sm font-bold text-[#4b2e83] transition-all hover:bg-[#f6f0fc] active:scale-95 disabled:opacity-50 dark:border-[#3a2b57] dark:bg-[#1d1530] dark:text-[#d1b9f7]';

export default function Compressor({ t, lang }: { t: Strings; lang: string }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const { items, overLimit, add, remove, clear, again } = useCompressor(settings);
  const [comparing, setComparing] = useState<Item | null>(null);
  const [zipping, setZipping] = useState(false);

  // Paste an image anywhere on the page (Ctrl+V / long-press Paste).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
      if (files.length) { e.preventDefault(); add(files); }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [add]);

  const done = items.filter((it) => it.status === 'done' && it.done);
  const totals = useMemo(() => {
    const before = done.reduce((n, it) => n + it.file.size, 0);
    const after = done.reduce((n, it) => n + it.done!.blob.size, 0);
    return { before, after };
  }, [done]);
  const stale = items.some((it) => it.status !== 'error' && !same(it.used, settings));
  const busy = items.some((it) => it.status === 'waiting' || it.status === 'working');

  const nameOf = (it: Item) => (it.done!.kept ? it.file.name : outName(it.file.name, it.done!.blob.type));
  const zipAll = async () => {
    setZipping(true);
    try {
      const names = uniqueNames(done.map(nameOf));
      download(await makeZip(done.map((it, i) => ({ name: names[i], blob: it.done!.blob }))), 'images.zip');
    } finally {
      setZipping(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-4xl space-y-5 px-4" aria-label={t.title}>
      {/* Upload first (what visitors come for), then their images, then settings. */}
      <Dropzone t={t} compact={items.length > 0} onFiles={add} />
      {overLimit && <p role="alert" className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">{fill(t.errLimit, { n: MAX_FILES })}</p>}

      {items.length > 0 && (
        <div className="rounded-3xl bg-white/90 p-4 sm:p-6 shadow-xl shadow-[#6d46b8]/10 dark:bg-[#17112a]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.listTitle}</h2>
            {done.length > 0 && (
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300" aria-live="polite">
                {fill(t.totalSaved, { size: formatBytes(Math.max(0, totals.before - totals.after), lang), p: saved(totals.before, totals.after), n: done.length })}
              </p>
            )}
          </div>
          <ul className="space-y-2">
            {items.map((it) => (
              <Fragment key={it.key}>
              <FileRow
                t={t}
                lang={lang}
                item={it}
                onDownload={() => download(it.done!.blob, nameOf(it))}
                onCompare={() => setComparing(it)}
                onRemove={() => remove(it.key)}
              />
              </Fragment>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {stale && !busy && (
              <button type="button" onClick={again} className={light}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {t.apply}
              </button>
            )}
            <button type="button" onClick={zipAll} disabled={done.length < 2 || zipping} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-[#6d46b8]/25 hover:brightness-110 active:scale-95 disabled:opacity-50">
              <Archive className="h-4 w-4" aria-hidden="true" />
              {t.downloadAll}
            </button>
            <button type="button" onClick={clear} className={light}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {t.clearAll}
            </button>
          </div>
        </div>
      )}
      <SettingsPanel t={t} value={settings} onChange={setSettings} />
      {comparing && <Compare t={t} item={comparing} onClose={() => setComparing(null)} />}
    </section>
  );
}
