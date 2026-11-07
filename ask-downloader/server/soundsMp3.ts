/**
 * Trending Sounds: saves the MP3 of an APPROVED sound in the data folder
 * (<data>/sounds/<id>.mp3). Nothing here is public yet.
 * Safety: only https links on TikTok's own CDN or TikWM (no arbitrary URL),
 * size limit, real MP3 header check, our own file name (the id, digits only),
 * one download at a time (the host has about 1 CPU core).
 */
import fs from 'node:fs';
import path from 'node:path';
import { dataFolder } from './store.ts';

const MAX_BYTES = 8 * 1024 * 1024;
const HOSTS = [/(^|\.)tiktokcdn(-us|-eu)?\.com$/i, /(^|\.)tikwm\.com$/i];

let ensured = '';
export const soundsDir = () => {
  const dir = path.join(dataFolder(), 'sounds');
  if (ensured !== dir) { fs.mkdirSync(dir, { recursive: true }); ensured = dir; } // once, not on every file check
  return dir;
};

/** Ids of all saved MP3 files, from ONE directory read (much cheaper than one file check per sound). */
export function savedIds(): Set<string> {
  try {
    return new Set(fs.readdirSync(soundsDir()).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)));
  } catch {
    return new Set();
  }
}
export const soundFile = (id: string) => (/^\d{1,30}$/.test(id) ? path.join(soundsDir(), `${id}.mp3`) : '');
export const hasSoundFile = (id: string) => { const f = soundFile(id); return !!f && fs.existsSync(f); };

/** ID3 tag, or an MPEG audio frame sync (0xFF 0xE0+). */
function looksLikeMp3(b: Buffer): boolean {
  if (b.length < 1024) return false;
  if (b.subarray(0, 3).toString('latin1') === 'ID3') return true;
  return b[0] === 0xff && (b[1] & 0xe0) === 0xe0;
}

let busy = false;

/** Downloads the MP3 from `url` for sound `id`. Returns '' on success or a short reason. */
export async function saveSoundMp3(id: string, url: string | undefined): Promise<string> {
  const file = soundFile(id);
  if (!file) return 'bad id';
  if (!url) return 'no MP3 link yet (wait for the next collector run)';
  let u: URL;
  try { u = new URL(url); } catch { return 'bad link'; }
  if (u.protocol !== 'https:' || !HOSTS.some((h) => h.test(u.hostname))) return 'link host not allowed';
  if (busy) return 'another download is running, try again in a moment';
  busy = true;
  try {
    const res = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ASKDownloader/1.0)' }, signal: AbortSignal.timeout(30000), redirect: 'error' });
    if (!res.ok) return `download failed (HTTP ${res.status})`;
    const len = Number(res.headers.get('content-length') || 0);
    if (len > MAX_BYTES) return 'file too big';
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) return 'file too big';
    if (!looksLikeMp3(buf)) return 'not a valid MP3';
    fs.writeFileSync(file + '.tmp', buf);
    fs.renameSync(file + '.tmp', file);
    return '';
  } catch (err: any) {
    return `download failed (${String(err?.message || err).slice(0, 60)})`;
  } finally {
    busy = false;
  }
}
