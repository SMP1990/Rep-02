import { useRef } from 'react';
import { ImagePlus, Pipette, X } from 'lucide-react';
import { fill, type Strings } from '../i18n/en';
import type { Background } from '../lib/compose';

interface Props {
  t: Strings;
  value: Background;
  onChange: (bg: Background) => void;
}

const COLORS = ['#ffffff', '#000000', '#f1e9fb', '#e6799f', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#9ca3af'];

const ring = (on: boolean) =>
  on ? 'ring-2 ring-[#6d46b8] ring-offset-2 dark:ring-offset-[#17112a]' : 'ring-1 ring-black/10 dark:ring-white/15';

export default function BackgroundPicker({ t, value, onChange }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const isColor = (c: string) => value.kind === 'color' && value.color.toLowerCase() === c;
  const custom = value.kind === 'color' && !COLORS.includes(value.color.toLowerCase());

  return (
    <div>
      <p className="mb-2 text-sm font-bold text-[#2e2440] dark:text-[#f4eefb]">{t.background}</p>
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          title={t.bgTransparent}
          aria-label={t.bgTransparent}
          aria-pressed={value.kind === 'none'}
          onClick={() => onChange({ kind: 'none' })}
          className={`checkerboard h-9 w-9 rounded-full ${ring(value.kind === 'none')}`}
        />
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title={fill(t.bgColor, { c })}
            aria-label={fill(t.bgColor, { c })}
            aria-pressed={isColor(c)}
            onClick={() => onChange({ kind: 'color', color: c })}
            className={`h-9 w-9 rounded-full ${ring(isColor(c))}`}
            style={{ background: c }}
          />
        ))}
        <label
          title={t.bgCustomColor}
          className={`relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[conic-gradient(#ef4444,#f59e0b,#22c55e,#3b82f6,#a855f7,#ef4444)] text-white ${ring(custom)}`}
        >
          <Pipette className="h-4 w-4 drop-shadow" />
          <input
            type="color"
            aria-label={t.bgCustomColor}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            value={value.kind === 'color' ? value.color : '#6d46b8'}
            onChange={(e) => onChange({ kind: 'color', color: e.target.value })}
          />
        </label>
        {value.kind === 'image' ? (
          <button
            type="button"
            title={t.bgRemoveImage}
            aria-label={t.bgRemoveImage}
            onClick={() => onChange({ kind: 'none' })}
            className={`flex h-9 w-9 items-center justify-center rounded-full bg-[#6d46b8] text-white ${ring(true)}`}
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            title={t.bgUpload}
            aria-label={t.bgUpload}
            onClick={() => fileInput.current?.click()}
            className={`flex h-9 w-9 items-center justify-center rounded-full bg-[#f1e9fb] text-[#6d46b8] dark:bg-[#261b3b] dark:text-[#d1b9f7] ${ring(false)}`}
          >
            <ImagePlus className="h-4 w-4" />
          </button>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            try {
              const image = await createImageBitmap(file, { imageOrientation: 'from-image' });
              onChange({ kind: 'image', image });
            } catch {
              // unreadable file: keep the current background
            }
          }}
        />
      </div>
    </div>
  );
}
