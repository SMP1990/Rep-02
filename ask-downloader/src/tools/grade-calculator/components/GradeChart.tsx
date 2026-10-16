// Every possible result for the current test, one row per wrong answer (or
// half answer). The row matching the current result is highlighted.
import { useEffect, useRef } from 'react';
import { ListOrdered } from 'lucide-react';
import type { Strings } from '../i18n/en';
import { band, type Result } from '../lib/grade';
import { BAND_BADGE } from '../lib/format';

interface Props {
  t: Strings;
  rows: Result[];
  total: number;
  current: number;
  points: boolean;
  f: { n: (v: number) => string; pct: (v: number) => string };
}

export default function GradeChart({ t, rows, total, current, points, f }: Props) {
  const active = useRef<HTMLTableRowElement>(null);
  // Keep the highlighted row in view inside the scroll box (not the page).
  useEffect(() => {
    const row = active.current;
    const box = row?.closest('[data-chart-box]') as HTMLElement | null;
    if (row && box) box.scrollTop = row.offsetTop - box.clientHeight / 2 + row.clientHeight / 2;
  }, [current, rows.length]);

  const th = 'sticky top-0 bg-[#f1e9fb] px-3 py-2 text-start text-xs font-extrabold uppercase tracking-wide text-[#4b2e83] dark:bg-[#231838] dark:text-[#d1b9f7]';
  return (
    <div className="mt-5 rounded-3xl bg-white/90 p-5 sm:p-7 shadow-xl shadow-[#6d46b8]/10 dark:bg-[#17112a]">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
        <ListOrdered className="h-5 w-5 text-[#6d46b8] dark:text-[#d1b9f7]" aria-hidden="true" />
        {t.chartTitle}
      </h2>
      <div data-chart-box className="relative max-h-96 overflow-y-auto rounded-xl border border-[#e9dcf7] dark:border-[#2c2142]">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>{points ? t.colLost : t.colWrong}</th>
              <th className={th}>{t.colScore}</th>
              <th className={th}>{t.colPercent}</th>
              <th className={th}>{t.colGrade}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const on = r.wrong === current;
              return (
                <tr
                  key={r.wrong}
                  ref={on ? active : undefined}
                  aria-current={on || undefined}
                  className={`border-t border-slate-100 dark:border-slate-800 ${on ? 'bg-[#efe4fb] font-extrabold dark:bg-[#2d1f4a]' : ''}`}
                >
                  <td className="px-3 py-1.5 tabular-nums">{f.n(r.wrong)}</td>
                  <td className="px-3 py-1.5 tabular-nums">
                    <span dir="ltr">{f.n(r.score)}/{f.n(total)}</span>
                  </td>
                  <td className="px-3 py-1.5 tabular-nums">{f.pct(r.percent)}</td>
                  <td className="px-3 py-1.5">
                    <span className={`inline-block min-w-[2.5rem] rounded-md px-2 py-0.5 text-center text-xs font-extrabold ${BAND_BADGE[band(r.letter)]}`}>
                      {r.letter}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
