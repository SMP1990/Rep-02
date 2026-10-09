// Brush editing: Erase removes parts of the cut-out, Restore brings them back.
import { useEffect, useRef, useState } from 'react';
import { Brush, Check, Eraser, RotateCcw, Undo2 } from 'lucide-react';
import type { Strings } from '../i18n/en';
import { drawSegment, type Background, type Stroke } from '../lib/compose';
import type { Preview } from '../lib/preview';

/** The DOM pointer event (works with or without React's type package). */
type PtrEvent = PointerEvent & { currentTarget: HTMLCanvasElement };

interface Props {
  t: Strings;
  preview: Preview;
  bg: Background;
  strokes: Stroke[];
  onStrokes: (s: Stroke[]) => void;
  onDone: () => void;
}

export default function MaskEditor({ t, preview, bg, strokes, onStrokes, onDone }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const current = useRef<Stroke | null>(null);
  const frame = useRef(0);
  const [mode, setMode] = useState<Stroke['mode']>('erase');
  const [brush, setBrush] = useState(30); // CSS pixels on screen
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  const draw = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const ctx = canvas.current?.getContext('2d');
      if (ctx) preview.render(ctx, bg);
    });
  };

  // Mask = AI mask + strokes; redrawn whenever the stroke list changes
  // (new stroke, undo, reset) or the background changes.
  useEffect(() => {
    preview.rebuild(strokes);
    draw();
  }, [preview, strokes, bg]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const point = (e: PtrEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, r };
  };

  const onDown = (e: PtrEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y, r } = point(e);
    const s: Stroke = { mode, size: brush / r.width, points: [x, y] };
    current.current = s;
    drawSegment(preview.mask[1], s, 0, 0);
    draw();
  };

  const onMove = (e: PtrEvent) => {
    const { x, y, r } = point(e);
    setCursor({ x: x * r.width, y: y * r.height });
    const s = current.current;
    if (!s) return;
    s.points.push(x, y);
    const n = s.points.length;
    drawSegment(preview.mask[1], s, n - 4, n - 2);
    draw();
  };

  const onUp = () => {
    if (current.current) onStrokes([...strokes, current.current]);
    current.current = null;
  };

  const toolBtn = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-all active:scale-95 ${
      active
        ? 'bg-[#6d46b8] text-white shadow-md shadow-[#6d46b8]/30'
        : 'bg-[#f1e9fb] text-[#4b2e83] hover:bg-[#e6daf7] dark:bg-[#261b3b] dark:text-[#d1b9f7]'
    }`;
  const smallBtn =
    'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-[#4b2e83] hover:bg-[#f1e9fb] disabled:opacity-40 disabled:hover:bg-transparent dark:text-[#d1b9f7] dark:hover:bg-[#261b3b]';

  return (
    <div>
      <p className="mb-3 text-center text-sm text-slate-600 dark:text-slate-300">{t.editHint}</p>
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
        <button type="button" aria-pressed={mode === 'erase'} className={toolBtn(mode === 'erase')} onClick={() => setMode('erase')}>
          <Eraser className="h-4 w-4" /> {t.erase}
        </button>
        <button type="button" aria-pressed={mode === 'restore'} className={toolBtn(mode === 'restore')} onClick={() => setMode('restore')}>
          <Brush className="h-4 w-4" /> {t.restore}
        </button>
        <label className="ml-1 flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          {t.brushSize}
          <input
            type="range"
            min={6}
            max={120}
            value={brush}
            onChange={(e) => setBrush(Number(e.target.value))}
            className="w-24 accent-[#6d46b8] sm:w-32"
          />
        </label>
      </div>
      <div
        className={`relative mx-auto w-full overflow-hidden rounded-2xl ${bg.kind === 'none' ? 'bgr-checkerboard' : ''}`}
        style={{
          aspectRatio: `${preview.width} / ${preview.height}`,
          maxWidth: `calc(65vh * ${preview.width / preview.height})`,
        }}
      >
        <canvas
          ref={canvas}
          width={preview.width}
          height={preview.height}
          aria-label={t.editorLabel}
          className="absolute inset-0 h-full w-full cursor-none touch-none"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={() => setCursor(null)}
        />
        {cursor && (
          <div
            className={`pointer-events-none absolute rounded-full border-2 ${mode === 'erase' ? 'border-red-500 bg-red-500/15' : 'border-emerald-500 bg-emerald-500/15'}`}
            style={{ width: brush, height: brush, left: cursor.x - brush / 2, top: cursor.y - brush / 2 }}
          />
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button type="button" className={smallBtn} disabled={!strokes.length} onClick={() => onStrokes(strokes.slice(0, -1))}>
          <Undo2 className="h-4 w-4" /> {t.undo}
        </button>
        <button type="button" className={smallBtn} disabled={!strokes.length} onClick={() => onStrokes([])}>
          <RotateCcw className="h-4 w-4" /> {t.resetEdits}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="inline-flex items-center gap-2 rounded-xl bg-[#6d46b8] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-[#6d46b8]/30 transition-all hover:bg-[#5a37a0] active:scale-95"
        >
          <Check className="h-4 w-4" /> {t.done}
        </button>
      </div>
    </div>
  );
}
