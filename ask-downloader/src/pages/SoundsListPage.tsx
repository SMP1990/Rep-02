import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Header } from '../components/Header.tsx';
import { Footer } from '../components/Footer.tsx';
import { Seo } from '../components/Seo.tsx';
import { buildWebPageSchema, buildBreadcrumbSchema } from '../utils/seoSchema.ts';
import { useLanguage } from '../context/LanguageContext.tsx';
import { fillN, soundStrings } from '../tools/sounds/i18n/index.ts';
import { SoundCard, type PublicSound } from '../tools/sounds/SoundCard.tsx';

const PATH = '/sounds';

/**
 * /sounds — the public list of approved trending sounds. Lazy-loaded (App.tsx).
 * It only reads the saved list from /api/sounds; nothing is sent to anyone.
 * One audio element is shared, so only one sound plays at a time.
 */
export const SoundsListPage: React.FC = () => {
  const { t, currentLang } = useLanguage();
  const s = soundStrings(currentLang);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const [sounds, setSounds] = useState<PublicSound[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  const load = useCallback(() => {
    setFailed(false);
    setSounds(null);
    fetch('/api/sounds')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('bad reply'))))
      .then((d) => setSounds(Array.isArray(d?.sounds) ? d.sounds : []))
      .catch(() => setFailed(true));
  }, []);
  useEffect(load, [load]);

  // Stop the sound when the visitor leaves the page.
  useEffect(() => () => { audio.current?.pause(); }, []);

  const toggle = useCallback((slug: string) => {
    if (!audio.current) {
      audio.current = new Audio();
      audio.current.preload = 'none';
      audio.current.addEventListener('ended', () => setPlaying(null));
      audio.current.addEventListener('error', () => setPlaying(null));
    }
    const a = audio.current;
    if (playing === slug) { a.pause(); setPlaying(null); return; }
    a.src = `/api/sounds/${encodeURIComponent(slug)}/mp3`;
    a.play().then(() => setPlaying(slug)).catch(() => setPlaying(null));
  }, [playing]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (sounds ?? []).filter((x) => !q || `${x.title} ${x.creator}`.toLowerCase().includes(q));
  }, [sounds, query]);

  const title = `${s.title} - MP3`;

  return (
    <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] text-[#2e2440] dark:text-[#f4eefb] flex flex-col transition-colors duration-200">
      <Seo
        title={title}
        description={s.subtitle}
        path={PATH}
        noindex={sounds !== null && sounds.length === 0}
        jsonLd={[
          buildWebPageSchema(title, s.subtitle, origin + PATH),
          buildBreadcrumbSchema([
            { name: t.header?.home || 'Home', url: origin + '/' },
            { name: s.title, url: origin + PATH },
          ]),
        ]}
      />
      <Header />

      <main className="flex-1 w-full py-10 sm:py-14">
        <div className="max-w-3xl mx-auto px-4 text-center mb-8">
          <h1 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tight">
            <span className="text-[#341d5b] dark:bg-gradient-to-r dark:to-[#e6799f] bg-clip-text dark:text-transparent dark:from-[#d1b9f7] dark:via-[#a78bda] dark:to-[#e6799f]">
              {s.title}
            </span>
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-600 dark:text-slate-300">{s.subtitle}</p>
        </div>

        <div className="max-w-3xl mx-auto px-4">
          {sounds && sounds.length > 0 && (
            <div className="mb-4 flex items-center gap-3">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={s.searchLabel}
                placeholder={s.searchPlaceholder}
                className="flex-1 rounded-xl border border-[#d8c9e8] dark:border-[#3a2d52] bg-white dark:bg-[#171025] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6d46b8]"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{fillN(s.count, shown.length)}</span>
            </div>
          )}

          {sounds === null && !failed && <p className="text-center text-slate-500 py-10" role="status">{s.loading}</p>}

          {failed && (
            <div className="text-center py-10" role="alert">
              <p className="mb-3">{s.loadError}</p>
              <button type="button" onClick={load} className="rounded-xl bg-[#341d5b] text-white text-sm font-semibold px-4 py-2.5 hover:bg-[#4a2b80]">{s.retry}</button>
            </div>
          )}

          {sounds && sounds.length === 0 && <p className="text-center text-slate-600 dark:text-slate-300 py-10">{s.empty}</p>}
          {sounds && sounds.length > 0 && shown.length === 0 && <p className="text-center text-slate-600 dark:text-slate-300 py-10">{s.noResults}</p>}

          {shown.length > 0 && (
            <ul className="space-y-3">
              {shown.map((x) => (
                <SoundCard key={x.slug} sound={x} t={s} lang={currentLang} playing={playing === x.slug} onToggle={toggle} />
              ))}
            </ul>
          )}

          <p className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">{s.note}</p>
        </div>
      </main>

      <Footer />
    </div>
  );
};
