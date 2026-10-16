/**
 * Image watermark remover on the server (MI-GAN, MIT, 28 MB model).
 * Same design as the Background Remover (bgRemover.ts):
 * - the model runs in a worker thread (wmWorker.ts), one photo at a time,
 *   one CPU thread, so the site keeps answering;
 * - onnxruntime-node is optional; without it the tool says so;
 * - the model is downloaded once into the data folder (Hugging Face, pinned
 *   revision, then this repo as a mirror) and checked by SHA-256;
 * - the worker starts on first use and stops after 10 idle minutes;
 * - photos are never written to disk or logged.
 * The browser sends only the area around the watermark (max ~1 MP), so
 * photos of any size work and the server's work stays the same.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { createRequire } from 'module';
import { Worker } from 'worker_threads';
import { dataFolder } from './store.ts';

const MODEL = {
  file: 'migan_pipeline_v2.onnx',
  bytes: 28079181,
  sha256: '6f1f3530a1a2324b19752018ce756088b07973cda8d7d890034ace5c8a48c40b',
  urls: [
    'https://huggingface.co/andraniksargsyan/migan/resolve/406830d0fa60666da0071c342ad2fbc8f30c5c64/migan_pipeline_v2.onnx',
  ],
  // Mirror in this repo: wm-remover-tool/model/migan.part0..1 (15 MB parts).
  mirrorParts: 2,
  mirrorHosts: [
    'https://raw.githubusercontent.com/SMP1990/Rep-02/claude/upbeat-archimedes-266v06/wm-remover-tool/model/',
  ],
};

// A long line instead of a hard limit: each photo takes ~3 s.
const MAX_WAITING = 30;
const IDLE_MS = 10 * 60 * 1000;

const WORKER_FILE = path.join(typeof __dirname !== 'undefined' ? __dirname : process.cwd(), 'wm-worker.cjs');

let usable: boolean | null = null;
export function wmAvailable(): boolean {
  if (usable === null) {
    try {
      createRequire(WORKER_FILE).resolve('onnxruntime-node');
      usable = fs.existsSync(WORKER_FILE);
    } catch {
      usable = false;
    }
    if (!usable) console.warn('[wm-remover] image mode off (no onnxruntime-node or worker file)');
  }
  return usable;
}

const sha = (b: Buffer) => crypto.createHash('sha256').update(b).digest('hex');

async function get(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(180_000) });
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

let fileJob: Promise<string> | null = null;
function ensureFile(): Promise<string> {
  if (fileJob) return fileJob;
  fileJob = (async () => {
    const out = path.join(dataFolder(), 'wm-models', MODEL.file);
    if (fs.existsSync(out) && fs.statSync(out).size === MODEL.bytes) return out;
    fs.mkdirSync(path.dirname(out), { recursive: true });
    let all: Buffer | null = null;
    for (const url of MODEL.urls) {
      const b = await get(url);
      if (b && b.length === MODEL.bytes && sha(b) === MODEL.sha256) { all = b; break; }
    }
    for (const host of MODEL.mirrorHosts) {
      if (all) break;
      const parts: Buffer[] = [];
      for (let n = 0; n < MODEL.mirrorParts; n++) {
        const b = await get(`${host}migan.part${n}`);
        if (!b) break;
        parts.push(b);
      }
      const b = Buffer.concat(parts);
      if (b.length === MODEL.bytes && sha(b) === MODEL.sha256) all = b;
    }
    if (!all) throw new Error('model could not be downloaded');
    fs.writeFileSync(out + '.tmp', all);
    fs.renameSync(out + '.tmp', out);
    console.log('[wm-remover] model saved (28 MB)');
    return out;
  })();
  fileJob.catch(() => { fileJob = null; });
  return fileJob;
}

/** Fetch the model file 2 minutes after start (file only, not into memory). */
export function prefetchWmModel() {
  setTimeout(() => {
    if (wmAvailable()) ensureFile().catch((e) => console.warn('[wm-remover]', e.message));
  }, 120_000).unref();
}

// ---- the worker thread -------------------------------------------------
let worker: Worker | null = null;
let idleTimer: NodeJS.Timeout | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (b: Uint8Array) => void; reject: (e: Error) => void }>();

export class WmBusy extends Error {}
export class WmBadInput extends Error {}

function getWorker(): Worker {
  if (worker) return worker;
  const w = new Worker(WORKER_FILE);
  w.on('message', (msg: { id: number; jpeg?: Uint8Array; error?: string; message?: string }) => {
    const p = pending.get(msg.id);
    pending.delete(msg.id);
    if (!p) return;
    if (msg.jpeg) return p.resolve(msg.jpeg);
    if (msg.error === 'failed' && /onnxruntime|\.so|GLIBC|Cannot find module/i.test(msg.message || '')) {
      usable = false;
      console.warn('[wm-remover] image mode off:', msg.message);
    } else if (msg.message) {
      console.error('[wm-remover] failed:', msg.message);
    }
    p.reject(msg.error === 'bad-image' ? new WmBadInput('bad image') : new Error(msg.error));
  });
  const fail = (err: Error) => {
    console.error('[wm-remover] worker stopped:', err.message);
    pending.forEach((p) => p.reject(new Error('worker stopped')));
    pending.clear();
    if (worker === w) worker = null;
  };
  w.on('error', fail);
  w.on('exit', (code) => code !== 0 && fail(new Error(`exit ${code}`)));
  worker = w;
  return w;
}

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

let chain: Promise<unknown> = Promise.resolve();
let waiting = 0;
export const wmQueue = () => waiting;

/** JPEG crop + mask (one byte per pixel, 255 = remove) in, JPEG out. */
export async function removeWatermarkOnServer(jpegBytes: Uint8Array, mask: Uint8Array): Promise<Uint8Array> {
  if (!wmAvailable()) throw new WmBusy('not available');
  if (waiting >= MAX_WAITING) throw new WmBusy('queue full');
  waiting++;
  const job = chain.then(async () => {
    waiting--;
    const file = await ensureFile();
    touchIdle();
    const out = await new Promise<Uint8Array>((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      const j = new Uint8Array(jpegBytes);
      const m = new Uint8Array(mask);
      getWorker().postMessage({ id, file, jpeg: j, mask: m }, [j.buffer, m.buffer]);
    });
    touchIdle();
    return out;
  });
  chain = job.catch(() => {});
  return job;
}
