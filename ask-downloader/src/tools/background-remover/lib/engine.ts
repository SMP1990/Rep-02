// Main-thread side of the worker: one shared worker, promise-based calls.
import createWorker from './createWorker';
import type { ModelId } from './models';
import { testLog } from './testMode';
import type { WorkerRequest, WorkerResponse } from './worker';

export interface Result {
  /** Alpha mask (0..255), one byte per pixel of the image. */
  mask: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Error with a code from src/i18n/en.ts `errors`. */
export class ToolError extends Error {}

interface Load {
  promise: Promise<void>;
  reject: (e: Error) => void;
  listeners: Set<(p: number) => void>;
}

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (r: Result) => void; reject: (e: Error) => void }>();
const loads = new Map<ModelId, Load>();

/** The worker itself broke (script failed to load or crashed): fail
 *  everything waiting on it and start a fresh worker on the next try. */
function crash(ev: Event) {
  console.error('background remover worker failed', (ev as ErrorEvent).message ?? ev);
  worker?.terminate();
  worker = null;
  const err = new ToolError('processing-failed');
  loads.forEach((l) => l.reject(err));
  loads.clear(); // a new worker has no model loaded
  pending.forEach((p) => p.reject(err));
  pending.clear();
}

function getWorker(): Worker {
  if (worker) return worker;
  worker = createWorker();
  worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
    const msg = e.data;
    if (msg.type === 'info' && msg.text) testLog(msg.text);
    if (msg.type === 'progress') loads.get(msg.model)?.listeners.forEach((f) => f(msg.p));
    if (msg.type === 'result') {
      pending.get(msg.id)?.resolve(msg);
      pending.delete(msg.id);
    }
    if (msg.type === 'error' && msg.id !== undefined) {
      pending.get(msg.id)?.reject(new ToolError(msg.code));
      pending.delete(msg.id);
    }
  };
  worker.onerror = crash;
  worker.onmessageerror = crash;
  return worker;
}

const send = (msg: WorkerRequest, transfer: Transferable[] = []) =>
  getWorker().postMessage(msg, transfer);

/** Starts a model download (once per model); progress goes 0..1. */
export function prepare(model: ModelId, onProgress?: (p: number) => void): Promise<void> {
  let load = loads.get(model);
  if (!load) {
    const listeners = new Set<(p: number) => void>();
    let reject!: (e: Error) => void;
    const promise = new Promise<void>((res, rej) => {
      reject = rej;
      const w = getWorker();
      const onMsg = (e: MessageEvent<WorkerResponse>) => {
        const m = e.data;
        if (m.type === 'ready' && m.model === model) res();
        else if (m.type === 'error' && m.id === undefined && m.model === model) rej(new ToolError(m.code));
        else return;
        w.removeEventListener('message', onMsg);
      };
      w.addEventListener('message', onMsg);
      send({ type: 'load', model });
    });
    load = { promise, reject, listeners };
    loads.set(model, load);
    const mine = load;
    promise.catch(() => {
      if (loads.get(model) === mine) loads.delete(model); // a failed download can be retried
    });
  }
  if (!onProgress) return load.promise;
  load.listeners.add(onProgress);
  const listeners = load.listeners;
  return load.promise.finally(() => listeners.delete(onProgress));
}

/** Makes the mask; the bitmap is handed to the worker (and closed there). */
export async function removeBackground(image: ImageBitmap, model: ModelId): Promise<Result> {
  await prepare(model);
  const id = nextId++;
  return new Promise<Result>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    send({ type: 'run', id, model, image }, [image]);
  });
}
