/**
 * Canonical URL rules.
 *
 * A post's canonical is its own address by default, computed at view time
 * from the current domain and slug, so it follows slug and domain changes.
 * Only a canonical that points somewhere ELSE (the original of a copied
 * article) is worth storing. A stored copy of the post's own URL goes
 * stale the moment the slug changes, and then tells Google the real page
 * is the old address, which now only redirects.
 */

const parse = (url: string) => {
  try {
    return new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  } catch {
    return null;
  }
};
const sameHost = (u: URL) => typeof window === 'undefined' || u.host === window.location.host;
const blogSlug = (u: URL) => (u.pathname.match(/^\/blog\/([^/]+)\/?$/) || [])[1] || '';

/** What to store on save: '' when the value is empty or this post's own address. */
export function storedCanonical(value: string, ownSlugs: string[]): string {
  const v = String(value || '').trim();
  const u = v && parse(v);
  if (!u) return '';
  if (sameHost(u) && ownSlugs.includes(blogSlug(u))) return '';
  return u.href;
}

/**
 * What to use on the page: the stored canonical, unless it is a same-site
 * /blog/ address that is this post or no longer a live post (a stale slug).
 */
export function effectiveCanonical(value: string | undefined, currentSlug: string, liveSlugs: Set<string>): string {
  const u = value && parse(value);
  if (!u) return '';
  if (sameHost(u)) {
    const s = blogSlug(u);
    if (s && (s === currentSlug || !liveSlugs.has(s))) return '';
  }
  return u.href;
}
