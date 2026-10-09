import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { fill, type Strings } from '../i18n/en';
import { downloadMb, type ModelId } from '../lib/models';

interface Props {
  t: Strings;
  /** Model download progress 0..1, or null while the photo is processed. */
  download: number | null;
  preview: string;
  model: ModelId;
}

export default function ProgressCard({ t, download, preview, model }: Props) {
  const hd = model === 'hd';
  const [seconds, setSeconds] = useState(0);
  const processing = download === null;

  useEffect(() => {
    if (!processing) return;
    setSeconds(0);
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [processing, model]);

  const pct = Math.round((download ?? 0) * 100);
  return (
    <div className="rounded-3xl bg-white/90 p-6 sm:p-8 shadow-xl shadow-[#6d46b8]/10 dark:bg-[#17112a]">
      <div className="relative mx-auto mb-6 w-fit overflow-hidden rounded-2xl">
        <img src={preview} alt="" className="max-h-64 w-auto opacity-60 blur-[1px]" />
        <div className="scan-line absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-[#a78bda]/50 to-transparent" />
      </div>
      <div className="flex items-center justify-center gap-2 text-[#4b2e83] dark:text-[#d1b9f7]">
        <Sparkles className="h-5 w-5 animate-pulse" />
        <p className="font-heading text-lg font-bold" role="status" aria-live="polite">
          {processing ? (hd ? t.hdProcessingTitle : t.processingTitle) : hd ? t.hdLoadingTitle : t.loadingTitle}
        </p>
      </div>
      {processing ? (
        <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          {hd ? t.hdProcessingHint : t.processingHint} <span className="tabular-nums">{fill(t.seconds, { n: seconds })}</span>
        </p>
      ) : (
        <>
          <div
            className="mx-auto mt-4 h-2.5 max-w-sm overflow-hidden rounded-full bg-[#f1e9fb] dark:bg-[#261b3b]"
            role="progressbar"
            aria-label={hd ? t.hdLoadingTitle : t.loadingTitle}
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#4b2e83] via-[#6d46b8] to-[#e6799f] transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
            <span className="font-semibold tabular-nums">{pct}%</span> ·{' '}
            {fill(hd ? t.hdLoadingNote : t.loadingFirstTime, { n: downloadMb(model) })}
          </p>
        </>
      )}
    </div>
  );
}
