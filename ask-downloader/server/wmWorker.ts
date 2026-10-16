/**
 * Worker thread of the image watermark remover (wmRemover.ts): runs the
 * MI-GAN inpainting model (MIT, Picsart AI Research) off the main thread.
 * Built to dist/wm-worker.cjs (see the "build" script).
 *
 * In: a JPEG crop (max ~1 MP) and a mask of the same size (255 = remove).
 * Out: the crop with the masked area filled in, as JPEG.
 */
import { parentPort } from 'worker_threads';
import jpeg from 'jpeg-js';

interface Job { id: number; file: string; jpeg: Uint8Array; mask: Uint8Array }

let ort: any = null;
let session: Promise<any> | null = null;
let sessionFile = '';

function getSession(file: string): Promise<any> {
  if (!session || sessionFile !== file) {
    sessionFile = file;
    session = ort.InferenceSession.create(file, {
      executionProviders: ['cpu'],
      graphOptimizationLevel: 'all',
      intraOpNumThreads: 1, // one CPU core, shared with the site
      interOpNumThreads: 1,
      // Measured: arena off + memory pattern on = ~3 s and ~150 MB per photo
      // (arena on needs ~900 MB; both off is twice as slow).
      enableCpuMemArena: false,
      enableMemPattern: true,
    });
    session.catch(() => { session = null; });
  }
  return session!;
}

parentPort!.on('message', async (job: Job) => {
  try {
    ort ??= require('onnxruntime-node');
    let img: { width: number; height: number; data: Uint8Array };
    try {
      img = jpeg.decode(job.jpeg, { useTArray: true, maxResolutionInMP: 1.1, maxMemoryUsageInMB: 64 });
    } catch {
      return parentPort!.postMessage({ id: job.id, error: 'bad-image' });
    }
    const { width: w, height: h } = img;
    const plane = w * h;
    if (job.mask.length !== plane || w < 8 || h < 8) return parentPort!.postMessage({ id: job.id, error: 'bad-image' });

    const chw = new Uint8Array(3 * plane);
    const mask = new Uint8Array(plane);
    for (let p = 0; p < plane; p++) {
      chw[p] = img.data[p * 4];
      chw[plane + p] = img.data[p * 4 + 1];
      chw[2 * plane + p] = img.data[p * 4 + 2];
      mask[p] = job.mask[p] > 127 ? 0 : 255; // the model fills where the mask is 0
    }
    const s = await getSession(job.file);
    const out = await s.run({
      image: new ort.Tensor('uint8', chw, [1, 3, h, w]),
      mask: new ort.Tensor('uint8', mask, [1, 1, h, w]),
    });
    const r = out[s.outputNames[0]].data as Uint8Array;
    const rgba = new Uint8Array(4 * plane);
    for (let p = 0; p < plane; p++) {
      rgba[p * 4] = r[p];
      rgba[p * 4 + 1] = r[plane + p];
      rgba[p * 4 + 2] = r[2 * plane + p];
      rgba[p * 4 + 3] = 255;
    }
    const enc = jpeg.encode({ data: rgba, width: w, height: h }, 92).data;
    const bytes = new Uint8Array(enc.buffer, enc.byteOffset, enc.byteLength);
    parentPort!.postMessage({ id: job.id, jpeg: bytes }, [bytes.buffer]);
  } catch (err: any) {
    parentPort!.postMessage({ id: job.id, error: 'failed', message: String(err?.message || err) });
  }
});
