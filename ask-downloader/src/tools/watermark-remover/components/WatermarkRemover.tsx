// The Watermark Remover: one tool, four kinds of file.
// Image: AI on the server (only the marked area is sent). PDF and Word:
// in the browser. Video: ffmpeg on the server, in line.
import { Fragment, useState } from 'react';
import { FileText, FileType2, Image as ImageIcon, Info, Video } from 'lucide-react';
import type { Strings } from '../i18n/en';
import DocPanel from './DocPanel';
import ImagePanel from './ImagePanel';
import VideoPanel from './VideoPanel';

type Tab = 'image' | 'pdf' | 'word' | 'video';

export default function WatermarkRemover({ t }: { t: Strings }) {
  const [tab, setTab] = useState<Tab>('image');
  const tabs: { id: Tab; label: string; Icon: typeof FileText }[] = [
    { id: 'image', label: t.tabImage, Icon: ImageIcon },
    { id: 'pdf', label: t.tabPdf, Icon: FileText },
    { id: 'word', label: t.tabWord, Icon: FileType2 },
    { id: 'video', label: t.tabVideo, Icon: Video },
  ];

  return (
    <section className="mx-auto w-full max-w-5xl px-4" aria-label={t.title}>
      <div className="rounded-3xl bg-white/90 p-4 shadow-xl shadow-[#6d46b8]/10 dark:bg-[#17112a] sm:p-6">
        <div role="tablist" aria-label={t.title} className="mb-5 grid grid-cols-4 gap-1 rounded-2xl bg-[#f1e9fb] p-1 dark:bg-[#120d1f]">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`wm-tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`wm-panel-${id}`}
              onClick={() => setTab(id)}
              className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs font-bold transition sm:flex-row sm:justify-center sm:text-sm ${
                tab === id ? 'bg-white text-[#4b2e83] shadow dark:bg-[#261b3b] dark:text-[#d1b9f7]' : 'text-slate-600 hover:text-[#4b2e83] dark:text-slate-300'
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        {/* Panels stay mounted, so switching tabs keeps each tab's work. */}
        {tabs.map(({ id }) => (
          <Fragment key={id}>
            <div role="tabpanel" id={`wm-panel-${id}`} aria-labelledby={`wm-tab-${id}`} hidden={tab !== id}>
              {id === 'image' && <ImagePanel t={t} />}
              {id === 'pdf' && <DocPanel t={t} kind="pdf" />}
              {id === 'word' && <DocPanel t={t} kind="word" />}
              {id === 'video' && <VideoPanel t={t} />}
            </div>
          </Fragment>
        ))}

        <p className="mt-5 flex items-start gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <Info className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
          {t.ownFiles}
        </p>
      </div>
    </section>
  );
}
