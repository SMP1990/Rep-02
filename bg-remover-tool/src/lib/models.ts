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
  /** Square input size the model expects. */
  size: number;
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
    commit: 'f971bc30cfafb16e2a61650d4908f0cacfe0b3fb',
    parts: 3,
    bytes: 46787316,
    size: 1024,
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

/** First-time download in MB as shown to users (the fast model also brings
 *  the ~4MB runtime). */
export function downloadMb(id: ModelId): number {
  return Math.round(MODELS[id].bytes / 1e6) + (id === 'fast' ? 4 : 0);
}
