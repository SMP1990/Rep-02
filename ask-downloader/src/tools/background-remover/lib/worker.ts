// Runs the models off the main thread so the page stays smooth while they work.
import { loadInfo, loadModel } from './model';
import type { ModelId } from './models';
import { computeMask, lastRun } from './removeBackground';

export type WorkerRequest =
  | { type: 'load'; model: ModelId }
  | { type: 'run'; id: number; model: ModelId; image: ImageBitmap };

export type WorkerResponse =
  | { type: 'progress'; model: ModelId; p: number }
  | { type: 'ready'; model: ModelId }
  | { type: 'result'; id: number; mask: Uint8ClampedArray; width: number; height: number }
  | { type: 'error'; id?: number; model?: ModelId; code: string }
  | { type: 'info'; text: string };

const post = (msg: WorkerResponse, transfer: Transferable[] = []) =>
  (self as unknown as Worker).postMessage(msg, transfer);

function errorCode(err: unknown): string {
  console.error('background remover:', err); // the real reason, for debugging
  const msg = err instanceof Error ? err.message : String(err);
  if (msg === 'model-download-failed') return msg;
  if (/memory|alloc|RangeError/i.test(msg)) return 'out-of-memory'; // incl. std::bad_alloc
  return 'processing-failed';
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  if (msg.type === 'load') {
    try {
      await loadModel(msg.model, (p) => post({ type: 'progress', model: msg.model, p }));
      post({ type: 'info', text: loadInfo.get(msg.model) ?? '' });
      post({ type: 'ready', model: msg.model });
    } catch (err) {
      post({ type: 'error', model: msg.model, code: errorCode(err) });
    }
    return;
  }
  try {
    const mask = await computeMask(msg.image, msg.model);
    msg.image.close();
    post({ type: 'info', text: lastRun });
    post(
      { type: 'result', id: msg.id, mask: mask.data, width: mask.width, height: mask.height },
      [mask.data.buffer],
    );
  } catch (err) {
    post({ type: 'error', id: msg.id, code: errorCode(err) });
  }
};
