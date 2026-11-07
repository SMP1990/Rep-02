import React from 'react';
import { fillN, type Strings } from './i18n/index.ts';

export type PublicSound = {
  slug: string; title: string; creator: string; duration: number; views: number;
  regions: string[]; firstSeen: string; lastSeen: string; video?: { id: string; user: string };
};

type Props = { sound: PublicSound; t: Strings; lang: string };

/** One sound in the list: round Play button (opens the sound page, which plays it in the player card), name, creator, length, views and the MP3 download. */
export const SoundCard: React.FC<Props> = ({ sound, t, lang }) => {
  const views = new Intl.NumberFormat(lang, { notation: 'compact', maximumFractionDigits: 1 }).format(sound.views);
  return (
    <li className="flex items-center gap-3 sm:gap-4 rounded-2xl border border-[#e5d9ef] dark:border-[#2e2440] bg-white dark:bg-[#171025] p-3 sm:p-4 shadow-sm">
      <a
        href={`/sounds/${encodeURIComponent(sound.slug)}?play=1`}
        aria-label={`${t.play}: ${sound.title}`}
        className="shrink-0 w-12 h-12 rounded-full bg-[#341d5b] text-white flex items-center justify-center hover:bg-[#4a2b80] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6d46b8] focus-visible:ring-offset-2 transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>
      </a>

      <div className="min-w-0 flex-1">
        <h2 className="font-heading text-base sm:text-lg font-bold truncate">
          <a href={`/sounds/${encodeURIComponent(sound.slug)}`} className="hover:underline focus:outline-none focus-visible:underline">{sound.title}</a>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 break-words">
          {sound.creator} · {fillN(t.sec, sound.duration)} · {fillN(t.views, views)}
        </p>
      </div>

      <a
        href={`/api/sounds/${encodeURIComponent(sound.slug)}/mp3?dl=1`}
        download
        className="shrink-0 rounded-xl bg-[#341d5b] text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2.5 hover:bg-[#4a2b80] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6d46b8] focus-visible:ring-offset-2 transition-colors"
      >
        {t.download}
      </a>
    </li>
  );
};
