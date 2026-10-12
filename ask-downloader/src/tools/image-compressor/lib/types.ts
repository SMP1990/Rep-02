// Shared by the page and the worker.

/** 'auto' keeps the file's own format (JPEG stays JPEG, PNG stays PNG...). */
export type Format = 'auto' | 'webp' | 'jpeg' | 'png';

export interface Settings {
  format: Format;
  /** 1-100, for JPEG and WebP. */
  quality: number;
  /** Longest side in pixels; 0 = keep the original size. */
  maxSide: number;
  /** Aim for at most this many KB (JPEG/WebP); 0 = off. */
  targetKB: number;
}

export const DEFAULT_SETTINGS: Settings = { format: 'auto', quality: 75, maxSide: 0, targetKB: 0 };

export interface Done {
  blob: Blob;
  width: number;
  height: number;
  /** The quality actually used (target-size mode may lower it). */
  quality: number;
  /** True when the original is smaller than anything we could make, so it is returned untouched. */
  kept: boolean;
}

/** Reasons shown to the visitor, in their language. */
export type ErrorCode = 'unsupported' | 'tooLarge' | 'failed';

export type WorkerReply = { id: number; ok: true; done: Done } | { id: number; ok: false; code: ErrorCode };
