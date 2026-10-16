// Numbers and percentages in the reader's language (English if the browser
// lacks it), plus the colours each letter grade is shown in.

export function formatters(lang: string, decimals: number) {
  const pick = (opts: Intl.NumberFormatOptions) => {
    try {
      return new Intl.NumberFormat(lang, opts);
    } catch {
      return new Intl.NumberFormat('en', opts);
    }
  };
  const num = pick({ maximumFractionDigits: 1 });
  const pct = pick({ style: 'percent', minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return {
    n: (v: number) => num.format(v),
    pct: (v: number) => pct.format(v / 100),
  };
}

/** Tailwind classes per grade band (a, b, c, d, f). */
export const BAND_BADGE: Record<string, string> = {
  a: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  b: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  c: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  d: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
  f: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
};
