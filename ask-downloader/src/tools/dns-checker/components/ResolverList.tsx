// One row per public DNS server: name, country, result badge, records, time.
import { useMemo } from 'react';
import { CheckCircle2, CircleAlert, CircleX, Globe2 } from 'lucide-react';
import { fill, type Strings } from '../i18n/en';
import { shown, type CheckResult, type ResolverRow } from '../lib/api';

type Badge = { label: string; help: string; cls: string; Icon: typeof CheckCircle2 };

function badge(t: Strings, r: ResolverRow): Badge {
  const green = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
  const amber = 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
  const red = 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300';
  if (r.match === 'same') return { label: t.same, help: t.sameHelp, cls: green, Icon: CheckCircle2 };
  if (r.match === 'geo') return { label: t.geo, help: t.geoHelp, cls: green, Icon: Globe2 };
  if (r.match === 'old') return { label: t.old, help: t.oldHelp, cls: amber, Icon: CircleAlert };
  if (r.match === 'missing') return { label: t.missing, help: t.missingHelp, cls: amber, Icon: CircleAlert };
  if (r.status === 'NXDOMAIN') return { label: t.nxdomain, help: t.notExist, cls: amber, Icon: CircleAlert };
  if (r.status === 'NOERROR') return { label: t.same, help: '', cls: green, Icon: CheckCircle2 }; // nothing to compare with
  return { label: t.failed, help: t.failedHelp, cls: red, Icon: CircleX };
}

export default function ResolverList({ t, lang, result }: { t: Strings; lang: string; result: CheckResult }) {
  const country = useMemo(() => {
    try {
      const names = new Intl.DisplayNames([lang, 'en'], { type: 'region' });
      return (cc: string) => names.of(cc) ?? cc;
    } catch {
      return (cc: string) => cc;
    }
  }, [lang]);
  const hasTruth = !!result.authoritative && ['NOERROR', 'NXDOMAIN'].includes(result.authoritative.status);

  return (
    <ul className="mt-3 divide-y divide-[#efe6f8] dark:divide-[#2c2142]">
      {result.resolvers.map((r) => {
        const b = badge(t, r);
        const records = shown(r.answers, result.type);
        const answered = r.status === 'NOERROR' || r.status === 'NXDOMAIN';
        return (
          <li key={r.id} className="grid grid-cols-[1fr_auto] items-start gap-x-3 gap-y-1 py-3 sm:grid-cols-[12rem_8.5rem_1fr_4.5rem]">
            <div className="min-w-0">
              <div className="truncate font-bold text-slate-900 dark:text-white" dir="ltr">{r.name}</div>
              <div className="truncate text-xs text-slate-500 dark:text-slate-400">{country(r.cc)}</div>
            </div>
            <div className="justify-self-end sm:justify-self-start" title={b.help || undefined}>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${hasTruth || !answered ? b.cls : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
                <b.Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {hasTruth || !answered ? b.label : r.status === 'NXDOMAIN' ? t.nxdomain : '✓'}
              </span>
            </div>
            <div className={`col-span-2 min-w-0 sm:col-span-1 ${r.match === 'same' ? 'hidden sm:block' : ''}`} dir="ltr">
              {records.length > 0 ? (
                <ul className="space-y-0.5">
                  {records.slice(0, 6).map((rec, i) => (
                    <li key={i} className="break-all font-mono text-xs text-slate-700 dark:text-slate-300">{rec.data}</li>
                  ))}
                  {records.length > 6 && <li className="text-xs text-slate-400">+{records.length - 6}</li>}
                </ul>
              ) : (
                <span className="text-xs text-slate-400" dir="auto">{answered ? (r.status === 'NXDOMAIN' ? 'NXDOMAIN' : t.noRecords) : ''}</span>
              )}
              {hasTruth && r.match !== 'same' && b.help && (
                <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400" dir="auto">{b.help}</p>
              )}
            </div>
            <div className="hidden text-end text-xs tabular-nums text-slate-500 dark:text-slate-400 sm:block">
              {r.ms ? fill(t.ms, { ms: r.ms }) : ''}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
