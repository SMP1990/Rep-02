// Before / after of one image, in a dialog. The two images are decoded only
// while it is open and released when it closes.
import { useEffect, useRef, useState } from 'react';
import { MoveHorizontal, X } from 'lucide-react';
import type { Strings } from '../i18n/en';
import type { Item } from '../lib/useCompressor';

export default function Compare({ t, item, onClose }: { t: Strings; item: Item; onClose: () => void }) {
  const [pos, setPos] = useState(50);
  const [urls, setUrls] = useState<{ before: string; after: string } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const before = URL.createObjectURL(item.file);
    const after = URL.createObjectURL(item.done!.blob);
    setUrls({ before, after });
    dialog.current?.showModal();
    return () => { URL.revokeObjectURL(before); URL.revokeObjectURL(after); };
  }, [item]);

  const { width, height } = item.done!;
  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      className="m-auto w-[min(96vw,1100px)] rounded-3xl bg-white p-3 sm:p-4 backdrop:bg-black/70 dark:bg-[#17112a]"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white" dir="auto">{item.file.name}</p>
        <button type="button" onClick={() => dialog.current?.close()} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-bold text-[#6d46b8] hover:bg-[#f1e9fb] dark:text-[#d1b9f7] dark:hover:bg-[#261b3b]">
          <X className="h-4 w-4" aria-hidden="true" />
          {t.closeCompare}
        </button>
      </div>
      {urls && (
        <div
          dir="ltr"
          className="bgr-checkerboard relative mx-auto w-full overflow-hidden rounded-2xl select-none"
          style={{ aspectRatio: `${width} / ${height}`, maxHeight: '78vh', maxWidth: `calc(78vh * ${width / height})` }}
        >
          <img src={urls.after} alt={t.resultAlt} className="absolute inset-0 h-full w-full object-contain" draggable={false} />
          <img src={urls.before} alt={t.originalAlt} className="absolute inset-0 h-full w-full object-contain" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} draggable={false} />
          <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_6px_rgba(0,0,0,0.4)]" style={{ left: `${pos}%` }}>
            <div className="absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#6d46b8] shadow-lg">
              <MoveHorizontal className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white">{t.before}</span>
          <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-[#6d46b8]/90 px-2.5 py-1 text-xs font-semibold text-white">{t.after}</span>
          <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label={t.compareLabel} className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" />
        </div>
      )}
    </dialog>
  );
}
