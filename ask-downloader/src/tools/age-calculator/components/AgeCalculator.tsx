// The Age Calculator: the two dates on top, then the age, the totals and the
// next birthday. Everything runs here in the browser (lib/age.ts); nothing
// is sent or stored. After the first "Calculate age" the results follow every
// change of the inputs.
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { CalendarDays, Cake, CalendarClock, Hourglass, PartyPopper, RotateCcw, ShieldCheck } from 'lucide-react';
import { fill, type Strings } from '../i18n/en';
import { calculate, dayNumber, formatDate, MAX_YEAR, MIN_YEAR, parseDate, today, type AgeError, type Ymd } from '../lib/age';

const MIN_DATE = `${MIN_YEAR}-01-01`;
const MAX_DATE = `${MAX_YEAR}-12-31`;

const ERROR_KEY: Record<AgeError, keyof Strings> = {
  required: 'errRequired',
  invalid: 'errInvalid',
  range: 'errRange',
  futureBirth: 'errFutureBirth',
  targetBefore: 'errTargetBefore',
};

/** Number and date formatting in the reader's language (English if the browser lacks it). */
function formatters(lang: string) {
  const pick = (make: (l: string) => Intl.NumberFormat | Intl.DateTimeFormat) => {
    try {
      return make(lang);
    } catch {
      return make('en');
    }
  };
  const num = pick((l) => new Intl.NumberFormat(l)) as Intl.NumberFormat;
  const long = pick((l) => new Intl.DateTimeFormat(l, { timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })) as Intl.DateTimeFormat;
  const weekday = pick((l) => new Intl.DateTimeFormat(l, { timeZone: 'UTC', weekday: 'long' })) as Intl.DateTimeFormat;
  const asDate = (a: Ymd) => new Date(dayNumber(a) * 86_400_000);
  return {
    n: (v: number) => num.format(v),
    date: (a: Ymd) => long.format(asDate(a)),
    weekday: (a: Ymd) => weekday.format(asDate(a)),
  };
}

function Tile({ value, label, big }: { value: string; label: string; big?: boolean }) {
  return (
    <div className="rounded-2xl border border-[#e9dcf7] bg-[#faf6fd] px-3 py-4 text-center dark:border-[#2c2142] dark:bg-[#120d1f]">
      <div className={`font-extrabold tabular-nums text-slate-900 dark:text-white ${big ? 'text-3xl sm:text-5xl' : 'text-xl sm:text-2xl'}`}>{value}</div>
      <div className="mt-1 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">{label}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-slate-100 py-2.5 last:border-0 dark:border-slate-800">
      <dt className="text-sm text-slate-600 dark:text-slate-300">{label}</dt>
      <dd className="font-bold text-slate-900 dark:text-white">{value}</dd>
    </div>
  );
}

export default function AgeCalculator({ t, lang }: { t: Strings; lang: string }) {
  const todayValue = formatDate(today());
  const [birth, setBirth] = useState('');
  const [target, setTarget] = useState(todayValue);
  const [shown, setShown] = useState(false);
  const results = useRef<HTMLDivElement>(null);

  const result = useMemo(() => calculate(birth, target, today()), [birth, target]);
  const f = useMemo(() => formatters(lang), [lang]);
  const error = 'error' in result ? result.error : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setShown(true);
    if (!error) requestAnimationFrame(() => results.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const clear = () => {
    setBirth('');
    setTarget(todayValue);
    setShown(false);
  };

  const card = 'rounded-3xl bg-white/90 p-5 sm:p-7 shadow-xl shadow-[#6d46b8]/10 dark:bg-[#17112a]';
  const input =
    'w-full min-h-[3rem] rounded-xl border-2 border-[#e9dcf7] bg-[#faf6fd] px-4 py-2.5 text-base font-semibold text-slate-900 focus:border-[#a78bda] focus:outline-none dark:border-[#2c2142] dark:bg-[#120d1f] dark:text-white dark:[color-scheme:dark]';
  const h2 = 'mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white';
  const icon = 'h-5 w-5 text-[#6d46b8] dark:text-[#d1b9f7]';

  const r = shown && !('error' in result) ? result : null;
  const born = r ? parseDate(birth) : null;

  return (
    <section className="mx-auto w-full max-w-3xl px-4" aria-label={t.title}>
      <form className={card} onSubmit={submit} noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="age-birth" className="mb-2 block font-bold text-slate-900 dark:text-white">
              {t.birthLabel}
            </label>
            <input
              id="age-birth"
              type="date"
              required
              min={MIN_DATE}
              max={MAX_DATE}
              value={birth}
              onChange={(e) => setBirth(e.target.value)}
              aria-invalid={shown && !!error && error !== 'targetBefore'}
              aria-describedby={shown && error ? 'age-error' : undefined}
              className={input}
            />
          </div>
          <div>
            <label htmlFor="age-target" className="mb-2 block font-bold text-slate-900 dark:text-white">
              {t.targetLabel}
            </label>
            <div className="flex gap-2">
              <input
                id="age-target"
                type="date"
                min={MIN_DATE}
                max={MAX_DATE}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                aria-invalid={shown && error === 'targetBefore'}
                aria-describedby="age-target-hint"
                className={input}
              />
              {target !== todayValue && (
                <button
                  type="button"
                  onClick={() => setTarget(todayValue)}
                  className="shrink-0 rounded-xl border border-[#d9c7f2] bg-white px-3 text-sm font-bold text-[#4b2e83] transition-all hover:bg-[#f6f0fc] active:scale-95 dark:border-[#3a2b57] dark:bg-[#1d1530] dark:text-[#d1b9f7]"
                >
                  {t.today}
                </button>
              )}
            </div>
            <p id="age-target-hint" className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              {t.targetHint}
            </p>
          </div>
        </div>

        {shown && error && (
          <p id="age-error" role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {fill(t[ERROR_KEY[error]], { min: MIN_YEAR, max: MAX_YEAR })}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="submit"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] px-5 py-3 text-base font-bold text-white shadow-md shadow-[#6d46b8]/25 transition-all hover:brightness-110 active:scale-95"
          >
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
            {t.calculate}
          </button>
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d9c7f2] bg-white px-5 py-3 text-sm font-bold text-[#4b2e83] transition-all hover:bg-[#f6f0fc] active:scale-95 dark:border-[#3a2b57] dark:bg-[#1d1530] dark:text-[#d1b9f7]"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t.clear}
          </button>
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          {t.privacy}
        </p>
      </form>

      <div ref={results} className="scroll-mt-24">
        {r && (
          <>
            {r.next.isToday && (
              <p className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-amber-100 px-4 py-3 text-center font-bold text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                <PartyPopper className="h-5 w-5 shrink-0" aria-hidden="true" />
                {fill(t.happyBirthday, { n: f.n(r.age.years) })}
              </p>
            )}

            <div className={`${card} mt-5`}>
              <h2 className={h2}>
                <Hourglass className={icon} aria-hidden="true" />
                {t.resultTitle}
              </h2>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <Tile big value={f.n(r.age.years)} label={t.years} />
                <Tile big value={f.n(r.age.months)} label={t.months} />
                <Tile big value={f.n(r.age.days)} label={t.days} />
              </div>
              <dl className="mt-4">
                {born && <Row label={t.bornOn} value={f.weekday(born)} />}
              </dl>
              {born?.m === 2 && born.d === 29 && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{t.leapNote}</p>}
            </div>

            <div className={`${card} mt-5`}>
              <h2 className={h2}>
                <CalendarClock className={icon} aria-hidden="true" />
                {t.totalsTitle}
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
                <Tile value={f.n(r.age.totalMonths)} label={t.totalMonths} />
                <Tile value={f.n(Math.floor(r.age.totalDays / 7))} label={t.totalWeeks} />
                <Tile value={f.n(r.age.totalDays)} label={t.totalDays} />
                <Tile value={f.n(r.age.totalDays * 24)} label={t.totalHours} />
              </div>
            </div>

            <div className={`${card} mt-5`}>
              <h2 className={h2}>
                <Cake className={icon} aria-hidden="true" />
                {t.nextTitle}
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <Tile big value={f.n(r.next.left.totalMonths)} label={t.months} />
                <Tile big value={f.n(r.next.left.days)} label={t.days} />
              </div>
              <dl className="mt-4">
                <Row label={t.nextDate} value={f.date(r.next.date)} />
                <Row label={t.turns} value={f.n(r.next.turns)} />
                <Row label={t.daysLeft} value={f.n(r.next.left.totalDays)} />
              </dl>
            </div>
          </>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {r ? `${t.resultTitle}: ${r.age.years} ${t.years}, ${r.age.months} ${t.months}, ${r.age.days} ${t.days}` : ''}
      </p>
    </section>
  );
}
