// Shows the photo with a paint layer on top: the visitor paints the
// watermark (red, half transparent). Also "hold to see the original".
import { forwardRef, useEffect, useImperativeHandle, useRef, type PointerEvent } from 'react';

export type PainterHandle = { mask: HTMLCanvasElement | null; work: HTMLCanvasElement | null; undo: () => void; clear: () => void; refresh: () => void };

type Props = { work: HTMLCanvasElement; original: HTMLCanvasElement; brush: number; showOriginal: boolean; onPaint: () => void };

const MASK_SIDE = 2048; // the paint layer's resolution: enough for any brush

export default forwardRef<PainterHandle, Props>(function MaskPainter({ work, original, brush, showOriginal, onPaint }, ref) {
  const view = useRef<HTMLCanvasElement>(null);
  const mask = useRef<HTMLCanvasElement>(null);
  const history = useRef<ImageData[]>([]);
  const last = useRef<{ x: number; y: number } | null>(null);

  const draw = () => {
    const v = view.current;
    if (!v) return;
    v.getContext('2d')!.drawImage(showOriginal ? original : work, 0, 0, v.width, v.height);
  };

  // Sizes follow the photo; the view is at most 2048 px wide (CSS scales it).
  useEffect(() => {
    const k = Math.min(1, MASK_SIDE / Math.max(work.width, work.height));
    for (const c of [view.current, mask.current]) {
      if (!c) continue;
      c.width = Math.round(work.width * k);
      c.height = Math.round(work.height * k);
    }
    history.current = [];
    draw();
  }, [work]);
  useEffect(draw, [showOriginal]);

  useImperativeHandle(ref, () => ({
    mask: mask.current,
    work,
    undo() {
      const m = mask.current, prev = history.current.pop();
      if (m && prev) m.getContext('2d')!.putImageData(prev, 0, 0);
      onPaint();
    },
    clear() {
      const m = mask.current;
      if (m) m.getContext('2d')!.clearRect(0, 0, m.width, m.height);
      history.current = [];
      onPaint();
    },
    refresh: draw,
  }));

  const point = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const k = e.currentTarget.width / r.width;
    return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k, k };
  };
  const stroke = (from: { x: number; y: number }, to: { x: number; y: number }, k: number) => {
    const c = mask.current!.getContext('2d')!;
    c.strokeStyle = c.fillStyle = 'rgb(239, 68, 68)';
    c.lineCap = c.lineJoin = 'round';
    c.lineWidth = brush * k;
    c.beginPath();
    c.moveTo(from.x, from.y);
    c.lineTo(to.x, to.y);
    c.stroke();
  };

  return (
    <div className="relative mx-auto w-fit max-w-full select-none">
      <canvas ref={view} className="block h-auto max-h-[70vh] w-auto max-w-full rounded-2xl" />
      <canvas
        ref={mask}
        className={`absolute inset-0 h-full w-full cursor-crosshair touch-none rounded-2xl opacity-50 ${showOriginal ? 'invisible' : ''}`}
        onPointerDown={(e) => {
          try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
          const m = mask.current!;
          history.current.push(m.getContext('2d')!.getImageData(0, 0, m.width, m.height));
          if (history.current.length > 8) history.current.shift();
          const p = point(e);
          last.current = p;
          stroke(p, p, p.k);
        }}
        onPointerMove={(e) => {
          if (!last.current) return;
          const p = point(e);
          stroke(last.current, p, p.k);
          last.current = p;
        }}
        onPointerUp={() => { if (last.current) onPaint(); last.current = null; }}
        onPointerCancel={() => { last.current = null; }}
      />
    </div>
  );
});
