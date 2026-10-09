// Loads the ISNet model once, on WebGPU when the browser has it, else WASM.
import * as ort from 'onnxruntime-web';

export const MODEL_URL = '/models/isnet-general-use.fp16.onnx';
export const MODEL_SIZE = 1024; // ISNet works on a 1024x1024 input

// Runtime files live in public/ort (see scripts/copy-ort.mjs).
ort.env.wasm.wasmPaths = '/ort/';

export type Backend = 'webgpu' | 'wasm';

export interface Loaded {
  session: ort.InferenceSession;
  backend: Backend;
  model: Uint8Array;
}

let loading: Promise<Loaded> | null = null;

async function hasWebGPU(): Promise<boolean> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  if (!gpu) return false;
  try {
    return (await gpu.requestAdapter()) != null;
  } catch {
    return false;
  }
}

async function create(backend: Backend, model: Uint8Array): Promise<Loaded> {
  const session = await ort.InferenceSession.create(model, {
    executionProviders: [backend],
    graphOptimizationLevel: 'all',
  });
  return { session, backend, model };
}

/** Called when a WebGPU run fails: rebuild the session on WASM for good. */
export function fallBackToWasm(): Promise<Loaded> {
  const prev = loading!;
  loading = prev.then(async (l) => {
    if (l.backend === 'wasm') return l;
    await l.session.release().catch(() => {});
    return create('wasm', l.model);
  });
  return loading;
}

/** Downloads the model with progress (0..1) and keeps one shared session. */
export function loadModel(onProgress?: (p: number) => void) {
  loading ??= (async () => {
    const res = await fetch(MODEL_URL);
    if (!res.ok || !res.body) throw new Error('model-download-failed');
    const total = Number(res.headers.get('content-length')) || 0;
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      got += value.length;
      if (total) onProgress?.(got / total);
    }
    const model = new Uint8Array(got);
    let off = 0;
    for (const c of chunks) {
      model.set(c, off);
      off += c.length;
    }
    // Multi-threaded WASM only works when the page is cross-origin isolated.
    ort.env.wasm.numThreads = self.crossOriginIsolated
      ? Math.min(4, navigator.hardwareConcurrency || 1)
      : 1;
    if (await hasWebGPU()) {
      try {
        return await create('webgpu', model);
      } catch {
        // Some GPUs fail to compile the graph: fall back to WASM below.
      }
    }
    return create('wasm', model);
  })();
  loading.catch(() => {
    loading = null; // let the user retry after a failed download
  });
  return loading;
}
