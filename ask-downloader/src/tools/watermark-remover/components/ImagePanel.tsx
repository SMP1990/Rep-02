// Image tab: paint over the watermark, the server's AI fills it in.
import { useRef, useState } from 'react';
import { Download, Eraser, Eye, ImagePlus, Loader2, RotateCcw, ShieldCheck, Wand2 } from 'lucide-react';
import type { Strings } from '../i18n/en';
import { inpaint, toBlob } from '../lib/inpaint';
import { cleanName, download, maxPixels } from '../lib/files';
import Drop from './Drop';
import MaskPainter, { type PainterHandle } from './MaskPainter';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/bmp,image/gif,image/avif';
const BTN = 'inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition active:scale-95 disabled:opacity-50';
const SOFT = `${BTN} bg-[#f1e9fb] text-[#4b2e83] hover:bg-[#e6d8f7] dark:bg-[#261b3b] dark:text-[#d1b9f7]`;
const MAIN = `${BTN} bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] px-5 py-3 text-white shadow-lg shadow-[#6d46b8]/30 hover:brightness-110`;

type Photo = { name: string; type: string; work: HTMLCanvasElement; original: HTMLCanvasElement; scaled: boolean };

async function load(file: File): Promise<Photo> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  const k = Math.min(1, Math.sqrt(maxPixels() / (bmp.width * bmp.height)));
  const mk = () => {
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('too big');
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    return c;
  };
  const work = mk(), original = mk();
  bmp.close();
  return { name: file.name, type: file.type, work, original, scaled: k < 1 };
}

export default function ImagePanel({ t }: { t: Strings }) {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [brush, setBrush] = useState(28);
  const [busy, setBusy] = useState(false);
  const [painted, setPainted] = useState(false);
  const [peek, setPeek] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const painter = useRef<PainterHandle>(null);

  const open = async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) return setMsg({ text: t.wrongType, bad: true });
    try {
      const p = await load(f);
      setPhoto(p);
      setPainted(false);
      setMsg(p.scaled ? { text: t.imgScaled } : null);
    } catch {
      setMsg({ text: t.imgTooBig, bad: true });
    }
  };

  const run = async () => {
    const h = painter.current;
    if (!photo || !h?.mask) return;
    setBusy(true);
    setMsg(null);
    try {
      const ok = await inpaint(photo.work, h.mask, () => setMsg({ text: t.errBusy }));
      if (!ok) return setMsg({ text: t.imgNoMark, bad: true });
      h.clear();
      h.refresh();
      setMsg({ text: t.imgDone });
    } catch (e: any) {
      const m = e?.message;
      setMsg({ text: m === 'unavailable' ? t.errUnavailable : m === 'network' ? t.errNetwork : t.errFailed, bad: true });
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!photo) return;
    const type = /png|webp/.test(photo.type) ? photo.type : 'image/jpeg';
    const blob = await toBlob(photo.work, type, 0.95);
    download(blob, cleanName(photo.name, type.split('/')[1].replace('jpeg', 'jpg')));
  };

  if (!photo) {
    return (
      <div>
        <Drop title={t.drop} hint={t.acceptImage} accept={ACCEPT} icon={ImagePlus} onFiles={open} />
        {msg && <p className={`mt-3 text-sm font-semibold ${msg.bad ? 'text-rose-600' : 'text-slate-600'}`}>{msg.text}</p>}
        <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />{t.privacyServer}</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{t.imgHow}</p>
      <MaskPainter ref={painter} work={photo.work} original={photo.original} brush={brush} showOriginal={peek} onPaint={() => setPainted(true)} />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="flex min-w-[12rem] flex-1 items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          {t.brush}
          <input type="range" min={6} max={120} value={brush} onChange={(e) => setBrush(+e.target.value)} className="flex-1 accent-[#6d46b8]" />
        </label>
        <button type="button" className={SOFT} onClick={() => painter.current?.undo()} disabled={busy}><RotateCcw className="h-4 w-4" aria-hidden="true" />{t.undo}</button>
        <button type="button" className={SOFT} onClick={() => { painter.current?.clear(); setPainted(false); }} disabled={busy}><Eraser className="h-4 w-4" aria-hidden="true" />{t.clear}</button>
        <button
          type="button"
          className={SOFT}
          onPointerDown={() => setPeek(true)}
          onPointerUp={() => setPeek(false)}
          onPointerLeave={() => setPeek(false)}
          onKeyDown={(e) => e.key === ' ' && setPeek(true)}
          onKeyUp={() => setPeek(false)}
        >
          <Eye className="h-4 w-4" aria-hidden="true" />{t.showOriginal}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={MAIN} onClick={run} disabled={busy || !painted}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Wand2 className="h-5 w-5" aria-hidden="true" />}
          {busy ? t.working : t.removeImg}
        </button>
        <button type="button" className={`${SOFT} px-5 py-3`} onClick={save} disabled={busy}><Download className="h-5 w-5" aria-hidden="true" />{t.download}</button>
        <button type="button" className={`${SOFT} px-5 py-3`} onClick={() => { setPhoto(null); setMsg(null); }} disabled={busy}>{t.another}</button>
      </div>
      <div role="status" aria-live="polite">
        {msg && <p className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${msg.bad ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' : 'bg-[#f1e9fb] text-[#4b2e83] dark:bg-[#261b3b] dark:text-[#d1b9f7]'}`}>{msg.text}</p>}
      </div>
      <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />{t.privacyServer}</p>
    </div>
  );
}
