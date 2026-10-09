// Result: compare slider, background choice, brush editing and downloads.
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BadgeCheck, Brush, Download, Info, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { fill, type ErrorCode, type Strings } from '../i18n/en';
import { exportImage, type Background, type Stroke } from '../lib/compose';
import { MAX_FILE_MB } from '../lib/image';
import { Preview } from '../lib/preview';
import BackgroundPicker from './BackgroundPicker';
import CompareSlider from './CompareSlider';
import MaskEditor from './MaskEditor';

interface Props {
  t: Strings;
  image: ImageBitmap;
  mask: Uint8ClampedArray;
  before: string;
  resized: boolean;
  fileName: string;
  /** True when this result already comes from the stronger model. */
  hd: boolean;
  /** A problem to mention above the result (the result itself is fine). */
  notice?: ErrorCode;
  onImprove: () => void;
  onReset: () => void;
}

type Format = 'png' | 'jpg';

export default function ResultView({ t, image, mask, before, resized, fileName, hd, notice, onImprove, onReset }: Props) {
  const preview = useMemo(() => new Preview(image, mask), [image, mask]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [bg, setBg] = useState<Background>({ kind: 'none' });
  const [editing, setEditing] = useState(false);
  const [after, setAfter] = useState('');
  const [busy, setBusy] = useState<Format | null>(null);
  const [problem, setProblem] = useState<ErrorCode | undefined>(notice);
  const prevBgImage = useRef<ImageBitmap | null>(null);

  // Refresh the "after" picture whenever edits or the background change.
  // The old picture is freed only once the new one is on screen.
  useEffect(() => {
    if (editing) return;
    let gone = false;
    preview.rebuild(strokes);
    preview.toBlob(bg).then((b) => {
      if (gone) return;
      const url = URL.createObjectURL(b);
      setAfter((old) => {
        if (old) setTimeout(() => URL.revokeObjectURL(old), 1000);
        return url;
      });
    });
    return () => {
      gone = true;
    };
  }, [preview, strokes, bg, editing]);

  const lastAfter = useRef('');
  lastAfter.current = after;
  useEffect(() => () => URL.revokeObjectURL(lastAfter.current), []);

  // Free a background image the user replaced or removed.
  useEffect(() => {
    const old = prevBgImage.current;
    if (old && (bg.kind !== 'image' || bg.image !== old)) old.close();
    prevBgImage.current = bg.kind === 'image' ? bg.image : null;
  }, [bg]);

  async function download(format: Format) {
    setBusy(format);
    setProblem(undefined);
    try {
      const type = format === 'png' ? 'image/png' : 'image/jpeg';
      const blob = await exportImage(image, mask, strokes, bg, type);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.${format}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setProblem('out-of-memory'); // a full-size picture did not fit in memory
    } finally {
      setBusy(null);
    }
  }

  const primary =
    'inline-flex items-center justify-center gap-2 rounded-xl bg-[#6d46b8] px-6 py-3 text-sm font-bold text-white shadow-md shadow-[#6d46b8]/30 transition-all hover:bg-[#5a37a0] active:scale-95 disabled:opacity-60';
  const secondary =
    'inline-flex items-center justify-center gap-2 rounded-xl border border-[#a78bda]/50 bg-white px-5 py-3 text-sm font-bold text-[#4b2e83] transition-all hover:bg-[#f1e9fb] active:scale-95 disabled:opacity-60 dark:bg-transparent dark:text-[#d1b9f7] dark:hover:bg-[#261b3b]';

  return (
    <div className="rounded-3xl bg-white/90 p-4 sm:p-6 shadow-xl shadow-[#6d46b8]/10 dark:bg-[#17112a]">
      {editing ? (
        <MaskEditor
          t={t}
          preview={preview}
          bg={bg}
          strokes={strokes}
          onStrokes={setStrokes}
          onDone={() => setEditing(false)}
        />
      ) : (
        <>
          {problem && (
            <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {fill(t.errors[problem], { n: MAX_FILE_MB })}
            </p>
          )}
          {after && (
            <CompareSlider t={t} before={before} after={after} width={preview.width} height={preview.height} />
          )}
          {hd ? (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#6d46b8] dark:text-[#d1b9f7]">
              <BadgeCheck className="h-4 w-4" />
              {t.betterDone}
            </p>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-1.5 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-center dark:border-amber-900/50 dark:bg-amber-950/20">
              <button
                type="button"
                onClick={onImprove}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-amber-700/25 transition-all hover:bg-amber-800 active:scale-95"
              >
                <Sparkles className="h-4 w-4" />
                {t.betterButton}
              </button>
              <p className="max-w-md text-xs text-amber-900/80 dark:text-amber-200/80">
                {t.betterHint}
              </p>
            </div>
          )}
          {resized && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Info className="h-3.5 w-3.5" />
              {fill(t.resizedNote, { w: image.width, h: image.height })}
            </p>
          )}
          <div className="mt-5 flex flex-col gap-4">
            <BackgroundPicker t={t} value={bg} onChange={setBg} />
            <button type="button" className={`${secondary} sm:self-start`} onClick={() => setEditing(true)}>
              <Brush className="h-4 w-4" />
              {t.editButton}
            </button>
          </div>
          <div className="mt-5 flex flex-col gap-3 border-t border-[#a78bda]/20 pt-5 sm:flex-row sm:justify-center">
            <button type="button" className={primary} disabled={!!busy} onClick={() => download('png')}>
              {busy === 'png' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {busy === 'png' ? t.preparing : t.downloadPng}
            </button>
            {bg.kind !== 'none' && (
              <button type="button" className={secondary} disabled={!!busy} onClick={() => download('jpg')}>
                {busy === 'jpg' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {busy === 'jpg' ? t.preparing : t.downloadJpg}
              </button>
            )}
            <button type="button" className={secondary} onClick={onReset}>
              <RotateCcw className="h-4 w-4" />
              {t.newImage}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
