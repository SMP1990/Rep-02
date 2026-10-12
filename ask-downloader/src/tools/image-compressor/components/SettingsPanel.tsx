// Output format, quality, resize and maximum file size.
import { SlidersHorizontal } from 'lucide-react';
import { fill, type Strings } from '../i18n/en';
import type { Format, Settings } from '../lib/types';

const SIZES = [0, 2560, 1920, 1280, 800];
const TARGETS = [0, 1000, 500, 200, 100];

const field = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-[#120d1f] dark:text-white';
const label = 'mb-1.5 block text-sm font-bold text-slate-900 dark:text-white';

export default function SettingsPanel({ t, value, onChange }: { t: Strings; value: Settings; onChange: (s: Settings) => void }) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange({ ...value, [k]: v });
  const formats: [Format, string][] = [['auto', t.formatAuto], ['webp', t.formatWebp], ['jpeg', t.formatJpeg], ['png', t.formatPng]];
  const lossless = value.format === 'png';

  return (
    <div className="rounded-3xl bg-white/90 p-4 sm:p-6 shadow-xl shadow-[#6d46b8]/10 dark:bg-[#17112a]">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
        <SlidersHorizontal className="h-5 w-5 text-[#6d46b8] dark:text-[#d1b9f7]" aria-hidden="true" />
        {t.settingsTitle}
      </h2>
      <fieldset>
        <legend className={label}>{t.format}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {formats.map(([f, name]) => (
            <label
              key={f}
              className="flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 px-2 py-2.5 text-center text-sm font-semibold text-slate-800 transition-colors hover:border-[#a78bda] has-[:checked]:border-[#6d46b8] has-[:checked]:bg-[#f1e9fb] has-[:checked]:text-[#4b2e83] dark:border-slate-800 dark:text-slate-200 dark:has-[:checked]:bg-[#261b3b] dark:has-[:checked]:text-[#d1b9f7]"
            >
              <input type="radio" name="ic-format" className="sr-only" checked={value.format === f} onChange={() => set('format', f)} />
              {name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className={`mt-5 ${lossless ? 'opacity-50' : ''}`}>
        <div className="flex items-baseline justify-between">
          <label htmlFor="ic-quality" className={label}>{t.quality}</label>
          <span className="font-mono text-sm font-bold text-[#4b2e83] dark:text-[#d1b9f7]">{value.quality}</span>
        </div>
        <input
          id="ic-quality"
          type="range"
          min={10}
          max={95}
          value={value.quality}
          disabled={lossless}
          onChange={(e) => set('quality', Number(e.target.value))}
          className="w-full accent-[#6d46b8]"
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">{t.qualityHint}</p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ic-resize" className={label}>{t.resize}</label>
          <select id="ic-resize" className={field} value={value.maxSide} onChange={(e) => set('maxSide', Number(e.target.value))}>
            {SIZES.map((n) => <option key={n} value={n}>{n ? fill(t.resizeTo, { n }) : t.resizeOff}</option>)}
          </select>
        </div>
        <div className={lossless ? 'opacity-50' : ''}>
          <label htmlFor="ic-target" className={label}>{t.target}</label>
          <select id="ic-target" className={field} value={value.targetKB} disabled={lossless} onChange={(e) => set('targetKB', Number(e.target.value))}>
            {TARGETS.map((n) => <option key={n} value={n}>{n ? `${n} KB` : t.targetOff}</option>)}
          </select>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.targetHint}</p>
        </div>
      </div>
    </div>
  );
}
