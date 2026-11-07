import React, { useEffect, useState } from 'react';
import { Header } from '../components/Header.tsx';
import { Footer } from '../components/Footer.tsx';
import { Seo } from '../components/Seo.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { soundStrings } from '../tools/sounds/i18n/index.ts';
import type { PublicSound } from '../tools/sounds/SoundCard.tsx';

/** The slug is the last part of the address: /sounds/<slug>. */
const slugFromUrl = () => decodeURIComponent(window.location.pathname.replace(/\/+$/, '').split('/').pop() || '');

/**
 * /sounds/<slug> — one sound. Lazy-loaded (App.tsx). Reads only /api/sounds/<slug>.
 * The server answers 404 (with the right status) when the sound is not public.
 */
export const SoundPage: React.FC = () => {
  const { currentLang } = useLanguage();
  const s = soundStrings(currentLang);
  const slug = slugFromUrl();
  const [sound, setSound] = useState<PublicSound | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'failed'>('loading');

  useEffect(() => {
    fetch(`/api/sounds/${encodeURIComponent(slug)}`)
      .then((r) => (r.status === 404 ? Promise.reject(new Error('missing')) : r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((d) => { setSound(d.sound); setState('ok'); })
      .catch((e) => setState(e?.message === 'missing' ? 'missing' : 'failed'));
  }, [slug]);

  const title = sound ? `${sound.title} MP3` : s.title;

  return (
    <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] text-[#2e2440] dark:text-[#f4eefb] flex flex-col transition-colors duration-200">
      <Seo title={title} description={s.subtitle} path={`/sounds/${slug}`} noindex={state !== 'ok'} />
      <Header />
      <main className="flex-1 w-full py-10 sm:py-14">
        <div className="max-w-3xl mx-auto px-4">
          {state === 'loading' && <p className="text-center text-slate-500 py-10" role="status">{s.loading}</p>}
          {state === 'failed' && <p className="text-center py-10" role="alert">{s.loadError}</p>}
          {state === 'missing' && <p className="text-center py-10">{s.noResults}</p>}
          {state === 'ok' && sound && (
            <div className="text-center">
              <h1 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tight text-[#341d5b] dark:text-[#d1b9f7]">{sound.title}</h1>
              <audio className="w-full mt-8" controls preload="none" src={`/api/sounds/${encodeURIComponent(sound.slug)}/mp3`} />
              <a
                href={`/api/sounds/${encodeURIComponent(sound.slug)}/mp3?dl=1`}
                download
                className="inline-block mt-5 rounded-xl bg-[#341d5b] text-white font-semibold px-6 py-3 hover:bg-[#4a2b80]"
              >
                {s.download}
              </a>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};
