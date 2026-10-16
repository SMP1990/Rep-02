/**
 * index.html only *preloads* the Latin Google Fonts stylesheet (Fraunces +
 * Plus Jakarta Sans), so the browser fetches it early without blocking the
 * first paint. Here it becomes a real stylesheet. Done from a bundled script
 * (not an inline onload="…") because the CSP only allows scripts from our
 * own origin.
 *
 * The Arabic, Urdu and Hindi fonts (~440 KB together) are added only for
 * pages in those languages: the reader's chosen language, or a blog post
 * written in one (both set <html lang>). Elsewhere the odd word in those
 * scripts — a language name in a list, an Urdu post title — is drawn with
 * the phone's own font, exactly as the CSS fallbacks already allow.
 */
const SCRIPT_FONTS: Record<string, string> = {
  ur: 'family=Noto+Nastaliq+Urdu:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;600;700;800&family=Noto+Naskh+Arabic:wght@400;500;600;700',
  ar: 'family=Noto+Naskh+Arabic:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;600;700;800',
  hi: 'family=Noto+Sans+Devanagari:wght@400;500;600;700',
};

const added = new Set<string>();

function addSheet(href: string, key: string) {
  if (added.has(key)) return;
  added.add(key);
  const sheet = document.createElement('link');
  sheet.rel = 'stylesheet';
  sheet.href = href;
  sheet.setAttribute('data-fonts-applied', key);
  document.head.appendChild(sheet);
}

function addScriptFonts(lang: string | null | undefined) {
  const code = String(lang || '').slice(0, 2).toLowerCase();
  const families = SCRIPT_FONTS[code];
  if (families) addSheet(`https://fonts.googleapis.com/css2?${families}&display=swap`, code);
}

export function loadFonts(): void {
  const preload = document.getElementById('google-fonts') as HTMLLinkElement | null;
  if (!preload || added.has('latin')) return;
  addSheet(preload.href, 'latin');

  // A returning Urdu/Arabic/Hindi reader gets their font right away…
  try {
    addScriptFonts(localStorage.getItem('fdownloader_lang'));
  } catch {
    // storage blocked: the <html lang> watch below still covers it
  }
  // …and any page that switches to one of those languages gets it then.
  const root = document.documentElement;
  addScriptFonts(root.lang);
  new MutationObserver(() => addScriptFonts(root.lang)).observe(root, { attributes: true, attributeFilter: ['lang'] });
}
