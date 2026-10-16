/**
 * Asks for an image no wider than it is shown, so a 64px thumbnail does
 * not download a 1200px photo.
 *
 * - Unsplash: its own `w=` parameter.
 * - Our uploads (/uploads/…jpg|png|webp): /thumb/<w>/… — the server sends a
 *   smaller WebP, or the original if it cannot (server/imageResize.ts).
 * - Anything else is returned unchanged.
 *
 * `width` is in CSS pixels; it is doubled for sharp phone screens and rounded
 * up to one of the sizes the server makes.
 */
const SIZES = [160, 480, 800, 1200];

export function sizedImage(url: string | undefined, width: number): string {
  if (!url) return url || '';
  const target = SIZES.find((s) => s >= width * 2) || SIZES[SIZES.length - 1];
  try {
    if (/^https:\/\/images\.unsplash\.com\//.test(url)) {
      const u = new URL(url);
      u.searchParams.set('w', String(target));
      return u.toString();
    }
    if (/^\/uploads\/[^?#]+\.(jpe?g|png|webp)$/i.test(url)) {
      return `/thumb/${target}${url.slice('/uploads'.length)}`;
    }
  } catch {
    // Unparseable URL: show it as it was.
  }
  return url;
}
