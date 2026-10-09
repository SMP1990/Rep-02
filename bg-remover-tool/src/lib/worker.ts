// Runs the model off the main thread so the page stays smooth while it works.
import { loadModel } from './model';
import { computeMask, cutout } from './removeBackground';

export type WorkerRequest =
  | { type: 'load' }
  | { type: 'run'; id: number; image: ImageBitmap };

export type WorkerResponse =
  | { type: 'progress'; p: number }
  | { type: 'ready' }
  | { type: 'result'; id: number; png: Blob; mask: Uint8ClampedArray; width: number; height: number }
  | { type: 'error'; id?: number; code: string };

const post = (msg: WorkerResponse, transfer: Transferable[] = []) =>
  (self as unknown as Worker).postMessage(msg, transfer);

function errorCode(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg === 'model-download-failed') return msg;
  if (/memory|allocation|RangeError/i.test(msg)) return 'out-of-memory';
  return 'processing-failed';
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  if (msg.type === 'load') {
    try {
      await loadModel((p) => post({ type: 'progress', p }));
      post({ type: 'ready' });
    } catch (err) {
      post({ type: 'error', code: errorCode(err) });
    }
    return;
  }
  try {
    const mask = await computeMask(msg.image);
    const png = await cutout(msg.image, mask);
    msg.image.close();
    post(
      { type: 'result', id: msg.id, png, mask: mask.data, width: mask.width, height: mask.height },
      [mask.data.buffer],
    );
  } catch (err) {
    post({ type: 'error', id: msg.id, code: errorCode(err) });
  }
};
