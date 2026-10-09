// Copies the onnxruntime-web runtime (WebGPU + WASM build) into public/ort.
// Served as plain files so its worker threads never load the app bundle.
import fs from 'node:fs';

const src = 'node_modules/onnxruntime-web/dist/';
const dst = 'public/ort/';
fs.mkdirSync(dst, { recursive: true });
for (const f of ['ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm']) {
  fs.copyFileSync(src + f, dst + f);
}
