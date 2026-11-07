import React, { useEffect, useState } from 'react';
import { ArrowRight, Headphones } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { fill } from '../utils/i18n.ts';
import { RouteLink } from './PageLink';

type Item = { slug: string; title: string; creator: string; duration: number; views: number };

/**
 * "Trending Sounds" — the top sounds above "Free Online Tools" on the home page.
 * It reads the saved list from /api/sounds after the page has loaded (the server
 * answers from its own data and caches it for 5 minutes), and shows nothing at all
 * while there are no approved sounds, so an empty site never shows an empty box.
 * Words come from the language dictionary (t.soundsHome), nothing extra is loaded.
 * Phones: one swipeable row of compact cards, so the tools below stay close to the top.
 */
export const TrendingSoundsSection: React.FC = () => {
  const { t, currentLang, currentLangInfo } = useLanguage();
  const rtl = currentLangInfo?.dir === 'rtl';
  const words = t.soundsHome;
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let alive = true;
    fetch('/api/sounds')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && Array.isArray(d?.sounds)) setItems(d.sounds.slice(0, 4)); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!words || items.length === 0) return null;
  const compact = new Intl.NumberFormat(currentLang, { notation: 'compact', maximumFractionDigits: 1 });

  return (
    <div id="section-sounds" className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-4 sm:py-6">
      <div className="text-center mb-3 sm:mb-8">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#6d46b8] dark:text-[#d1b9f7] bg-[#f1e9fb] dark:bg-[#261b3b] px-3 py-1 rounded-full mb-3 max-sm:mb-0">
          <Headphones className="w-3 h-3" aria-hidden="true" />
          {words.badge}
        </span>
        <h2 className="max-sm:sr-only text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{words.title}</h2>
        <p className="max-sm:hidden text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2 max-w-xl mx-auto">{words.subtitle}</p>
      </div>

      <ul className="flex gap-3 overflow-x-auto snap-x snap-mandatory py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-4 md:gap-5 md:overflow-visible md:py-0">
        {items.map((s) => (
          <li key={s.slug} className="shrink-0 w-44 snap-start md:w-auto">
            <a
              href={`/sounds/${encodeURIComponent(s.slug)}`}
              className="group relative flex flex-col h-full bg-white dark:bg-[#181224] rounded-2xl p-3 sm:p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-xl hover:-translate-y-1 hover:border-[#a78bda] dark:hover:border-[#6d46b8] transition-all duration-300"
            >
              <span className="w-9 h-9 sm:w-11 sm:h-11 mb-2 sm:mb-3 rounded-xl bg-[#341d5b] dark:bg-gradient-to-br dark:from-[#6d46b8] dark:to-[#e6799f] text-white flex items-center justify-center shadow-md shadow-[#6d46b8]/25 group-hover:scale-110 transition-transform duration-300">
                <Headphones className="w-5 h-5" aria-hidden="true" />
              </span>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white line-clamp-2 mb-1 group-hover:text-[#6d46b8] dark:group-hover:text-[#d1b9f7] transition-colors">{s.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {fill(words.sec, { n: s.duration })} · {fill(words.views, { n: compact.format(s.views) })}
              </p>
              <span className="max-sm:hidden mt-auto pt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#6d46b8] dark:text-[#d1b9f7]">
                {words.listen}
                <ArrowRight aria-hidden="true" className={`w-3.5 h-3.5 transition-transform duration-300 ${rtl ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
              </span>
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-2.5 sm:mt-6 text-center">
        <RouteLink
          route="public-sounds"
          className="inline-flex items-center gap-2 rounded-xl bg-[#341d5b] text-white text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2 sm:py-2.5 hover:bg-[#4a2b80] transition-colors cursor-pointer"
        >
          {words.seeAll}
          <ArrowRight aria-hidden="true" className={`w-4 h-4 ${rtl ? 'rotate-180' : ''}`} />
        </RouteLink>
      </div>
    </div>
  );
};
