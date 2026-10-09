/**
 * yt-dlp integration.
 *
 * Provisioning (proven on Hostinger by the diagnostic): the ~40 MB
 * yt-dlp_linux binary can't ship in the deploy zip (upload limit), so it
 * is uploaded once via File Manager as yt-dlp_linux.part1..N into the
 * domain folder or public_html (which survive redeploys). At startup the
 * parts are joined into an app-local folder, made executable, and proven
 * to run. TMPDIR points inside the app because /tmp is no-exec.
 *
 * Extraction: `yt-dlp -J` gives every real format with real sizes and
 * duration. Files are then served through short-lived tokens
 * (/api/video/ytdlp-stream/<token>) so platform headers/cookies stay on
 * the server and separate audio+video tracks can be muxed with ffmpeg.
 */
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { Readable } from 'stream';
import type { Request, Response } from 'express';
import { makeRunnable, runtimeDir } from './binaries.ts';
import { formatBytes, formatDuration, SIZE_UNAVAILABLE_LABEL } from './extractorCommon.ts';
import { canMux, muxAudioVideo } from './mux.ts';

const KNOWN_SHA256 = '58162f9bfdc27458ea47bfcb311cf47028f17d8154a8bf7d689861d46399230a'; // yt-dlp_linux 2026.08.19
const MAX_CONCURRENT = 3;
const RUN_TIMEOUT_MS = 25000;

let status: any = { ready: false, version: '', source: '', note: 'not started' };
let binPromise: Promise<string | null> | null = null;
let active = 0;

export const ytdlpStatus = () => status;
let failedAt = 0;
/** Cached. If the parts weren't there yet, looks again at most once a
 * minute — so uploading them after a deploy works without a restart. */
export function getYtdlp(): Promise<string | null> {
  if (process.env.YTDLP_DISABLED === '1') { status.note = 'disabled by YTDLP_DISABLED=1'; return Promise.resolve(null); }
  if (!binPromise || (failedAt && Date.now() - failedAt > 60_000)) {
    failedAt = 0;
    binPromise = provision().then((b) => { if (!b) failedAt = Date.now(); return b; });
  }
  return binPromise;
}

async function ytEnv(): Promise<NodeJS.ProcessEnv> {
  return { ...process.env, TMPDIR: await runtimeDir('yt-tmp') };
}

function run(file: string, args: string[], env: NodeJS.ProcessEnv, timeoutMs: number): Promise<{ code: number | null; out: string; err: string }> {
  return new Promise((resolve) => {
    let out = '', err = '', done = false;
    const finish = (code: number | null) => { if (!done) { done = true; resolve({ code, out, err }); } };
    try {
      const p = spawn(file, args, { env });
      const t = setTimeout(() => { p.kill('SIGKILL'); err += ' [timeout]'; }, timeoutMs);
      p.stdout.on('data', (d) => (out += d));
      p.stderr.on('data', (d) => (err += d));
      p.on('error', (e) => { clearTimeout(t); err += String(e); finish(null); });
      p.on('close', (code) => { clearTimeout(t); finish(code); });
    } catch (e) {
      err = String(e);
      finish(null);
    }
  });
}

/** Every folder that survives a redeploy and could hold the parts:
 * overrides, the app folder's ancestors, the account home, and every
 * site folder under ~/domains — each plus its public_html. */
/** Folders that a redeploy does NOT replace (the build folder and its
 * public_html DO get replaced, which is why uploads there disappear). */
function persistentDirs(): string[] {
  return [path.join(path.resolve(process.cwd(), '../../../..'), '.ytdlp'), path.join(os.homedir(), '.ytdlp')];
}

function searchDirs(): string[] {
  const dirs: string[] = [];
  const add = (d?: string) => {
    if (!d) return;
    // .ytdlp = where a previous site on this account already stored it,
    // so moving to a new domain needs no re-upload.
    for (const x of [d, path.join(d, 'public_html'), path.join(d, 'yt-dlp'), path.join(d, '.ytdlp')]) if (!dirs.includes(x)) dirs.push(x);
  };
  for (const d of persistentDirs()) if (!dirs.includes(d)) dirs.push(d); // checked first — survives redeploys
  add(process.env.YTDLP_DIR);
  // This site's own folders first, then the account home (a main domain's
  // File Manager opens at ~/public_html, not inside ~/domains/<site>).
  let up = process.cwd();
  for (let i = 0; i < 8; i++) { add(up); const parent = path.dirname(up); if (parent === up) break; up = parent; }
  add(os.homedir());
  for (const root of [path.join(os.homedir(), 'domains'), path.resolve(process.cwd(), '../../../../..')]) {
    add(path.dirname(root));
    try {
      for (const site of fsSync.readdirSync(root)) add(path.join(root, site));
    } catch {}
  }
  // Keep folders belonging to THIS site ahead of other sites on the account.
  const mine = path.resolve(process.cwd(), '../../../..');
  return [...dirs.filter((d) => d.startsWith(mine)), ...dirs.filter((d) => !d.startsWith(mine))];
}

/** Anything that looks like an attempted upload — helps spot renamed files. */
function lookalikes(dirs: string[]): string[] {
  const hits: string[] = [];
  for (const d of dirs) {
    try {
      for (const n of fsSync.readdirSync(d)) if (/yt.?dlp/i.test(n)) hits.push(path.join(d, n));
    } catch {}
    if (hits.length > 12) break;
  }
  return hits;
}

async function provision(): Promise<string | null> {
  status = { ready: false, version: '', source: '', note: 'searching' };
  const env = await ytEnv();
  for (const dir of searchDirs()) {
    // A complete single file (e.g. uploaded where no size limit applies).
    const single = path.join(dir, 'yt-dlp_linux');
    try {
      if ((await fs.stat(single)).size > 30_000_000) {
        const ok = await makeRunnable(single, 'yt-dlp_linux', ['--version'], env);
        if (ok) return ready(ok, `file ${single}`, env);
      }
    } catch {}

    // Split parts yt-dlp_linux.part1..N.
    let parts: string[] = [];
    try { parts = (await fs.readdir(dir)).filter((n) => /^yt-dlp_linux\.part\d+$/.test(n)); } catch { continue; }
    if (!parts.length) continue;
    parts.sort((a, b) => +a.split('part')[1] - +b.split('part')[1]);
    const joined = Buffer.concat(await Promise.all(parts.map((n) => fs.readFile(path.join(dir, n)))));
    const out = path.join(await runtimeDir(), 'yt-dlp_linux');
    await fs.writeFile(out, joined);
    await fs.chmod(out, 0o755);
    const sum = crypto.createHash('sha256').update(joined).digest('hex') === KNOWN_SHA256 ? 'checksum OK' : 'newer version';
    const ok = await makeRunnable(out, 'yt-dlp_linux', ['--version'], env);
    if (ok) return ready(ok, `${parts.length} parts in ${dir} (${sum})`, env);
    status.note = `parts in ${dir} joined to ${joined.length} bytes but do not run — a part is missing or broken`;
    console.warn(`[yt-dlp] ${status.note}`);
    return null;
  }
  const dirs = searchDirs();
  const similar = lookalikes(dirs);
  status.note = similar.length
    ? `parts not found, but these look like attempted uploads (check the file names): ${similar.join(' | ')}`
    : 'yt-dlp_linux parts not found in any of the folders listed in "searched"';
  status.searched = dirs;
  status.lookalikes = similar;
  console.warn(`[yt-dlp] ${status.note}`);
  return null;
}

/** Saves the working binary where redeploys can't remove it, so the
 * parts only ever have to be uploaded once. */
async function keepPermanentCopy(bin: string): Promise<string> {
  for (const dir of persistentDirs()) {
    const dest = path.join(dir, 'yt-dlp_linux');
    if (path.resolve(bin) === path.resolve(dest)) return `already stored at ${dest}`;
    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.copyFile(bin, dest);
      await fs.chmod(dest, 0o755);
      return `permanent copy saved at ${dest} — the uploaded parts are no longer needed`;
    } catch {}
  }
  return 'could NOT save a permanent copy — keep the uploaded parts in place';
}

async function ready(bin: string, source: string, env: NodeJS.ProcessEnv): Promise<string> {
  const v = await run(bin, ['--version'], env, 20000);
  const stored = await keepPermanentCopy(bin);
  status = { ready: true, version: v.out.trim(), source, note: `ready — ${stored}`, searched: searchDirs() };
  console.log(`[yt-dlp] ready ${status.version} — ${source}`);
  return bin;
}

// ---------- short-lived download tokens ----------
type Media = { url: string; headers: Record<string, string> };
/** A token remembers WHAT it points at (page + which quality), not just
 * the CDN link — platform links expire after a while, so when a user
 * downloads long after fetching, the link is re-resolved automatically. */
type Entry = { pageUrl: string; platform: string; kind: 'video' | 'audio'; height: number; video?: Media; audio?: Media; created: number };
const tokens = new Map<string, Entry>();
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
let tokenFile = '';

/** Descriptors (no CDN links, no cookies) are kept on disk so links keep
 * working after a restart or redeploy. */
async function saveTokens(): Promise<void> {
  try {
    if (!tokenFile) tokenFile = path.join(persistentDirs()[0], 'tokens.json');
    const slim = [...tokens].slice(-400).map(([t, e]) => [t, { pageUrl: e.pageUrl, platform: e.platform, kind: e.kind, height: e.height, created: e.created }]);
    await fs.mkdir(path.dirname(tokenFile), { recursive: true });
    await fs.writeFile(tokenFile, JSON.stringify(slim));
  } catch {}
}

function loadTokens(): void {
  for (const dir of persistentDirs()) {
    try {
      const raw = JSON.parse(fsSync.readFileSync(path.join(dir, 'tokens.json'), 'utf8'));
      for (const [t, e] of raw) if (Date.now() - e.created < TOKEN_TTL_MS) tokens.set(t, e);
      tokenFile = path.join(dir, 'tokens.json');
      return;
    } catch {}
  }
}
loadTokens();

let saveTimer: NodeJS.Timeout | null = null;
function register(pageUrl: string, platform: string, kind: 'video' | 'audio', height: number, video: Media, audio?: Media): string {
  const now = Date.now();
  for (const [k, v] of tokens) if (now - v.created > TOKEN_TTL_MS) tokens.delete(k);
  if (tokens.size > 3000) tokens.delete(tokens.keys().next().value as string);
  const t = crypto.randomBytes(12).toString('hex');
  tokens.set(t, { pageUrl, platform, kind, height, video, audio, created: now });
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void saveTokens(), 2000);
  return `/api/video/ytdlp-stream/${t}`;
}

/** Headers yt-dlp says the CDN needs, including cookies (TikTok needs them). */
function mediaOf(f: any): Media {
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(f?.http_headers || {})) if (k.toLowerCase() !== 'accept-encoding') headers[k] = String(v);
  if (typeof f?.cookies === 'string' && f.cookies) {
    const attrs = /^(domain|path|expires|max-age|secure|httponly|samesite)$/i;
    const pairs = f.cookies.split(/;\s*/).filter((p: string) => p.includes('=') && !attrs.test(p.split('=')[0]));
    if (pairs.length) headers['Cookie'] = pairs.join('; ');
  }
  return { url: f.url, headers };
}

/** Re-asks yt-dlp for a fresh link to the same video and quality. Used
 * when the stored link has expired — the user just clicks Download and
 * it works, with nothing to re-paste. */
async function refresh(entry: Entry): Promise<boolean> {
  const bin = await getYtdlp();
  if (!bin) return false;
  try {
    const r = await run(bin, ['-J', '--no-playlist', '--no-warnings', '--no-cache-dir', '--socket-timeout', '10', entry.pageUrl], await ytEnv(), RUN_TIMEOUT_MS);
    if (r.code !== 0 || !r.out.trim()) return false;
    const parsed = parseInfo(JSON.parse(r.out));
    if (!parsed) return false;
    if (entry.kind === 'audio') {
      if (!parsed.bestAudio) return false;
      entry.video = mediaOf(parsed.bestAudio);
      entry.audio = undefined;
    } else {
      const heights = [...new Set(parsed.videos.map((f: any) => Number(f.height) || 0))].sort((a, b) => b - a) as number[];
      // Same height if it still exists, otherwise the closest one available.
      const h = heights.includes(entry.height) ? entry.height : heights.sort((a, b) => Math.abs(a - entry.height) - Math.abs(b - entry.height))[0];
      const pick = pickForHeight(parsed, h, await canMux());
      if (!pick) return false;
      entry.video = pick.video;
      entry.audio = pick.audio;
    }
    console.log(`[yt-dlp] refreshed an expired link for ${entry.pageUrl}`);
    return true;
  } catch (err) {
    console.warn('[yt-dlp] refresh failed:', err);
    return false;
  }
}

async function grab(m: Media): Promise<globalThis.Response> {
  return fetch(m.url, { headers: m.headers });
}

export async function handleYtdlpStream(req: Request, res: Response): Promise<any> {
  const entry = tokens.get(String(req.params.token || ''));
  if (!entry) return res.status(404).send('This download link is no longer available. Please fetch the video again.');
  try {
    // Platform links expire; if this one has, fetch a fresh one and carry on.
    if (!entry.video) {
      if (!(await refresh(entry))) return res.status(502).send('This video is no longer available from the source.');
    } else {
      const probe = await grab(entry.video).catch(() => null);
      if (!probe || !probe.ok) {
        probe?.body?.cancel().catch(() => {});
        if (!(await refresh(entry))) return res.status(502).send('This video is no longer available from the source.');
      } else {
        probe.body?.cancel().catch(() => {});
      }
    }

    if (entry.audio && (await canMux())) {
      const [v, a] = await Promise.all([grab(entry.video!), grab(entry.audio)]);
      if (!v.ok || !a.ok) return res.status(502).send('The source refused this download. Please fetch the video again.');
      const merged = await muxAudioVideo(Buffer.from(await v.arrayBuffer()), Buffer.from(await a.arrayBuffer()));
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Length', String(merged.length));
      return res.end(merged);
    }

    const up = await grab(entry.video!);
    if (!up.ok || !up.body) return res.status(502).send('The source refused this download. Please fetch the video again.');
    res.setHeader('Content-Type', up.headers.get('content-type') || 'video/mp4');
    const len = up.headers.get('content-length');
    if (len) res.setHeader('Content-Length', len);
    // @ts-ignore — web stream to node stream
    Readable.fromWeb(up.body).pipe(res);
  } catch (err) {
    console.warn('[yt-dlp] stream failed:', err);
    if (!res.headersSent) res.status(502).send('Download failed. Please try again.');
  }
}

// ---------- extraction ----------
const isAudioOnly = (f: any) => f.vcodec === 'none' && f.acodec && f.acodec !== 'none';
const isVideoOnly = (f: any) => f.acodec === 'none' && f.vcodec && f.vcodec !== 'none';
const isDirect = (f: any) => typeof f.url === 'string' && (f.protocol ? /^https?$/.test(f.protocol) : /^https?:/.test(f.url));
const isHls = (f: any) => typeof f.protocol === 'string' && f.protocol.startsWith('m3u8');
const rate = (f: any) => f.tbr || f.vbr || f.abr || 0;

function bytesOf(f: any, dur: number): { n: number; exact: boolean } {
  if (f?.filesize) return { n: f.filesize, exact: true };
  if (f?.filesize_approx) return { n: f.filesize_approx, exact: false };
  const r = rate(f);
  return r && dur ? { n: Math.round((r * 1000 / 8) * dur), exact: false } : { n: 0, exact: false };
}
function sizeLabel(parts: Array<{ n: number; exact: boolean }>): string {
  if (parts.some((p) => !p.n)) return SIZE_UNAVAILABLE_LABEL;
  const total = parts.reduce((s, p) => s + p.n, 0);
  return (parts.every((p) => p.exact) ? '' : '~') + formatBytes(total);
}
const label = (h: number) => (h ? `${h}p${h >= 1080 ? ' (Full HD)' : h >= 720 ? ' (HD)' : ' (SD)'}` : 'Best Quality');
const best = (list: any[]) => [...list].sort((a, b) => rate(b) - rate(a))[0];

type SizeJob = { q: any; media: Media[] };

/** Parses a yt-dlp JSON dump into the pieces both paths need. */
function parseInfo(raw: any) {
  const info = raw?._type === 'playlist' ? (raw.entries || []).find((e: any) => e?.formats || e?.url) : raw;
  if (!info) return null;
  const formats: any[] = (info.formats?.length ? info.formats : [info]).filter(
    (f: any) => f?.url && f.ext !== 'mhtml' && !(f.vcodec === 'none' && f.acodec === 'none')
  );
  return {
    info,
    dur: Number(info.duration) || 0,
    formats,
    bestAudio: best(formats.filter((f) => isAudioOnly(f) && isDirect(f))),
    videos: formats.filter((f) => !isAudioOnly(f) && (isDirect(f) || isHls(f))),
  };
}

/** Chooses the stream(s) for one height: a combined file, else video+audio
 * to be muxed, else an HLS manifest. The same choice every time, so a
 * re-resolved link matches what the user originally picked. */
function pickForHeight(p: ReturnType<typeof parseInfo>, h: number, allowMux: boolean) {
  if (!p) return null;
  const atH = p.videos.filter((f: any) => (Number(f.height) || 0) === h);
  const combined = best(atH.filter((f: any) => !isVideoOnly(f) && isDirect(f)));
  if (combined) return { f: combined, video: mediaOf(combined), audio: undefined as Media | undefined, sizes: [combined], hls: false };
  const vOnly = best(atH.filter((f: any) => isVideoOnly(f) && isDirect(f)));
  if (vOnly && p.bestAudio && allowMux) return { f: vOnly, video: mediaOf(vOnly), audio: mediaOf(p.bestAudio) as Media | undefined, sizes: [vOnly, p.bestAudio], hls: false };
  const hls = best(atH.filter((f: any) => !isVideoOnly(f) && isHls(f)));
  if (hls) return { f: hls, video: mediaOf(hls), audio: undefined as Media | undefined, sizes: [hls], hls: true };
  return null;
}

export function buildResult(raw: any, url: string, platform: string, allowMux: boolean, sizeJobs: SizeJob[] = []): any | null {
  const parsed = parseInfo(raw);
  if (!parsed) return null;
  const { info, dur, bestAudio, videos } = parsed;
  const heights = [...new Set(videos.map((f: any) => Number(f.height) || 0))].sort((a, b) => b - a).slice(0, 3) as number[];

  const qualities: any[] = [];
  for (const h of heights) {
    const pick = pickForHeight(parsed, h, allowMux);
    if (!pick) continue;
    const f = pick.f;
    // Resolution is named by the SHORT side (a vertical 1080x1920 clip is 1080p, not 1920p).
    const shortSide = f.width && f.height ? Math.min(f.width, f.height) : h;
    const row = {
      id: `yt_${h || 'best'}`,
      quality: label(shortSide),
      resolution: f.width && f.height ? `${f.width}x${f.height}` : '',
      format: String(f.ext === 'webm' ? 'webm' : 'mp4').toUpperCase(),
      fileSizeEstimate: sizeLabel(pick.sizes.map((s: any) => bytesOf(s, dur))),
      downloadUrl: pick.hls ? f.url : register(url, platform, 'video', h, pick.video, pick.audio),
      isHd: shortSide >= 720,
      hasAudio: true,
    };
    qualities.push(row);
    if (row.fileSizeEstimate === SIZE_UNAVAILABLE_LABEL && !pick.hls) {
      sizeJobs.push({ q: row, media: pick.audio ? [pick.video, pick.audio] : [pick.video] });
    }
  }
  if (!qualities.length) return null;

  // MP3: convert from the audio-only track when one exists (small download), else from the top video.
  qualities.push({
    id: 'yt_mp3',
    quality: 'Audio (MP3)',
    resolution: '192 kbps',
    format: 'MP3',
    fileSizeEstimate: SIZE_UNAVAILABLE_LABEL,
    downloadUrl: bestAudio ? register(url, platform, 'audio', 0, mediaOf(bestAudio)) : qualities[0].downloadUrl,
    isHd: false,
    hasAudio: true,
  });

  const views = Number(info.view_count);
  const likes = Number(info.like_count);
  const compact = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : `${n}`);
  return {
    id: `ytdlp_${platform}_${info.id || Date.now()}`,
    originalUrl: url,
    canonicalUrl: info.webpage_url || url,
    platform,
    title: String(info.title || info.description || `${platform} video`).slice(0, 200),
    description: info.description ? String(info.description).slice(0, 500) : undefined,
    authorName: info.uploader || info.channel || info.creator || `${platform} creator`,
    authorHandle: info.uploader_id ? `@${info.uploader_id}` : '',
    duration: formatDuration(dur),
    thumbnailUrl: info.thumbnail || '',
    viewsCount: views ? `${compact(views)} views` : 'Public Stream',
    likesCount: likes ? compact(likes) : undefined,
    fetchedAt: Date.now(),
    qualities,
  };
}

async function remoteBytes(m: Media): Promise<number> {
  const attempt = async (init: RequestInit) => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 5000);
    try { return await fetch(m.url, { ...init, signal: ctl.signal }); } finally { clearTimeout(t); }
  };
  try {
    const h = await attempt({ method: 'HEAD', headers: m.headers });
    const len = Number(h.headers.get('content-length'));
    if (h.ok && len > 0) return len;
  } catch {}
  try {
    const g = await attempt({ headers: { ...m.headers, Range: 'bytes=0-0' } });
    const total = Number((g.headers.get('content-range') || '').split('/')[1]);
    g.body?.cancel().catch(() => {});
    if (total > 0) return total;
  } catch {}
  return 0;
}

async function fillSizes(jobs: SizeJob[]): Promise<void> {
  await Promise.all(jobs.map(async ({ q, media }) => {
    const sizes = await Promise.all(media.map(remoteBytes));
    if (sizes.every((n) => n > 0)) q.fileSizeEstimate = formatBytes(sizes.reduce((s, n) => s + n, 0));
  }));
}

/** Returns a full result (real qualities, sizes, duration) or null on any failure. */
export async function extractViaYtdlp(url: string, platform: string): Promise<any | null> {
  const bin = await getYtdlp();
  if (!bin) return null;
  if (active >= MAX_CONCURRENT) {
    console.warn('[yt-dlp] busy — skipping to next method');
    return null;
  }
  active++;
  try {
    const r = await run(bin, ['-J', '--no-playlist', '--no-warnings', '--no-cache-dir', '--socket-timeout', '10', url], await ytEnv(), RUN_TIMEOUT_MS);
    if (r.code !== 0 || !r.out.trim()) {
      console.warn(`[yt-dlp] no result for ${url}: ${r.err.trim().split('\n').pop()?.slice(0, 300)}`);
      return null;
    }
    const sizeJobs: SizeJob[] = [];
    const result = buildResult(JSON.parse(r.out), url, platform, await canMux(), sizeJobs);
    if (result && sizeJobs.length) await fillSizes(sizeJobs);
    if (result) console.log(`[yt-dlp] extracted ${platform}: ${result.qualities.length} options`);
    return result;
  } catch (err) {
    console.warn('[yt-dlp] extraction error:', err);
    return null;
  } finally {
    active--;
  }
}
