// Small file helpers shared by the tabs.

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** "Report.final.pdf" -> "Report.final-no-watermark.pdf" */
export function cleanName(name: string, ext?: string): string {
  const m = name.match(/^(.*?)(\.[^./\\]+)?$/)!;
  return `${m[1] || 'file'}-no-watermark${ext ? '.' + ext : m[2] || ''}`;
}

export const isPhone = () =>
  typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

/** Phones' browsers refuse canvases much over ~16 MP. */
export const maxPixels = () => (isPhone() ? 16_000_000 : 60_000_000);
