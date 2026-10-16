import React from 'react';
import { TOOL_TILES } from '../config/tools.ts';
import { PageLink, ROUTE_PATHS } from './PageLink';

/**
 * Phones only (below sm): every live tool as a small icon with its name,
 * 4 per row, so all tools fit on the first screen together with the
 * downloader. From sm up ToolsSection shows its usual cards instead.
 * Opening a tool works exactly like the cards (same route / full load).
 */
export const ToolsIconGrid: React.FC<{
  words: Record<string, string>;
  onOpen: (route: NonNullable<(typeof TOOL_TILES)[number]['route']>) => void;
}> = ({ words, onOpen }) => (
  <ul className="sm:hidden grid grid-cols-4 gap-x-2 gap-y-2">
    {TOOL_TILES.filter((tool) => tool.route).map((tool) => {
      const Icon = tool.icon;
      const href = ROUTE_PATHS[tool.route!];
      return (
        <li key={tool.id}>
          <PageLink
            href={href}
            onNavigate={() => (tool.fullLoad ? window.location.assign(href) : onOpen(tool.route!))}
            className="group flex flex-col items-center gap-1 rounded-xl p-1 text-center active:scale-95 transition-transform"
          >
            <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#6d46b8] to-[#e6799f] text-white flex items-center justify-center shadow-md shadow-[#6d46b8]/25">
              <Icon className="w-5 h-5" aria-hidden="true" />
            </span>
            <span className="text-[11px] font-extrabold leading-tight text-slate-900 dark:text-white line-clamp-3">
              {words[tool.titleKey!]}
            </span>
          </PageLink>
        </li>
      );
    })}
  </ul>
);
