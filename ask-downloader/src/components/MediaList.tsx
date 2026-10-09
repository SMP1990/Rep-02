import React from 'react';
import { MediaItemCard, type MediaItem } from './MediaItemCard';
import { groupByDate } from '../utils/mediaDates';
import type { SortOrder } from '../utils/mediaFilters';

const card = 'bg-white dark:bg-[#181129] rounded-2xl border border-[#eae3ee] dark:border-white/10 shadow-xs';

interface Props {
  items: MediaItem[]; // already filtered and sorted
  sort: SortOrder;
  edits: Record<string, string>;
  onEdit: (key: string, alt: string) => void;
  onDelete: (item: MediaItem) => void;
}

/**
 * The files, grouped Year -> Month -> Date when sorted by date; as one plain
 * list when sorted by name or size, where date groups would only scatter them.
 */
export const MediaList: React.FC<Props> = ({ items, sort, edits, onEdit, onDelete }) => {
  const row = (it: MediaItem) => <MediaItemCard key={it.url} item={it} edits={edits} onDelete={onDelete} onEdit={onEdit} />;

  if (!items.length) return <p className={`${card} p-10 text-center text-sm text-[#726c85]`}>No files match these filters.</p>;

  if (sort === 'name' || sort === 'largest') {
    return (
      <section className={`${card} overflow-hidden`}>
        <h3 className="px-4 py-3 text-sm font-bold border-b border-[#eae3ee] dark:border-white/10 bg-[#faf7fc] dark:bg-white/5">
          {sort === 'name' ? 'By name (A–Z)' : 'Largest first'}
          <span className="font-normal text-[#726c85]"> · {items.length} file{items.length === 1 ? '' : 's'}</span>
        </h3>
        <ul className="divide-y divide-[#eae3ee] dark:divide-white/10">{items.map(row)}</ul>
      </section>
    );
  }

  return (
    <>
      {groupByDate(items, sort === 'oldest').map((y) => (
        <div key={y.year} className="mb-8">
          <h2 className="flex items-baseline gap-2 mb-3 px-1">
            <span className="font-heading text-2xl font-extrabold text-[#2e2440] dark:text-white">{y.year}</span>
            <span className="text-xs text-[#726c85]">{y.count} file{y.count === 1 ? '' : 's'}</span>
          </h2>
          {y.months.map((m) => (
            <section key={m.key} className={`${card} mb-4 overflow-hidden`} aria-label={`${m.label} ${y.year}`}>
              <h3 className="px-4 py-3 text-sm font-bold border-b border-[#eae3ee] dark:border-white/10 bg-[#faf7fc] dark:bg-white/5">
                {y.year} <span className="text-[#a29cb2]">→</span> {m.label}
                <span className="font-normal text-[#726c85]"> · {m.count} file{m.count === 1 ? '' : 's'}</span>
              </h3>
              {m.days.map((d) => (
                <div key={d.key}>
                  <h4 className="px-4 pt-3 pb-1 text-[11px] font-extrabold uppercase tracking-wider text-[#6d46b8] dark:text-[#a78bda]">
                    {d.label} <span className="font-semibold normal-case tracking-normal text-[#a29cb2]">· {d.items.length}</span>
                  </h4>
                  <ul className="divide-y divide-[#eae3ee] dark:divide-white/10">{d.items.map(row)}</ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      ))}
    </>
  );
};
