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
  slug?: string; // public address /sounds/<slug>, made once when the sound is approved and never changed
  mp3Error?: string; // result of the last MP3 download for an approved sound ("" = ok)
  mp3Ms?: number; // how long that download took (milliseconds) and how big the file is (KB), for the admin page
  mp3Kb?: number;
  vs?: number; // 2 = "views" is the top video's views (v30+); older sounds summed videos, repeats included
};
export type Settings = { minViews: number; minSec: number; maxSec: number; perCreator: number; minDays: number; excludeMusic: boolean; excludeJunk: boolean };

export const DEFAULT_SETTINGS: Settings = { minViews: 1_000_000, minSec: 3, maxSec: 60, perCreator: 2, minDays: 2, excludeMusic: true, excludeJunk: true };

/** Words in the sound name or creator that mean: brand, news, lyrics, Quran or spam (not a meme/dialogue/SFX). Edit here to tune. */
const JUNK = new RegExp([
  'lyric', 'lirik', 'letra', 'lagu', 'karaoke',
  'quran', "qur'an", 'koran', 'tilawat', 'tilawah', 'قرآن', 'القرآن', 'قران', 'تلاوة',
  'for sale', 'shop', 'store', 'market', 'parcel', 'packaging', 'brasil', 'official', 'oficial',
  'news', 'berita', 'detik', 'liputan', 'museum', 'adobe', 'sephora', 'daraz', 'dewalt',
  // famous people / channels, songs, religious pages, brands (v34)
  'mrbeast', 'ishowspeed', 'espn', 'fiba', 'mandela', 'netanyahu', 'jisoo', 'moosewala', 'sartaaj',
  'songs', 'beats', 'musik', 'lyrix', 'background music', 'la_note', 'islam', 'sajdah',
  'vivo_arabia', 'neutrogena', 'saadiyat',
].join('|'), 'iu');

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
    minDays: num(x?.minDays, 1, 30, d.minDays),
    excludeMusic: typeof x?.excludeMusic === 'boolean' ? x.excludeMusic : d.excludeMusic,
    excludeJunk: typeof x?.excludeJunk === 'boolean' ? x.excludeJunk : d.excludeJunk,
  };
}

/** Fancy letters (𝑸𝑼𝑹𝑨𝑵) to plain ones, and Arabic marks/invisible characters removed, so words can be matched. */
const plain = (t: string) => t.normalize('NFKC').replace(/[\p{M}\p{C}]/gu, '');

/** The sound's own name without the "original sound - " part; empty if it has no real letters. */
export function realName(name: string): string {
  const n = name.replace(/\p{C}/gu, '').replace(/^[^-–—]*(original|asli|оригинал|オリジナル)[^-–—]*[-–—]/iu, '').trim();
  return /[\p{L}\p{N}]{2}/u.test(n) ? n : '';
}

export type Verdict = { reason: string; score: number };

export function judge(sounds: Sound[], s: Settings): Map<string, Verdict> {
  const out = new Map<string, Verdict>();
  const seen = new Set<string>();
  const perCreator = new Map<string, number>();
  for (const k of [...sounds].sort((a, b) => b.views - a.views)) {
    // days seen weighs most: a sound that keeps coming back is a real trend, not one lucky video
    const score = Math.round(Math.log10(k.views + 1) * 10 + (k.regions.length - 1) * 5 + (k.days.length - 1) * 8);
    let reason = '';
    if (k.status === 'rejected') reason = 'rejected';
    else if (k.status !== 'approved') {
      if (!realName(k.name)) reason = 'bad name';
      else if (!k.creator.replace(/\p{C}|\s/gu, '')) reason = 'no creator';
      else if (s.excludeJunk && JUNK.test(plain(`${k.name} ${k.creator}`))) reason = 'junk word';
      else if (s.excludeMusic && !k.original) reason = 'music';
      else if (k.days.length < s.minDays) reason = 'few days';
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
