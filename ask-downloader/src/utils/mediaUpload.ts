/**
 * Media Library uploads from the browser.
 *
 * The file is sent as-is (not base64) with XMLHttpRequest, which — unlike
 * fetch — reports upload progress. The server checks everything again
 * (server/mediaTypes.ts); the checks here only make obvious mistakes fail
 * at once, without waiting for the upload.
 */

export type MediaCategory = 'image' | 'video' | 'audio' | 'document' | 'archive';

export interface MediaFileRecord {
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
}

const MB = 1024 * 1024;

/** Keep in step with server/mediaTypes.ts. */
const CATEGORY_OF: Record<string, MediaCategory> = {
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', avif: 'image', svg: 'image',
  mp4: 'video', webm: 'video', mov: 'video',
  mp3: 'audio', wav: 'audio', ogg: 'audio', m4a: 'audio',
  pdf: 'document', doc: 'document', docx: 'document', xls: 'document', xlsx: 'document',
  ppt: 'document', pptx: 'document', txt: 'document', csv: 'document',
  zip: 'archive',
};

export const MAX_BYTES: Record<MediaCategory, number> = {
  image: 10 * MB, audio: 30 * MB, document: 25 * MB, archive: 25 * MB, video: 100 * MB,
};
const MAX_SVG_BYTES = 2 * MB;

/** For the file picker's "accept" list. */
export const ACCEPT_ATTR = Object.keys(CATEGORY_OF).map((e) => `.${e}`).join(',');

export const extOf = (name: string) => (String(name).toLowerCase().match(/\.([a-z0-9]{1,5})$/) || [])[1] || '';
export const categoryOf = (name: string): MediaCategory | null => CATEGORY_OF[extOf(name)] || null;

export const formatBytes = (b: number) =>
  b >= MB ? `${(b / MB).toFixed(1).replace(/\.0$/, '')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

/** A plain-language reason the file can't be uploaded, or null if it looks fine. */
export function checkMediaFile(file: File): string | null {
  const ext = extOf(file.name);
  const category = CATEGORY_OF[ext];
  if (!category) return `${ext ? `.${ext.toUpperCase()}` : 'This'} files are not supported.`;
  if (!file.size) return 'This file is empty.';
  const limit = ext === 'svg' ? MAX_SVG_BYTES : MAX_BYTES[category];
  if (file.size > limit) {
    return `This file is ${formatBytes(file.size)}. The limit for ${ext === 'svg' ? 'SVG' : category} files is ${formatBytes(limit)}.`;
  }
  return null;
}

// One shape rather than a union: the project builds with strict mode off.
export type MediaUploadOutcome = { ok: boolean; file?: MediaFileRecord; error?: string };

export interface UploadHandle {
  promise: Promise<MediaUploadOutcome>;
  cancel: () => void;
}

/** Uploads one file, calling onProgress with 0–100 as it goes. */
export function uploadMediaFile(file: File, onProgress: (percent: number) => void): UploadHandle {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<MediaUploadOutcome>((resolve) => {
    xhr.open('POST', '/api/admin/media/upload');
    xhr.withCredentials = true;
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.onload = () => {
      let data: any = {};
      try { data = JSON.parse(xhr.responseText || '{}'); } catch {}
      if (xhr.status === 401) return resolve({ ok: false, error: 'Your session has ended. Please log in again.' });
      if (xhr.status >= 200 && xhr.status < 300 && data.ok) {
        onProgress(100);
        return resolve({ ok: true, file: data.file });
      }
      resolve({ ok: false, error: data.error || `The upload failed (error ${xhr.status}). Please try again.` });
    };
    xhr.onerror = () => resolve({ ok: false, error: 'Could not reach the server. Please check your connection.' });
    xhr.onabort = () => resolve({ ok: false, error: 'Upload cancelled.' });
    xhr.send(file);
  });
  return { promise, cancel: () => xhr.abort() };
}
