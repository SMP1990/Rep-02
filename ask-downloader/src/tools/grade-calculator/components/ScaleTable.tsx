// The letter ranges of the chosen grading scale, as a small reference table.
import { Scale as ScaleIcon } from 'lucide-react';
import type { Strings } from '../i18n/en';
import { band, scaleRanges, type Scale } from '../lib/grade';
import { BAND_BADGE } from '../lib/format';

export default function ScaleTable({ t, scale, n }: { t: Strings; scale: Scale; n: (v: number) => string }) {
  return (
    <div className="mt-5 rounded-3xl bg-white/90 p-5 sm:p-7 shadow-xl shadow-[#6d46b8]/10 dark:bg-[#17112a]">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
        <ScaleIcon className="h-5 w-5 text-[#6d46b8] dark:text-[#d1b9f7]" aria-hidden="true" />
        {t.scaleTitle}
      </h2>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {scaleRanges(scale).map(([letter, from, to]) => (
          <div key={letter} className="flex items-center justify-between gap-2 rounded-xl border border-[#e9dcf7] bg-[#faf6fd] px-3 py-2 dark:border-[#2c2142] dark:bg-[#120d1f]">
            <dt>
              <span className={`inline-block min-w-[2.5rem] rounded-md px-2 py-0.5 text-center text-xs font-extrabold ${BAND_BADGE[band(letter)]}`}>{letter}</span>
            </dt>
            <dd className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200" dir="ltr">
              {n(from)}–{n(to)}%
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
