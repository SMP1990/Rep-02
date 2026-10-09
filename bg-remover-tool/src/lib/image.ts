// Checks and opens the user's file before it goes to the model.
import { ToolError } from './engine';

export const MAX_FILE_MB = 25;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Larger photos are scaled down: the mask is made at 1024px anyway, and
 *  very big canvases crash phone browsers. Phones with little memory get a
 *  lower limit (deviceMemory is only reported by Chromium browsers). */
export function maxPixels(): number {
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return mem !== undefined && mem <= 4 ? 8_000_000 : 16_000_000;
}

export interface OpenedImage {
  bitmap: ImageBitmap;
  resized: boolean;
}

/** Scales with a canvas: works in every browser (Safari ignores the resize
 *  options of createImageBitmap). */
async function shrink(bitmap: ImageBitmap, w: number, h: number): Promise<ImageBitmap> {
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ToolError('out-of-memory');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);
  return createImageBitmap(canvas);
}

export async function openImage(file: File): Promise<OpenedImage> {
  if (!TYPES.includes(file.type)) throw new ToolError('unsupported-type');
  if (file.size > MAX_FILE_MB * 1024 * 1024) throw new ToolError('file-too-large');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new ToolError('decode-failed');
  }
  const limit = maxPixels();
  const pixels = bitmap.width * bitmap.height;
  if (pixels <= limit) return { bitmap, resized: false };
  const k = Math.sqrt(limit / pixels);
  try {
    return { bitmap: await shrink(bitmap, Math.round(bitmap.width * k), Math.round(bitmap.height * k)), resized: true };
  } finally {
    bitmap.close();
  }
}
