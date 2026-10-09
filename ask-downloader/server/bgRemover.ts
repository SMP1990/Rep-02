/**
 * Background Remover on the server, so visitors do not download the ~50MB
 * model and slow phones get the same speed as computers.
 *
 * Kept light on purpose, because the same server runs the downloader:
 * - The model runs in a worker thread (bgWorker.ts): the site keeps
 *   answering while a photo is processed. One CPU thread, one photo at a
 *   time, a short queue, and "busy" when it is full.
 * - onnxruntime-node is an optional dependency. If the host cannot install
 *   or load it, the page runs the model in the browser instead.
 * - The model files come from GitHub once, into the data folder (they are
 *   not in the deploy zip). The worker, with the models in memory, is only
 *   started when someone uses the tool and is stopped after 10 idle minutes.
 * - Photos are never written to disk or logged.
 *
 * The browser sends the photo already resized to the model's square input
 * (JPEG) and gets back the mask at that size (one byte per pixel, gzip).
 */
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { createRequire } from 'module';
import { Worker } from 'worker_threads';
import { dataFolder } from './store.ts';

export type BgModelId = 'fast' | 'hd';

interface Spec {
  dir: string;
  file: string;
  commit: string;
  parts: number;
  bytes: number;
  size: number;
  mean: [number, number, number];
  std: [number, number, number];
}

// Same files as the browser version (src/tools/background-remover/lib/models.ts).
// The fast model runs at 768 here: 2.7x less work than 1024 on the plan's
// single CPU core, close in quality (measured on 19 test photos).
const MODELS: Record<BgModelId, Spec> = {
  fast: {
    dir: 'model', file: 'isnet', commit: 'd472b3d346aca52327a09c004dd51730bd24beca',
    parts: 3, bytes: 46451987, size: 768, mean: [0.5, 0.5, 0.5], std: [1, 1, 1],
  },
  hd: {
    dir: 'model-hd', file: 'u2net', commit: 'bfcf3183ab745592f189fcab590d6d6b25f90f60',
    parts: 3, bytes: 44269182, size: 320, mean: [0.485, 0.456, 0.406], std: [0.229, 0.224, 0.225],
  },
};

export const bgSizes = () => ({ fast: MODELS.fast.size, hd: MODELS.hd.size });
export const isBgModel = (x: unknown): x is BgModelId => x === 'fast' || x === 'hd';

const MAX_WAITING = 3;
const IDLE_MS = 10 * 60 * 1000;

/** dist/bg-worker.cjs next to the bundled server (dist/server.cjs). */
const WORKER_FILE = path.join(typeof __dirname !== 'undefined' ? __dirname : process.cwd(), 'bg-worker.cjs');

let usable: boolean | null = null; // false once the package failed to load
export function bgAvailable(): boolean {
  if (usable === null) {
    try {
      createRequire(WORKER_FILE).resolve('onnxruntime-node');
      usable = fs.existsSync(WORKER_FILE);
    } catch {
      usable = false;
    }
    if (!usable) console.warn('[bg-remover] server mode off (no onnxruntime-node or worker file), the page uses the browser');
  }
  return usable;
}

function modelPath(m: Spec): string {
  return path.join(dataFolder(), 'bg-models', `${m.file}-${m.commit.slice(0, 8)}.onnx`);
}

/** Downloads the model parts once (GitHub raw, then jsDelivr) and joins them. */
const fileJobs = new Map<BgModelId, Promise<string>>();
function ensureFile(id: BgModelId): Promise<string> {
  let job = fileJobs.get(id);
  if (job) return job;
  const m = MODELS[id];
  job = (async () => {
    const out = modelPath(m);
    if (fs.existsSync(out) && fs.statSync(out).size === m.bytes) return out;
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const hosts = [
      `https://raw.githubusercontent.com/SMP1990/Rep-02/${m.commit}/bg-remover-tool/${m.dir}/`,
      `https://cdn.jsdelivr.net/gh/SMP1990/Rep-02@${m.commit}/bg-remover-tool/${m.dir}/`,
    ];
    const parts: Buffer[] = [];
    for (let n = 0; n < m.parts; n++) {
      let got: Buffer | null = null;
      for (const host of hosts) {
        try {
          const res = await fetch(`${host}${m.file}.part${n}`, { signal: AbortSignal.timeout(120_000) });
          if (res.ok) {
            got = Buffer.from(await res.arrayBuffer());
            break;
          }
        } catch {
          // next host
        }
      }
      if (!got) throw new Error(`model part ${n} could not be downloaded`);
      parts.push(got);
    }
    const all = Buffer.concat(parts);
    if (all.length !== m.bytes) throw new Error('model download incomplete');
    fs.writeFileSync(out + '.tmp', all);
    fs.renameSync(out + '.tmp', out);
    console.log(`[bg-remover] ${id} model saved (${Math.round(all.length / 1e6)} MB)`);
    return out;
  })();
  fileJobs.set(id, job);
  job.catch(() => fileJobs.delete(id));
  return job;
}

/** Fetch the model files a minute after start, so the first visitor does
 *  not wait for them. Files only: nothing is loaded into memory. */
export function prefetchBgModels() {
  setTimeout(async () => {
    if (!bgAvailable()) return;
    for (const id of ['fast', 'hd'] as BgModelId[]) {
      await ensureFile(id).catch((e) => console.warn('[bg-remover]', e.message));
    }
  }, 60_000).unref();
}

// ---- the worker thread -------------------------------------------------
let worker: Worker | null = null;
let idleTimer: NodeJS.Timeout | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (b: Uint8Array) => void; reject: (e: Error) => void }>();

function getWorker(): Worker {
  if (worker) return worker;
  const w = new Worker(WORKER_FILE);
  w.on('message', (msg: { id: number; mask?: Uint8Array; error?: string; message?: string }) => {
    const p = pending.get(msg.id);
    pending.delete(msg.id);
    if (!p) return;
    if (msg.mask) return p.resolve(msg.mask);
    if (msg.error === 'failed' && /onnxruntime|\.so|GLIBC|Cannot find module/i.test(msg.message || '')) {
      usable = false; // the package cannot load on this host: browser from now on
      console.warn('[bg-remover] server mode off:', msg.message);
    } else if (msg.message) {
      console.error('[bg-remover] failed:', msg.message);
    }
    p.reject(msg.error === 'bad-image' ? new BgBadInput('bad image') : new Error(msg.error));
  });
  const fail = (err: Error) => {
    console.error('[bg-remover] worker stopped:', err.message);
    pending.forEach((p) => p.reject(new Error('worker stopped')));
    pending.clear();
    if (worker === w) worker = null;
  };
  w.on('error', fail);
  w.on('exit', (code) => code !== 0 && fail(new Error(`exit ${code}`)));
  worker = w;
  return w;
}

/** Stop the worker (and free the models' memory) after 10 idle minutes. */
function touchIdle() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (pending.size) return touchIdle();
    const w = worker;
    worker = null;
    w?.terminate().catch(() => {});
  }, IDLE_MS);
  idleTimer.unref();
}

// One photo at a time.
let chain: Promise<unknown> = Promise.resolve();
let waiting = 0;

export class BgBusy extends Error {}
export class BgBadInput extends Error {}

/** JPEG of the model's square size in, gzipped mask (size x size bytes) out. */
export async function removeBgOnServer(id: BgModelId, jpegBytes: Buffer): Promise<Buffer> {
  if (!bgAvailable()) throw new BgBusy('not available');
  if (waiting >= MAX_WAITING) throw new BgBusy('queue full');
  const m = MODELS[id];
  waiting++;
  const job = chain.then(async () => {
    waiting--;
    const file = await ensureFile(id);
    touchIdle();
    const mask = await new Promise<Uint8Array>((resolve, reject) => {
      const jobId = nextId++;
      pending.set(jobId, { resolve, reject });
      const bytes = new Uint8Array(jpegBytes);
      getWorker().postMessage({ id: jobId, file, size: m.size, mean: m.mean, std: m.std, jpeg: bytes }, [bytes.buffer]);
    });
    touchIdle();
    return zlib.gzipSync(mask, { level: 6 });
  });
  chain = job.catch(() => {});
  return job;
}
