// The live numbers beside (desktop) or above (phone) the text box.
import { useMemo } from 'react';
import { fill, type Strings } from '../i18n/en';
import type { Counts } from '../lib/count';

function duration(t: Strings, seconds: number): string {
  if (seconds < 60) return fill(t.seconds, { n: seconds });
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? fill(t.minutesSeconds, { m, s }) : fill(t.minutes, { m });
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl sm:rounded-2xl border border-[#e9dcf7] bg-[#faf6fd] px-2 py-1.5 sm:px-3 sm:py-3 dark:border-[#2c2142] dark:bg-[#120d1f]">
      <dt className="text-[10px] sm:text-xs font-semibold leading-tight text-slate-600 dark:text-slate-300">{label}</dt>
      <dd className="mt-0.5 text-base sm:text-xl font-extrabold tabular-nums text-slate-900 dark:text-white">{value}</dd>
    </div>
  );
}

export default function Stats({ t, lang, counts }: { t: Strings; lang: string; counts: Counts }) {
  const n = useMemo(() => {
    try {
      return new Intl.NumberFormat(lang);
    } catch {
      return new Intl.NumberFormat('en');
    }
  }, [lang]);

  return (
    <div className="rounded-3xl bg-white/90 p-3 sm:p-5 shadow-xl shadow-[#6d46b8]/10 dark:bg-[#17112a]">
      <h2 className="sr-only">{t.statsTitle}</h2>
      <div className="mb-2 sm:mb-3 flex items-baseline justify-between gap-3 rounded-2xl bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] px-4 py-2 sm:py-3 text-white lg:block">
        <div className="text-xs font-semibold opacity-90">{t.words}</div>
        <div className="text-2xl sm:text-4xl font-extrabold tabular-nums">{n.format(counts.words)}</div>
      </div>
      <dl className="grid grid-cols-3 gap-1.5 sm:gap-2 lg:grid-cols-2">
        <Tile label={t.characters} value={n.format(counts.characters)} />
        <Tile label={t.charactersNoSpaces} value={n.format(counts.charactersNoSpaces)} />
        <Tile label={t.sentences} value={n.format(counts.sentences)} />
        <Tile label={t.paragraphs} value={n.format(counts.paragraphs)} />
        <Tile label={t.readingTime} value={duration(t, counts.readingSeconds)} />
        <Tile label={t.speakingTime} value={duration(t, counts.speakingSeconds)} />
      </dl>
    </div>
  );
}
