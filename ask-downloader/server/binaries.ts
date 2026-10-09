/**
 * Makes external binaries (ffmpeg, yt-dlp) actually runnable on hosts
 * that strip the executable permission during build/upload — which
 * Hostinger does (proven by diagnostic: ffmpeg-static landed as 644 and
 * failed with EACCES, while a copy with +x inside the app folder ran).
 *
 * "Runnable" is always checked by really executing the binary, never by
 * merely checking that the file exists.
 */
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';

/** App-local folder for runnable copies. The system /tmp is mounted
 * no-exec on Hostinger, so it can't be used for this. */
export async function runtimeDir(sub = ''): Promise<string> {
  const dir = path.join(process.cwd(), '.runtime-bin', sub);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/** True only if `file args` really runs and exits 0. */
export function canRun(file: string, args: string[], env?: NodeJS.ProcessEnv, timeoutMs = 20000): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok: boolean) => { if (!done) { done = true; resolve(ok); } };
    try {
      const p = spawn(file, args, { env: env || process.env, stdio: 'ignore' });
      const t = setTimeout(() => { p.kill('SIGKILL'); finish(false); }, timeoutMs);
      p.on('error', () => { clearTimeout(t); finish(false); });
      p.on('close', (code) => { clearTimeout(t); finish(code === 0); });
    } catch {
      finish(false);
    }
  });
}

/**
 * Returns a path that is proven to run: the original if it already runs,
 * else the original after chmod 755, else an app-local copy with 755.
 * Returns null if none of those work. Logs which method succeeded.
 */
export async function makeRunnable(file: string, name: string, probeArgs: string[], env?: NodeJS.ProcessEnv): Promise<string | null> {
  if (await canRun(file, probeArgs, env)) return file;

  try {
    await fs.chmod(file, 0o755);
    if (await canRun(file, probeArgs, env)) {
      console.log(`[binaries] ${name}: fixed permission in place (${file})`);
      return file;
    }
  } catch {
    // Not allowed to chmod in place — try an app-local copy.
  }

  try {
    const copy = path.join(await runtimeDir(), name);
    await fs.copyFile(file, copy);
    await fs.chmod(copy, 0o755);
    if (await canRun(copy, probeArgs, env)) {
      console.log(`[binaries] ${name}: using runnable copy ${copy}`);
      return copy;
    }
  } catch (err) {
    console.warn(`[binaries] ${name}: copy fallback failed:`, err);
  }

  console.warn(`[binaries] ${name}: NOT runnable (${file})`);
  return null;
}
