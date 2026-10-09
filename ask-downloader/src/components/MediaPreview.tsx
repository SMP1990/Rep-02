import React from 'react';
import { FileText, FileSpreadsheet, Presentation, FileArchive, File as FileIcon, ExternalLink, Music } from 'lucide-react';
import { categoryOf, extOf } from '../utils/mediaUpload';

/** The right preview for any Media Library file: picture, player or icon. */
export const MediaPreview: React.FC<{ url: string; name: string; compact?: boolean; className?: string }> = ({
  url, name, compact = false, className = '',
}) => {
  const category = categoryOf(name);
  const ext = extOf(name);
  const box = `rounded-xl border border-[#eae3ee] dark:border-white/10 bg-[#f1e9fb] dark:bg-[#201538] ${className}`;

  if (category === 'image') {
    return <img src={url} alt="" loading="lazy" className={`object-cover ${box}`} />;
  }
  if (category === 'video') {
    return compact
      ? <video src={url} preload="metadata" muted className={`object-cover bg-black ${box}`} />
      : <video src={url} controls preload="metadata" className={`bg-black ${box}`} />;
  }
  if (category === 'audio' && !compact) {
    return (
      <div className={`flex items-center p-2 ${box}`}>
        <audio src={url} controls preload="none" className="w-full" />
      </div>
    );
  }

  const Icon = category === 'audio' ? Music
    : ['xls', 'xlsx', 'csv'].includes(ext) ? FileSpreadsheet
    : ['ppt', 'pptx'].includes(ext) ? Presentation
    : ext === 'zip' ? FileArchive
    : ['pdf', 'doc', 'docx', 'txt'].includes(ext) ? FileText
    : FileIcon;
  return (
    <a href={url} target="_blank" rel="noreferrer" title={`Open ${name}`}
      className={`flex flex-col items-center justify-center gap-1 text-[#6d46b8] dark:text-[#d1b9f7] hover:opacity-80 ${box}`}>
      <Icon className="w-7 h-7" />
      <span className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
        {ext || 'file'}{!compact && <ExternalLink className="w-3 h-3" />}
      </span>
    </a>
  );
};
