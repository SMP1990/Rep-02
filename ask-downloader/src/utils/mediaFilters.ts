/**
 * Media Library filters: type, date and sort order (search and the ALT
 * filters stay on the page itself).
 */
import { categoryOf } from './mediaUpload';
import { localDay } from './mediaDates';

export type CategoryFilter = 'all' | 'image' | 'video' | 'audio' | 'document' | 'archive';
export type SortOrder = 'newest' | 'oldest' | 'name' | 'largest';
/** 'any', 'last7', 'last30', a year ('2026') or a month ('2026-10'). */
export type DateFilter = string;

export interface MediaFilterState { category: CategoryFilter; date: DateFilter; sort: SortOrder }
export const DEFAULT_FILTERS: MediaFilterState = { category: 'all', date: 'any', sort: 'newest' };

interface Filterable { name: string; url: string; bytes: number; uploadedAt: string; category?: string; local: boolean }

export const itemCategory = (it: Filterable): string => it.category || categoryOf(it.name) || 'image';

export function matchesDate(it: Filterable, date: DateFilter): boolean {
  if (date === 'any') return true;
  const t = new Date(it.uploadedAt).getTime();
  if (date === 'last7' || date === 'last30') {
    const days = date === 'last7' ? 7 : 30;
    return !isNaN(t) && Date.now() - t <= days * 86400000;
  }
  return localDay(it.uploadedAt).startsWith(date);
}

/** Years and months that actually have files, newest first, for the date menu. */
export function dateOptions(items: Filterable[]): { years: string[]; months: { key: string; label: string }[] } {
  const days = new Set(items.map((it) => localDay(it.uploadedAt)).filter(Boolean));
  const months = [...new Set([...days].map((d) => d.slice(0, 7)))].sort().reverse();
  const years = [...new Set(months.map((m) => m.slice(0, 4)))];
  return {
    years,
    months: months.map((key) => ({
      key,
      label: new Date(`${key}-01T12:00:00`).toLocaleDateString('en', { month: 'long', year: 'numeric' }),
    })),
  };
}

export function sortItems<T extends Filterable>(items: T[], sort: SortOrder): T[] {
  const list = [...items];
  const byDate = (a: T, b: T) => b.uploadedAt.localeCompare(a.uploadedAt);
  if (sort === 'newest') return list.sort(byDate);
  if (sort === 'oldest') return list.sort((a, b) => byDate(b, a));
  if (sort === 'name') return list.sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' }));
  return list.sort((a, b) => b.bytes - a.bytes || byDate(a, b));
}

/** How many files of each type pass the other filters, for the type buttons. */
export function categoryCounts(items: Filterable[]): Record<CategoryFilter, number> {
  const out: Record<CategoryFilter, number> = { all: items.length, image: 0, video: 0, audio: 0, document: 0, archive: 0 };
  for (const it of items) {
    const c = itemCategory(it) as CategoryFilter;
    if (c in out) out[c]++;
  }
  return out;
}
