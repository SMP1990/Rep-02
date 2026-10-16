// Grade Calculator - Swift Score: total and wrong on top, the result right
// under them, then the options, the grading chart and the letter ranges.
// Everything runs here in the browser (lib/grade.ts); nothing is sent or
// stored. W adds a wrong answer and R resets, for grading a pile of papers.
import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, RotateCcw, ShieldCheck, Keyboard } from 'lucide-react';
import { fill, type Strings } from '../i18n/en';
import { band, chart, cleanTotal, cleanWrong, grade, MAX_TOTAL, type Mode, type Scale } from '../lib/grade';
import { BAND_BADGE, formatters } from '../lib/format';
import GradeChart from './GradeChart';
import ScaleTable from './ScaleTable';

const card = 'rounded-3xl bg-white/90 p-5 sm:p-7 shadow-xl shadow-[#6d46b8]/10 dark:bg-[#17112a]';
const input =
  'w-full min-h-[3rem] rounded-xl border-2 border-[#e9dcf7] bg-[#faf6fd] px-4 py-2.5 text-center text-lg font-bold tabular-nums text-slate-900 focus:border-[#a78bda] focus:outline-none dark:border-[#2c2142] dark:bg-[#120d1f] dark:text-white';
const select =
  'w-full min-h-[2.75rem] rounded-xl border-2 border-[#e9dcf7] bg-[#faf6fd] px-3 py-2 text-sm font-semibold text-slate-900 focus:border-[#a78bda] focus:outline-none dark:border-[#2c2142] dark:bg-[#120d1f] dark:text-white dark:[color-scheme:dark]';
const label = 'mb-2 block text-sm font-bold text-slate-900 dark:text-white';
const ghostBtn =
  'inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#d9c7f2] bg-white px-4 py-2.5 text-sm font-bold text-[#4b2e83] transition-all hover:bg-[#f6f0fc] active:scale-95 dark:border-[#3a2b57] dark:bg-[#1d1530] dark:text-[#d1b9f7]';

/** True when a key press is meant for a form field, not for the shortcuts. */
function typingInField(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}

export default function GradeCalculator({ t, lang }: { t: Strings; lang: string }) {
  const [mode, setMode] = useState<Mode>('questions');
  const [totalText, setTotalText] = useState('20');
  const [wrongText, setWrongText] = useState('0');
  const [scale, setScale] = useState<Scale>('standard');
  const [decimals, setDecimals] = useState(0);
  const [half, setHalf] = useState(false);
  const [showChart, setShowChart] = useState(false);

  const step = half ? 0.5 : 1;
  const total = cleanTotal(Number(totalText));
  const wrong = cleanWrong(Number(wrongText), total, step);
  const result = grade(total, wrong, scale);
  const f = useMemo(() => formatters(lang, decimals), [lang, decimals]);
  const rows = useMemo(() => (showChart ? chart(total, step, scale) : []), [showChart, total, step, scale]);
  const points = mode === 'points';

  const addWrong = () => setWrongText(String(cleanWrong(wrong + step, total, step)));
  const removeWrong = () => setWrongText(String(cleanWrong(wrong - step, total, step)));
  const reset = () => setWrongText('0');

  const toggleHalf = (on: boolean) => {
    setHalf(on);
    // Turning half points off must not leave a .5 behind in the box.
    if (!on) setWrongText(String(Math.floor(wrong)));
  };

  // W = one more wrong answer, R = next paper. Ignored while typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || typingInField(e)) return;
      const k = e.key.toLowerCase();
      if (k === 'w') {
        e.preventDefault();
        setWrongText((prev) => String(cleanWrong(cleanWrong(Number(prev), total, step) + step, total, step)));
      } else if (k === 'r') {
        e.preventDefault();
        setWrongText('0');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [total, step]);

  const resultLine = fill(t.resultLine, { score: f.n(result.score), total: f.n(total), percent: f.pct(result.percent) });

  return (
    <section className="mx-auto w-full max-w-3xl px-4" aria-label={t.title}>
      <div className={card}>
        {/* Questions or points */}
        <div role="radiogroup" aria-label={t.modeLabel} className="mx-auto mb-5 grid max-w-xs grid-cols-2 gap-1 rounded-xl bg-[#f1e9fb] p-1 dark:bg-[#231838]">
          {(['questions', 'points'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-lg px-3 py-2 text-sm font-bold transition-all ${
                mode === m ? 'bg-white text-[#4b2e83] shadow-sm dark:bg-[#3a2b57] dark:text-white' : 'text-[#6d46b8] hover:bg-white/60 dark:text-[#d1b9f7] dark:hover:bg-white/5'
              }`}
            >
              {m === 'questions' ? t.modeQuestions : t.modePoints}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="gc-total" className={label}>{points ? t.totalPoints : t.totalQuestions}</label>
            <input
              id="gc-total"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_TOTAL}
              step={1}
              value={totalText}
              onChange={(e) => setTotalText(e.target.value)}
              onBlur={() => setTotalText(String(total))}
              aria-describedby="gc-total-hint"
              className={input}
            />
            <p id="gc-total-hint" className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{fill(t.totalHint, { max: f.n(MAX_TOTAL) })}</p>
          </div>
          <div>
            <label htmlFor="gc-wrong" className={label}>{points ? t.wrongPoints : t.wrongQuestions}</label>
            <div className="flex gap-2">
              <button type="button" onClick={removeWrong} className={ghostBtn} aria-label={`− ${points ? t.wrongPoints : t.wrongQuestions}`}>
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
              <input
                id="gc-wrong"
                type="number"
                inputMode="decimal"
                min={0}
                max={total}
                step={step}
                value={wrongText}
                onChange={(e) => setWrongText(e.target.value)}
                onBlur={() => setWrongText(String(wrong))}
                className={input}
              />
              <button type="button" onClick={addWrong} className={ghostBtn} aria-label={`+ ${points ? t.wrongPoints : t.wrongQuestions}`}>
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={addWrong}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] px-5 py-3 text-base font-bold text-white shadow-md shadow-[#6d46b8]/25 transition-all hover:brightness-110 active:scale-95"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            {half ? t.addHalf : t.addWrong}
          </button>
          <button type="button" onClick={reset} className={ghostBtn}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t.resetWrong}
          </button>
        </div>

        {/* The result */}
        <div
          className="mt-5 rounded-2xl bg-gradient-to-br from-[#4b2e83] via-[#6d46b8] to-[#8b5cc4] px-5 py-6 text-center text-white shadow-lg shadow-[#6d46b8]/25"
          aria-live="polite"
        >
          <p className="text-3xl font-extrabold tabular-nums sm:text-4xl" dir="ltr">{resultLine}</p>
          <p className="mt-3 flex items-center justify-center gap-2 text-base font-bold">
            {t.letterLabel}:
            <span className={`inline-block min-w-[3rem] rounded-lg px-3 py-1 text-xl font-extrabold ${BAND_BADGE[band(result.letter)]}`}>{result.letter}</span>
          </p>
        </div>

        {/* Options */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="gc-scale" className={label}>{t.scaleLabel}</label>
            <select id="gc-scale" value={scale} onChange={(e) => setScale(e.target.value as Scale)} className={select}>
              <option value="standard">{t.scaleStandard}</option>
              <option value="ten">{t.scaleTen}</option>
            </select>
          </div>
          <div>
            <label htmlFor="gc-decimals" className={label}>{t.decimalsLabel}</label>
            <select id="gc-decimals" value={decimals} onChange={(e) => setDecimals(Number(e.target.value))} className={select}>
              <option value={0}>{t.decimals0}</option>
              <option value={1}>{t.decimals1}</option>
              <option value={2}>{t.decimals2}</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:gap-6">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            <input type="checkbox" checked={half} onChange={(e) => toggleHalf(e.target.checked)} className="h-4 w-4 accent-[#6d46b8]" />
            {t.halfPoints}
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            <input type="checkbox" checked={showChart} onChange={(e) => setShowChart(e.target.checked)} className="h-4 w-4 accent-[#6d46b8]" />
            {t.showChart}
          </label>
        </div>

        <p className="mt-5 hidden items-center gap-2 text-xs text-slate-500 dark:text-slate-400 sm:flex">
          <Keyboard className="h-4 w-4 shrink-0 text-[#6d46b8] dark:text-[#d1b9f7]" aria-hidden="true" />
          {t.shortcuts}
        </p>
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          {t.privacy}
        </p>
      </div>

      {showChart && <GradeChart t={t} rows={rows} total={total} current={wrong} points={points} f={f} />}
      <ScaleTable t={t} scale={scale} n={f.n} />
    </section>
  );
}
