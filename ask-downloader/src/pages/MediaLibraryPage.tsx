import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { TopHeader } from '../components/TopHeader';
import { useAdmin } from '../context/AdminContext';
import { usageKey, type MediaItem } from '../components/MediaItemCard';
import { MediaList } from '../components/MediaList';
import { MediaFilterBar } from '../components/MediaFilterBar';
import { DEFAULT_FILTERS, matchesDate, itemCategory, sortItems, categoryCounts, dateOptions, type MediaFilterState } from '../utils/mediaFilters';
import { Save, Wand2, Search, UploadCloud } from 'lucide-react';
import { MediaUploader } from '../components/MediaUploader';

type Filter = 'all' | 'missing' | 'unused';
const card = 'bg-white dark:bg-[#181129] rounded-2xl border border-[#eae3ee] dark:border-white/10 shadow-xs';

export const MediaLibraryPage: React.FC<{ onOpenMobileMenu: () => void }> = ({ onOpenMobileMenu }) => {
  const { showToast, reloadBlog } = useAdmin();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [filters, setFilters] = useState<MediaFilterState>(DEFAULT_FILTERS);

  const load = () =>
    fetch('/api/admin/media', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(d.items || []))
      .catch(() => {});
  useEffect(() => { load(); }, []);

  const altOf = (it: MediaItem, i: number) => edits[usageKey(it.url, it.usages[i])] ?? it.usages[i].alt;
  const isMissing = (it: MediaItem) => it.usages.some((u, i) => u.kind !== 'site' && !altOf(it, i).trim());
  const isUnused = (it: MediaItem) => it.local && !it.usages.length;

  const stats = useMemo(
    () => ({ total: items.length, missing: items.filter(isMissing).length, unused: items.filter(isUnused).length }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, edits]
  );

  // ALT filter, search and date first; the type buttons count what is left,
  // then the chosen type and sort order give the list.
  const base = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((it) =>
      (filter === 'all' || (filter === 'missing' ? isMissing(it) : isUnused(it))) &&
      matchesDate(it, filters.date) &&
      (!s || it.name.toLowerCase().includes(s) || (it.originalName || '').toLowerCase().includes(s) ||
        it.usages.some((u) => u.postTitle.toLowerCase().includes(s)))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, filter, q, edits, filters.date]);
  const shown = useMemo(
    () => sortItems(filters.category === 'all' ? base : base.filter((it) => itemCategory(it) === filters.category), filters.sort),
    [base, filters.category, filters.sort]
  );
  const counts = useMemo(() => categoryCounts(base), [base]);
  const { years, months } = useMemo(() => dateOptions(items), [items]);

  const pending = (Object.entries(edits) as [string, string][]).filter(([key, alt]) => {
    const [url, postId, kind] = key.split('|');
    const u = items.find((i) => i.url === url)?.usages.find((x) => x.postId === postId && x.kind === kind);
    return u && u.alt !== alt.trim();
  });

  /** Fills every empty ALT with its post's title, for the admin to review. */
  const autoFill = () => {
    const next = { ...edits };
    let n = 0;
    items.forEach((it) => it.usages.forEach((u, i) => {
      if (u.kind !== 'site' && !altOf(it, i).trim()) { next[usageKey(it.url, u)] = u.postTitle; n++; }
    }));
    setEdits(next);
    showToast(n ? `Filled ${n} empty ALT texts from post titles — review, then Save.` : 'No empty ALT texts.', 'info');
  };

  const save = async () => {
    setSaving(true);
    const changes = pending.map(([key, alt]) => {
      const [url, postId, kind] = key.split('|');
      return { url, postId, kind, alt };
    });
    const r = await fetch('/api/admin/media/alt', {
      method: 'PUT', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ changes }),
    }).then((x) => x.json()).catch(() => ({ success: false }));
    setSaving(false);
    if (!r.success) return showToast(r.error || 'Could not save ALT texts.', 'error');
    setEdits({});
    await Promise.all([load(), reloadBlog()]);
    showToast(`Saved ALT text for ${r.updated} image use${r.updated === 1 ? '' : 's'}.`, 'success');
  };

  const remove = async (it: MediaItem) => {
    if (!confirm(`Delete ${it.name}? It isn't used anywhere on the site.`)) return;
    await fetch(`/api/admin/upload?url=${encodeURIComponent(it.url)}`, { method: 'DELETE', credentials: 'same-origin' });
    setItems((prev) => prev.filter((x) => x.url !== it.url));
    showToast('File deleted.', 'info');
  };

  const chip = (f: Filter, label: string, n: number) => (
    <button
      onClick={() => setFilter(f)}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
        filter === f ? 'bg-[#6d46b8] text-white' : 'text-[#726c85] dark:text-[#b5a9cd] hover:bg-[#f1e9fb] dark:hover:bg-white/5'
      }`}
    >
      {label} ({n})
    </button>
  );

  return (
    <div className="animate-fade-in pb-20">
      <TopHeader
        title="Media Library"
        subtitle="Every file on the site — images, videos, audio and documents — by year, month and date. Give each image a descriptive ALT text: Google Images reads it, and so do screen readers."
        onOpenMobileMenu={onOpenMobileMenu}
        actionButton={{ label: 'Add Media', onClick: () => setShowUploader((v) => !v), icon: UploadCloud }}
      />

      {showUploader && <MediaUploader onClose={() => setShowUploader(false)} onUploaded={() => load()} />}

      <div className={`${card} p-3 mb-4 space-y-3`}>
      <MediaFilterBar value={filters} onChange={setFilters} counts={counts} years={years} months={months} />
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between border-t border-[#eae3ee] dark:border-white/10 pt-3">
        <div className="flex flex-wrap gap-1">
          {chip('all', 'All', stats.total)}
          {chip('missing', 'Missing ALT', stats.missing)}
          {chip('unused', 'Unused', stats.unused)}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#a29cb2]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search file name or post" aria-label="Search files"
              className="w-full sm:w-56 pl-9 pr-3 py-2 rounded-xl text-xs bg-[#f6f0f4] dark:bg-[#0e0a17] border border-[#eae3ee] dark:border-white/10 focus:outline-none" />
          </div>
          <button onClick={autoFill} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#6d46b8] border border-[#6d46b8]/40 hover:bg-[#f1e9fb] dark:hover:bg-white/5 cursor-pointer">
            <Wand2 className="w-4 h-4" /> Fill empty ALT from titles
          </button>
        </div>
      </div>
      </div>

      <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] mb-3 px-1" role="status">
        Showing {shown.length} of {items.length} file{items.length === 1 ? '' : 's'}
      </p>

      <MediaList items={shown} sort={filters.sort} edits={edits} onDelete={remove}
        onEdit={(k, v) => setEdits((e) => ({ ...e, [k]: v }))} />

      {/* Rendered on <body>: the page's fade-in animation would otherwise pin
          this "fixed" bar inside the page instead of the screen corner. */}
      {pending.length > 0 && createPortal(
        <div className="fixed bottom-5 right-5 z-40">
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#6d46b8] hover:bg-[#4b2e83] text-white text-sm font-bold shadow-xl disabled:opacity-60 cursor-pointer">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : `Save ${pending.length} ALT change${pending.length === 1 ? '' : 's'}`}
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};
