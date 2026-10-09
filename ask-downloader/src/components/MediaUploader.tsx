import React, { useEffect, useRef, useState } from 'react';
import { UploadCloud, X, CheckCircle2, AlertCircle, Loader2, Copy, Check } from 'lucide-react';
import { ACCEPT_ATTR, checkMediaFile, formatBytes, uploadMediaFile, categoryOf, type MediaFileRecord, type MediaCategory, type UploadHandle } from '../utils/mediaUpload';
import { MediaPreview } from './MediaPreview';

type Status = 'waiting' | 'uploading' | 'done' | 'error';
interface QueueItem {
  key: string;
  file: File;
  status: Status;
  progress: number;
  error?: string;
  result?: MediaFileRecord;
}

/** Files uploaded side by side; the rest wait their turn. */
const PARALLEL = 2;

/**
 * Media Library -> Add Media: click or drag & drop any number of files,
 * watch each one upload, see its preview (or why it failed).
 */
interface Props {
  onUploaded: (file: MediaFileRecord) => void;
  /** Shows a close button when given. */
  onClose?: () => void;
  /** Only these types may be uploaded here (e.g. images for a cover). All types if left out. */
  accept?: MediaCategory[];
}

export const MediaUploader: React.FC<Props> = ({ onClose, onUploaded, accept }) => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const imagesOnly = accept?.length === 1 && accept[0] === 'image';
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const handles = useRef(new Map<string, UploadHandle>());
  const started = useRef(new Set<string>());
  const dragDepth = useRef(0);

  const update = (key: string, patch: Partial<QueueItem>) =>
    setQueue((q) => q.map((it) => (it.key === key ? { ...it, ...patch } : it)));

  const addFiles = (list: FileList | File[] | null) => {
    const files = Array.from(list || []);
    if (!files.length) return;
    setQueue((q) => [
      ...q,
      ...files.map((file, i) => {
        const category = categoryOf(file.name);
        const problem = checkMediaFile(file) ||
          (accept && category && !accept.includes(category) ? `Only ${accept.join(' / ')} files can be used here.` : null);
        return {
          key: `${Date.now()}-${i}-${file.name}`,
          file,
          status: (problem ? 'error' : 'waiting') as Status,
          progress: 0,
          error: problem || undefined,
        };
      }),
    ]);
  };

  // Start waiting files whenever a slot is free.
  useEffect(() => {
    const running = queue.filter((it) => it.status === 'uploading').length;
    const next = queue.filter((it) => it.status === 'waiting').slice(0, Math.max(0, PARALLEL - running));
    for (const it of next) {
      if (started.current.has(it.key)) continue; // never upload the same file twice
      started.current.add(it.key);
      update(it.key, { status: 'uploading', progress: 0 });
      const handle = uploadMediaFile(it.file, (p) => update(it.key, { progress: p }));
      handles.current.set(it.key, handle);
      handle.promise.then((r) => {
        handles.current.delete(it.key);
        if (r.ok && r.file) {
          update(it.key, { status: 'done', progress: 100, result: r.file });
          onUploaded(r.file);
        } else {
          update(it.key, { status: 'error', error: r.error });
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue]);

  // Leaving the page cancels uploads still in progress.
  useEffect(() => () => handles.current.forEach((h) => h.cancel()), []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(window.location.origin + url);
      setCopied(url);
      window.setTimeout(() => setCopied(''), 1500);
    } catch {}
  };

  const busy = queue.some((it) => it.status === 'uploading' || it.status === 'waiting');
  const finished = queue.filter((it) => it.status === 'done' || it.status === 'error').length;
  const done = queue.filter((it) => it.status === 'done').length;
  const failed = queue.filter((it) => it.status === 'error').length;

  return (
    <section className="bg-white dark:bg-[#181129] rounded-2xl border border-[#eae3ee] dark:border-white/10 shadow-xs p-4 sm:p-5 mb-6" aria-label="Upload media">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-extrabold text-[#2e2440] dark:text-white">Upload Media</h2>
          <p className="text-[11px] text-[#726c85] dark:text-[#b5a9cd] mt-0.5">
            {imagesOnly ? 'Images' : 'Images, videos, audio, documents and ZIP files'}. New files are added to the Media Library, saved by date (e.g. /uploads/2026/10/).
          </p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close upload panel"
            className="p-1.5 rounded-lg text-[#726c85] hover:bg-[#f6f0f4] dark:hover:bg-white/5 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        onDragEnter={(e) => { e.preventDefault(); dragDepth.current++; setDragging(true); }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false); }}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center text-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 sm:py-10 cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#6d46b8]/50 ${
          dragging ? 'border-[#6d46b8] bg-[#f1e9fb] dark:bg-[#261b3b]' : 'border-[#d9cdea] dark:border-white/15 hover:border-[#6d46b8] hover:bg-[#faf7fc] dark:hover:bg-white/5'
        }`}
      >
        <UploadCloud className="w-9 h-9 text-[#6d46b8] dark:text-[#d1b9f7]" />
        <p className="text-sm font-bold text-[#2e2440] dark:text-white">
          {dragging ? 'Drop the files here' : <>Drag &amp; drop files here, or <span className="text-[#6d46b8] dark:text-[#d1b9f7] underline">choose files</span></>}
        </p>
        <p className="text-[11px] text-[#726c85] dark:text-[#b5a9cd] max-w-md">
          {imagesOnly
            ? 'JPG, PNG, GIF, WebP, AVIF or SVG'
            : 'JPG, PNG, GIF, WebP, AVIF, SVG · MP4, WebM, MOV · MP3, WAV, OGG, M4A · PDF, DOC(X), XLS(X), PPT(X), TXT, CSV · ZIP'}
        </p>
        <p className="text-[11px] text-[#a29cb2]">
          {imagesOnly ? 'Max size: 10 MB (SVG 2 MB)' : 'Max size: images 10 MB (SVG 2 MB) · audio 30 MB · documents & ZIP 25 MB · video 100 MB'}
        </p>
        <input ref={inputRef} type="file" multiple className="hidden"
          accept={accept ? ACCEPT_ATTR.split(',').filter((e) => accept.includes(categoryOf(e) as MediaCategory)).join(',') : ACCEPT_ATTR}
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
      </div>

      {queue.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 mt-4 mb-2">
            <p className="text-xs text-[#726c85] dark:text-[#b5a9cd]" role="status">
              {busy ? `Uploading… ${finished} of ${queue.length} finished` : `${done} uploaded${failed ? `, ${failed} failed` : ''}`}
            </p>
            {!busy && (
              <button type="button" onClick={() => setQueue([])}
                className="text-[11px] font-bold text-[#6d46b8] dark:text-[#d1b9f7] hover:underline cursor-pointer">Clear list</button>
            )}
          </div>
          <ul className="space-y-2">
            {queue.map((it) => (
              <li key={it.key} className={`flex items-center gap-3 rounded-xl border p-2.5 ${
                it.status === 'error' ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20' : 'border-[#eae3ee] dark:border-white/10'
              }`}>
                <div className="w-14 h-14 shrink-0">
                  {it.status === 'done' && it.result
                    ? <MediaPreview url={it.result.url} name={it.result.name} compact className="w-14 h-14" />
                    : <div className="w-14 h-14 rounded-xl bg-[#f6f0f4] dark:bg-white/5 flex items-center justify-center">
                        {it.status === 'error' ? <AlertCircle className="w-5 h-5 text-rose-500" /> : <Loader2 className={`w-5 h-5 text-[#6d46b8] ${it.status === 'uploading' ? 'animate-spin' : 'opacity-40'}`} />}
                      </div>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-[#2e2440] dark:text-white truncate" title={it.file.name}>{it.file.name}</p>
                    <span className="text-[10px] text-[#a29cb2] shrink-0">{formatBytes(it.file.size)}</span>
                  </div>
                  {it.status === 'uploading' || it.status === 'waiting' ? (
                    <div className="mt-1.5">
                      <div className="h-1.5 rounded-full bg-[#f1e9fb] dark:bg-white/10 overflow-hidden"
                        role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={it.progress} aria-label={`Uploading ${it.file.name}`}>
                        <div className="h-full bg-gradient-to-r from-[#6d46b8] to-[#e6799f] transition-[width] duration-200" style={{ width: `${it.progress}%` }} />
                      </div>
                      <p className="text-[10px] text-[#726c85] mt-1">{it.status === 'waiting' ? 'Waiting…' : `${it.progress}%`}</p>
                    </div>
                  ) : it.status === 'error' ? (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{it.error}</p>
                  ) : (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 min-w-0">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate font-mono" title={it.result?.url}>{it.result?.url}</span>
                    </p>
                  )}
                </div>
                {it.status === 'uploading' && (
                  <button type="button" onClick={() => handles.current.get(it.key)?.cancel()} aria-label={`Cancel ${it.file.name}`}
                    className="p-1.5 rounded-lg text-[#726c85] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                )}
                {it.status === 'done' && it.result && (
                  <button type="button" onClick={() => copy(it.result!.url)} aria-label="Copy link"
                    className="p-1.5 rounded-lg text-[#726c85] hover:text-[#6d46b8] hover:bg-[#f1e9fb] dark:hover:bg-white/5 cursor-pointer" title="Copy link">
                    {copied === it.result.url ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
};
