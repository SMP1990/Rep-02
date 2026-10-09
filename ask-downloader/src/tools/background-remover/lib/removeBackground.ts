// Image -> alpha mask, all inside the browser.
import type * as Ort from 'onnxruntime-web';
import { fallBackToWasm, loadModel, type Loaded } from './model';
import { MODELS, inputSize, type ModelId, type ModelSpec } from './models';

/** Grayscale mask (0..255), same size as the source image. */
export interface Mask {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

function toTensor(ort: typeof Ort, img: CanvasImageSource, m: ModelSpec, S: number): Ort.Tensor {
  const canvas = new OffscreenCanvas(S, S);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, S, S);
  const px = ctx.getImageData(0, 0, S, S).data;
  let scale = 255;
  if (m.scaleByMax) {
    // rembg's preprocessing: scale by the brightest value.
    scale = 1;
    for (let i = 0; i < px.length; i += 4) scale = Math.max(scale, px[i], px[i + 1], px[i + 2]);
  }
  const plane = S * S;
  const input = new Float32Array(3 * plane);
  for (let c = 0; c < 3; c++) {
    const mean = m.mean[c];
    const std = m.std[c];
    for (let p = 0; p < plane; p++) input[c * plane + p] = (px[p * 4 + c] / scale - mean) / std;
  }
  return new ort.Tensor('float32', input, [1, 3, S, S]);
}

function toMask(out: Float32Array, m: ModelSpec, S: number, width: number, height: number): Mask {
  const v = m.sigmoid ? out.map((x) => 1 / (1 + Math.exp(-x))) : out;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < S * S; i++) {
    min = Math.min(min, v[i]);
    max = Math.max(max, v[i]);
  }
  const range = max - min || 1;
  const small = new ImageData(S, S);
  for (let i = 0; i < S * S; i++) {
    const g = ((v[i] - min) / range) * 255;
    small.data[i * 4] = small.data[i * 4 + 1] = small.data[i * 4 + 2] = g;
    small.data[i * 4 + 3] = 255;
  }
  // Scale the model-sized mask back to the photo's own size.
  const a = new OffscreenCanvas(S, S);
  a.getContext('2d')!.putImageData(small, 0, 0);
  const b = new OffscreenCanvas(width, height);
  const ctx = b.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(a, 0, 0, width, height);
  const big = ctx.getImageData(0, 0, width, height).data;
  const data = new Uint8ClampedArray(width * height);
  for (let i = 0; i < data.length; i++) data[i] = big[i * 4];
  return { width, height, data };
}

async function run(l: Loaded, input: Ort.Tensor): Promise<Float32Array> {
  const results = await l.session.run({ [l.session.inputNames[0]]: input });
  return (await results[l.session.outputNames[0]].getData()) as Float32Array;
}

/** A blank or broken result (all one value, or NaN) means the GPU misbehaved. */
function looksBroken(out: Float32Array): boolean {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < out.length; i++) {
    const x = out[i];
    if (Number.isNaN(x)) return true;
    if (x < min) min = x;
    if (x > max) max = x;
  }
  return max - min < 1e-3;
}

/** Timings of the last photo, for the hidden test mode (testMode.ts). */
export let lastRun = '';

export async function computeMask(img: ImageBitmap, id: ModelId): Promise<Mask> {
  const m = MODELS[id];
  const loaded = await loadModel(id);
  const size = inputSize(m);
  const t0 = performance.now();
  const input = toTensor(loaded.ort, img, m, size);
  const t1 = performance.now();
  let data = await run(loaded, input).catch((err) => {
    if (loaded.backend !== 'webgpu') throw err;
    return null;
  });
  if (!data || (loaded.backend === 'webgpu' && looksBroken(data))) {
    // GPU error or a silently blank result: this photo (and later ones)
    // go through WASM, which matches the reference model.
    data = await run(await fallBackToWasm(id), input);
  }
  const t2 = performance.now();
  const mask = toMask(data, m, size, img.width, img.height);
  const s = (a: number, b: number) => ((b - a) / 1000).toFixed(1) + 's';
  lastRun = `${id} photo ${img.width}x${img.height} at ${size}: prepare ${s(t0, t1)}, ` +
    `model ${s(t1, t2)} (${(await loadModel(id)).backend}), finish ${s(t2, performance.now())}`;
  return mask;
}
