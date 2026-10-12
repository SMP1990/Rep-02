// One image: decode (orientation applied, metadata such as GPS dropped),
// resize, encode. Runs in the worker. Measured choices (see TOOLS-GUIDE):
// WebP = the browser's own encoder (as small as libwebp, nothing to load);
// JPEG = MozJPEG; PNG = OxiPNG, lossless. No AVIF: 14-31 s per photo.
import type { Done, ErrorCode, Format, Settings } from './types';
import { mozjpeg, oxipng, webp } from './codecs';
import { MAX_MEGAPIXELS } from './limits';

export class Fail extends Error {
  constructor(public code: ErrorCode) { super(code); }
}

const outputFormat = (format: Format, type: string): Exclude<Format, 'auto'> =>
  format !== 'auto' ? format : type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpeg';

async function draw(file: Blob, maxSide: number, fill: boolean, scale = 1) {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Fail('unsupported'); // e.g. HEIC outside Safari, or a broken file
  }
  if ((bmp.width * bmp.height) / 1e6 > MAX_MEGAPIXELS) { bmp.close(); throw new Fail('tooLarge'); }
  const fit = maxSide && Math.max(bmp.width, bmp.height) > maxSide ? maxSide / Math.max(bmp.width, bmp.height) : 1;
  const w = Math.max(1, Math.round(bmp.width * fit * scale));
  const h = Math.max(1, Math.round(bmp.height * fit * scale));
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d')!;
  if (fill) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); } // JPEG has no transparency
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, w, h);
  const resized = w !== bmp.width || h !== bmp.height;
  bmp.close();
  return { canvas, ctx, w, h, resized };
}

type Drawn = Awaited<ReturnType<typeof draw>>;

async function encodeOnce({ canvas, ctx, w, h }: Pick<Drawn, 'canvas' | 'ctx' | 'w' | 'h'>, fmt: Exclude<Format, 'auto'>, quality: number): Promise<Blob> {
  if (fmt === 'png') {
    const png = await (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer();
    try {
      return new Blob([(await oxipng())(png)], { type: 'image/png' });
    } catch {
      return new Blob([png], { type: 'image/png' });
    }
  }
  if (fmt === 'webp') {
    const own = await canvas.convertToBlob({ type: 'image/webp', quality: quality / 100 });
    if (own.type === 'image/webp') return own;
    const enc = await webp(); // this browser cannot make WebP itself
    return new Blob([await enc(ctx.getImageData(0, 0, w, h), quality)], { type: 'image/webp' });
  }
  try {
    const enc = await mozjpeg();
    return new Blob([await enc(ctx.getImageData(0, 0, w, h), quality)], { type: 'image/jpeg' });
  } catch {
    return canvas.convertToBlob({ type: 'image/jpeg', quality: quality / 100 });
  }
}

/** Below this quality JPEG/WebP show blocks; shrinking the image looks better. */
const MIN_TARGET_QUALITY = 40;

/**
 * Fits targetKB: the highest quality (>= 40) that fits, found by halving the
 * range; when even quality 40 is too big the image is made 20% smaller and
 * tried again. For JPEG the search uses the browser's fast encoder and only
 * the final file is made with MozJPEG (smaller still), so it stays quick.
 */
async function toTarget(file: Blob, s: Settings, fmt: 'jpeg' | 'webp'): Promise<{ blob: Blob; drawn: Drawn; quality: number }> {
  const limit = s.targetKB * 1024;
  const probe = (d: Drawn, q: number) =>
    fmt === 'jpeg' ? d.canvas.convertToBlob({ type: 'image/jpeg', quality: q / 100 }) : encodeOnce(d, fmt, q);
  for (let scale = 1; ; scale *= 0.8) {
    const drawn = await draw(file, s.maxSide, fmt === 'jpeg', scale);
    const last = scale < 0.25; // stop shrinking at ~1/4 of the size
    const floor = last ? 10 : MIN_TARGET_QUALITY;
    let lo = floor, hi = Math.min(95, s.quality), fit = -1;
    if ((await probe(drawn, hi)).size <= limit) fit = hi;
    else {
      while (hi - lo > 2) {
        const q = Math.round((lo + hi) / 2);
        if ((await probe(drawn, q)).size <= limit) { fit = q; lo = q; } else hi = q;
      }
      if (fit < 0 && (await probe(drawn, floor)).size <= limit) fit = floor;
    }
    if (fit >= 0 || last) {
      const quality = Math.max(fit, floor);
      return { blob: await encodeOnce(drawn, fmt, quality), drawn, quality };
    }
  }
}

export async function compress(file: File, s: Settings): Promise<Done> {
  const fmt = outputFormat(s.format, file.type);
  let blob: Blob, drawn: Drawn, quality = s.quality;
  if (s.targetKB > 0 && fmt !== 'png') {
    ({ blob, drawn, quality } = await toTarget(file, s, fmt));
  } else {
    drawn = await draw(file, s.maxSide, fmt === 'jpeg');
    blob = await encodeOnce(drawn, fmt, s.quality);
  }
  // Never hand back a bigger file of the same format and pixel size: the
  // original is then the better result (it also meets any size target ours meets).
  if (blob.size >= file.size && outputFormat('auto', file.type) === fmt && !drawn.resized) {
    return { blob: file, width: drawn.w, height: drawn.h, quality, kept: true };
  }
  return { blob, width: drawn.w, height: drawn.h, quality, kept: false };
}
