/**
 * Video watermark remover: ffmpeg's delogo filter fills the boxes the
 * visitor drew from the pixels around them, on every frame.
 * Re-encoding video is heavy for the plan's single core, so:
 * - one video at a time, the rest wait in line (no size or count limit,
 *   only a 2 GB safety cap per upload so the shared disk cannot fill up);
 * - ffmpeg uses 1 thread at the lowest CPU priority: the site always wins;
 * - uploads arrive in pieces into a temp folder (never memory); every file is
 *   deleted after download, on cancel, or 1 hour after it is ready.
 */
import { spawn, type ChildProcess } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { findFfmpeg } from './mux.ts';

export type Box = { x: number; y: number; w: number; h: number };
type State = 'queued' | 'working' | 'done' | 'failed';
type Job = {
  id: string; dir: string; input: string; output: string; name: string; boxes: Box[];
  state: State; progress: number; error?: string; duration: number; width: number; height: number;
  proc?: ChildProcess; doneAt?: number; size: number; received: number; started?: boolean;
};

export const MAX_UPLOAD = 2 * 1024 ** 3;
const KEEP_MS = 60 * 60 * 1000;
const jobs = new Map<string, Job>();
const line: Job[] = [];
let running: Job | null = null;

export class VideoBad extends Error {}

/** Reads duration and frame size from `ffmpeg -i` (no ffprobe on the host). */
async function probe(ffmpeg: string, file: string): Promise<{ duration: number; width: number; height: number }> {
  const err = await new Promise<string>((resolve) => {
    const p = spawn(ffmpeg, ['-hide_banner', '-nostdin', '-i', file]);
    let s = '';
    p.stderr.on('data', (d) => { if (s.length < 20000) s += d; });
    p.on('close', () => resolve(s));
    p.on('error', () => resolve(''));
  });
  const d = err.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  const v = err.match(/Stream #\S+.*?Video:.*?(\d{2,5})x(\d{2,5})/);
  if (!d || !v) throw new VideoBad('not a video');
  return { duration: +d[1] * 3600 + +d[2] * 60 + +d[3], width: +v[1], height: +v[2] };
}

/** delogo needs the box inside the frame, off the very edge. */
function filter(boxes: Box[], W: number, H: number): string {
  return boxes.map((b) => {
    const x = Math.max(1, Math.min(W - 3, Math.round(b.x)));
    const y = Math.max(1, Math.min(H - 3, Math.round(b.y)));
    const w = Math.max(2, Math.min(W - 1 - x, Math.round(b.w)));
    const h = Math.max(2, Math.min(H - 1 - y, Math.round(b.h)));
    return `delogo=x=${x}:y=${y}:w=${w}:h=${h}`;
  }).join(',');
}

function run(ffmpeg: string, job: Job, audio: 'copy' | 'aac'): Promise<boolean> {
  return new Promise((resolve) => {
    const args = [
      '-hide_banner', '-nostdin', '-y', '-threads', '1', '-i', job.input,
      '-vf', filter(job.boxes, job.width, job.height),
      '-map', '0:v:0', '-map', '0:a:0?',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-threads', '1',
      ...(audio === 'copy' ? ['-c:a', 'copy'] : ['-c:a', 'aac', '-b:a', '160k']),
      '-movflags', '+faststart', '-progress', 'pipe:1', '-nostats', job.output,
    ];
    const p = spawn(ffmpeg, args);
    job.proc = p;
    try { if (p.pid) os.setPriority(p.pid, 19); } catch { /* not allowed: normal priority */ }
    let tail = '';
    p.stdout.on('data', (d: Buffer) => {
      const m = String(d).match(/out_time_us=(\d+)/g);
      if (m && job.duration) job.progress = Math.min(0.99, Number(m[m.length - 1].split('=')[1]) / 1e6 / job.duration);
    });
    p.stderr.on('data', (d) => { tail = (tail + d).slice(-600); });
    p.on('error', () => resolve(false));
    p.on('close', (code) => {
      job.proc = undefined;
      if (code !== 0 && job.state === 'working') console.warn('[wm-video] ffmpeg', code, tail.replace(/\s+/g, ' ').slice(-200));
      resolve(code === 0);
    });
  });
}

async function next() {
  if (running || !line.length) return;
  const job = line.shift()!;
  running = job;
  job.state = 'working';
  const ffmpeg = await findFfmpeg();
  const ok = !!ffmpeg && ((await run(ffmpeg, job, 'copy')) || (job.state === 'working' && (await run(ffmpeg, job, 'aac'))));
  if (job.state === 'working') {
    job.state = ok ? 'done' : 'failed';
    job.progress = ok ? 1 : job.progress;
    job.doneAt = Date.now();
    if (!ok) { job.error = 'failed'; cleanup(job, false); }
  }
  fs.rm(job.input, { force: true }, () => {});
  running = null;
  next();
}

function cleanup(job: Job, forget = true) {
  job.proc?.kill('SIGKILL');
  fs.rm(job.dir, { recursive: true, force: true }, () => {});
  const i = line.indexOf(job);
  if (i >= 0) line.splice(i, 1);
  if (forget) jobs.delete(job.id);
}

setInterval(() => {
  const now = Date.now();
  for (const j of jobs.values()) if (j.doneAt && now - j.doneAt > KEEP_MS) cleanup(j);
}, 5 * 60 * 1000).unref();

// Folders left by a restart (jobs live in memory only) go after an hour.
setTimeout(() => {
  fs.readdir(os.tmpdir(), (err, names) => {
    if (err) return;
    for (const n of names) {
      if (!n.startsWith('wm-video-')) continue;
      const p = path.join(os.tmpdir(), n);
      fs.stat(p, (e, st) => { if (!e && Date.now() - st.mtimeMs > KEEP_MS) fs.rm(p, { recursive: true, force: true }, () => {}); });
    }
  });
}, 30_000).unref();

export async function videoAvailable(): Promise<boolean> {
  return (await findFfmpeg()) !== null;
}

/**
 * Uploads come in 8 MB pieces (one request each), so no request is long or
 * big: Node's 5-minute request limit and any proxy body limit never apply,
 * and a failed piece is simply sent again.
 */
export const CHUNK = 8 * 1024 * 1024;

export async function createVideoJob(name: string, boxes: Box[], size: number): Promise<string> {
  if (!(await findFfmpeg())) throw new Error('unavailable');
  if (!(size > 0) || size > MAX_UPLOAD) throw new VideoBad('too big');
  const id = crypto.randomBytes(16).toString('hex');
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'wm-video-'));
  jobs.set(id, {
    id, dir, input: path.join(dir, 'in'), output: path.join(dir, 'out.mp4'), name, boxes,
    state: 'queued', progress: 0, duration: 0, width: 0, height: 0, size, received: 0, doneAt: Date.now(),
  });
  return id;
}

/** Writes one piece at its offset; pieces must arrive in order (resends are fine). */
export async function addVideoChunk(id: string, offset: number, data: Buffer): Promise<number> {
  const j = jobs.get(id);
  if (!j || j.started) throw new VideoBad('no upload');
  if (offset > j.received || offset + data.length > j.size || data.length > CHUNK) throw new VideoBad('bad piece');
  const fh = await fs.promises.open(j.input, offset === 0 ? 'w' : 'r+');
  try { await fh.write(data, 0, data.length, offset); } finally { await fh.close(); }
  j.received = Math.max(j.received, offset + data.length);
  j.doneAt = Date.now(); // an upload left unfinished is removed an hour later
  return j.received;
}

/** All pieces are in: check the file and put it in line. */
export async function startVideoJob(id: string): Promise<void> {
  const j = jobs.get(id);
  if (!j || j.started || j.received !== j.size) throw new VideoBad('incomplete');
  const ffmpeg = await findFfmpeg();
  if (!ffmpeg) throw new Error('unavailable');
  try {
    Object.assign(j, await probe(ffmpeg, j.input));
  } catch (e) {
    cleanup(j);
    throw e;
  }
  j.started = true;
  j.doneAt = undefined;
  line.push(j);
  next();
}

export function videoJob(id: string) {
  const j = jobs.get(id);
  if (!j) return null;
  return {
    state: j.state, progress: Math.round(j.progress * 100) / 100, error: j.error,
    position: j.state === 'queued' ? line.indexOf(j) + 1 : 0, width: j.width, height: j.height, duration: j.duration,
  };
}

export function videoFile(id: string): { path: string; name: string; done: () => void } | null {
  const j = jobs.get(id);
  if (!j || j.state !== 'done') return null;
  return { path: j.output, name: j.name, done: () => setTimeout(() => cleanup(j), 10 * 60 * 1000).unref() };
}

export function cancelVideo(id: string): boolean {
  const j = jobs.get(id);
  if (!j) return false;
  j.state = 'failed';
  j.error = 'cancelled';
  cleanup(j);
  return true;
}
