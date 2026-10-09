// Main-thread side of the worker: one shared worker, promise-based calls.
import type { WorkerRequest, WorkerResponse } from './worker';

export interface Result {
  /** Alpha mask (0..255), one byte per pixel of the image. */
  mask: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Error with a code from src/i18n/en.ts `errors`. */
export class ToolError extends Error {}

let worker: Worker | null = null;
let ready: Promise<void> | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (r: Result) => void; reject: (e: Error) => void }>();
const progressListeners = new Set<(p: number) => void>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
    const msg = e.data;
    if (msg.type === 'progress') progressListeners.forEach((f) => f(msg.p));
    if (msg.type === 'result') {
      pending.get(msg.id)?.resolve(msg);
      pending.delete(msg.id);
    }
    if (msg.type === 'error' && msg.id !== undefined) {
      pending.get(msg.id)?.reject(new ToolError(msg.code));
      pending.delete(msg.id);
    }
  };
  return worker;
}

const send = (msg: WorkerRequest, transfer: Transferable[] = []) =>
  getWorker().postMessage(msg, transfer);

/** Starts the model download (once); progress goes 0..1. */
export function prepare(onProgress?: (p: number) => void): Promise<void> {
  if (onProgress) progressListeners.add(onProgress);
  ready ??= new Promise<void>((resolve, reject) => {
    const w = getWorker();
    const onMsg = (e: MessageEvent<WorkerResponse>) => {
      if (e.data.type === 'ready') resolve();
      else if (e.data.type === 'error' && e.data.id === undefined) reject(new ToolError(e.data.code));
      else return;
      w.removeEventListener('message', onMsg);
    };
    w.addEventListener('message', onMsg);
    send({ type: 'load' });
  });
  const p = ready.finally(() => onProgress && progressListeners.delete(onProgress));
  ready.catch(() => {
    ready = null; // a failed download can be retried
  });
  return p;
}

/** Makes the mask; the bitmap is handed to the worker (and closed there). */
export async function removeBackground(image: ImageBitmap): Promise<Result> {
  await prepare();
  const id = nextId++;
  return new Promise<Result>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    send({ type: 'run', id, image }, [image]);
  });
}
