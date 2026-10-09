// The two models. "fast" runs for every photo; "hd" only when the user asks
// for better results, and its mask is combined with the fast one
// (combine.ts). Files live in this repo and are served by jsDelivr.

export type ModelId = 'fast' | 'hd';

export interface ModelSpec {
  /** Folder in bg-remover-tool/ and file name prefix of the parts. */
  dir: string;
  file: string;
  /** Commit that holds the parts (made by the prepare script). */
  commit: string;
  parts: number;
  bytes: number;
  /** Square input size the model works at. */
  size: number;
  /** Smaller size for phones and slow computers (see inputSize()). */
  smallSize?: number;
  /** How the photo is turned into numbers for this model. */
  mean: [number, number, number];
  std: [number, number, number];
  /** rembg-style: scale by the brightest pixel instead of 255. */
  scaleByMax: boolean;
  /** Models that output logits need a sigmoid. */
  sigmoid: boolean;
}

export const MODELS: Record<ModelId, ModelSpec> = {
  // ISNet general-use (Apache-2.0) — scripts/prepare_model.py
  fast: {
    dir: 'model',
    file: 'isnet',
    commit: 'd472b3d346aca52327a09c004dd51730bd24beca',
    parts: 3,
    bytes: 46451987,
    size: 1024,
    // 2.7x faster than 1024 and close in quality on the test photos
    // (512 was measured too: it brings parts of the background back).
    smallSize: 768,
    mean: [0.5, 0.5, 0.5],
    std: [1, 1, 1],
    scaleByMax: true,
    sigmoid: false,
  },
  // U2Net (Apache-2.0) — scripts/prepare_hd_model.py
  hd: {
    dir: 'model-hd',
    file: 'u2net',
    commit: 'bfcf3183ab745592f189fcab590d6d6b25f90f60',
    parts: 3,
    bytes: 44269182,
    size: 320,
    mean: [0.485, 0.456, 0.406],
    std: [0.229, 0.224, 0.225],
    scaleByMax: true,
    sigmoid: false,
  },
};

export function isPhone(): boolean {
  const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  return !!nav.userAgentData?.mobile || /Android|iPhone|iPad|iPod|Mobi/i.test(nav.userAgent);
}

/** Size the model works at. On the CPU, phones, low-memory devices and
 *  computers with 4 cores or fewer use the small size: measured on a 4GB
 *  Android phone (13s at 768) and a 4-core laptop (21s at 1024). A real
 *  graphics chip keeps the full size. */
export function inputSize(m: ModelSpec, onGpu = false): number {
  if (!m.smallSize || onGpu) return m.size;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const slow = isPhone() || (mem !== undefined && mem <= 4) || (navigator.hardwareConcurrency || 4) <= 4;
  return slow ? m.smallSize : m.size;
}
