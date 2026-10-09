import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { Strings } from '../i18n/en';
import { inputSize, MODELS, type ModelId } from '../lib/models';

interface Props {
  t: Strings;
  /** Model download progress 0..1, or null while the photo is processed. */
  download: number | null;
  preview: string;
  model: ModelId;
}

/** Share of the bar used by the first-time download. */
const DOWNLOAD_SHARE = 70;

// Seconds the last photo took on this device, per model: paces the bar.
const took: Partial<Record<ModelId, number>> = {};

function expectedSeconds(model: ModelId): number {
  const phone = inputSize(MODELS.fast) !== MODELS.fast.size;
  return took[model] ?? (model === 'hd' ? (phone ? 8 : 3) : phone ? 13 : 4);
}

/** One bar for the whole wait. The download reports real progress; the
 *  model itself cannot, so the bar then eases toward 99% over the time a
 *  photo usually takes, and the result replaces it when it is ready. */
export default function ProgressCard({ t, download, preview, model }: Props) {
  const hd = model === 'hd';
  const processing = download === null;
  const [pct, setPct] = useState(0);
  const shown = useRef(0);
  shown.current = pct;

  useEffect(() => {
    if (download !== null) setPct((p) => Math.max(p, Math.round(download * DOWNLOAD_SHARE)));
  }, [download]);

  useEffect(() => {
    if (!processing) return;
    const from = shown.current;
    const start = performance.now();
    const tau = expectedSeconds(model) / 2.5; // ~92% at the expected time
    const timer = setInterval(() => {
      const s = (performance.now() - start) / 1000;
      setPct(Math.round(from + (99 - from) * (1 - Math.exp(-s / tau))));
    }, 200);
    return () => {
      clearInterval(timer);
      took[model] = (performance.now() - start) / 1000;
    };
  }, [processing, model]);

  const title = processing ? (hd ? t.hdProcessingTitle : t.processingTitle) : hd ? t.hdLoadingTitle : t.loadingTitle;
  return (
    <div className="rounded-3xl bg-white/90 p-6 sm:p-8 shadow-xl shadow-[#6d46b8]/10 dark:bg-[#17112a]">
      <div className="relative mx-auto mb-6 w-fit overflow-hidden rounded-2xl">
        <img src={preview} alt="" className="max-h-64 w-auto opacity-60 blur-[1px]" />
        <div className="bgr-scan-line absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-[#a78bda]/50 to-transparent" />
      </div>
      <div className="flex items-center justify-center gap-2 text-[#4b2e83] dark:text-[#d1b9f7]">
        <Sparkles className="h-5 w-5 animate-pulse" />
        <p className="font-heading text-lg font-bold" role="status" aria-live="polite">
          {title}
        </p>
      </div>
      <div
        className="mx-auto mt-4 h-2.5 max-w-sm overflow-hidden rounded-full bg-[#f1e9fb] dark:bg-[#261b3b]"
        role="progressbar"
        aria-label={title}
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
        <span className="font-semibold tabular-nums">{pct}%</span>
        {processing && <> · {hd ? t.hdProcessingHint : t.processingHint}</>}
      </p>
    </div>
  );
}
