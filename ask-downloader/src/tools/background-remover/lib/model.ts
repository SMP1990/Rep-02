// Loads the ONNX runtime and a model from public CDNs, once per model.
// Nothing heavy is bundled with the site: the app code stays small and the
// model and runtime come only when someone uses the tool.
import type * as Ort from 'onnxruntime-web';
import { MODELS, type ModelId, type ModelSpec } from './models';

const ORT_VERSION = '1.30.0'; // keep equal to package.json
// Same files on two npm CDNs: jsDelivr first, unpkg if it is unreachable.
const ORT_CDNS = [
  `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`,
  `https://unpkg.com/onnxruntime-web@${ORT_VERSION}/dist/`,
];

const env = import.meta.env;
// WASM-only build (~3.5MB) for most devices; the WebGPU build (~7MB) only
// for devices with a real graphics chip.
const ORT_WASM_URLS: string[] = env.VITE_ORT_URL ? [env.VITE_ORT_URL] : ORT_CDNS.map((c) => c + 'ort.wasm.min.mjs');
const ORT_GPU_URLS: string[] = env.VITE_ORT_GPU_URL ? [env.VITE_ORT_GPU_URL] : ORT_CDNS.map((c) => c + 'ort.webgpu.min.mjs');

/** The runtime from the first CDN that answers. */
async function importRuntime(urls: string[]): Promise<typeof Ort> {
  for (const url of urls) {
    try {
      return (await import(/* @vite-ignore */ url)) as typeof Ort;
    } catch {
      // unreachable or blocked: try the next CDN
    }
  }
  throw new Error('model-download-failed');
}

/** Same files from two hosts: jsDelivr first, GitHub raw if it fails. */
function hosts(m: ModelSpec): string[] {
  if (env.VITE_MODEL_BASE) return [`${env.VITE_MODEL_BASE}${m.dir}/`];
  const path = `bg-remover-tool/${m.dir}/`;
  return [
    `https://cdn.jsdelivr.net/gh/SMP1990/Rep-02@${m.commit}/${path}`,
    `https://raw.githubusercontent.com/SMP1990/Rep-02/${m.commit}/${path}`,
  ];
}

export type Backend = 'webgpu' | 'wasm';

export interface Loaded {
  ort: typeof Ort;
  session: Ort.InferenceSession;
  backend: Backend;
  /** Kept while on WebGPU, to rebuild on WASM if the GPU misbehaves. */
  bytes: Uint8Array | null;
}

const loading = new Map<ModelId, Promise<Loaded>>();
let runtime: Promise<{ ort: typeof Ort; gpu: boolean }> | null = null;

/** A real graphics chip (software emulation is slower than WASM). */
async function realGpu(): Promise<boolean> {
  type Adapter = { info?: { architecture?: string; vendor?: string }; isFallbackAdapter?: boolean };
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<Adapter | null> } }).gpu;
  if (!gpu) return false;
  try {
    const a = await gpu.requestAdapter();
    if (!a || a.isFallbackAdapter) return false;
    return !/swiftshader|llvmpipe|software/i.test(`${a.info?.architecture} ${a.info?.vendor}`);
  } catch {
    return false;
  }
}

function loadRuntime() {
  runtime ??= (async () => {
    const gpu = await realGpu();
    const ort = await importRuntime(gpu ? ORT_GPU_URLS : ORT_WASM_URLS);
    // Threads only work when the page is cross-origin isolated.
    ort.env.wasm.numThreads = self.crossOriginIsolated
      ? Math.min(4, navigator.hardwareConcurrency || 1)
      : 1;
    return { ort, gpu };
  })();
  runtime.catch(() => {
    runtime = null;
  });
  return runtime;
}

async function openCache(m: ModelSpec): Promise<Cache | null> {
  try {
    return await caches.open(`bg-remover-${m.file}-${m.commit.slice(0, 8)}`);
  } catch {
    return null; // private mode or no Cache API: just download each time
  }
}

/** One model part, from the browser cache or the first host that answers. */
async function fetchPart(m: ModelSpec, n: number, onBytes: (n: number) => void): Promise<Uint8Array> {
  const file = `${m.file}.part${n}`;
  const urls = hosts(m);
  // Cache keys must be full URLs (a relative name fails in a blob: worker).
  const key = urls[0] + file;
  const cache = await openCache(m);
  const hit = await cache?.match(key).catch(() => undefined);
  if (hit) {
    const buf = new Uint8Array(await hit.arrayBuffer());
    onBytes(buf.length);
    return buf;
  }
  for (const host of urls) {
    let got = 0;
    try {
      const res = await fetch(host + file);
      if (!res.ok || !res.body) continue;
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        got += value.length;
        onBytes(value.length);
      }
      const buf = join(chunks);
      cache?.put(key, new Response(buf)).catch(() => {});
      return buf;
    } catch {
      onBytes(-got); // broke half-way: the next host starts this part again
    }
  }
  throw new Error('model-download-failed');
}

function join(chunks: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(chunks.reduce((s, c) => s + c.length, 0));
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

async function session(ort: typeof Ort, bytes: Uint8Array, backend: Backend) {
  return ort.InferenceSession.create(bytes, {
    executionProviders: [backend],
    graphOptimizationLevel: 'all',
  });
}

/** Downloads (or reads from cache) a model; progress goes 0..1. */
export function loadModel(id: ModelId, onProgress?: (p: number) => void): Promise<Loaded> {
  let p = loading.get(id);
  if (p) return p;
  const m = MODELS[id];
  p = (async () => {
    const { ort, gpu } = await loadRuntime();
    let got = 0;
    const tick = (n: number) => {
      got += n;
      onProgress?.(Math.min(1, got / m.bytes));
    };
    const bytes = join(await Promise.all(Array.from({ length: m.parts }, (_, n) => fetchPart(m, n, tick))));
    if (gpu) {
      try {
        return { ort, session: await session(ort, bytes, 'webgpu'), backend: 'webgpu', bytes } as Loaded;
      } catch {
        // this GPU cannot run the model: WASM below
      }
    }
    return { ort, session: await session(ort, bytes, 'wasm'), backend: 'wasm', bytes: null } as Loaded;
  })();
  loading.set(id, p);
  p.catch(() => loading.delete(id)); // let the user retry after a failed download
  return p;
}

/** The GPU gave a broken result: rebuild this model on WASM for good. */
export function fallBackToWasm(id: ModelId): Promise<Loaded> {
  const prev = loading.get(id)!;
  const next = prev.then(async (l) => {
    if (l.backend === 'wasm' || !l.bytes) return l;
    await l.session.release().catch(() => {});
    return { ort: l.ort, session: await session(l.ort, l.bytes, 'wasm'), backend: 'wasm', bytes: null } as Loaded;
  });
  loading.set(id, next);
  return next;
}
