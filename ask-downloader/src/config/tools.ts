import type { LucideIcon } from 'lucide-react';
import { Clock, ImageMinus } from 'lucide-react';

/**
 * The tool tiles on the home page ("Free Online Tools"). One entry per tile.
 *
 * A live tool has a `path` (its own page) and its words in
 * `t.toolsHub[titleKey | descKey]`. A tile without a path is a placeholder
 * shown as "Coming soon": it is not a link, so no visitor or search engine
 * lands on an empty page. To launch a new tool, give its tile a path, an
 * icon and its two translation keys.
 */
export interface ToolTile {
  id: string;
  icon: LucideIcon;
  path?: string;
  titleKey?: string;
  descKey?: string;
}

export const TOOL_TILES: ToolTile[] = [
  {
    id: 'background-remover',
    icon: ImageMinus,
    path: '/background-remover',
    titleKey: 'bgRemoverTitle',
    descKey: 'bgRemoverDesc',
  },
  { id: 'soon-1', icon: Clock },
  { id: 'soon-2', icon: Clock },
  { id: 'soon-3', icon: Clock },
  { id: 'soon-4', icon: Clock },
  { id: 'soon-5', icon: Clock },
  { id: 'soon-6', icon: Clock },
  { id: 'soon-7', icon: Clock },
];
