// Password generation in the browser.
//
// The rules are ported from generate-password by Brendan Ashworth
// (https://github.com/brendanashworth/generate-password, MIT License,
// Copyright (c) 2014 Brendan Ashworth): character pools, "exclude similar
// characters", custom exclusions and "use every chosen type". That library
// needs Node's crypto module; here randomness comes from the browser's
// crypto.getRandomValues, with rejection sampling so every character is
// equally likely. Math.random is never used. Nothing leaves the device.

export const POOLS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()+_-=}{[]|:;"/?.><,`~',
} as const;

export type PoolName = keyof typeof POOLS;
export const POOL_NAMES = Object.keys(POOLS) as PoolName[];

/** Characters that are easy to mix up when read or typed by hand. */
export const SIMILAR = 'il1LI|oO0`';

export interface Options {
  length: number;
  upper: boolean;
  lower: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeSimilar: boolean;
  /** Use every chosen type at least once. */
  strict: boolean;
  /** Extra characters to leave out. */
  exclude: string;
}

export const MIN_LENGTH = 4;
export const MAX_LENGTH = 128;

/** Uniform random integer in [0, max): rejects values that would bias it. */
function randomInt(max: number): number {
  const limit = 2 ** 32 - (2 ** 32 % max);
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
}

/** The usable characters of each chosen type, after the exclusions. */
export function pools(o: Options): string[] {
  const skip = new Set((o.excludeSimilar ? SIMILAR : '') + o.exclude);
  return POOL_NAMES.filter((n) => o[n])
    .map((n) => [...POOLS[n]].filter((c) => !skip.has(c)).join(''))
    .filter((p) => p.length > 0);
}

/** A new password, or '' when no character is left to use. */
export function generate(o: Options): string {
  const chosen = pools(o);
  const all = chosen.join('');
  if (!all) return '';
  const length = Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, Math.round(o.length) || MIN_LENGTH));
  // One character of each chosen type first (strict), then any characters,
  // then a Fisher-Yates shuffle so the guaranteed ones sit anywhere.
  const out = o.strict ? chosen.map((p) => p[randomInt(p.length)]) : [];
  while (out.length < length) out.push(all[randomInt(all.length)]);
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join('');
}

/** Bits of entropy of a password made with these options. */
export function entropyBits(o: Options): number {
  const size = pools(o).join('').length;
  const length = Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, Math.round(o.length) || MIN_LENGTH));
  return size > 1 ? Math.round(length * Math.log2(size)) : 0;
}

export type Strength = 'weak' | 'fair' | 'strong' | 'veryStrong';

export function strength(bits: number): Strength {
  if (bits < 40) return 'weak';
  if (bits < 60) return 'fair';
  if (bits < 80) return 'strong';
  return 'veryStrong';
}

/** Rough time to try half of all passwords at 10 billion guesses a second
 *  (a fast offline attack). */
export function crackSeconds(bits: number): number {
  return 2 ** Math.max(0, bits - 1) / 1e10;
}
