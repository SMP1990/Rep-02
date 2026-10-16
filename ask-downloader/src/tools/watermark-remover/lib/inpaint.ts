// Photo watermark removal, browser side. Only the area around the marked
// pixels (max ~1 MP) goes to the server (server/wmRoutes.ts); the cleaned
// crop comes back and is pasted over the marked pixels only, so the rest of
// the photo keeps its original pixels at full resolution, whatever its size.

const MAX_CROP = 1_000_000;

export type ApiError = 'busy' | 'unavailable' | 'failed' | 'network';

const canvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

/** Draws the mask region grown by r pixels (8 shifted copies = cheap dilation). */
function grown(ctx: CanvasRenderingContext2D, mask: HTMLCanvasElement, sx: number, sy: number, sw: number, sh: number, w: number, h: number, r: number) {
  for (const [dx, dy] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r], [r, -r], [-r, r]]) ctx.drawImage(mask, sx, sy, sw, sh, dx, dy, w, h);
}

/** Bounding box of painted pixels in the mask canvas, or null. */
function bbox(mask: HTMLCanvasElement) {
  const { width: w, height: h } = mask;
  const a = mask.getContext('2d')!.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (a[(y * w + x) * 4 + 3] > 0) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x0, y0, x1: x1 + 1, y1: y1 + 1 };
}

const toBlob = (c: HTMLCanvasElement, type: string, q?: number) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), type, q));

async function gzip(bytes: Uint8Array): Promise<Uint8Array> {
  const s = new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

/** One request; resolves the cleaned crop, retrying while the server is busy. */
async function send(body: Blob, onWait: () => void): Promise<Blob> {
  for (let attempt = 0; ; attempt++) {
    let r: Response;
    try {
      r = await fetch('/api/tools/watermark/image', { method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body });
    } catch {
      throw new Error('network');
    }
    if (r.ok) return r.blob();
    const err = (await r.json().catch(() => ({})))?.error;
    if (r.status === 503 && err === 'busy' && attempt < 60) {
      onWait();
      await new Promise((z) => setTimeout(z, 3000));
      continue;
    }
    throw new Error(err === 'unavailable' ? 'unavailable' : 'failed');
  }
}

/**
 * Cleans the marked area of `work` (full-size photo canvas) in place.
 * `mask` is the painting canvas (any scale of the photo, alpha = marked).
 * Returns false when nothing is marked.
 */
export async function inpaint(work: HTMLCanvasElement, mask: HTMLCanvasElement, onWait: () => void): Promise<boolean> {
  const box = bbox(mask);
  if (!box) return false;
  const k = work.width / mask.width; // mask -> photo pixels
  // Some context around the marks helps the model, but too much makes the
  // crop bigger than ~1 MP and it gets scaled down: 25%, 32..256 photo px.
  const mw = box.x1 - box.x0, mh = box.y1 - box.y0;
  const pad = Math.min(256, Math.max(32, Math.max(mw, mh) * k * 0.25)) / k;
  const mx0 = Math.max(0, Math.floor(box.x0 - pad)), my0 = Math.max(0, Math.floor(box.y0 - pad));
  const mx1 = Math.min(mask.width, Math.ceil(box.x1 + pad)), my1 = Math.min(mask.height, Math.ceil(box.y1 + pad));
  // Same area in photo pixels
  const px = Math.floor(mx0 * k), py = Math.floor(my0 * k);
  const pw = Math.min(work.width - px, Math.ceil((mx1 - mx0) * k)), ph = Math.min(work.height - py, Math.ceil((my1 - my0) * k));
  const s = Math.min(1, Math.sqrt(MAX_CROP / (pw * ph)));
  const cw = Math.max(8, Math.round(pw * s)), ch = Math.max(8, Math.round(ph * s));

  const crop = canvas(cw, ch);
  const cc = crop.getContext('2d')!;
  cc.imageSmoothingQuality = 'high';
  cc.drawImage(work, px, py, pw, ph, 0, 0, cw, ch);
  const cmask = canvas(cw, ch);
  const mc = cmask.getContext('2d')!;
  grown(mc, mask, mx0, my0, mx1 - mx0, my1 - my0, cw, ch, 2); // catch soft watermark edges
  const a = mc.getImageData(0, 0, cw, ch).data;
  const bytes = new Uint8Array(cw * ch);
  for (let i = 0; i < bytes.length; i++) bytes[i] = a[i * 4 + 3] > 20 ? 255 : 0;

  const jpeg = new Uint8Array(await (await toBlob(crop, 'image/jpeg', 0.92)).arrayBuffer());
  const head = new Uint8Array(4);
  new DataView(head.buffer).setUint32(0, jpeg.length);
  const result = await send(new Blob([head, jpeg, (await gzip(bytes)) as BlobPart]), onWait);

  // Paste back: the cleaned crop, kept only where marked (soft edge).
  const img = await createImageBitmap(result);
  const patch = canvas(pw, ph);
  const pc = patch.getContext('2d')!;
  pc.imageSmoothingQuality = 'high';
  pc.drawImage(img, 0, 0, pw, ph);
  img.close();
  // grow on its own canvas first: 9 draws with destination-in would shrink it
  const r = Math.max(2, Math.round(2 * pw / cw));
  const soft = canvas(pw, ph);
  grown(soft.getContext('2d')!, mask, mx0, my0, mx1 - mx0, my1 - my0, pw, ph, r);
  pc.globalCompositeOperation = 'destination-in';
  pc.filter = `blur(${Math.round(r / 2)}px)`; // ignored where unsupported: hard edge
  pc.drawImage(soft, 0, 0);
  work.getContext('2d')!.drawImage(patch, px, py);
  return true;
}

export { toBlob };
