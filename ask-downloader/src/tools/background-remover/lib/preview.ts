// A screen-sized copy of the photo and mask, so brush strokes stay smooth even
// on 16MP photos. Downloads are made from the full-size image (compose.ts).
import { compose, drawStroke, makeCanvas, maskToCanvas, type Background, type Stroke } from './compose';

const MAX_SIDE = 1600;

export class Preview {
  readonly width: number;
  readonly height: number;
  private image: OffscreenCanvas;
  private base: OffscreenCanvas;
  readonly mask: [OffscreenCanvas, OffscreenCanvasRenderingContext2D];
  private scratch: [OffscreenCanvas, OffscreenCanvasRenderingContext2D];

  constructor(image: ImageBitmap, mask: Uint8ClampedArray) {
    const k = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
    this.width = Math.round(image.width * k);
    this.height = Math.round(image.height * k);
    const [img, ictx] = makeCanvas(this.width, this.height);
    ictx.imageSmoothingQuality = 'high';
    ictx.drawImage(image, 0, 0, this.width, this.height);
    this.image = img;
    this.base = maskToCanvas(mask, image.width, image.height, this.width, this.height);
    this.mask = makeCanvas(this.width, this.height);
    this.scratch = makeCanvas(this.width, this.height);
    this.rebuild([]);
  }

  /** AI mask plus the given strokes, from scratch (used after undo/reset). */
  rebuild(strokes: Stroke[]) {
    const ctx = this.mask[1];
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.drawImage(this.base, 0, 0);
    strokes.forEach((s) => drawStroke(ctx, s));
  }

  render(out: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D, bg: Background) {
    compose(out, this.image, this.mask[0], bg, this.scratch);
  }

  async toBlob(bg: Background): Promise<Blob> {
    const [c, ctx] = makeCanvas(this.width, this.height);
    this.render(ctx, bg);
    return c.convertToBlob({ type: 'image/png' });
  }
}
