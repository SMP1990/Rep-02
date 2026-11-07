import React, { useEffect, useState } from 'react';
import { Header } from '../components/Header.tsx';
import { Footer } from '../components/Footer.tsx';
import { Seo } from '../components/Seo.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { fillN, soundStrings } from '../tools/sounds/i18n/index.ts';
import { SoundAbout, soundAbout, soundFaq } from '../tools/sounds/SoundAbout.tsx';
import { SoundPlayer } from '../tools/sounds/SoundPlayer.tsx';
import { buildBreadcrumbSchema, buildFaqSchema, buildWebPageSchema } from '../utils/seoSchema.ts';
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
  const [related, setRelated] = useState<PublicSound[]>([]);
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'failed'>('loading');
  const [indexable, setIndexable] = useState(false); // the server decides when search engines may list these pages

  useEffect(() => {
    setState('loading');
    fetch(`/api/sounds/${encodeURIComponent(slug)}`)
      .then((r) => (r.status === 404 ? Promise.reject(new Error('missing')) : r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((d) => { setIndexable(d.indexable === true); setSound(d.sound); setRelated(Array.isArray(d.related) ? d.related : []); setState('ok'); })
      .catch((e) => setState(e?.message === 'missing' ? 'missing' : 'failed'));
  }, [slug]);

  // The order of all public sounds (most viewed first), only to know which sound is before / after this one.
  const [order, setOrder] = useState<string[]>([]);
  useEffect(() => {
    fetch('/api/sounds')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (Array.isArray(d?.sounds)) setOrder(d.sounds.map((x: PublicSound) => x.slug)); })
      .catch(() => {});
  }, []);
  const neighbour = (step: number) => {
    const i = order.indexOf(slug);
    return order[(i + step + order.length) % order.length];
  };
  const autoPlay = new URLSearchParams(window.location.search).get('play') === '1';
  // Previous / Next keep playing: the next page also starts by itself.
  const open = (to: string) => { if (to && to !== slug) window.location.assign(`/sounds/${encodeURIComponent(to)}?play=1`); };

  const title = sound ? `${sound.title} MP3` : s.title;
  const views = sound ? new Intl.NumberFormat(currentLang, { notation: 'compact', maximumFractionDigits: 1 }).format(sound.views) : '';
  const mp3 = sound ? `/api/sounds/${encodeURIComponent(sound.slug)}/mp3` : '';

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = `${origin}/sounds/${encodeURIComponent(slug)}`;
  // Structured data for Google: the page, its breadcrumb, the audio file itself and the FAQ.
  const jsonLd = sound
    ? [
        buildWebPageSchema(title, soundAbout(sound, s, currentLang)[0], url),
        buildBreadcrumbSchema([
          { name: 'Home', url: origin + '/' },
          { name: s.allSounds, url: origin + '/sounds' },
          { name: sound.title, url },
        ]),
        {
          '@context': 'https://schema.org',
          '@type': 'AudioObject',
          name: sound.title,
          description: soundAbout(sound, s, currentLang)[0],
          contentUrl: origin + mp3,
          encodingFormat: 'audio/mpeg',
          duration: `PT${Math.max(1, Math.round(sound.duration))}S`,
          uploadDate: sound.firstSeen,
          author: { '@type': 'Person', name: sound.creator },
          url,
        },
        buildFaqSchema(soundFaq(sound, s).map((f) => ({ question: f.q, answer: f.a }))),
      ]
    : undefined;

  return (
    <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] text-[#2e2440] dark:text-[#f4eefb] flex flex-col transition-colors duration-200">
      <Seo
        title={title}
        description={sound ? soundAbout(sound, s, currentLang)[0] : s.notFound}
        path={`/sounds/${slug}`}
        noindex={state !== 'ok' || !indexable}
        jsonLd={jsonLd}
      />
      <Header />
      <main className="flex-1 w-full py-8 sm:py-12">
        <div className="max-w-3xl mx-auto px-4">
          <a href="/sounds" className="text-sm font-semibold text-[#341d5b] dark:text-[#d1b9f7] underline underline-offset-4">{s.allSounds}</a>

          {state === 'loading' && <p className="text-center text-slate-500 py-10" role="status">{s.loading}</p>}
          {state === 'failed' && <p className="text-center py-10" role="alert">{s.loadError}</p>}
          {state === 'missing' && <p className="text-center py-10">{s.notFound}</p>}

          {state === 'ok' && sound && (
            <>
              <div className="text-center mt-6">
                <SoundPlayer
                  src={mp3}
                  title={sound.title}
                  creator={sound.creator}
                  t={s}
                  autoPlay={autoPlay}
                  onPrev={order.length > 1 ? () => open(neighbour(-1)) : undefined}
                  onNext={order.length > 1 ? () => open(neighbour(1)) : undefined}
                />
                <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
                  {fillN(s.sec, sound.duration)} · {fillN(s.views, views)}
                </p>
                <a
                  href={`${mp3}?dl=1`}
                  download
                  className="inline-block mt-5 rounded-xl bg-[#341d5b] text-white font-semibold px-6 py-3 hover:bg-[#4a2b80] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6d46b8] focus-visible:ring-offset-2"
                >
                  {s.download}
                </a>
              </div>

              <SoundAbout sound={sound} s={s} lang={currentLang} />

              <p className="mt-8 text-center text-sm">
                <a href={`/report-content?sound=${encodeURIComponent(sound.slug)}`} className="text-slate-500 dark:text-slate-400 underline underline-offset-4 hover:text-[#6d46b8]">{s.reportThisSound}</a>
              </p>

              {related.length > 0 && (
                <section className="mt-12">
                  <h2 className="font-heading text-xl sm:text-2xl font-bold mb-3">{s.relatedTitle}</h2>
                  <ul className="space-y-2">
                    {related.map((r) => (
                      <li key={r.slug}>
                        <a
                          href={`/sounds/${encodeURIComponent(r.slug)}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-[#e5d9ef] dark:border-[#2e2440] bg-white dark:bg-[#171025] px-4 py-3 hover:border-[#6d46b8]"
                        >
                          <span className="font-semibold truncate">{r.title}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{fillN(s.sec, r.duration)}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};
