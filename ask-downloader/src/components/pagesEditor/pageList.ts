import type { ComponentType } from 'react';
import { Info, Mail, ShieldCheck, FileText, Scale } from 'lucide-react';
import { INITIAL_SITE_PAGES } from '../../data/mockAdminData';
import { enTranslation } from '../../context/LanguageContext';
import { isUnchangedBuiltIn } from '../../utils/legalContent';

export type PageKey = 'about' | 'contact' | 'privacy' | 'terms' | 'legal';

/** The pages edited in Content Editor -> Pages, in the order they are listed. */
export const PAGE_LIST: Array<{ key: PageKey; name: string; path: string; icon: ComponentType<{ className?: string }> }> = [
  { key: 'about', name: 'About Us', path: '/about-us', icon: Info },
  { key: 'contact', name: 'Contact', path: '/contact', icon: Mail },
  { key: 'privacy', name: 'Privacy Policy', path: '/privacy-policy', icon: ShieldCheck },
  { key: 'terms', name: 'Terms of Use', path: '/terms-of-use', icon: FileText },
  { key: 'legal', name: 'Legal & DMCA', path: '/legal', icon: Scale },
];

/**
 * "Custom" when the page shows the admin's own words; "Built-in" while it
 * still has the text the site shipped with (translated into every language).
 */
export function isCustomPage(key: PageKey, pages: any): boolean {
  if (key === 'about' || key === 'contact') {
    return JSON.stringify(pages?.[key] ?? null) !== JSON.stringify((INITIAL_SITE_PAGES as any)[key]);
  }
  // Built-in text opened for editing but not changed is still saved as built-in.
  const sections = pages?.[key]?.sections || [];
  return sections.length > 0 && !isUnchangedBuiltIn(key, enTranslation, sections);
}

/**
 * Pages whose form differs from what is saved. Built-in legal text opened
 * for editing but left unchanged counts as unchanged, as it is saved that way.
 */
export function pagesDirtyKeys(form: any, saved: any, normalize: (pages: any) => any): PageKey[] {
  if (!form || !saved) return [];
  const a = normalize(form);
  const b = normalize(saved);
  return PAGE_LIST.filter(({ key }) => JSON.stringify(a?.[key] ?? null) !== JSON.stringify(b?.[key] ?? null)).map((p) => p.key);
}

/** A page's shipped content: what "Reset to default" puts back. */
export function defaultPage(key: PageKey): any {
  if (key === 'about' || key === 'contact') return JSON.parse(JSON.stringify((INITIAL_SITE_PAGES as any)[key]));
  return { sections: [] };
}
