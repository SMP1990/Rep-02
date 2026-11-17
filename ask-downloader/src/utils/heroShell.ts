/**
 * The server puts a plain copy of the top of the home page into the HTML
 * (server/heroShell.ts) so the heading shows before the scripts have run.
 * These helpers let the app take over from it.
 */

/** True while the server's copy is still on the page. */
export function hasHeroShell(): boolean {
  return typeof document !== 'undefined' && !!document.getElementById('hero-shell');
}

/** Removes the copy (safe to call any number of times). */
export function removeHeroShell(): void {
  if (typeof document === 'undefined') return;
  document.getElementById('hero-shell')?.remove();
}

let boot: any;

/** Site settings + home text the server put into the page, or undefined. */
export function bootConfig(): { siteSettings?: any; landingContent?: any } | undefined {
  if (boot !== undefined) return boot || undefined;
  boot = null;
  try {
    const el = typeof document !== 'undefined' ? document.getElementById('ask-boot') : null;
    if (el?.textContent) boot = JSON.parse(el.textContent);
  } catch {
    boot = null;
  }
  return boot || undefined;
}
