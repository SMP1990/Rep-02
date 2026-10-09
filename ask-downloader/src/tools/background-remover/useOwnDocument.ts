import { useEffect } from 'react';

/**
 * The tool page is served with its own headers (server.ts): a CSP that lets
 * the AI load from its CDN, and cross-origin isolation for faster
 * multi-threaded processing. Headers belong to a page load, so while this
 * page is open every move to another page of the site becomes a real page
 * load — that page then gets its normal headers again (e.g. YouTube embeds,
 * which isolation would block). Covers in-site links and buttons (they all
 * go through history.pushState) and the browser's back/forward buttons.
 */
export function useOwnDocument(path: string) {
  useEffect(() => {
    const push = history.pushState;
    history.pushState = function (data: unknown, unused: string, url?: string | URL | null) {
      if (url != null && new URL(String(url), location.href).pathname !== path) {
        location.assign(String(url));
        return;
      }
      return push.call(this, data, unused, url);
    };
    // Capture phase: runs before the app's own popstate handler.
    const onPop = (e: PopStateEvent) => {
      if (location.pathname === path) return;
      e.stopImmediatePropagation();
      location.reload();
    };
    window.addEventListener('popstate', onPop, true);
    return () => {
      history.pushState = push;
      window.removeEventListener('popstate', onPop, true);
    };
  }, [path]);
}
