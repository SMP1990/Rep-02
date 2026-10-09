/**
 * Image uploads.
 *
 * The app had no upload system at all — cover images, inline images and
 * avatars could only be pasted as external URLs. Files are stored in the
 * same deploy-proof folder the rest of the data uses, so uploads survive
 * redeploys, and are served back from /uploads/<name>.
 */
import { promises as fs } from 'fs';
import { smartSlug, cleanSlug } from '../src/utils/slug.ts';
import * as fsSync from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { dataFolder } from './store.ts';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
/** Nobody needs a 6000px photo on a web page; larger images are scaled
 * down before conversion, which is where most of the saving comes from. */
const MAX_DIMENSION = 2000;
const WEBP_QUALITY = 82;

let sharpModule: any | null | undefined;

/** sharp is an optional dependency: if the host cannot install it, uploads
 * still work — the original file is stored instead of a WebP. */
async function getSharp(): Promise<any | null> {
  if (sharpModule !== undefined) return sharpModule;
  try {
    const mod: any = await import('sharp');
    sharpModule = mod?.default || mod;
  } catch {
    sharpModule = null;
    console.warn('[uploads] sharp is not installed — images are stored as uploaded, without WebP conversion.');
  }
  return sharpModule;
}

export async function imageProcessingAvailable(): Promise<boolean> {
  return (await getSharp()) !== null;
}

/**
 * Converts a JPG/PNG/GIF/WebP to WebP and compresses it: much smaller files,
 * so pages load faster and score better, with no visible loss of quality.
 * Returns the original when that is smaller or conversion isn't possible.
 */
export async function optimizeImage(input: Buffer, ext: string): Promise<{ buf: Buffer; ext: string; width?: number; height?: number }> {
  const sharp = await getSharp();
  if (!sharp) return { buf: input, ext };
  try {
    const image = sharp(input, { animated: ext === 'gif' });
    const meta = await image.metadata();
    const tooWide = (meta.width || 0) > MAX_DIMENSION || (meta.height || 0) > MAX_DIMENSION;
    const { data, info } = await image
      .rotate() // honour the camera orientation before resizing
      .resize(tooWide ? { width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true } : undefined)
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    // Keep whichever is actually smaller — a tiny PNG icon can come out
    // larger as WebP, and shipping the bigger file would be pointless.
    if (data.length < input.length) return { buf: data, ext: 'webp', width: info.width, height: info.pageHeight || info.height };
    return { buf: input, ext, width: meta.width, height: meta.pageHeight || meta.height };
  } catch (err) {
    console.warn('[uploads] WebP conversion failed, storing the original:', err);
    return { buf: input, ext };
  }
}

/** Width and height of an image, when sharp is available. */
export async function imageSize(buf: Buffer): Promise<{ width?: number; height?: number }> {
  const sharp = await getSharp();
  if (!sharp) return {};
  try {
    const meta = await sharp(buf).metadata();
    return { width: meta.width, height: meta.pageHeight || meta.height };
  } catch {
    return {};
  }
}

/** Only real image types, matched on the file's own signature so a
 * renamed file cannot sneak through. */
const SIGNATURES: Array<{ ext: string; mime: string; test: (b: Buffer) => boolean }> = [
  { ext: 'jpg', mime: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', mime: 'image/png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: 'gif', mime: 'image/gif', test: (b) => b.subarray(0, 6).toString('ascii').startsWith('GIF8') },
  { ext: 'webp', mime: 'image/webp', test: (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP' },
];

export function uploadsDir(): string {
  const dir = path.join(dataFolder(), 'uploads');
  fsSync.mkdirSync(dir, { recursive: true });
  return dir;
}

export type UploadResult =
  | { ok: true; url: string; name: string; bytes: number; originalBytes: number }
  | { ok: false; error: string };

/**
 * Stores a data-URL image (what the browser sends after reading the
 * chosen file). Returns the public URL to save on the post/profile.
 */
export async function saveImage(dataUrl: string, hint = 'image'): Promise<UploadResult> {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return { ok: false, error: 'No image was received.' };
  }
  const comma = dataUrl.indexOf(',');
  const base64 = dataUrl.slice(comma + 1);
  let buf: Buffer;
  try {
    buf = Buffer.from(base64, 'base64');
  } catch {
    return { ok: false, error: 'That file could not be read.' };
  }

  if (!buf.length) return { ok: false, error: 'That file is empty.' };
  if (buf.length > MAX_BYTES) {
    return { ok: false, error: `Image is too large (${(buf.length / 1048576).toFixed(1)} MB). The limit is 5 MB.` };
  }

  const match = SIGNATURES.find((s) => s.test(buf));
  if (!match) return { ok: false, error: 'Only JPG, PNG, GIF and WebP images are allowed.' };

  const original = buf.length;
  const optimized = await optimizeImage(buf, match.ext);
  buf = optimized.buf;
  const ext = optimized.ext;

  // Descriptive, keyword filename (Google reads it): the post title's
  // keywords, e.g. "facebook-reels-downloader-cover.webp". Only a-z, 0-9
  // and hyphens survive, so nothing the user typed can escape the folder.
  // A short random tag is added only when that name is already taken.
  const base = cleanSlug(smartSlug(hint) || hint, 50) || 'image';
  let name = `${base}.${ext}`;
  while (fsSync.existsSync(path.join(uploadsDir(), name))) {
    name = `${base}-${crypto.randomBytes(2).toString('hex')}.${ext}`;
  }

  try {
    await fs.writeFile(path.join(uploadsDir(), name), buf);
  } catch (err: any) {
    return { ok: false, error: `Could not save the image: ${err?.message || 'unknown error'}` };
  }
  return { ok: true, url: `/uploads/${name}`, name, bytes: buf.length, originalBytes: original };
}

/**
 * The file on disk for an /uploads/... URL — either a plain name (older
 * uploads) or year/month/name — or null for anything that could point
 * outside the uploads folder.
 */
export function uploadPath(url: string): string | null {
  const rel = String(url || '').replace(/^\/uploads\//, '');
  if (!String(url || '').startsWith('/uploads/') || !/^(\d{4}\/\d{2}\/)?[A-Za-z0-9][A-Za-z0-9._-]*$/.test(rel) || rel.includes('..')) return null;
  return path.join(uploadsDir(), rel);
}

/** Removes an uploaded file. Ignores anything outside the uploads folder. */
export async function deleteImage(url: string): Promise<boolean> {
  const file = uploadPath(String(url || ''));
  if (!file) return false;
  try {
    await fs.unlink(file);
    return true;
  } catch {
    return false;
  }
}
