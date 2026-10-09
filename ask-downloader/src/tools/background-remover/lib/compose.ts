// Mask edits and the final picture. Brush strokes are stored in image-relative
// units, so the same strokes can be drawn on the small preview while editing
// and again on the full-size image for the download.

export type Background =
  | { kind: 'none' }
  | { kind: 'color'; color: string }
  | { kind: 'image'; image: ImageBitmap };

export interface Stroke {
  mode: 'erase' | 'restore';
  /** Brush diameter as a share of the image width. */
  size: number;
  /** x, y pairs as shares of the image width / height. */
  points: number[];
}

type Canvas = OffscreenCanvas;
type Ctx = OffscreenCanvasRenderingContext2D;

export function makeCanvas(w: number, h: number): [Canvas, Ctx] {
  const c = new OffscreenCanvas(w, h);
  return [c, c.getContext('2d')!];
}

/** The AI mask as a canvas whose alpha is the mask (scaled to w x h). */
export function maskToCanvas(mask: Uint8ClampedArray, mw: number, mh: number, w = mw, h = mh): Canvas {
  const [full, fctx] = makeCanvas(mw, mh);
  const img = new ImageData(mw, mh);
  for (let i = 0; i < mask.length; i++) {
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = 255;
    img.data[i * 4 + 3] = mask[i];
  }
  fctx.putImageData(img, 0, 0);
  if (w === mw && h === mh) return full;
  const [small, sctx] = makeCanvas(w, h);
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(full, 0, 0, w, h);
  return small;
}

/** Draws points from..to (indexes into s.points); a dot when from === to. */
export function drawSegment(ctx: Ctx, s: Stroke, from: number, to: number) {
  const { width: w, height: h } = ctx.canvas;
  const p = s.points;
  ctx.save();
  ctx.globalCompositeOperation = s.mode === 'erase' ? 'destination-out' : 'source-over';
  ctx.strokeStyle = ctx.fillStyle = '#fff';
  ctx.lineWidth = s.size * w;
  ctx.lineCap = ctx.lineJoin = 'round';
  if (from === to) {
    ctx.beginPath();
    ctx.arc(p[from] * w, p[from + 1] * h, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(p[from] * w, p[from + 1] * h);
    for (let i = from + 2; i <= to; i += 2) ctx.lineTo(p[i] * w, p[i + 1] * h);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawStroke(ctx: Ctx, s: Stroke) {
  drawSegment(ctx, s, 0, s.points.length - 2);
}

/** Background, then the photo cut out by the mask, into out (any size). */
export function compose(
  out: Ctx | CanvasRenderingContext2D,
  image: CanvasImageSource,
  mask: Canvas,
  bg: Background,
  scratch: [Canvas, Ctx],
) {
  const { width: w, height: h } = out.canvas;
  const [cut, cctx] = scratch;
  cctx.clearRect(0, 0, w, h);
  cctx.globalCompositeOperation = 'source-over';
  cctx.drawImage(image, 0, 0, w, h);
  cctx.globalCompositeOperation = 'destination-in';
  cctx.drawImage(mask, 0, 0, w, h);
  cctx.globalCompositeOperation = 'source-over';

  out.clearRect(0, 0, w, h);
  if (bg.kind === 'color') {
    out.fillStyle = bg.color;
    out.fillRect(0, 0, w, h);
  } else if (bg.kind === 'image') {
    // cover: fill the whole frame, crop what sticks out
    const k = Math.max(w / bg.image.width, h / bg.image.height);
    const bw = bg.image.width * k;
    const bh = bg.image.height * k;
    out.drawImage(bg.image, (w - bw) / 2, (h - bh) / 2, bw, bh);
  }
  out.drawImage(cut, 0, 0);
}

/** Full-size picture for download: AI mask + all strokes + background. */
export async function exportImage(
  image: ImageBitmap,
  mask: Uint8ClampedArray,
  strokes: Stroke[],
  bg: Background,
  type: 'image/png' | 'image/jpeg',
): Promise<Blob> {
  const { width: w, height: h } = image;
  const m = maskToCanvas(mask, w, h);
  const mctx = m.getContext('2d')!;
  strokes.forEach((s) => drawStroke(mctx, s));
  const [out, octx] = makeCanvas(w, h);
  // JPG has no transparency: a transparent result gets a white background.
  const back: Background = type === 'image/jpeg' && bg.kind === 'none' ? { kind: 'color', color: '#ffffff' } : bg;
  compose(octx, image, m, back, makeCanvas(w, h));
  return out.convertToBlob({ type, quality: 0.92 });
}
