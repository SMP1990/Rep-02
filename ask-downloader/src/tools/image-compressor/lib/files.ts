// File names and sizes for the list and the downloads.

export const MAX_FILES = 20;
export const MAX_FILE_MB = 50;
export const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif,image/heic,image/heif';

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** "IMG 2041.HEIC" + image/webp -> "IMG 2041-compressed.webp" */
export function outName(original: string, type: string): string {
  const base = original.replace(/\.[^./\\]+$/, '') || 'image';
  return `${base}-compressed.${EXT[type] || 'jpg'}`;
}

/** Same name twice in one ZIP gets " (2)", " (3)"... */
export function uniqueNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((n) => {
    const count = (seen.get(n) || 0) + 1;
    seen.set(n, count);
    return count === 1 ? n : n.replace(/(\.[^.]+)?$/, ` (${count})$1`);
  });
}

export function formatBytes(bytes: number, lang: string): string {
  const fmt = (v: number, d: number) => {
    try {
      return new Intl.NumberFormat(lang, { maximumFractionDigits: d }).format(v);
    } catch {
      return v.toFixed(d);
    }
  };
  if (bytes < 1024) return `${fmt(bytes, 0)} B`;
  if (bytes < 1024 * 1024) return `${fmt(bytes / 1024, 0)} KB`;
  return `${fmt(bytes / 1024 / 1024, 2)} MB`;
}

/** Percent saved, never below 0 in the label. */
export const saved = (before: number, after: number) => Math.max(0, Math.round((1 - after / before) * 100));

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
