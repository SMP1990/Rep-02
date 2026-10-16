// Video tab: draw boxes over the logo on the video, the server removes it
// from every frame (ffmpeg delogo), in line with other videos.
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Download, Loader2, ShieldCheck, Video, Wand2, X } from 'lucide-react';
import { fill, type Strings } from '../i18n/en';
import { cancelVideo, uploadVideo, videoFileUrl, videoStatus, type Box } from '../lib/videoApi';
import Drop from './Drop';

type Phase = { kind: 'edit' } | { kind: 'upload'; p: number } | { kind: 'queued'; n: number } | { kind: 'working'; p: number } | { kind: 'done'; id: string };
const BTN = 'inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-3 text-sm font-bold transition active:scale-95 disabled:opacity-50';
const ERR: Record<string, keyof Strings> = { 'too-big': 'errTooBig', 'bad-video': 'errBadVideo', unavailable: 'errUnavailable', network: 'errNetwork' };

export default function VideoPanel({ t }: { t: Strings }) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [draft, setDraft] = useState<Box | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'edit' });
  const [error, setError] = useState('');
  const job = useRef<{ id?: string; ctrl?: AbortController }>({});
  const start = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const open = (files: File[]) => {
    const f = files[0];
    if (!f) return;
    if (!/^video\//.test(f.type) && !/\.(mp4|mov|m4v|webm|mkv|avi|3gp)$/i.test(f.name)) return setError(t.wrongType);
    if (f.size > 2 * 1024 ** 3) return setError(t.errTooBig);
    setError('');
    setFile(f);
    setUrl(URL.createObjectURL(f));
    setBoxes([]);
    setPhase({ kind: 'edit' });
  };

  // Pointer position in video pixels
  const pos = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * size.w, y: ((e.clientY - r.top) / r.height) * size.h };
  };
  const rect = (a: { x: number; y: number }, b: { x: number; y: number }): Box => ({
    x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y),
  });
  const pct = (b: Box) => ({ left: `${(b.x / size.w) * 100}%`, top: `${(b.y / size.h) * 100}%`, width: `${(b.w / size.w) * 100}%`, height: `${(b.h / size.h) * 100}%` });

  const run = async () => {
    if (!file) return;
    if (!boxes.length) return setError(t.vidNoBox);
    setError('');
    const ctrl = new AbortController();
    job.current = { ctrl };
    try {
      setPhase({ kind: 'upload', p: 0 });
      const id = await uploadVideo(file, boxes, (p) => setPhase({ kind: 'upload', p }), ctrl.signal);
      job.current.id = id;
      for (;;) {
        if (ctrl.signal.aborted) return;
        const s = await videoStatus(id);
        if (s.state === 'done') return setPhase({ kind: 'done', id });
        if (s.state === 'failed') throw new Error('failed');
        setPhase(s.state === 'queued' ? { kind: 'queued', n: s.position } : { kind: 'working', p: s.progress });
        await new Promise((z) => setTimeout(z, 1500));
      }
    } catch (e: any) {
      if (ctrl.signal.aborted) return;
      setError(t[ERR[e?.message] ?? 'errFailed']);
      setPhase({ kind: 'edit' });
    }
  };
  const cancel = () => {
    job.current.ctrl?.abort();
    if (job.current.id) cancelVideo(job.current.id);
    job.current = {};
    setPhase({ kind: 'edit' });
  };

  if (!file) {
    return (
      <div>
        <Drop title={t.drop} hint={t.acceptVideo} accept="video/*" icon={Video} onFiles={open} />
        {error && <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}
        <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />{t.privacyVideo}</p>
      </div>
    );
  }

  const busy = phase.kind !== 'edit' && phase.kind !== 'done';
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{t.vidHow}</p>
      <div className="relative mx-auto w-fit max-w-full">
        <video
          src={url}
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={(e) => setSize({ w: e.currentTarget.videoWidth, h: e.currentTarget.videoHeight })}
          className="block h-auto max-h-[65vh] w-auto max-w-full rounded-2xl bg-black"
        />
        {size.w > 0 && (
          <div
            className={`absolute inset-0 touch-none rounded-2xl ${busy ? 'pointer-events-none' : 'cursor-crosshair'}`}
            onPointerDown={(e) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ } start.current = pos(e); setDraft(null); }}
            onPointerMove={(e) => start.current && setDraft(rect(start.current, pos(e)))}
            onPointerUp={(e) => {
              if (start.current) {
                const b = rect(start.current, pos(e));
                if (b.w > size.w / 100 && b.h > size.h / 100) setBoxes((bs) => [...bs, b].slice(-20));
              }
              start.current = null;
              setDraft(null);
            }}
          >
            {[...boxes, ...(draft ? [draft] : [])].map((b, i) => (
              <div key={i} style={pct(b)} className="absolute rounded border-2 border-rose-500 bg-rose-500/25">
                {i < boxes.length && !busy && (
                  <button
                    type="button"
                    aria-label={t.clear}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => setBoxes((bs) => bs.filter((_, j) => j !== i))}
                    className="absolute -end-3 -top-3 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white shadow"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t.vidTip}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {phase.kind === 'done' ? (
          <a href={videoFileUrl(phase.id)} className={`${BTN} bg-emerald-600 text-white hover:bg-emerald-700`}><Download className="h-5 w-5" aria-hidden="true" />{t.download}</a>
        ) : (
          <button type="button" onClick={run} disabled={busy || !boxes.length} className={`${BTN} bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] text-white shadow-lg shadow-[#6d46b8]/30 hover:brightness-110`}>
            {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Wand2 className="h-5 w-5" aria-hidden="true" />}
            {t.remove}
          </button>
        )}
        {busy && <button type="button" onClick={cancel} className={`${BTN} bg-[#f1e9fb] text-[#4b2e83] dark:bg-[#261b3b] dark:text-[#d1b9f7]`}>{t.vidCancel}</button>}
        {!busy && <button type="button" onClick={() => { setFile(null); setPhase({ kind: 'edit' }); }} className={`${BTN} bg-[#f1e9fb] text-[#4b2e83] dark:bg-[#261b3b] dark:text-[#d1b9f7]`}>{t.another}</button>}
      </div>

      <div role="status" aria-live="polite" className="mt-3 text-sm font-semibold">
        {phase.kind === 'upload' && <Progress text={fill(t.vidUploading, { p: Math.round(phase.p * 100) })} p={phase.p} />}
        {phase.kind === 'queued' && <p className="text-[#4b2e83] dark:text-[#d1b9f7]">{fill(t.vidQueued, { n: phase.n })}</p>}
        {phase.kind === 'working' && <Progress text={fill(t.vidWorking, { p: Math.round(phase.p * 100) })} p={phase.p} />}
        {phase.kind === 'done' && <p className="text-emerald-700 dark:text-emerald-400">{t.vidDone}</p>}
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
      </div>
      <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />{t.privacyVideo}</p>
    </div>
  );
}

function Progress({ text, p }: { text: string; p: number }) {
  return (
    <div>
      <p className="text-[#4b2e83] dark:text-[#d1b9f7]">{text}</p>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div className="h-full rounded-full bg-gradient-to-r from-[#6d46b8] to-[#e6799f] transition-all" style={{ width: `${Math.round(p * 100)}%` }} />
      </div>
    </div>
  );
}
