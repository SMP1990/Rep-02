/**
 * Server-side data store.
 *
 * Dashboard data (contact messages, blog posts, subscribers, settings,
 * stats) lives on the SERVER, not in a visitor's browser — otherwise a
 * message a visitor sends never reaches the admin, and a post the admin
 * writes is invisible to visitors.
 *
 * It is stored as JSON files in a folder that a redeploy does not
 * replace (the same trick used for the yt-dlp binary). Everything is
 * kept in memory and written back atomically (temp file + rename), so a
 * crash mid-write can never leave a half-written file.
 *
 * This is deliberately behind a small interface: moving to MySQL later
 * means replacing this one file, not the dashboard.
 */
import * as fsSync from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TYPES, extOf, contentMatches } from './mediaTypes.ts';
import { sanitizeSvg } from './svgSanitize.ts';

/** Folders a redeploy does not replace. */
function candidates(): string[] {
  return [
    process.env.DATA_DIR || '',
    path.join(path.resolve(process.cwd(), '../../../..'), '.fdownloader-data'),
    path.join(os.homedir(), '.fdownloader-data'),
    path.join(process.cwd(), '.fdownloader-data'),
  ].filter(Boolean);
}

let dataDir = '';
function dir(): string {
  if (dataDir) return dataDir;
  for (const d of candidates()) {
    try {
      fsSync.mkdirSync(d, { recursive: true });
      fsSync.accessSync(d, fsSync.constants.W_OK);
      dataDir = d;
      console.log(`[store] data folder: ${d}`);
      return d;
    } catch {}
  }
  throw new Error('No writable data folder found');
}

export function dataFolder(): string {
  try { return dir(); } catch { return '(none writable)'; }
}

const cache = new Map<string, any>();

/** Reads a collection (cached after the first read). */
export function read<T>(name: string, fallback: T): T {
  if (cache.has(name)) return cache.get(name);
  let value = fallback;
  try {
    value = JSON.parse(fsSync.readFileSync(path.join(dir(), `${name}.json`), 'utf8'));
  } catch {
    // First run, or the file isn't there yet — start from the fallback.
  }
  cache.set(name, value);
  return value;
}

/**
 * Saves a collection immediately.
 *
 * An earlier version delayed the write by a fraction of a second to
 * batch them. That quietly lost any change if the app restarted or was
 * redeployed in that window — a changed password could simply revert.
 * These files are small, so writing at once is both safe and fast.
 * The temp-file + rename keeps it atomic.
 */
export function write<T>(name: string, value: T): T {
  cache.set(name, value);
  try {
    const file = path.join(dir(), `${name}.json`);
    const tmp = `${file}.tmp`;
    fsSync.writeFileSync(tmp, JSON.stringify(value));
    fsSync.renameSync(tmp, file);
  } catch (err) {
    console.warn(`[store] could not save ${name}:`, err);
  }
  return value;
}

/** Kept for callers that want an explicit checkpoint; writes are already
 * immediate, so there is nothing pending to flush. */
export async function flushAll(): Promise<void> {}

export const COLLECTIONS = ['adminAccount', 'adminUsers', 'adminProfile', 'messages', 'subscribers', 'blogPosts', 'blogCategories', 'blogComments', 'blogSeedRemoved', 'siteSettings', 'landingContent', 'sitePages', 'downloadStats', 'downloadTotals', 'visitors', 'notificationsRead', 'redirects', 'pageTranslations', 'pageTranslationEdits', 'mediaFiles'];

/** The shape each collection must have. A restore that writes the wrong
 * type (a string where a list belongs) breaks the site, so the file is
 * checked before anything is written. */
const SHAPES: Record<string, 'array' | 'object'> = {
  adminAccount: 'object', adminUsers: 'array', adminProfile: 'object',
  messages: 'array', subscribers: 'array', sitePages: 'object',
  blogPosts: 'array', blogCategories: 'array', blogComments: 'array',
  blogSeedRemoved: 'array', siteSettings: 'object',
  landingContent: 'object', downloadStats: 'array', downloadTotals: 'object',
  visitors: 'object', notificationsRead: 'array', redirects: 'array',
  pageTranslations: 'object', pageTranslationEdits: 'object', mediaFiles: 'array',
};

const shapeOf = (v: any) => (Array.isArray(v) ? 'array' : v && typeof v === 'object' ? 'object' : typeof v);

/** Uploaded files are part of the site: without them a restored blog
 * shows broken pictures. Included up to a sensible total size; anything
 * beyond it (usually large videos) is listed as skipped. */
const UPLOAD_LIMIT_BYTES = 60 * 1024 * 1024;

function readUploads(): { files: Record<string, string>; skipped: string[] } {
  const files: Record<string, string> = {};
  const skipped: string[] = [];
  let used = 0;
  const dir = path.join(dataFolder(), 'uploads');
  // Older uploads sit directly in the folder; newer ones in <year>/<month>/.
  // Keys keep that path ("2026/10/name.mp4") so a restore puts them back.
  const walk = (rel: string) => {
    let names: string[] = [];
    try { names = fsSync.readdirSync(path.join(dir, rel)); } catch { return; } // no uploads yet
    for (const name of names) {
      if (name.startsWith('.')) continue; // uploads still in progress
      const key = rel ? `${rel}/${name}` : name;
      const st = fsSync.statSync(path.join(dir, key));
      if (st.isDirectory()) { if (/^\d{4}(\/\d{2})?$/.test(key)) walk(key); continue; }
      if (!st.isFile()) continue;
      if (used + st.size > UPLOAD_LIMIT_BYTES) { skipped.push(key); continue; }
      files[key] = fsSync.readFileSync(path.join(dir, key)).toString('base64');
      used += st.size;
    }
  };
  walk('');
  return { files, skipped };
}

/** Whole-store backup — one file the admin can download and restore. */
export async function exportAll(): Promise<Record<string, any>> {
  await flushAll();
  const out: Record<string, any> = { exportedAt: new Date().toISOString(), version: 2, data: {} };
  for (const name of COLLECTIONS) {
    try {
      out.data[name] = JSON.parse(fsSync.readFileSync(path.join(dir(), `${name}.json`), 'utf8'));
    } catch {}
  }
  const { files, skipped } = readUploads();
  out.uploads = files;
  out.uploadsSkipped = skipped;
  return out;
}

export type RestoreResult = { restored: string[]; images: number; rejected: string[]; safetyCopy: string };

/**
 * Restores a backup. Everything is validated first, and the current data
 * is copied aside before anything is overwritten, so a bad file can
 * never leave the site empty.
 */
export async function importAll(payload: any): Promise<RestoreResult> {
  const data = payload?.data;
  if (!data || typeof data !== 'object') {
    throw new Error('This file is not a backup of this site.');
  }

  // 1. Validate before touching anything.
  const rejected: string[] = [];
  const accepted: Array<[string, any]> = [];
  for (const name of COLLECTIONS) {
    if (data[name] === undefined) continue;
    if (shapeOf(data[name]) !== SHAPES[name]) {
      rejected.push(`${name} (expected ${SHAPES[name]}, found ${shapeOf(data[name])})`);
      continue;
    }
    accepted.push([name, data[name]]);
  }
  if (!accepted.length) {
    throw new Error(
      rejected.length
        ? `Nothing could be restored — the file is damaged: ${rejected.join('; ')}`
        : 'This file has no recognisable backup data.'
    );
  }

  // 2. Keep a copy of what is here now, before overwriting it.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safetyCopy = path.join(dir(), `before-restore-${stamp}.json`);
  try {
    const current: Record<string, any> = {};
    for (const name of COLLECTIONS) {
      try { current[name] = JSON.parse(fsSync.readFileSync(path.join(dir(), `${name}.json`), 'utf8')); } catch {}
    }
    fsSync.writeFileSync(safetyCopy, JSON.stringify({ savedAt: new Date().toISOString(), data: current }));
  } catch (err) {
    console.warn('[store] could not write the pre-restore safety copy:', err);
  }

  // 3. Write.
  const restored: string[] = [];
  for (const [name, value] of accepted) {
    write(name, value);
    restored.push(name);
  }

  // 4. Uploaded files (Media Library). A backup file must never be able to
  // drop a script or an unexpected file onto the server, so each one needs
  // a plain name (optionally in <year>/<month>/), an accepted extension and
  // content that really is that type; SVGs are cleaned again.
  let images = 0;
  const uploads = payload?.uploads;
  if (uploads && typeof uploads === 'object') {
    try {
      const dest = path.join(dataFolder(), 'uploads');
      for (const [name, b64] of Object.entries(uploads)) {
        const key = String(name);
        const ext = extOf(key);
        if (!/^(\d{4}\/\d{2}\/)?[A-Za-z0-9][A-Za-z0-9._-]*$/.test(key) || key.includes('..') || !TYPES[ext] || typeof b64 !== 'string') continue;
        let buf = Buffer.from(b64, 'base64');
        if (!buf.length || !contentMatches(ext, buf.subarray(0, 65536), buf)) continue;
        if (ext === 'svg') {
          const cleaned = sanitizeSvg(buf.toString('utf8'));
          if (!cleaned.ok) continue;
          buf = Buffer.from(cleaned.svg!, 'utf8');
        }
        fsSync.mkdirSync(path.dirname(path.join(dest, key)), { recursive: true });
        fsSync.writeFileSync(path.join(dest, key), buf);
        images++;
      }
    } catch (err) {
      console.warn('[store] could not restore uploaded files:', err);
    }
  }

  return { restored, images, rejected, safetyCopy: path.basename(safetyCopy) };
}
