import React from 'react';
import { Image as ImageIcon, Film, Music, FileText, FileArchive, LayoutGrid, X } from 'lucide-react';
import { DEFAULT_FILTERS, type CategoryFilter, type MediaFilterState, type SortOrder } from '../utils/mediaFilters';

const CATEGORIES: Array<{ key: CategoryFilter; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'all', label: 'All types', icon: LayoutGrid },
  { key: 'image', label: 'Images', icon: ImageIcon },
  { key: 'video', label: 'Videos', icon: Film },
  { key: 'audio', label: 'Audio', icon: Music },
  { key: 'document', label: 'Documents', icon: FileText },
  { key: 'archive', label: 'Archives', icon: FileArchive },
];

const SORTS: Array<{ key: SortOrder; label: string }> = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'name', label: 'Name (A–Z)' },
  { key: 'largest', label: 'Largest first' },
];

const select = 'px-3 py-2 rounded-xl text-xs bg-[#f6f0f4] dark:bg-[#0e0a17] border border-[#eae3ee] dark:border-white/10 text-[#2e2440] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6d46b8]/40 cursor-pointer';

interface Props {
  value: MediaFilterState;
  onChange: (next: MediaFilterState) => void;
  counts: Record<CategoryFilter, number>;
  years: string[];
  months: { key: string; label: string }[];
}

/** Type buttons, date menu and sort menu for the Media Library. */
export const MediaFilterBar: React.FC<Props> = ({ value, onChange, counts, years, months }) => {
  const set = (patch: Partial<MediaFilterState>) => onChange({ ...value, ...patch });
  const active = value.category !== DEFAULT_FILTERS.category || value.date !== DEFAULT_FILTERS.date || value.sort !== DEFAULT_FILTERS.sort;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="File type">
        {CATEGORIES.map(({ key, label, icon: Icon }) => {
          const on = value.category === key;
          return (
            <button key={key} type="button" role="radio" aria-checked={on} onClick={() => set({ category: key })}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                on ? 'bg-[#4b2e83] text-white' : 'text-[#726c85] dark:text-[#b5a9cd] bg-[#f6f0f4] dark:bg-white/5 hover:bg-[#f1e9fb] dark:hover:bg-white/10'
              }`}>
              <Icon className="w-3.5 h-3.5" /> {label}
              <span className={`text-[10px] font-semibold ${on ? 'text-white/70' : 'text-[#a29cb2]'}`}>{counts[key]}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#726c85] dark:text-[#b5a9cd]">
          Date
          <select value={value.date} onChange={(e) => set({ date: e.target.value })} className={select}>
            <option value="any">Any date</option>
            <option value="last7">Last 7 days</option>
            <option value="last30">Last 30 days</option>
            {years.length > 0 && (
              <optgroup label="Year">
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </optgroup>
            )}
            {months.length > 0 && (
              <optgroup label="Month">
                {months.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </optgroup>
            )}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#726c85] dark:text-[#b5a9cd]">
          Sort
          <select value={value.sort} onChange={(e) => set({ sort: e.target.value as SortOrder })} className={select}>
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
        {active && (
          <button type="button" onClick={() => onChange(DEFAULT_FILTERS)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer">
            <X className="w-3.5 h-3.5" /> Clear filters
          </button>
        )}
      </div>
    </div>
  );
};
