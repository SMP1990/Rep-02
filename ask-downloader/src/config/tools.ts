import type { LucideIcon } from 'lucide-react';
import { Cake, Eraser, FileText, Globe2, GraduationCap, ImageDown, ImageMinus, KeyRound } from 'lucide-react';
import type { PublicRoute } from '../components/PageLink';

/**
 * The tool tiles on the home page ("Free Online Tools"). One entry per tile.
 *
 * A live tool has a `route` (its own page, see ROUTE_PATHS) and its words in
 * `t.toolsHub[titleKey | descKey]`. `fullLoad` opens it with a real page
 * load, for pages that need their own server headers. A tile without a path is a placeholder
 * shown as "Coming soon": it is not a link, so no visitor or search engine
 * lands on an empty page. To launch a new tool, give its tile a path, an
 * route, an icon and its two translation keys.
 */
export interface ToolTile {
  id: string;
  icon: LucideIcon;
  route?: PublicRoute;
  fullLoad?: boolean;
  titleKey?: string;
  descKey?: string;
}

export const TOOL_TILES: ToolTile[] = [
  {
    id: 'background-remover',
    icon: ImageMinus,
    route: 'background-remover',
    fullLoad: true,
    titleKey: 'bgRemoverTitle',
    descKey: 'bgRemoverDesc',
  },
  {
    id: 'password-generator',
    icon: KeyRound,
    route: 'password-generator',
    titleKey: 'pwGenTitle',
    descKey: 'pwGenDesc',
  },
  {
    id: 'age-calculator',
    icon: Cake,
    route: 'age-calculator',
    titleKey: 'ageCalcTitle',
    descKey: 'ageCalcDesc',
  },
  {
    id: 'word-counter',
    icon: FileText,
    route: 'word-counter',
    titleKey: 'wordCountTitle',
    descKey: 'wordCountDesc',
  },
  {
    id: 'image-compressor',
    icon: ImageDown,
    route: 'image-compressor',
    titleKey: 'imgCompTitle',
    descKey: 'imgCompDesc',
  },
  {
    id: 'dns-checker',
    icon: Globe2,
    route: 'dns-checker',
    titleKey: 'dnsTitle',
    descKey: 'dnsDesc',
  },
  {
    id: 'watermark-remover',
    icon: Eraser,
    route: 'watermark-remover',
    fullLoad: true, // the page has its own CSP (blob: previews)
    titleKey: 'wmTitle',
    descKey: 'wmDesc',
  },
  {
    id: 'grade-calculator',
    icon: GraduationCap,
    route: 'grade-calculator',
    titleKey: 'gradeCalcTitle',
    descKey: 'gradeCalcDesc',
  },
];
