// Summary, the true answer from the domain's own name servers, the public
// DNS servers, and the lookup path.
import { BadgeCheck, ServerCrash } from 'lucide-react';
import { fill, type Strings } from '../i18n/en';
import { shown, type CheckResult } from '../lib/api';
import Records from './Records';
import ResolverList from './ResolverList';
import Trace from './Trace';

const CARD = 'mt-5 rounded-3xl bg-white/90 p-4 sm:p-6 shadow-xl shadow-[#6d46b8]/10 dark:bg-[#17112a]';

export default function Results({ t, lang, result }: { t: Strings; lang: string; result: CheckResult }) {
  const auth = result.authoritative;
  const truth = auth && (auth.status === 'NOERROR' || auth.status === 'NXDOMAIN') ? auth : null;
  const total = result.resolvers.length;
  const answered = result.resolvers.filter((r) => r.status === 'NOERROR' || r.status === 'NXDOMAIN').length;
  const same = result.resolvers.filter((r) => r.match === 'same' || r.match === 'geo').length;
  const records = truth ? shown(truth.answers, result.type) : [];
  const seconds = ((auth?.ms ?? Math.max(...result.resolvers.map((r) => r.ms))) / 1000).toFixed(1);

  return (
    <div aria-live="polite">
      <div className={CARD}>
        <h2 className="font-heading text-xl font-extrabold text-slate-900 dark:text-white">{t.summaryTitle}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          <span dir="ltr" className="font-bold text-slate-700 dark:text-slate-200">{result.name}</span> · <span dir="ltr">{result.type}</span> · {fill(t.checkedIn, { s: seconds })}
        </p>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${((truth ? same : answered) / Math.max(1, total)) * 100}%` }} />
        </div>
        <p className="mt-2 font-semibold text-slate-800 dark:text-slate-100">
          {truth ? fill(t.summarySame, { n: same, total }) : fill(t.summaryNoTruth, { n: answered, total })}
        </p>
      </div>

      <div className={CARD}>
        <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold text-slate-900 dark:text-white">
          {truth ? <BadgeCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" /> : <ServerCrash className="h-5 w-5 text-amber-600" aria-hidden="true" />}
          {t.authTitle}
        </h2>
        {!auth && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t.authDohNote}</p>}
        {auth && !truth && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t.authNone}</p>}
        {truth && (
          <div className="mt-3">
            {truth.status === 'NXDOMAIN' ? (
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">{t.notExist}</p>
            ) : records.length ? (
              <Records t={t} records={records} type={result.type} />
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-300">{t.noRecords}</p>
            )}
            {truth.authority && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {t.authFrom.split('{server}')[0]}
                <span dir="ltr">{truth.authority.name} ({truth.authority.ip})</span>
                {t.authFrom.split('{server}')[1]}
              </p>
            )}
          </div>
        )}
        {auth && auth.trace.length > 0 && <Trace t={t} steps={auth.trace} />}
      </div>

      <div className={CARD}>
        <h2 className="font-heading text-lg font-extrabold text-slate-900 dark:text-white">{t.resolversTitle}</h2>
        <ResolverList t={t} lang={lang} result={result} />
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{t.anycastNote}</p>
      </div>
    </div>
  );
}
