// Image -> alpha mask with ISNet, all inside the browser.
import type * as Ort from 'onnxruntime-web';
import { loadModel, MODEL_SIZE } from './model';

/** Grayscale mask (0..255), same size as the source image. */
export interface Mask {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

function toTensor(ort: typeof Ort, img: CanvasImageSource): Ort.Tensor {
  const S = MODEL_SIZE;
  const canvas = new OffscreenCanvas(S, S);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, S, S);
  const px = ctx.getImageData(0, 0, S, S).data;
  // Same preprocessing as rembg: scale by the brightest value, minus 0.5.
  let max = 1;
  for (let i = 0; i < px.length; i += 4) {
    max = Math.max(max, px[i], px[i + 1], px[i + 2]);
  }
  const plane = S * S;
  const input = new Float32Array(3 * plane);
  for (let i = 0, p = 0; p < plane; i += 4, p++) {
    input[p] = px[i] / max - 0.5;
    input[plane + p] = px[i + 1] / max - 0.5;
    input[2 * plane + p] = px[i + 2] / max - 0.5;
  }
  return new ort.Tensor('float32', input, [1, 3, S, S]);
}

function toMask(out: Float32Array, width: number, height: number): Mask {
  const S = MODEL_SIZE;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < S * S; i++) {
    min = Math.min(min, out[i]);
    max = Math.max(max, out[i]);
  }
  const range = max - min || 1;
  const small = new ImageData(S, S);
  for (let i = 0; i < S * S; i++) {
    const v = ((out[i] - min) / range) * 255;
    small.data[i * 4] = small.data[i * 4 + 1] = small.data[i * 4 + 2] = v;
    small.data[i * 4 + 3] = 255;
  }
  // Scale the 1024x1024 mask back to the photo's own size.
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

export async function computeMask(img: ImageBitmap): Promise<Mask> {
  const { ort, session } = await loadModel();
  const results = await session.run({ [session.inputNames[0]]: toTensor(ort, img) });
  const data = (await results[session.outputNames[0]].getData()) as Float32Array;
  return toMask(data, img.width, img.height);
}
