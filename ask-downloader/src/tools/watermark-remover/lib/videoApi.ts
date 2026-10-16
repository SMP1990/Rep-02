// Video watermark removal, browser side (server/wmVideo.ts does the work).
// The file goes up in 8 MB pieces; a failed piece is retried.

export type Box = { x: number; y: number; w: number; h: number }; // video pixels
export type Status = { state: 'queued' | 'working' | 'done' | 'failed'; progress: number; position: number; error?: string };

const API = '/api/tools/watermark/video';

async function call(url: string, init?: RequestInit) {
  let r: Response;
  try { r = await fetch(url, init); } catch { throw new Error('network'); }
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body?.error || 'failed');
  return body;
}

export async function uploadVideo(file: File, boxes: Box[], onProgress: (p: number) => void, signal: AbortSignal): Promise<string> {
  const q = boxes.map((b) => [b.x, b.y, b.w, b.h].map(Math.round).join(',')).join(';');
  const { id, chunk } = await call(`${API}?boxes=${q}&size=${file.size}&name=${encodeURIComponent(file.name)}`, { method: 'POST', signal });
  for (let off = 0; off < file.size; off += chunk) {
    for (let tries = 0; ; tries++) {
      try {
        await call(`${API}/${id}?offset=${off}`, {
          method: 'PUT', headers: { 'content-type': 'application/octet-stream' }, body: file.slice(off, off + chunk), signal,
        });
        break;
      } catch (e) {
        if (signal.aborted || tries >= 4) throw e;
        await new Promise((z) => setTimeout(z, 1500 * (tries + 1)));
      }
    }
    onProgress(Math.min(1, (off + chunk) / file.size));
  }
  await call(`${API}/${id}/start`, { method: 'POST', signal });
  return id;
}

export const videoStatus = (id: string): Promise<Status> => call(`${API}/${id}`);
export const cancelVideo = (id: string) => fetch(`${API}/${id}`, { method: 'DELETE' }).catch(() => {});
export const videoFileUrl = (id: string) => `${API}/${id}/file`;
