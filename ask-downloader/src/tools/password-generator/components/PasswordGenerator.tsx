// The Password Generator: options on the left, the password and its
// strength on top, a few passwords at once below. Everything runs here in
// the browser (lib/generate.ts); nothing is stored, not even the settings.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Copy, KeyRound, ListPlus, RefreshCw, ShieldCheck } from 'lucide-react';
import { fill, type Strings } from '../i18n/en';
import {
  crackSeconds,
  entropyBits,
  generate,
  MAX_LENGTH,
  MIN_LENGTH,
  strength,
  type Options,
  type PoolName,
  type Strength,
} from '../lib/generate';
import { copyText } from '../lib/clipboard';

const SLIDER_MAX = 64; // the number box goes up to MAX_LENGTH
const BULK_SIZES = [5, 10];

const STRENGTH_STYLE: Record<Strength, { bar: string; text: string; width: string }> = {
  weak: { bar: 'bg-red-500', text: 'text-red-700 dark:text-red-300', width: 'w-1/4' },
  fair: { bar: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300', width: 'w-2/4' },
  strong: { bar: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', width: 'w-3/4' },
  veryStrong: { bar: 'bg-emerald-600', text: 'text-emerald-700 dark:text-emerald-300', width: 'w-full' },
};

function crackText(t: Strings, bits: number): string {
  const s = crackSeconds(bits);
  const year = 365 * 86400;
  if (s < 1) return t.instantly;
  if (s < 60) return fill(t.seconds, { n: Math.round(s) });
  if (s < 3600) return fill(t.minutes, { n: Math.round(s / 60) });
  if (s < 86400) return fill(t.hours, { n: Math.round(s / 3600) });
  if (s < year) return fill(t.days, { n: Math.round(s / 86400) });
  if (s < 100 * year) return fill(t.years, { n: Math.round(s / year) });
  return t.centuries;
}

/** Digits and symbols in colour, so the password is easier to read. */
function Colored({ value }: { value: string }) {
  return (
    <>
      {[...value].map((c, i) => (
        <span
          key={i}
          className={
            /[0-9]/.test(c)
              ? 'text-sky-600 dark:text-sky-300'
              : /[A-Za-z]/.test(c)
                ? undefined
                : 'text-pink-600 dark:text-pink-300'
          }
        >
          {c}
        </span>
      ))}
    </>
  );
}

function useCopied() {
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 1600);
    return () => clearTimeout(timer);
  }, [copied]);
  return [copied, setCopied] as const;
}

export default function PasswordGenerator({ t }: { t: Strings }) {
  const [o, setO] = useState<Options>({
    length: 16,
    upper: true,
    lower: true,
    numbers: true,
    symbols: true,
    excludeSimilar: false,
    strict: true,
    exclude: '',
  });
  const [password, setPassword] = useState('');
  const [bulk, setBulk] = useState<string[]>([]);
  const [copied, setCopied] = useCopied();

  const renew = useCallback(() => setPassword(generate(o)), [o]);
  useEffect(() => {
    renew();
    setBulk([]); // old extra passwords no longer match the settings
  }, [renew]);

  const set = <K extends keyof Options>(k: K, v: Options[K]) => setO((prev) => ({ ...prev, [k]: v }));
  const bits = useMemo(() => entropyBits(o), [o]);
  const level = strength(bits);
  const style = STRENGTH_STYLE[level];

  const copy = async (text: string, key: string) => {
    if (text && (await copyText(text))) setCopied(key);
  };

  const types: [PoolName, string][] = [
    ['upper', t.upper],
    ['lower', t.lower],
    ['numbers', t.numbers],
    ['symbols', t.symbols],
  ];
  const card = 'rounded-3xl bg-white/90 p-5 sm:p-7 shadow-xl shadow-[#6d46b8]/10 dark:bg-[#17112a]';
  const check =
    'h-5 w-5 shrink-0 rounded-md accent-[#6d46b8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6d46b8]';

  return (
    <section className="mx-auto w-full max-w-3xl px-4" aria-label={t.title}>
      {/* The password */}
      <div className={card}>
        <p className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{t.yourPassword}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <output
            dir="ltr"
            aria-live="polite"
            className="min-h-[3.5rem] flex-1 break-all rounded-2xl border-2 border-[#e9dcf7] bg-[#faf6fd] px-4 py-3 text-left font-mono text-lg sm:text-xl font-semibold tracking-wide text-slate-900 dark:border-[#2c2142] dark:bg-[#120d1f] dark:text-white"
          >
            {password ? <Colored value={password} /> : <span className="font-sans text-base font-normal text-red-700 dark:text-red-300">{t.noTypes}</span>}
          </output>
          <div className="flex gap-2 sm:flex-col">
            <button
              type="button"
              onClick={() => copy(password, 'main')}
              disabled={!password}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] px-5 py-3 text-sm font-bold text-white shadow-md shadow-[#6d46b8]/25 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              {copied === 'main' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              {copied === 'main' ? t.copied : t.copy}
            </button>
            <button
              type="button"
              onClick={renew}
              disabled={!password}
              aria-label={t.regenerate}
              title={t.regenerate}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d9c7f2] bg-white px-4 py-3 text-sm font-bold text-[#4b2e83] transition-all hover:bg-[#f6f0fc] active:scale-95 disabled:opacity-50 dark:border-[#3a2b57] dark:bg-[#1d1530] dark:text-[#d1b9f7]"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span className="sm:sr-only">{t.regenerate}</span>
            </button>
          </div>
        </div>

        {password && (
          <div className="mt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
              <span className="text-slate-600 dark:text-slate-300">
                {t.strength}: <strong className={style.text}>{t[level]}</strong>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {fill(t.bits, { n: bits })} · {fill(t.crackTime, { t: crackText(t, bits) })}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
              <div className={`h-full rounded-full transition-all duration-300 ${style.bar} ${style.width}`} />
            </div>
          </div>
        )}
        <p className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          {t.privacy}
        </p>
      </div>

      {/* Settings */}
      <div className={`${card} mt-5`}>
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="pw-length" className="font-bold text-slate-900 dark:text-white">
            {t.length}
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={MIN_LENGTH}
            max={MAX_LENGTH}
            value={o.length}
            aria-label={t.length}
            onChange={(e) => set('length', Number(e.target.value) || MIN_LENGTH)}
            onBlur={(e) => set('length', Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, Number(e.target.value) || MIN_LENGTH)))}
            className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center font-mono font-bold text-slate-900 dark:border-slate-700 dark:bg-[#120d1f] dark:text-white"
          />
        </div>
        <input
          id="pw-length"
          type="range"
          min={MIN_LENGTH}
          max={SLIDER_MAX}
          value={Math.min(o.length, SLIDER_MAX)}
          onChange={(e) => set('length', Number(e.target.value))}
          className="mt-3 w-full accent-[#6d46b8]"
        />

        <fieldset className="mt-6">
          <legend className="mb-3 font-bold text-slate-900 dark:text-white">{t.characters}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {types.map(([name, label]) => (
              <label
                key={name}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 transition-colors hover:border-[#a78bda] has-[:checked]:border-[#a78bda] has-[:checked]:bg-[#faf6fd] dark:border-slate-800 dark:text-slate-200 dark:has-[:checked]:bg-[#1d1530]"
              >
                <input type="checkbox" className={check} checked={o[name]} onChange={(e) => set(name, e.target.checked)} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <details className="group mt-5">
          <summary className="cursor-pointer list-none font-bold text-[#6d46b8] dark:text-[#d1b9f7] [&::-webkit-details-marker]:hidden">
            {t.moreOptions} <span className="inline-block transition-transform group-open:rotate-90" aria-hidden="true">›</span>
          </summary>
          <div className="mt-3 space-y-3 text-sm text-slate-800 dark:text-slate-200">
            <label className="flex cursor-pointer items-center gap-3">
              <input type="checkbox" className={check} checked={o.excludeSimilar} onChange={(e) => set('excludeSimilar', e.target.checked)} />
              {t.excludeSimilar}
            </label>
            <label className="flex cursor-pointer items-center gap-3">
              <input type="checkbox" className={check} checked={o.strict} onChange={(e) => set('strict', e.target.checked)} />
              {t.strict}
            </label>
            <label className="block">
              <span className="mb-1 block font-medium">{t.exclude}</span>
              <input
                type="text"
                dir="ltr"
                value={o.exclude}
                maxLength={60}
                spellCheck={false}
                autoComplete="off"
                placeholder={t.excludeHint}
                onChange={(e) => set('exclude', e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-slate-900 dark:border-slate-700 dark:bg-[#120d1f] dark:text-white"
              />
            </label>
          </div>
        </details>
      </div>

      {/* Several at once */}
      <div className={`${card} mt-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <ListPlus className="h-5 w-5 text-[#6d46b8] dark:text-[#d1b9f7]" aria-hidden="true" />
            {t.bulkTitle}
          </h2>
          <div className="flex gap-2">
            {BULK_SIZES.map((n) => (
              <button
                key={n}
                type="button"
                disabled={!password}
                onClick={() => setBulk(Array.from({ length: n }, () => generate(o)))}
                className="rounded-xl border border-[#d9c7f2] px-3 py-2 text-xs font-bold text-[#4b2e83] transition-all hover:bg-[#f6f0fc] active:scale-95 disabled:opacity-50 dark:border-[#3a2b57] dark:text-[#d1b9f7] dark:hover:bg-[#1d1530]"
              >
                {fill(t.bulkButton, { n })}
              </button>
            ))}
          </div>
        </div>
        {bulk.length > 0 && (
          <>
            <ul className="mt-4 space-y-2">
              {bulk.map((p, i) => (
                <li key={p} className="flex items-center gap-2 rounded-xl bg-[#faf6fd] px-3 py-2 dark:bg-[#120d1f]">
                  <span dir="ltr" className="flex-1 break-all text-left font-mono text-sm text-slate-900 dark:text-white">
                    <Colored value={p} />
                  </span>
                  <button
                    type="button"
                    onClick={() => copy(p, `b${i}`)}
                    aria-label={fill(t.copyNumber, { n: i + 1 })}
                    title={fill(t.copyNumber, { n: i + 1 })}
                    className="rounded-lg p-2 text-[#6d46b8] transition-colors hover:bg-white dark:text-[#d1b9f7] dark:hover:bg-[#1d1530]"
                  >
                    {copied === `b${i}` ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => copy(bulk.join('\n'), 'all')}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#f1e9fb] px-4 py-2 text-sm font-bold text-[#4b2e83] transition-all hover:brightness-95 active:scale-95 dark:bg-[#261b3b] dark:text-[#d1b9f7]"
            >
              {copied === 'all' ? <Check className="h-4 w-4" aria-hidden="true" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />}
              {copied === 'all' ? t.copied : t.copyAll}
            </button>
          </>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {copied ? t.copied : ''}
      </p>
    </section>
  );
}
