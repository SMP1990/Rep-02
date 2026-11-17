/**
 * Home page "hero shell" (speed: Largest Contentful Paint).
 *
 * The home page is built by JavaScript, so on a slow phone its big heading
 * appeared only after ~1 MB of script had downloaded and run. The server now
 * puts a plain copy of the top of the home page (an empty header bar, the
 * small badge and the heading box) straight into the HTML, so the heading is
 * painted together with the first paint. When the real page mounts it removes
 * the copy (src/utils/heroShell.ts), and the real heading sits in exactly the
 * same place (same classes, header heights measured: 64.8 px / 80.8 px).
 *
 * Safety rules:
 * - Only English, the default language: a small script removes the copy before
 *   the first paint when the visitor chose another language, so nobody sees
 *   English text flash in place of their own language.
 * - Nothing here is clickable; it is a picture of the top of the page.
 * - If the text cannot be built cleanly (empty, or a "{...}" placeholder left)
 *   no copy is sent and the page loads exactly as before.
 * - Removed after 10 s at the latest, so it can never cover the page.
 */
import { createHash } from 'crypto';
import { INITIAL_LANDING_CONTENT } from '../src/data/mockAdminData.ts';

// English defaults of the home hero. They MUST stay equal to `hero.badge`,
// `hero.titlePrefix` and `hero.titleHighlight` in src/context/LanguageContext.tsx
// (the English dictionary), because the real page shows those when the admin
// has not written his own text.
const EN_BADGE = 'High-Speed Social Media Video Downloader';
const EN_TITLE_PREFIX = 'Download videos of';
const EN_TITLE_HIGHLIGHT = 'Videos in 1080p Full HD';
const FIRST_PLATFORM = 'Facebook'; // first name of the rotating list in PublicHomePage.tsx

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Same rule as heroField() in src/utils/heroContent.ts: the admin's own words win, the shipped default is replaced by the English dictionary text. */
function pick(hero: any, field: 'heading' | 'trustBadge', english: string): string {
  const authored = String(hero?.[field] ?? '').trim();
  const shipped = String((INITIAL_LANDING_CONTENT.hero as any)[field] ?? '').trim();
  if (authored && authored !== shipped) return authored;
  return english || shipped || authored;
}

/** The HTML of the shell, or '' when it should not be sent. */
export function heroShellHtml(landingContent: any): string {
  const hero = landingContent?.hero;
  const badge = pick(hero, 'trustBadge', EN_BADGE);
  const heading = pick(hero, 'heading', EN_TITLE_PREFIX);
  const showsPlatform = heading.includes('{platform}');
  const [before, after = ''] = showsPlatform ? heading.split('{platform}') : [heading];
  const texts = [badge, before, after, EN_TITLE_HIGHLIGHT];
  if (!heading.trim() || texts.some((t) => /[{}]/.test(t))) return '';

  const platform = showsPlatform
    ? `<span class="inline-block min-w-[170px] sm:min-w-[230px] md:min-w-[280px] text-left sm:text-center"><span class="inline-block text-white">${FIRST_PLATFORM}</span></span>`
    : '';
  return (
    `<div id="hero-shell" aria-hidden="true" style="position:absolute;top:0;left:0;width:100%;z-index:70" class="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] text-[#2e2440] dark:text-[#f4eefb]">` +
    `<div class="w-full bg-white/90 dark:bg-[#181224]/90 border-b border-[#eae3ee]/80 dark:border-[#2e1d4d]/80"><div class="h-16 sm:h-20"></div></div>` +
    `<section class="relative z-10 pt-4 sm:pt-12 pb-1 sm:pb-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center">` +
    `<div class="max-w-3xl mx-auto space-y-4"><div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#f1e9fb] dark:bg-[#261b3b] text-[#6d46b8] dark:text-[#d1b9f7] border border-[#a78bda]/30 shadow-2xs">` +
    `<span class="w-4 h-4 inline-block"></span><span>${esc(badge)}</span></div></div>` +
    `<div class="max-w-6xl mx-auto mt-3 sm:mt-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-3 py-3 sm:px-8 sm:py-7 shadow-lg shadow-purple-500/20">` +
    `<p style="visibility:hidden" class="font-heading text-lg sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.25] flex flex-wrap items-center justify-center gap-x-2">` +
    `<span>${esc(before)}</span>${platform}${after ? `<span>${esc(after)}</span>` : ''}` +
    `<span class="w-full block mt-1 sm:mt-2 text-sm sm:text-xl md:text-2xl font-bold text-white/90">${esc(EN_TITLE_HIGHLIGHT)}</span>` +
    `</p></div></section></div>`
  );
}

/**
 * Runs before the first paint (inline, allowed by its hash in the CSP):
 * - sets dark mode early, with the same rule as src/context/ThemeContext.tsx;
 * - removes the shell at once for visitors who chose another language;
 * - shows the heading text when Fraunces is ready (at the latest after 3 s);
 * - removes it after 10 s in any case.
 */
export const HERO_SHELL_SCRIPT =
  "(function(){var d=document,s=d.getElementById('hero-shell');" +
  "try{var t=localStorage.getItem('fdown_theme_mode');" +
  "if(t!=='dark'&&t!=='light')t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';" +
  "if(t==='dark'){d.documentElement.classList.add('dark');d.documentElement.style.colorScheme='dark';}" +
  "var l=localStorage.getItem('fdownloader_lang');if(s&&l&&l!=='en'){s.remove();s=null;}}catch(e){}" +
  "if(!s)return;" +
  // The heading text waits for its real font (Fraunces): drawn first in the
  // narrower fallback font, the real heading would later count as a new,
  // larger "largest paint" and the speed gain would be lost.
  "var p=s.querySelector('p'),shown=0,show=function(){if(!shown&&p){shown=1;p.style.visibility='';}};" +
  // Fraunces is declared in the site's own CSS (src/fraunces.css) and its Latin
  // file is preloaded in <head>, so it can be awaited right away.
  "if(d.fonts&&d.fonts.load){Promise.all([d.fonts.load(\"800 1em Fraunces\"),d.fonts.load(\"700 1em Fraunces\")]).then(show,show);}" +
  "else show();" +
  "setTimeout(show,3000);" +
  "setTimeout(function(){if(s.parentNode)s.parentNode.removeChild(s);},10000);})();";

/** CSP source that allows exactly HERO_SHELL_SCRIPT and nothing else. */
export const HERO_SHELL_SCRIPT_CSP = `'sha256-${createHash('sha256').update(HERO_SHELL_SCRIPT).digest('base64')}'`;

/** Public site settings + home text for the first render, so the page does not wait for /api/site-config. */
export function bootConfigTag(siteSettings: any, landingContent: any): string {
  const json = JSON.stringify({ siteSettings, landingContent }).replace(/</g, '\\u003c');
  return `<script type="application/json" id="ask-boot">${json}</script>`;
}
