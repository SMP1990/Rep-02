// Loads the ONNX runtime and the ISNet model from public CDNs, once.
// Nothing heavy is bundled with the site: the app code stays small and the
// ~47MB model and ~14MB runtime come only when someone uses the tool.
import type * as Ort from 'onnxruntime-web';

export const MODEL_SIZE = 1024; // ISNet works on a 1024x1024 input

const ORT_VERSION = '1.30.0'; // keep equal to package.json
// Commit that holds bg-remover-tool/model (made by scripts/prepare_model.py).
const MODEL_COMMIT = 'f971bc30cfafb16e2a61650d4908f0cacfe0b3fb';
const MODEL_PARTS = 3;
const MODEL_BYTES = 46787316;
const CACHE_NAME = `bg-remover-${MODEL_COMMIT.slice(0, 8)}`;

const env = import.meta.env;
const ORT_URL: string =
  env.VITE_ORT_URL ||
  `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/ort.wasm.min.mjs`;
// Same files from two hosts: jsDelivr first, GitHub raw if it fails.
const MODEL_HOSTS: string[] = env.VITE_MODEL_BASE
  ? [env.VITE_MODEL_BASE]
  : [
      `https://cdn.jsdelivr.net/gh/SMP1990/Rep-02@${MODEL_COMMIT}/bg-remover-tool/model/`,
      `https://raw.githubusercontent.com/SMP1990/Rep-02/${MODEL_COMMIT}/bg-remover-tool/model/`,
    ];

export interface Loaded {
  ort: typeof Ort;
  session: Ort.InferenceSession;
}

let loading: Promise<Loaded> | null = null;

async function openCache(): Promise<Cache | null> {
  try {
    return await caches.open(CACHE_NAME);
  } catch {
    return null; // private mode or no Cache API: just download each time
  }
}

/** One model part, from the browser cache or the first host that answers. */
async function fetchPart(n: number, onBytes: (n: number) => void): Promise<Uint8Array> {
  const file = `isnet.part${n}`;
  // Cache keys must be full URLs (a relative name fails in a blob: worker).
  const key = MODEL_HOSTS[0] + file;
  const cache = await openCache();
  const hit = await cache?.match(key).catch(() => undefined);
  if (hit) {
    const buf = new Uint8Array(await hit.arrayBuffer());
    onBytes(buf.length);
    return buf;
  }
  for (const host of MODEL_HOSTS) {
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

/** Downloads (or reads from cache) everything; progress goes 0..1. */
export function loadModel(onProgress?: (p: number) => void): Promise<Loaded> {
  loading ??= (async () => {
    const ort = (await import(/* @vite-ignore */ ORT_URL)) as typeof Ort;
    // Threads only work when the page is cross-origin isolated.
    ort.env.wasm.numThreads = self.crossOriginIsolated
      ? Math.min(4, navigator.hardwareConcurrency || 1)
      : 1;
    let got = 0;
    const tick = (n: number) => {
      got += n;
      onProgress?.(Math.min(1, got / MODEL_BYTES));
    };
    const parts = await Promise.all(
      Array.from({ length: MODEL_PARTS }, (_, n) => fetchPart(n, tick)),
    );
    const session = await ort.InferenceSession.create(join(parts), {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });
    return { ort, session };
  })();
  loading.catch(() => {
    loading = null; // let the user retry after a failed download
  });
  return loading;
}
