// The lookup path: root servers -> top-level domain -> the domain's own
// name servers, one line per question (ZDNS "trace" idea).
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { fill, type Strings } from '../i18n/en';
import type { TraceStep } from '../lib/api';

function what(t: Strings, s: TraceStep): string {
  if (s.cached) return t.traceCached;
  switch (s.result) {
    case 'referral': return fill(t.traceReferral, { zone: s.detail.split(' ')[0] });
    case 'answer': return t.traceAnswer;
    case 'cname': return fill(t.traceCname, { name: s.detail.replace(/^-> /, '') });
    case 'nxdomain': return t.traceNx;
    case 'nodata': return t.traceNodata;
    default: return fill(t.traceError, { detail: s.detail });
  }
}

const DOT: Record<TraceStep['result'], string> = {
  referral: 'bg-[#a78bda]', answer: 'bg-emerald-500', cname: 'bg-sky-500',
  nxdomain: 'bg-amber-500', nodata: 'bg-amber-500', error: 'bg-rose-500',
};

export default function Trace({ t, steps }: { t: Strings; steps: TraceStep[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-bold text-[#4b2e83] hover:bg-[#f1e9fb] dark:text-[#d1b9f7] dark:hover:bg-[#261b3b]"
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        {open ? t.traceHide : t.traceShow}
      </button>
      {open && (
        <div className="mt-2">
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{t.traceIntro}</p>
          <ol className="space-y-1">
            {steps.map((s, i) => (
              <li
                key={i}
                className="flex flex-wrap items-baseline gap-x-2 rounded-lg bg-[#faf6fd] px-3 py-1.5 text-xs dark:bg-[#120d1f]"
                style={{ marginInlineStart: `${s.depth * 1.25}rem` }}
              >
                <span className={`h-2 w-2 shrink-0 self-center rounded-full ${DOT[s.result]}`} aria-hidden="true" />
                <span className="font-bold text-slate-800 dark:text-slate-100" dir="ltr">{s.zone ? `.${s.zone}` : t.traceRoot}</span>
                <span className="text-slate-500 dark:text-slate-400" dir="ltr">{s.server}</span>
                <span className="text-slate-700 dark:text-slate-200">{what(t, s)}</span>
                {s.depth > 0 && <span className="text-slate-400">· {t.traceSub}</span>}
                {s.ms > 0 && <span className="ms-auto tabular-nums text-slate-400">{fill(t.ms, { ms: s.ms })}</span>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
