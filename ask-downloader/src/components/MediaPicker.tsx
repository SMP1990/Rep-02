import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Loader2, CheckCircle2, Images, UploadCloud } from 'lucide-react';
import { MediaPreview } from './MediaPreview';
import { MediaUploader } from './MediaUploader';
import { categoryOf, formatBytes, type MediaCategory } from '../utils/mediaUpload';

/** What the place that opened the picker gets back. */
export interface PickedMedia { url: string; name: string; width?: number; height?: number }

interface LibraryFile extends PickedMedia {
  local: boolean;
  bytes: number;
  uploadedAt: string;
  category?: string;
  originalName?: string;
}

interface Props {
  open: boolean;
  title: string;
  /** Types that can be chosen here, e.g. ['image'] for a cover. */
  accept: MediaCategory[];
  onClose: () => void;
  onSelect: (file: PickedMedia) => void;
}

/**
 * WordPress-style "Choose from Media Library": pick a file that is already
 * in the library, or upload new ones (they go into the library first) and
 * pick one of those. Every image on the site comes from one place.
 */
export const MediaPicker: React.FC<Props> = ({ open, title, accept, onClose, onSelect }) => {
  const [tab, setTab] = useState<'library' | 'upload'>('library');
  const [files, setFiles] = useState<LibraryFile[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<LibraryFile | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/media', { credentials: 'same-origin' });
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      setFiles((d.items || []).filter((it: LibraryFile) => it.local));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setTab('library'); setQ(''); setSelected(null);
    load();
  }, [open, load]);

  // Esc closes, like any dialog.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (files || []).filter((f) => {
      const cat = (f.category || categoryOf(f.name)) as MediaCategory;
      return accept.includes(cat) && (!s || f.name.toLowerCase().includes(s) || (f.originalName || '').toLowerCase().includes(s));
    });
  }, [files, q, accept]);

  if (!open) return null;

  const choose = (f: PickedMedia) => { onSelect(f); onClose(); };
  const tabBtn = (key: 'library' | 'upload', label: string, Icon: React.ComponentType<{ className?: string }>) => (
    <button type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 cursor-pointer ${
        tab === key ? 'border-[#6d46b8] text-[#4b2e83] dark:text-white' : 'border-transparent text-[#726c85] dark:text-[#b5a9cd] hover:text-[#4b2e83]'
      }`}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className="bg-white dark:bg-[#181129] w-full h-full sm:h-[85vh] sm:max-w-5xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-4">
          <h2 className="text-base font-extrabold text-[#2e2440] dark:text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-[#726c85] hover:bg-[#f6f0f4] dark:hover:bg-white/5 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-2 px-4 sm:px-5 border-b border-[#eae3ee] dark:border-white/10" role="tablist">
          {tabBtn('library', 'Media Library', Images)}
          {tabBtn('upload', 'Upload files', UploadCloud)}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* Both tabs stay mounted, so switching never cancels an upload. */}
          <div className={tab === 'upload' ? '' : 'hidden'}>
            <MediaUploader accept={accept} onUploaded={(f) => {
              const picked: LibraryFile = { ...f, local: true };
              setFiles((prev) => [picked, ...(prev || []).filter((x) => x.url !== f.url)]);
              setSelected(picked);
            }} />
            <p className="text-[11px] text-[#726c85] dark:text-[#b5a9cd] -mt-3">
              Tip: name image files with words that describe them (e.g. <span className="font-mono">facebook-reels-downloader.jpg</span>) — Google reads file names.
            </p>
          </div>

          <div className={tab === 'library' ? '' : 'hidden'}>
            <div className="relative mb-4 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#a29cb2]" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search media" aria-label="Search media"
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[#f6f0f4] dark:bg-[#0e0a17] border border-[#eae3ee] dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#6d46b8]/40" />
            </div>
            {failed && !files ? (
              <p className="text-xs text-rose-600">The Media Library could not be loaded. <button type="button" className="underline cursor-pointer" onClick={load}>Try again</button></p>
            ) : !files ? (
              <p className="flex items-center gap-2 text-xs text-[#726c85]"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>
            ) : shown.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm font-bold text-[#2e2440] dark:text-white mb-1">{q ? 'Nothing matches your search' : 'No files here yet'}</p>
                <button type="button" onClick={() => setTab('upload')} className="text-xs font-bold text-[#6d46b8] underline cursor-pointer">Upload files</button>
              </div>
            ) : (
              <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                {shown.map((f) => {
                  const on = selected?.url === f.url;
                  return (
                    <li key={f.url}>
                      <button type="button" aria-pressed={on} title={f.name}
                        onClick={() => setSelected(f)} onDoubleClick={() => choose(f)}
                        className={`relative block w-full aspect-square rounded-xl overflow-hidden cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#6d46b8] ${
                          on ? 'ring-[3px] ring-[#6d46b8] ring-offset-2 dark:ring-offset-[#181129]' : 'hover:opacity-90'
                        }`}>
                        <MediaPreview url={f.url} name={f.name} compact className="w-full h-full pointer-events-none" />
                        {on && <CheckCircle2 className="absolute top-1.5 right-1.5 w-5 h-5 text-white fill-[#6d46b8]" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-[#eae3ee] dark:border-white/10 bg-[#faf7fc] dark:bg-white/5">
          <div className="min-w-0 text-xs text-[#726c85] dark:text-[#b5a9cd]">
            {selected ? (
              <>
                <p className="font-mono text-[#2e2440] dark:text-white truncate">{selected.name}</p>
                <p>{[selected.bytes ? formatBytes(selected.bytes) : '', selected.width ? `${selected.width} × ${selected.height} px` : ''].filter(Boolean).join(' · ')}</p>
              </>
            ) : 'Click a file to select it (double-click to use it at once).'}
          </div>
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold rounded-xl border border-[#eae3ee] dark:border-white/10 text-[#2e2440] dark:text-white cursor-pointer">Cancel</button>
            <button type="button" disabled={!selected} onClick={() => selected && choose(selected)}
              className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              Use this file
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
