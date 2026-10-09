/**
 * Which files the Media Library accepts, how big they may be, and how each
 * is recognised.
 *
 * A file is accepted only when its extension is on the list AND its content
 * really is that kind of file (checked from its first bytes), so a renamed
 * script or web page cannot get through as "photo.jpg".
 */

export type MediaCategory = 'image' | 'video' | 'audio' | 'document' | 'archive';

const MB = 1024 * 1024;

/** Largest single file per category. */
export const MAX_BYTES: Record<MediaCategory, number> = {
  image: 10 * MB,
  audio: 30 * MB,
  document: 25 * MB,
  archive: 25 * MB,
  video: 100 * MB,
};

interface TypeInfo { category: MediaCategory; mime: string; }

/** SVGs are text that is parsed and cleaned, so they get a tighter limit. */
export const MAX_SVG_BYTES = 2 * MB;

/** Accepted extensions. */
export const TYPES: Record<string, TypeInfo> = {
  jpg: { category: 'image', mime: 'image/jpeg' },
  jpeg: { category: 'image', mime: 'image/jpeg' },
  png: { category: 'image', mime: 'image/png' },
  gif: { category: 'image', mime: 'image/gif' },
  webp: { category: 'image', mime: 'image/webp' },
  avif: { category: 'image', mime: 'image/avif' },
  svg: { category: 'image', mime: 'image/svg+xml' },
  mp4: { category: 'video', mime: 'video/mp4' },
  webm: { category: 'video', mime: 'video/webm' },
  mov: { category: 'video', mime: 'video/quicktime' },
  mp3: { category: 'audio', mime: 'audio/mpeg' },
  wav: { category: 'audio', mime: 'audio/wav' },
  ogg: { category: 'audio', mime: 'audio/ogg' },
  m4a: { category: 'audio', mime: 'audio/mp4' },
  pdf: { category: 'document', mime: 'application/pdf' },
  doc: { category: 'document', mime: 'application/msword' },
  docx: { category: 'document', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  xls: { category: 'document', mime: 'application/vnd.ms-excel' },
  xlsx: { category: 'document', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  ppt: { category: 'document', mime: 'application/vnd.ms-powerpoint' },
  pptx: { category: 'document', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
  txt: { category: 'document', mime: 'text/plain' },
  csv: { category: 'document', mime: 'text/csv' },
  zip: { category: 'archive', mime: 'application/zip' },
};

/** The extension of a file name, lower-case, without the dot. */
export const extOf = (name: string) => (String(name).toLowerCase().match(/\.([a-z0-9]{1,5})$/) || [])[1] || '';

const ascii = (b: Buffer, from: number, to: number) => b.subarray(from, to).toString('latin1');
const starts = (b: Buffer, bytes: number[]) => bytes.every((x, i) => b[i] === x);

/** ISO media (MP4 family): the brand in the ftyp box tells MP4, MOV, M4A and AVIF apart. */
function isoBrands(b: Buffer): string[] | null {
  if (ascii(b, 4, 8) !== 'ftyp') return null;
  const size = Math.min(b.readUInt32BE(0) || 0, b.length);
  const brands = [ascii(b, 8, 12)];
  for (let i = 16; i + 4 <= size; i += 4) brands.push(ascii(b, i, i + 4));
  return brands;
}

/** Text files: readable UTF-8, no binary zero bytes. */
function looksLikeText(b: Buffer): boolean {
  const sample = b.subarray(0, 65536);
  if (sample.includes(0)) return false;
  return !sample.toString('utf8').includes('�');
}

/** Office files saved as ZIP carry their own folder inside. */
const OOXML_FOLDER: Record<string, string> = { docx: 'word/', xlsx: 'xl/', pptx: 'ppt/' };

/**
 * True when the file's content matches its extension. `head` is the start of
 * the file (64 KB is plenty); `whole` is the full file, needed only to look
 * inside DOCX/XLSX/PPTX.
 */
export function contentMatches(ext: string, head: Buffer, whole?: Buffer): boolean {
  const b = head;
  switch (ext) {
    case 'jpg': case 'jpeg': return starts(b, [0xff, 0xd8, 0xff]);
    case 'png': return starts(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case 'gif': return ascii(b, 0, 4) === 'GIF8';
    case 'webp': return ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP';
    case 'avif': { const br = isoBrands(b); return !!br && (br.includes('avif') || br.includes('avis')); }
    case 'mp4': case 'mov': case 'm4a': {
      const br = isoBrands(b);
      if (br) return !br.includes('avif') && !br.includes('avis');
      // Older QuickTime files can start with another box instead of ftyp.
      return ext === 'mov' && ['moov', 'mdat', 'wide', 'free', 'skip'].includes(ascii(b, 4, 8));
    }
    case 'webm': return starts(b, [0x1a, 0x45, 0xdf, 0xa3]);
    case 'mp3': return ascii(b, 0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0);
    case 'wav': return ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WAVE';
    case 'ogg': return ascii(b, 0, 4) === 'OggS';
    case 'pdf': return ascii(b, 0, 5) === '%PDF-';
    case 'doc': case 'xls': case 'ppt': return starts(b, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    case 'docx': case 'xlsx': case 'pptx':
      return starts(b, [0x50, 0x4b, 0x03, 0x04]) && !!whole && whole.includes(Buffer.from(OOXML_FOLDER[ext], 'latin1'));
    case 'zip': return starts(b, [0x50, 0x4b, 0x03, 0x04]) || starts(b, [0x50, 0x4b, 0x05, 0x06]);
    case 'txt': case 'csv': return looksLikeText(b);
    // Checked loosely here; sanitizeSvg() does the real parsing and cleaning.
    case 'svg': return looksLikeText(b) && /<svg[\s>]/i.test(b.toString('utf8'));
    default: return false;
  }
}

/** Shown when a type is not accepted. */
export const ACCEPTED_LIST = 'JPG, PNG, GIF, WebP, AVIF, SVG, MP4, WebM, MOV, MP3, WAV, OGG, M4A, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV, ZIP';
