import React from 'react';
import { ArrowRight, Wand2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { TOOL_TILES, type ToolTile } from '../config/tools.ts';
import { PageLink } from './PageLink';

/**
 * "Free Online Tools" — the tool tiles above "Trending Stories" on the home
 * page. Same card language as the other home sections (white rounded-2xl
 * surface, violet accent, hover lift). 2 columns on phones, 4 from tablets.
 * Plain CSS transitions only: nothing here adds to the page's load.
 */
export const ToolsSection: React.FC = () => {
  const { t, currentLangInfo } = useLanguage();
  const rtl = currentLangInfo?.dir === 'rtl';
  const words = t.toolsHub;

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
      <ul className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
        {TOOL_TILES.map((tool) => (
          <li key={tool.id}>{tool.path ? liveTile(tool, tool.icon) : soonTile(tool.icon)}</li>
        ))}
      </ul>
    </div>
  );
};
