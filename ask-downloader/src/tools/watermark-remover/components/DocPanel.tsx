// PDF and Word tabs: watermarks are found automatically, in the browser.
// The PDF/Word code loads only when the first file is added.
import { useState, type FormEvent } from 'react';
import { CheckCircle2, CircleAlert, Download, ExternalLink, FileText, Loader2, ShieldCheck } from 'lucide-react';
import { fill, type Strings } from '../i18n/en';
import { cleanName, download } from '../lib/files';
import Drop from './Drop';

type Kind = 'pdf' | 'word';
type Row = {
  id: number; file: File; state: 'working' | 'done' | 'none' | 'error' | 'password';
  blob?: Blob; note?: string; password?: string; wrong?: boolean;
};

const BTN = 'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition active:scale-95';
const SOFT = `${BTN} bg-[#f1e9fb] text-[#4b2e83] hover:bg-[#e6d8f7] dark:bg-[#261b3b] dark:text-[#d1b9f7]`;
let ids = 0;

async function processFile(kind: Kind, t: Strings, file: File, strong: boolean, password?: string): Promise<Partial<Row>> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (kind === 'word') {
    const { removeDocxWatermark, NotDocx } = await import('../lib/docx');
    try {
      const r = removeDocxWatermark(bytes);
      if (!r.removed.length) return { state: 'none' };
      const what = r.removed.map((x) => (x.text ? `"${x.text}"` : x.kind === 'picture' ? t.wordPicture : t.wordText));
      return { state: 'done', blob: new Blob([r.data as BlobPart], { type: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), note: fill(t.wordFound, { text: [...new Set(what)].join(', ') }) };
    } catch (e) {
      return { state: 'error', note: e instanceof NotDocx ? t.wordNotDocx : t.errFailed };
    }
  }
  const { removePdfWatermark, PdfPasswordNeeded, NotPdf } = await import('../lib/pdf');
  try {
    const r = await removePdfWatermark(bytes, { strong, password });
    if (!r.changedPages) return { state: 'none' };
    return { state: 'done', blob: new Blob([r.data as BlobPart], { type: 'application/pdf' }), note: fill(t.pdfFound, { n: r.changedPages }) };
  } catch (e) {
    if (e instanceof PdfPasswordNeeded) return { state: 'password', wrong: password !== undefined };
    return { state: 'error', note: e instanceof NotPdf ? t.pdfNotPdf : t.errFailed };
  }
}

export default function DocPanel({ t, kind }: { t: Strings; kind: Kind }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [strong, setStrong] = useState(false);
  const accept = kind === 'pdf' ? 'application/pdf,.pdf' : '.docx,.docm,.dotx,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const okType = (f: File) => (kind === 'pdf' ? /\.pdf$/i.test(f.name) || f.type === 'application/pdf' : /\.(docx|docm|dotx)$/i.test(f.name));

  const update = (id: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const work = async (row: Row, password?: string) => {
    update(row.id, { state: 'working', wrong: false });
    update(row.id, await processFile(kind, t, row.file, strong, password));
  };
  const add = async (files: File[]) => {
    const fresh = files.map((file) => ({ id: ++ids, file, state: okType(file) ? 'working' : 'error', note: okType(file) ? undefined : t.wrongType }) as Row);
    setRows((rs) => [...fresh, ...rs]);
    for (const r of fresh) if (r.state === 'working') await work(r); // one by one: keeps phones responsive
  };
  const name = (r: Row) => cleanName(r.file.name);
  const done = rows.filter((r) => r.state === 'done');

  return (
    <div>
      <Drop title={t.dropMany} hint={kind === 'pdf' ? t.acceptPdf : t.acceptWord} accept={accept} multiple icon={FileText} onFiles={add} />
      {kind === 'pdf' && (
        <label className="mt-4 flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input type="checkbox" checked={strong} onChange={(e) => setStrong(e.target.checked)} className="mt-1 h-4 w-4 accent-[#6d46b8]" />
          {t.pdfStrong}
        </label>
      )}

      {rows.length > 0 && (
        <ul className="mt-4 divide-y divide-[#efe6f8] rounded-2xl bg-white/90 dark:divide-[#2c2142] dark:bg-[#17112a]">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
              {r.state === 'working' && <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[#6d46b8]" aria-hidden="true" />}
              {r.state === 'done' && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />}
              {(r.state === 'none' || r.state === 'error' || r.state === 'password') && <CircleAlert className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />}
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-slate-900 dark:text-white" dir="auto">{r.file.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {r.state === 'working' && t.working}
                  {r.state === 'done' && <><span className="font-bold text-emerald-700 dark:text-emerald-400">{t.docRemoved}</span> · <span dir="auto">{r.note}</span></>}
                  {r.state === 'none' && <><span className="font-bold text-amber-700 dark:text-amber-400">{t.docNone}</span> · {t.docNoneHelp}</>}
                  {r.state === 'error' && r.note}
                </div>
                {r.state === 'password' && (
                  <form
                    className="mt-2 flex flex-wrap items-center gap-2"
                    onSubmit={(e: FormEvent) => { e.preventDefault(); work(r, r.password ?? ''); }}
                  >
                    <label className="text-xs text-slate-600 dark:text-slate-300">{r.wrong ? t.pdfWrongPassword : t.pdfPassword}</label>
                    <input type="password" autoComplete="off" value={r.password ?? ''} onChange={(e) => update(r.id, { password: e.target.value })} className="rounded-lg border border-[#e9dcf7] bg-white px-2 py-1 text-sm dark:border-[#2c2142] dark:bg-[#120d1f] dark:text-white" />
                    <button type="submit" className={SOFT}>{t.pdfOpen}</button>
                  </form>
                )}
              </div>
              {r.state === 'done' && r.blob && (
                <div className="flex gap-2">
                  {kind === 'pdf' && (
                    <button type="button" className={SOFT} onClick={() => window.open(URL.createObjectURL(r.blob!), '_blank', 'noopener')}>
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />{t.pdfView}
                    </button>
                  )}
                  <button type="button" className={`${BTN} bg-[#6d46b8] text-white hover:bg-[#5a37a0]`} onClick={() => download(r.blob!, name(r))}>
                    <Download className="h-4 w-4" aria-hidden="true" />{t.download}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {done.length > 1 && (
        <button type="button" className={`${SOFT} mt-3`} onClick={() => done.forEach((r, i) => setTimeout(() => download(r.blob!, name(r)), i * 400))}>
          <Download className="h-4 w-4" aria-hidden="true" />{t.downloadAll}
        </button>
      )}
      <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />{t.privacyLocal}</p>
    </div>
  );
}
