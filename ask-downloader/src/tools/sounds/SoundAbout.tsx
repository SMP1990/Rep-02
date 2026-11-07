import React from 'react';
import { fill, type Strings } from './i18n/index.ts';
import type { PublicSound } from './SoundCard.tsx';

/** Question/answer pairs of a sound page (also used for the FAQ schema). */
export function soundFaq(sound: PublicSound, s: Strings): { q: string; a: string }[] {
  const v = { title: sound.title, creator: sound.creator };
  return [1, 2, 3, 4].map((n) => ({
    q: fill((s as any)[`faq${n}Q`], v),
    a: fill((s as any)[`faq${n}A`], v),
  }));
}

/** The four short paragraphs about the sound, filled from the sound's real data (no two pages read the same). */
export function soundAbout(sound: PublicSound, s: Strings, lang: string): string[] {
  const nf = new Intl.NumberFormat(lang, { notation: 'compact', maximumFractionDigits: 1 });
  const date = new Intl.DateTimeFormat(lang, { dateStyle: 'long' }).format(new Date(`${sound.firstSeen}T00:00:00Z`));
  const v = { title: sound.title, creator: sound.creator, sec: sound.duration, views: nf.format(sound.views), regions: sound.regions.length, date };
  return [s.about1, s.about2, s.about3, s.about4].map((p) => fill(p, v));
}

type Props = { sound: PublicSound; s: Strings; lang: string };

/** "About this sound" text, a link to the video downloader and the FAQ. */
export const SoundAbout: React.FC<Props> = ({ sound, s, lang }) => {
  const paragraphs = soundAbout(sound, s, lang);
  return (
    <section className="mt-12 text-start">
      <h2 className="font-heading text-xl sm:text-2xl font-bold mb-3">{s.aboutTitle}</h2>
      {paragraphs.map((p, i) => (
        <p key={i} className="mb-3 leading-relaxed text-slate-700 dark:text-slate-300">{p}</p>
      ))}
      <a href="/" className="inline-block mt-1 font-semibold text-[#341d5b] dark:text-[#d1b9f7] underline underline-offset-4">{s.openDownloader}</a>

      <h2 className="font-heading text-xl sm:text-2xl font-bold mt-10 mb-3">{s.faqTitle}</h2>
      <div className="space-y-2">
        {soundFaq(sound, s).map((f) => (
          <details key={f.q} className="rounded-xl border border-[#e5d9ef] dark:border-[#2e2440] bg-white dark:bg-[#171025] px-4 py-3">
            <summary className="cursor-pointer font-semibold">{f.q}</summary>
            <p className="mt-2 text-slate-700 dark:text-slate-300">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
};
