/**
 * Google Analytics 4.
 *
 * Nothing loads until a Measurement ID ("G-XXXXXXX") is saved in
 * Settings. The site's CSP forbids inline scripts, so the gtag setup
 * is served from our own /ga-init.js instead of an inline <script>.
 * Admin pages are never tracked, so your own visits don't skew reports.
 */
import * as store from './store.ts';
import { INITIAL_SITE_SETTINGS } from '../src/data/mockAdminData.ts';

const GA_ID = /^G-[A-Z0-9]{4,20}$/;

export function gaId(): string {
  // The store remembers the first fallback it is given for a missing file,
  // so every reader must pass the real defaults — an empty {} here used to
  // become the site's settings until the admin saved them.
  const s = store.read<any>('siteSettings', INITIAL_SITE_SETTINGS) || {};
  const id = String(s.googleAnalyticsId || '').trim().toUpperCase();
  return GA_ID.test(id) ? id : '';
}

/** Extra CSP sources GA needs — empty when GA is off. */
export const GA_CSP = {
  script: 'https://www.googletagmanager.com',
  connect: 'https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com',
};

/** Tags for <head>, or '' when GA is off or the page is an admin page. */
export function gaHeadTags(pathname: string): string {
  const id = gaId();
  if (!id || /^\/(admin|wp-admin|login)(\/|$)/.test(pathname)) return '';
  return (
    `    <script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>\n` +
    `    <script src="/ga-init.js"></script>\n`
  );
}

/** Body of /ga-init.js. GA4's enhanced measurement records the
 * in-app page changes (history events) on its own. */
export function gaInitScript(): string {
  const id = gaId();
  if (!id) return '/* Google Analytics is off */';
  return [
    'window.dataLayer = window.dataLayer || [];',
    'function gtag(){dataLayer.push(arguments);}',
    "gtag('js', new Date());",
    `gtag('config', '${id}');`,
  ].join('\n');
}
