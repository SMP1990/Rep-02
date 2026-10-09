// Checks and opens the user's file before it goes to the model.
import { ToolError } from './engine';

export const MAX_FILE_MB = 25;
// Larger photos are scaled down: the mask is made at 1024px anyway, and very
// big canvases crash phone browsers.
const MAX_PIXELS = 16_000_000;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface OpenedImage {
  bitmap: ImageBitmap;
  resized: boolean;
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
  const pixels = bitmap.width * bitmap.height;
  if (pixels <= MAX_PIXELS) return { bitmap, resized: false };
  const k = Math.sqrt(MAX_PIXELS / pixels);
  const small = await createImageBitmap(bitmap, {
    resizeWidth: Math.round(bitmap.width * k),
    resizeHeight: Math.round(bitmap.height * k),
    resizeQuality: 'high',
  });
  bitmap.close();
  return { bitmap: small, resized: true };
}
