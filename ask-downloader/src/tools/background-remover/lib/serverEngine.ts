// The server does the work (server/bgRemover.ts): no model download for the
// visitor and the same speed on every phone. If the server cannot (package
// missing on the host, busy, offline), the caller falls back to the model in
// the browser (engine.ts) for that photo.
import { makeCanvas } from './compose';
import type { ModelId } from './models';

interface Status {
  available: boolean;
  /** Square size each model works at on the server. */
  sizes?: Record<ModelId, number>;
}

let status: Promise<Status> | null = null;
function getStatus(): Promise<Status> {
  status ??= fetch('/api/tools/remove-bg/status', { signal: AbortSignal.timeout(5000) })
    .then((r) => (r.ok ? r.json() : { available: false }))
    .catch(() => ({ available: false }));
  return status;
}

/** Whether the server can remove backgrounds (asked once per page). */
export const serverAvailable = () => getStatus().then((s) => s.available && !!s.sizes);

/** Mask (one byte per pixel, image size) from the server, or null when the
 *  server cannot do it right now. */
export async function serverMask(image: ImageBitmap, model: ModelId): Promise<Uint8ClampedArray | null> {
  const { available, sizes } = await getStatus();
  if (!available || !sizes) return null;
  const S = sizes[model];
  const [square, sctx] = makeCanvas(S, S);
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(image, 0, 0, S, S);
  const jpeg = await square.convertToBlob({ type: 'image/jpeg', quality: 0.92 });

  let small: Uint8Array;
  try {
    const res = await fetch(`/api/tools/remove-bg?model=${model}`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg' },
      body: jpeg,
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) return null;
    small = new Uint8Array(await res.arrayBuffer());
  } catch {
    return null; // offline, timeout: the browser takes over
  }
  if (small.length !== S * S) return null;

  // Scale the mask back to the photo's own size.
  const gray = new ImageData(S, S);
  for (let i = 0; i < small.length; i++) {
    gray.data[i * 4] = gray.data[i * 4 + 1] = gray.data[i * 4 + 2] = small[i];
    gray.data[i * 4 + 3] = 255;
  }
  sctx.putImageData(gray, 0, 0);
  const [, bctx] = makeCanvas(image.width, image.height);
  bctx.imageSmoothingQuality = 'high';
  bctx.drawImage(square, 0, 0, image.width, image.height);
  const px = bctx.getImageData(0, 0, image.width, image.height).data;
  const mask = new Uint8ClampedArray(image.width * image.height);
  for (let i = 0; i < mask.length; i++) mask[i] = px[i * 4];
  return mask;
}
