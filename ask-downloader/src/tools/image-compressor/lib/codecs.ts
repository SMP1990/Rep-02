// WebAssembly encoders from Google's Squoosh, via jSquash (Apache-2.0,
// https://github.com/jamsinclair/jSquash). The .wasm files are bundled and
// served by this site (never a CDN at run time) and each one is fetched only
// the first time it is needed. Runs inside the worker.
import mozjpegWasm from '@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm?url';
import webpWasm from '@jsquash/webp/codec/enc/webp_enc.wasm?url';
import webpSimdWasm from '@jsquash/webp/codec/enc/webp_enc_simd.wasm?url';
import oxipngWasm from '@jsquash/oxipng/codec/pkg/squoosh_oxipng_bg.wasm?url';

type Pixels = { data: Uint8ClampedArray; width: number; height: number };

async function compile(url: string): Promise<WebAssembly.Module> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`codec ${res.status}`);
  try {
    return await WebAssembly.compileStreaming(res.clone());
  } catch {
    return WebAssembly.compile(await res.arrayBuffer()); // server without application/wasm
  }
}

function once<T>(load: () => Promise<T>): () => Promise<T> {
  let p: Promise<T> | null = null;
  return () => (p ??= load().catch((e) => { p = null; throw e; }));
}

/** MozJPEG: ~30-40% smaller than the browser's own JPEG at the same quality (measured). */
export const mozjpeg = once(async () => {
  const m = await import('@jsquash/jpeg/encode.js');
  await m.init(await compile(mozjpegWasm));
  return (img: Pixels, quality: number) => m.default(img as ImageData, { quality });
});

/** libwebp, for browsers that cannot encode WebP themselves (Safari). */
export const webp = once(async () => {
  const { simd } = await import('wasm-feature-detect');
  const m = await import('@jsquash/webp/encode.js');
  // Must match the build jSquash picks (it runs the same SIMD check).
  await m.init(await compile((await simd()) ? webpSimdWasm : webpWasm));
  return (img: Pixels, quality: number) => m.default(img as ImageData, { quality, method: 4 });
});

/** OxiPNG, lossless. Single-threaded build: needs no cross-origin isolation. */
export const oxipng = once(async () => {
  const m = await import('@jsquash/oxipng/codec/pkg/squoosh_oxipng.js');
  await m.default(await compile(oxipngWasm));
  return (png: ArrayBuffer) => m.optimise(new Uint8Array(png), 2, false, true);
});
