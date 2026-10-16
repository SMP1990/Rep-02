/**
 * Smaller copies of uploaded images: /thumb/480/<file>  (for /uploads/<file>)
 *
 * Not /uploads/<file>?w=480: on the hosting, LiteSpeed sends files that exist
 * under /uploads/ straight from disk, so a query string there never reaches
 * this code. /thumb/… is not a real folder, so it always comes to Node.
 *
 * A 64px blog thumbnail used to download the full upload (one cover is a
 * 1.7 MB PNG). Here the server sends a WebP scaled to that width,
 * made once and then kept on disk. If sharp is not installed, or anything
 * goes wrong, the visitor is sent to the original file, so no image can ever
 * break because of this.
 *
 * When that happens, the X-Image-Resize header says why
 * (there is no server console on the hosting to read errors from).
 */
import type { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { dataFolder } from './store.ts';
import { getSharp, uploadsDir } from './uploads.ts';

/** Only these widths, so nobody can fill the disk with odd sizes. */
const WIDTHS = [160, 480, 800, 1200];
const RESIZABLE = /\.(jpe?g|png|webp)$/i;

function short(err: unknown): string {
  return String((err as any)?.message || err).replace(/[^\x20-\x7e]/g, ' ').slice(0, 160);
}

/** GET /thumb/:w/<path inside uploads> */
export async function resizedUpload(req: Request, res: Response, next: NextFunction) {
  const m = /^\/(\d+)(\/.+)$/.exec(req.path);
  const w = Number(m?.[1]);
  const rel = m?.[2] || '';
  if (req.method !== 'GET' || !WIDTHS.includes(w) || !RESIZABLE.test(rel)) return next();
  const fallback = (reason: string) => {
    res.setHeader('X-Image-Resize', `original: ${reason}`);
    res.setHeader('Cache-Control', 'no-cache');
    return res.redirect(302, '/uploads' + rel);
  };

  let source: string;
  let cached: string;
  try {
    const root = path.resolve(uploadsDir());
    source = path.resolve(root, '.' + decodeURIComponent(rel));
    if (!source.startsWith(root + path.sep) || !fs.existsSync(source)) {
      res.setHeader('X-Image-Resize', 'not found');
      return res.status(404).end();
    }
    const cacheRoot = path.resolve(dataFolder(), 'upload-thumbs', String(w));
    cached = path.resolve(cacheRoot, path.relative(root, source) + '.webp');
    if (!cached.startsWith(cacheRoot + path.sep)) return fallback('bad cache path');
  } catch (err) {
    return fallback(`path: ${short(err)}`);
  }

  const send = (buf: Buffer) => {
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=2592000');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Image-Resize', 'resized');
    res.end(buf);
  };

  try {
    if (fs.existsSync(cached) && fs.statSync(cached).mtimeMs >= fs.statSync(source).mtimeMs) {
      return send(fs.readFileSync(cached));
    }
  } catch {
    // Unreadable cache copy: make a new one below.
  }

  const sharp = await getSharp();
  if (!sharp) return fallback('sharp not available');

  let buf: Buffer;
  try {
    buf = await sharp(fs.readFileSync(source))
      .rotate()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 78, effort: 4 })
      .toBuffer();
  } catch (err) {
    return fallback(`sharp: ${short(err)}`);
  }
  // A tiny original can come out bigger as WebP — then just use it.
  if (buf.length >= fs.statSync(source).size) return fallback('original is smaller');

  try {
    fs.mkdirSync(path.dirname(cached), { recursive: true });
    fs.writeFileSync(cached, buf);
  } catch {
    // Could not keep a copy on disk; still send this one.
  }
  return send(buf);
}
