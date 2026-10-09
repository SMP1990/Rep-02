/**
 * Media Library uploads: images, video, audio, documents and ZIP files.
 *
 * The file arrives as the raw request body (not base64 inside JSON) and is
 * streamed straight to disk, so a 100 MB video never sits in memory and the
 * browser can report real upload progress. It is then checked — extension
 * on the list, content really of that type, within the size limit — and
 * moved to /uploads/<year>/<month>/<clean-name>.<ext>. A record of every
 * file is kept in the "mediaFiles" collection.
 *
 * Older uploads stay where they are (/uploads/<name>): posts link to them.
 */
import type { Request } from 'express';
import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as store from './store.ts';
import { uploadsDir, optimizeImage, imageSize } from './uploads.ts';
import { TYPES, MAX_BYTES, MAX_SVG_BYTES, ACCEPTED_LIST, extOf, contentMatches, type MediaCategory } from './mediaTypes.ts';
import { sanitizeSvg } from './svgSanitize.ts';
import { cleanSlug } from '../src/utils/slug.ts';

export interface MediaFile {
  id: string;
  url: string;
  name: string;
  originalName: string;
  category: MediaCategory;
  ext: string;
  mime: string;
  bytes: number;
  originalBytes: number;
  width?: number;
  height?: number;
  uploadedAt: string;
  uploadedBy?: string;
}

const COLLECTION = 'mediaFiles';
export const readMediaFiles = (): MediaFile[] => store.read<MediaFile[]>(COLLECTION, []);

// One shape rather than a union: this project builds with strict mode off,
// where narrowing a union on `ok` is unreliable.
export type MediaUploadResult = { ok: boolean; file?: MediaFile; status?: number; error?: string };

const fail = (status: number, error: string): MediaUploadResult => ({ ok: false, status, error });
const mb = (n: number) => `${Math.round(n / 1048576)} MB`;

/** Readable, keyword-style file name: "My Holiday Photo (1).JPG" -> "my-holiday-photo-1". */
function cleanBase(originalName: string, category: MediaCategory): string {
  const base = originalName.replace(/\.[^.]*$/, '').normalize('NFKD').replace(/[̀-ͯ]/g, '');
  return cleanSlug(base.replace(/[_\s]+/g, '-'), 60) || category;
}

/** Writes the request body to a temporary file, stopping at `limit` bytes. */
function receive(req: Request, tmp: string, limit: number): Promise<{ ok: boolean; bytes?: number; tooBig?: boolean }> {
  return new Promise((resolve) => {
    const out = fsSync.createWriteStream(tmp);
    let bytes = 0;
    let done = false;
    const finish = (r: any) => { if (!done) { done = true; resolve(r); } };
    req.on('data', (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > limit) {
        req.unpipe(out);
        out.destroy();
        req.resume(); // drain the rest so the reply can be sent
        finish({ ok: false, tooBig: true });
      }
    });
    req.on('aborted', () => { out.destroy(); finish({ ok: false, tooBig: false }); });
    out.on('error', () => finish({ ok: false, tooBig: false }));
    out.on('finish', () => finish(bytes > limit ? { ok: false, tooBig: true } : { ok: true, bytes }));
    req.pipe(out);
  });
}

/** Handles one upload. The original file name comes in the X-File-Name header (URI-encoded). */
export async function handleMediaUpload(req: Request, uploadedBy?: string): Promise<MediaUploadResult> {
  let originalName = '';
  try { originalName = decodeURIComponent(String(req.headers['x-file-name'] || '')); } catch {}
  originalName = path.basename(originalName.replace(/\\/g, '/')).slice(0, 200);
  const ext = extOf(originalName);
  const type = TYPES[ext];
  if (!originalName || !type) return fail(415, `This file type is not supported. Allowed: ${ACCEPTED_LIST}.`);

  const limit = ext === 'svg' ? MAX_SVG_BYTES : MAX_BYTES[type.category];
  const declared = Number(req.headers['content-length'] || 0);
  const kind = ext === 'svg' ? 'SVG' : type.category;
  if (declared > limit) return fail(413, `"${originalName}" is ${mb(declared)}. The limit for ${kind} files is ${mb(limit)}.`);

  const tmpDir = path.join(uploadsDir(), '.incoming');
  await fs.mkdir(tmpDir, { recursive: true });
  const tmp = path.join(tmpDir, crypto.randomBytes(12).toString('hex'));
  try {
    const got = await receive(req, tmp, limit);
    if (!got.ok) return got.tooBig
      ? fail(413, `"${originalName}" is larger than the ${mb(limit)} limit for ${kind} files.`)
      : fail(400, 'The upload was interrupted. Please try again.');
    if (!got.bytes) return fail(400, `"${originalName}" is empty.`);

    // Check what the file really is. Office files (DOCX/XLSX/PPTX) need the
    // whole file to look inside; for everything else the start is enough.
    const needsWhole = ['docx', 'xlsx', 'pptx'].includes(ext);
    const whole = needsWhole ? await fs.readFile(tmp) : undefined;
    const head = whole ? whole.subarray(0, 65536) : await readHead(tmp, 65536);
    if (!contentMatches(ext, head, whole)) {
      return fail(415, `"${originalName}" is not a real ${ext.toUpperCase()} file, so it was not saved.`);
    }

    // Images are compressed (and usually converted to WebP), as before.
    let finalExt = ext === 'jpeg' ? 'jpg' : ext;
    let bytes = got.bytes;
    let width: number | undefined;
    let height: number | undefined;
    let data: Buffer | null = null;
    if (finalExt === 'svg') {
      // Only the cleaned copy is ever stored.
      const cleaned = sanitizeSvg((await fs.readFile(tmp)).toString('utf8'));
      if (!cleaned.ok) return fail(415, `"${originalName}": ${cleaned.error}`);
      data = Buffer.from(cleaned.svg!, 'utf8');
      bytes = data.length;
      const vb = cleaned.svg!.match(/viewBox="[\d.\s-]*?\s([\d.]+)\s+([\d.]+)"/);
      if (vb) { width = Math.round(Number(vb[1])); height = Math.round(Number(vb[2])); }
    } else if (type.category === 'image') {
      const original = await fs.readFile(tmp);
      if (['jpg', 'png', 'gif', 'webp'].includes(finalExt)) {
        const o = await optimizeImage(original, finalExt);
        data = o.buf; finalExt = o.ext; width = o.width; height = o.height; bytes = o.buf.length;
      } else {
        ({ width, height } = await imageSize(original));
      }
    }

    // /uploads/2026/10/name.ext — a number is added only if the name is taken.
    const now = new Date();
    const folder = path.join(String(now.getUTCFullYear()), String(now.getUTCMonth() + 1).padStart(2, '0'));
    await fs.mkdir(path.join(uploadsDir(), folder), { recursive: true });
    const base = cleanBase(originalName, type.category);
    let name = `${base}.${finalExt}`;
    for (let n = 2; fsSync.existsSync(path.join(uploadsDir(), folder, name)); n++) name = `${base}-${n}.${finalExt}`;
    const dest = path.join(uploadsDir(), folder, name);

    if (data) { await fs.writeFile(dest, data); await fs.unlink(tmp).catch(() => {}); }
    else await fs.rename(tmp, dest);

    const file: MediaFile = {
      id: `media_${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`,
      url: `/uploads/${folder.split(path.sep).join('/')}/${name}`,
      name,
      originalName,
      category: type.category,
      ext: finalExt,
      mime: TYPES[finalExt]?.mime || type.mime,
      bytes,
      originalBytes: got.bytes,
      ...(width ? { width, height } : {}),
      uploadedAt: now.toISOString(),
      ...(uploadedBy ? { uploadedBy } : {}),
    };
    store.write(COLLECTION, [file, ...readMediaFiles()]);
    return { ok: true, file };
  } catch (err: any) {
    console.warn('[media] upload failed:', err);
    return fail(500, 'The file could not be saved. Please try again.');
  } finally {
    await fs.unlink(tmp).catch(() => {});
  }
}

async function readHead(file: string, n: number): Promise<Buffer> {
  const fh = await fs.open(file, 'r');
  try {
    const buf = Buffer.alloc(n);
    const { bytesRead } = await fh.read(buf, 0, n, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await fh.close();
  }
}

/** Drops the record of a deleted file. */
export function forgetMediaFile(url: string): void {
  const list = readMediaFiles();
  const next = list.filter((f) => f.url !== url);
  if (next.length !== list.length) store.write(COLLECTION, next);
}

/** Response headers that keep uploaded files from being run as a web page. */
export function uploadHeaders(res: { setHeader: (k: string, v: string) => void }, filePath: string): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const ext = extOf(filePath);
  // Office files and ZIPs are downloaded, never opened inside the site.
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip'].includes(ext)) {
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
  }
  // An SVG opened on its own may not run anything or load anything from
  // elsewhere — a second wall behind the cleaning done at upload.
  if (ext === 'svg') {
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox");
  }
  // Plain text is always shown as text, in UTF-8 so Urdu/Arabic read correctly.
  if (ext === 'txt') res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  if (ext === 'csv') res.setHeader('Content-Type', 'text/csv; charset=utf-8');
}
