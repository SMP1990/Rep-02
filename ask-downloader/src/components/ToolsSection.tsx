import React, { useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, ChevronsRight, Wand2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { fill } from '../utils/i18n.ts';
import { TOOL_TILES, type ToolTile } from '../config/tools.ts';
import { PageLink } from './PageLink';

/**
 * "Free Online Tools" — the tool tiles above "Trending Stories" on the home
 * page. Same card language as the other home sections (white rounded-2xl
 * surface, violet accent, hover lift). Plain CSS only: nothing here adds to
 * the page's load.
 *
 * Phones: pages of 4 tiles (2x2) in a swipeable row with snap, dots and
 * arrows, so the tiles don't push the rest of the page down. From tablets up
 * the page wrappers use `display: contents`, so all tiles sit in one 4-column
 * grid. Same DOM for both: no tile is rendered twice.
 */
const PER_PAGE = 4;
const PAGES: ToolTile[][] = [];
for (let i = 0; i < TOOL_TILES.length; i += PER_PAGE) PAGES.push(TOOL_TILES.slice(i, i + PER_PAGE));

export const ToolsSection: React.FC = () => {
  const { t, currentLangInfo } = useLanguage();
  const rtl = currentLangInfo?.dir === 'rtl';
  const words = t.toolsHub;
  const scroller = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);

  // scrollLeft is negative in right-to-left pages, hence abs / the sign.
  const onScroll = () => {
    const el = scroller.current;
    if (el) setPage(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
  };
  const goTo = (i: number) => {
    const el = scroller.current;
    if (el) el.scrollTo({ left: (rtl ? -1 : 1) * i * el.clientWidth, behavior: 'smooth' });
  };
  const arrowBtn =
    'w-9 h-9 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#181224] text-[#6d46b8] dark:text-[#d1b9f7] shadow-xs disabled:opacity-35 active:scale-95 transition';

  const liveTile = (tool: ToolTile, Icon: ToolTile['icon']) => (
    <PageLink
      href={tool.path!}
      // The tool page arrives in the next step; until then a full page load
      // shows the site's own "page not found".
      onNavigate={() => window.location.assign(tool.path!)}
      className="group relative flex flex-col h-full bg-white dark:bg-[#181224] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-xl hover:-translate-y-1 hover:border-[#a78bda] dark:hover:border-[#6d46b8] transition-all duration-300"
    >
      <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
        <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#6d46b8] to-[#e6799f] text-white flex items-center justify-center shadow-md shadow-[#6d46b8]/25 group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
        </span>
        <span className="text-[10px] font-extrabold uppercase tracking-wide text-amber-800 bg-amber-100 dark:text-amber-200 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
          {words.newLabel}
        </span>
      </div>
      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1 group-hover:text-[#6d46b8] dark:group-hover:text-[#d1b9f7] transition-colors">
        {words[tool.titleKey!]}
      </h3>
      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
        {words[tool.descKey!]}
      </p>
      <span className="mt-auto pt-3 sm:pt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#6d46b8] dark:text-[#d1b9f7]">
        {words.open}
        <ArrowRight
          aria-hidden="true"
          className={`w-3.5 h-3.5 transition-transform duration-300 ${rtl ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`}
        />
      </span>
    </PageLink>
  );

  const soonTile = (Icon: ToolTile['icon']) => (
    <div
      className="flex flex-col h-full rounded-2xl p-4 sm:p-5 border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-[#181224]/40"
    >
      <span className="w-11 h-11 sm:w-12 sm:h-12 mb-3 sm:mb-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center">
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
      </span>
      <h3 className="text-sm sm:text-base font-bold text-slate-500 dark:text-slate-400 mb-1">{words.comingSoon}</h3>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-500 leading-relaxed">{words.comingSoonDesc}</p>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="text-center mb-6 sm:mb-8">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#6d46b8] dark:text-[#d1b9f7] bg-[#f1e9fb] dark:bg-[#261b3b] px-3 py-1 rounded-full mb-3">
          <Wand2 className="w-3 h-3" aria-hidden="true" />
          {words.badge}
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{words.title}</h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2 max-w-xl mx-auto">{words.subtitle}</p>
      </div>
      <div
        ref={scroller}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-4 md:gap-5 md:overflow-visible md:py-0"
      >
        {PAGES.map((tiles, i) => (
          <ul
            key={i}
            aria-label={fill(words.pageDot, { n: i + 1 })}
            className="grid grid-cols-2 gap-3 w-full shrink-0 snap-start md:contents"
          >
            {tiles.map((tool) => (
              <li key={tool.id}>{tool.path ? liveTile(tool, tool.icon) : soonTile(tool.icon)}</li>
            ))}
          </ul>
        ))}
      </div>

      {/* Phone-only pager: swipe hint, arrows and dots. */}
      {PAGES.length > 1 && (
        <div className="md:hidden mt-4 flex flex-col items-center gap-3">
          {page === 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6d46b8] dark:text-[#d1b9f7] bg-[#f1e9fb] dark:bg-[#261b3b] px-3 py-1 rounded-full">
              <ChevronsRight aria-hidden="true" className={`w-4 h-4 tools-nudge ${rtl ? 'rotate-180' : ''}`} />
              {words.swipeHint}
            </span>
          )}
          <div className="flex items-center gap-4">
            <button type="button" className={arrowBtn} onClick={() => goTo(page - 1)} disabled={page === 0} aria-label={words.prevPage}>
              <ChevronLeft aria-hidden="true" className={`w-5 h-5 ${rtl ? 'rotate-180' : ''}`} />
            </button>
            <div className="flex items-center gap-2">
              {PAGES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={fill(words.pageDot, { n: i + 1 })}
                  aria-current={i === page ? 'true' : undefined}
                  className={`h-2.5 rounded-full transition-all duration-300 ${i === page ? 'w-6 bg-[#6d46b8] dark:bg-[#d1b9f7]' : 'w-2.5 bg-slate-300 dark:bg-slate-700'}`}
                />
              ))}
            </div>
            <button type="button" className={arrowBtn} onClick={() => goTo(page + 1)} disabled={page === PAGES.length - 1} aria-label={words.nextPage}>
              <ChevronRight aria-hidden="true" className={`w-5 h-5 ${rtl ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
