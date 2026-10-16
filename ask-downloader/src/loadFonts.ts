/**
 * index.html only *preloads* the Google Fonts stylesheet, so the browser
 * fetches it early without blocking the first paint. Here it becomes a real
 * stylesheet. Done from a bundled script (not an inline onload="…") because
 * the CSP only allows scripts from our own origin.
 */
export function loadFonts(): void {
  const preload = document.getElementById('google-fonts') as HTMLLinkElement | null;
  if (!preload || document.querySelector('link[data-fonts-applied]')) return;
  const sheet = document.createElement('link');
  sheet.rel = 'stylesheet';
  sheet.href = preload.href;
  sheet.setAttribute('data-fonts-applied', '');
  document.head.appendChild(sheet);
}
