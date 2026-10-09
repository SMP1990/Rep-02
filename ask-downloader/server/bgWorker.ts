/**
 * Worker thread of the server-side Background Remover (bgRemover.ts).
 * onnxruntime-node runs a model on the thread that calls it, so it must not
 * run on the main thread: the downloader would stop answering meanwhile.
 * Built to dist/bg-worker.cjs (see the "build" script).
 */
import { parentPort } from 'worker_threads';
import jpeg from 'jpeg-js';

interface Job {
  id: number;
  file: string;
  size: number;
  mean: [number, number, number];
  std: [number, number, number];
  jpeg: Uint8Array;
}

let ort: any = null;
const sessions = new Map<string, Promise<any>>();

function session(file: string): Promise<any> {
  let s = sessions.get(file);
  if (!s) {
    s = ort.InferenceSession.create(file, {
      executionProviders: ['cpu'],
      graphOptimizationLevel: 'all',
      intraOpNumThreads: 1, // the plan has one CPU core, shared with the site
      interOpNumThreads: 1,
      enableCpuMemArena: false, // give memory back after each photo
    });
    sessions.set(file, s);
    s.catch(() => sessions.delete(file));
  }
  return s;
}

function toTensorData(rgba: Uint8Array, job: Job): Float32Array {
  const plane = job.size * job.size;
  // rembg-style: scale by the brightest value instead of 255.
  let scale = 1;
  for (let i = 0; i < rgba.length; i += 4) scale = Math.max(scale, rgba[i], rgba[i + 1], rgba[i + 2]);
  const out = new Float32Array(3 * plane);
  for (let c = 0; c < 3; c++) {
    const mean = job.mean[c];
    const std = job.std[c];
    for (let p = 0; p < plane; p++) out[c * plane + p] = (rgba[p * 4 + c] / scale - mean) / std;
  }
  return out;
}

function toMaskBytes(v: Float32Array, plane: number): Uint8Array {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < plane; i++) {
    if (v[i] < min) min = v[i];
    if (v[i] > max) max = v[i];
  }
  const range = max - min || 1;
  const out = new Uint8Array(plane);
  for (let i = 0; i < plane; i++) out[i] = Math.round(((v[i] - min) / range) * 255);
  return out;
}

parentPort!.on('message', async (job: Job) => {
  try {
    ort ??= require('onnxruntime-node');
    let img: { width: number; height: number; data: Uint8Array };
    try {
      img = jpeg.decode(job.jpeg, { useTArray: true, maxResolutionInMP: 2, maxMemoryUsageInMB: 64 });
    } catch {
      return parentPort!.postMessage({ id: job.id, error: 'bad-image' });
    }
    if (img.width !== job.size || img.height !== job.size) {
      return parentPort!.postMessage({ id: job.id, error: 'bad-image' });
    }
    const s = await session(job.file);
    const input = new ort.Tensor('float32', toTensorData(img.data, job), [1, 3, job.size, job.size]);
    const result = await s.run({ [s.inputNames[0]]: input });
    const mask = toMaskBytes(result[s.outputNames[0]].data as Float32Array, job.size * job.size);
    parentPort!.postMessage({ id: job.id, mask }, [mask.buffer]);
  } catch (err: any) {
    parentPort!.postMessage({ id: job.id, error: 'failed', message: String(err?.message || err) });
  }
});
