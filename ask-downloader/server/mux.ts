/**
 * Audio/video muxing helper.
 *
 * Some sources (notably Reddit) serve video and audio as two entirely
 * separate streams. Concatenating only the video track produces a
 * silent file — the two tracks have to be combined into one container.
 * That needs ffmpeg, so this module locates an ffmpeg binary at runtime
 * and reports honestly when none is available, rather than silently
 * handing back a video with no sound.
 */

import { spawn } from 'child_process';
import { makeRunnable, canRun } from './binaries.ts';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

let ffmpegPromise: Promise<string | null> | null = null;

/** Locates an ffmpeg binary that is PROVEN to run: the optional
 * `ffmpeg-static` package first (its exec permission is repaired if the
 * host stripped it), then a system ffmpeg on PATH. Null if none runs.
 * Cached as a promise so concurrent callers share one lookup. */
export function findFfmpeg(): Promise<string | null> {
  if (!ffmpegPromise) ffmpegPromise = locateFfmpeg();
  return ffmpegPromise;
}

async function locateFfmpeg(): Promise<string | null> {
  try {
    const mod: any = await import('ffmpeg-static');
    const p = mod?.default || mod;
    if (typeof p === 'string' && p) {
      const runnable = await makeRunnable(p, 'ffmpeg', ['-version']);
      if (runnable) return runnable;
    }
  } catch {
    // ffmpeg-static not installed — fall through to the system binary.
  }
  if (await canRun('ffmpeg', ['-version'])) return 'ffmpeg';
  console.warn('[mux] No runnable ffmpeg — separate audio/video streams cannot be combined.');
  return null;
}

/** True when this server can combine separate audio + video tracks. */
export async function canMux(): Promise<boolean> {
  return (await findFfmpeg()) !== null;
}

/**
 * Combines a video-only buffer and an audio-only buffer into a single
 * playable MP4. Streams are copied, not re-encoded, so this is fast and
 * lossless. Throws if ffmpeg isn't available or the merge fails — the
 * caller decides what to do instead.
 */
export async function muxAudioVideo(videoBuf: Buffer, audioBuf: Buffer): Promise<Buffer> {
  const ffmpegPath = await findFfmpeg();
  if (!ffmpegPath) throw new Error('ffmpeg is not available on this server.');

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mux-'));
  const videoPath = path.join(tmpDir, 'video.bin');
  const audioPath = path.join(tmpDir, 'audio.bin');
  const outPath = path.join(tmpDir, 'out.mp4');

  try {
    await fs.writeFile(videoPath, videoBuf);
    await fs.writeFile(audioPath, audioBuf);

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(ffmpegPath, [
        '-y',
        '-i', videoPath,
        '-i', audioPath,
        '-c', 'copy',
        '-movflags', '+faststart',
        '-shortest',
        outPath,
      ]);
      let stderr = '';
      proc.stderr.on('data', (d) => {
        stderr += d.toString();
      });
      proc.on('error', reject);
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`));
      });
    });

    return await fs.readFile(outPath);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Extracts the audio track from a video buffer and encodes it as MP3.
 * This is what makes the "Audio (MP3)" option a genuinely different,
 * much smaller file rather than the same video bytes renamed.
 */
export async function extractAudioAsMp3(videoBuf: Buffer): Promise<Buffer> {
  const ffmpegPath = await findFfmpeg();
  if (!ffmpegPath) throw new Error('ffmpeg is not available on this server.');

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mp3-'));
  const inPath = path.join(tmpDir, 'in.mp4');
  const outPath = path.join(tmpDir, 'out.mp3');

  try {
    await fs.writeFile(inPath, videoBuf);
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(ffmpegPath, [
        '-y', '-i', inPath,
        '-vn',
        '-c:a', 'libmp3lame',
        '-b:a', '192k',
        outPath,
      ]);
      let stderr = '';
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
      proc.on('error', reject);
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg mp3 extraction failed (${code}): ${stderr.slice(-400)}`));
      });
    });
    return await fs.readFile(outPath);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Reddit stores every video as two separate, complete MP4 files on
 * v.redd.it: a video-only track (e.g. CMAF_720.mp4 / DASH_720.mp4) and
 * an audio-only track next to it. Given the video URL, returns the
 * likely audio URLs to try, newest naming scheme first. Returns [] for
 * anything that isn't a Reddit video-track URL.
 */
export function redditAudioCandidates(videoUrl: string): string[] {
  let u: URL;
  try {
    u = new URL(videoUrl);
  } catch {
    return [];
  }
  if (!u.hostname.endsWith('redd.it')) return [];
  const m = u.pathname.match(/^(.*\/)(CMAF|DASH)_\d+\.mp4$/i);
  if (!m) return [];
  const base = `${u.protocol}//${u.host}${m[1]}`;
  return [
    'CMAF_AUDIO_128.mp4',
    'CMAF_AUDIO_64.mp4',
    'DASH_AUDIO_128.mp4',
    'DASH_AUDIO_64.mp4',
    'DASH_audio.mp4',
    'audio',
  ].map((f) => base + f);
}
