/**
 * Trending Sounds: the filter. Nothing is deleted by it: every sound stays in
 * the data file and only gets a "reason" (empty = qualified), so the admin can
 * change a number later without losing sounds. Approved sounds always pass,
 * rejected ones never do.
 */
import type { SoundHit } from './soundsFetch.ts';

export type Status = 'new' | 'approved' | 'rejected';
export type Sound = SoundHit & {
  regions: string[]; days: string[]; firstSeen: string; lastSeen: string;
  status: Status; hist: Record<string, number>; // hist: views seen per day (last 14 days)
  vs?: number; // 2 = "views" is the top video's views (v30+); older sounds summed videos, repeats included
};
export type Settings = { minViews: number; minSec: number; maxSec: number; perCreator: number; excludeMusic: boolean };

export const DEFAULT_SETTINGS: Settings = { minViews: 1_000_000, minSec: 3, maxSec: 60, perCreator: 2, excludeMusic: true };

const num = (v: unknown, min: number, max: number, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : d;
};

export function cleanSettings(x: any, d: Settings = DEFAULT_SETTINGS): Settings {
  return {
    minViews: num(x?.minViews, 0, 1e10, d.minViews),
    minSec: num(x?.minSec, 0, 600, d.minSec),
    maxSec: num(x?.maxSec, 1, 600, d.maxSec),
    perCreator: num(x?.perCreator, 1, 50, d.perCreator),
    excludeMusic: typeof x?.excludeMusic === 'boolean' ? x.excludeMusic : d.excludeMusic,
  };
}

/** The sound's own name without the "original sound - " part; empty if it has no real letters. */
function realName(name: string): string {
  const n = name.replace(/\p{C}/gu, '').replace(/^[^-–—]*(original|asli|оригинал|オリジナル)[^-–—]*[-–—]/iu, '').trim();
  return /[\p{L}\p{N}]{2}/u.test(n) ? n : '';
}

export type Verdict = { reason: string; score: number };

export function judge(sounds: Sound[], s: Settings): Map<string, Verdict> {
  const out = new Map<string, Verdict>();
  const seen = new Set<string>();
  const perCreator = new Map<string, number>();
  for (const k of [...sounds].sort((a, b) => b.views - a.views)) {
    const score = Math.round(Math.log10(k.views + 1) * 10 + (k.regions.length - 1) * 5 + (k.days.length - 1) * 3);
    let reason = '';
    if (k.status === 'rejected') reason = 'rejected';
    else if (k.status !== 'approved') {
      if (!realName(k.name)) reason = 'bad name';
      else if (s.excludeMusic && !k.original) reason = 'music';
      else if (k.views < s.minViews) reason = 'low views';
      else if (k.duration < s.minSec) reason = 'too short';
      else if (k.duration > s.maxSec) reason = 'too long';
      else if (seen.has(`${k.name.toLowerCase()}|${k.duration}`)) reason = 'duplicate';
      else if ((perCreator.get(k.creator) ?? 0) >= s.perCreator) reason = 'same creator';
    }
    if (!reason) {
      seen.add(`${k.name.toLowerCase()}|${k.duration}`);
      perCreator.set(k.creator, (perCreator.get(k.creator) ?? 0) + 1);
    }
    out.set(k.id, { reason, score });
  }
  return out;
}
