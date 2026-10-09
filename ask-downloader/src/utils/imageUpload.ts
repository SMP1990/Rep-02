/**
 * Uploads an image chosen from the user's device to the server and
 * returns its public URL. One helper for every place that accepts an
 * image (cover image, images inside a post, avatars) so the validation
 * and error messages stay identical everywhere.
 */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// A single shape (rather than a union) because this project builds with
// strict mode off, where union narrowing on `ok` is unreliable.
export type UploadOutcome = { ok: boolean; url?: string; error?: string };

/** Checks the file before sending, so obvious mistakes fail instantly. */
export function checkImageFile(file: File): string | null {
  if (!ALLOWED.includes(file.type)) return 'Please choose a JPG, PNG, GIF or WebP image.';
  if (file.size > MAX_IMAGE_BYTES) {
    return `That image is ${(file.size / 1048576).toFixed(1)} MB. Please choose one under 5 MB.`;
  }
  return null;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('That file could not be read.'));
    reader.readAsDataURL(file);
  });
}

export async function uploadImage(file: File, hint = 'image'): Promise<UploadOutcome> {
  const problem = checkImageFile(file);
  if (problem) return { ok: false, error: problem };

  try {
    const dataUrl = await readAsDataUrl(file);
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl, hint }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) return { ok: false, error: data.error || 'The upload failed. Please try again.' };
    return { ok: true, url: data.url };
  } catch {
    return { ok: false, error: 'Could not reach the server. Please check your connection.' };
  }
}

/** Removes a previously uploaded file. Safe to call for external URLs —
 * it simply does nothing for anything the site did not store. */
export async function removeUploadedImage(url: string): Promise<void> {
  if (!url?.startsWith('/uploads/')) return;
  try {
    await fetch(`/api/admin/upload?url=${encodeURIComponent(url)}`, { method: 'DELETE', credentials: 'same-origin' });
  } catch {
    // Losing an orphaned file is not worth interrupting the user for.
  }
}

/** A neutral placeholder built from the person's initials, so an admin
 * without a photo is not represented by a stock picture of a stranger. */
export function initialsAvatar(name: string): string {
  const initials = (name || 'A')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6d46b8"/><stop offset="1" stop-color="#e6799f"/>
    </linearGradient></defs>
    <rect width="100" height="100" rx="50" fill="url(#g)"/>
    <text x="50" y="50" dy="0.35em" text-anchor="middle" font-family="system-ui, sans-serif"
          font-size="38" font-weight="700" fill="#ffffff">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
