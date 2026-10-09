import React, { useState } from 'react';
import { Trash2, AlertTriangle, CheckCircle2, Copy, Check, Download, ExternalLink } from 'lucide-react';
import { MediaPreview } from './MediaPreview';
import { categoryOf, extOf, formatBytes } from '../utils/mediaUpload';

export type Usage = { postId: string; postTitle: string; kind: 'cover' | 'inline' | 'site'; alt: string };
export type MediaItem = {
  url: string; name: string; local: boolean; bytes: number;
  uploadedAt: string; month: string; usages: Usage[];
  /** Present for files uploaded through the Media Library. */
  category?: string; originalName?: string; mime?: string; width?: number; height?: number;
};

export const usageKey = (url: string, u: Usage) => `${url}|${u.postId}|${u.kind}`;

const KIND_LABEL = { cover: 'Cover', inline: 'In post', site: 'Site' } as const;
const CATEGORY_LABEL: Record<string, string> = { image: 'Image', video: 'Video', audio: 'Audio', document: 'Document', archive: 'Archive' };
/** Opened in the browser; everything else (Word, Excel, ZIP…) downloads. */
const OPENS_INLINE = ['image', 'video', 'audio'];

interface Props {
  item: MediaItem;
  edits: Record<string, string>;
  onEdit: (key: string, alt: string) => void;
  onDelete: (item: MediaItem) => void;
}

export const MediaItemCard: React.FC<Props> = ({ item, edits, onEdit, onDelete }) => {
  const [copied, setCopied] = useState(false);
  const unused = item.local && item.usages.length === 0;
  const category = item.category || categoryOf(item.name) || 'image';
  const ext = extOf(item.name);
  const opensInline = OPENS_INLINE.includes(category) || ['pdf', 'txt', 'csv'].includes(ext);
  const time = (() => {
    const d = new Date(item.uploadedAt);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  })();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.local ? window.location.origin + item.url : item.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const action = 'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-[#6d46b8] dark:text-[#d1b9f7] hover:bg-[#f1e9fb] dark:hover:bg-white/5 cursor-pointer';

  return (
    <li className="flex flex-col sm:flex-row gap-4 p-4">
      {category === 'image' || !item.local ? (
        <a href={item.url} target="_blank" rel="noreferrer" className="shrink-0">
          <img
            src={item.url}
            alt=""
            loading="lazy"
            className="w-full sm:w-36 h-40 sm:h-24 object-cover rounded-xl border border-[#eae3ee] dark:border-white/10 bg-[#f1e9fb]"
          />
        </a>
      ) : category === 'video' ? (
        <MediaPreview url={item.url} name={item.name} className="shrink-0 w-full sm:w-36 h-48 sm:h-24 object-contain" />
      ) : (
        <MediaPreview url={item.url} name={item.name} compact className="shrink-0 w-full sm:w-36 h-24" />
      )}

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-mono text-xs truncate text-[#2e2440] dark:text-white max-w-full" title={item.name}>{item.name}</p>
          {!item.local && <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">External</span>}
          {unused && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold">Unused</span>}
        </div>

        <p className="text-[11px] text-[#726c85] dark:text-[#b5a9cd] flex flex-wrap gap-x-2 gap-y-0.5">
          <span className="font-bold text-[#4b2e83] dark:text-[#d1b9f7]">{CATEGORY_LABEL[category] || 'File'}{ext ? ` · ${ext.toUpperCase()}` : ''}</span>
          {item.bytes > 0 && <span>{formatBytes(item.bytes)}</span>}
          {item.width && item.height && <span>{item.width} × {item.height} px</span>}
          {time && <span>Uploaded {time}</span>}
          {item.originalName && item.originalName !== item.name && (
            <span className="truncate max-w-full" title={item.originalName}>Original: {item.originalName}</span>
          )}
        </p>
        {item.local && <p className="text-[10px] font-mono text-[#a29cb2] truncate" title={item.url}>{item.url}</p>}

        {category === 'audio' && item.local && (
          <audio src={item.url} controls preload="none" className="w-full max-w-md h-9" />
        )}

        <div className="flex flex-wrap items-center gap-1 -ml-2">
          <button type="button" onClick={copy} className={action} title="Copy the file's link">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied' : 'Copy link'}
          </button>
          <a href={item.url} target="_blank" rel="noreferrer" className={action}>
            {opensInline ? <><ExternalLink className="w-3.5 h-3.5" /> Open</> : <><Download className="w-3.5 h-3.5" /> Download</>}
          </a>
        </div>

        {item.usages.map((u) => {
          const key = usageKey(item.url, u);
          const value = edits[key] ?? u.alt;
          const editable = u.kind !== 'site';
          return (
            <div key={key} className="text-xs">
              <p className="text-[11px] text-[#726c85] dark:text-[#b5a9cd] mb-1 truncate">
                <span className="font-bold text-[#6d46b8] dark:text-[#a78bda]">{KIND_LABEL[u.kind]}</span> · {u.postTitle}
              </p>
              {editable && (
                <div className="flex items-center gap-2">
                  <input
                    value={value}
                    maxLength={160}
                    onChange={(e) => onEdit(key, e.target.value)}
                    placeholder={u.kind === 'cover' ? `Empty — "${u.postTitle}" is used` : 'Describe this image…'}
                    className={`flex-1 min-w-0 px-3 py-1.5 rounded-lg text-xs bg-[#f6f0f4] dark:bg-[#0e0a17] border focus:outline-none focus:ring-2 focus:ring-[#6d46b8]/40 ${
                      key in edits ? 'border-[#6d46b8]' : 'border-[#eae3ee] dark:border-white/10'
                    }`}
                  />
                  {value.trim()
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    : <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {unused && (
        <button
          onClick={() => onDelete(item)}
          title="Delete this unused file"
          className="self-start p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </li>
  );
};
