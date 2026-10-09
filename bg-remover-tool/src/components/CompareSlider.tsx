import { useState } from 'react';
import { MoveHorizontal } from 'lucide-react';
import type { Strings } from '../i18n/en';

interface Props {
  t: Strings;
  before: string;
  after: string;
  width: number;
  height: number;
}

/** Original on the left, cut-out on the right; drag (or arrow keys) to move. */
export default function CompareSlider({ t, before, after, width, height }: Props) {
  const [pos, setPos] = useState(50);

  return (
    <div
      className="checkerboard relative mx-auto w-full overflow-hidden rounded-2xl select-none"
      style={{ aspectRatio: `${width} / ${height}`, maxHeight: '70vh', maxWidth: `calc(70vh * ${width / height})` }}
    >
      <img src={after} alt={t.resultAlt} className="absolute inset-0 h-full w-full object-contain" draggable={false} />
      <img
        src={before}
        alt={t.originalAlt}
        className="absolute inset-0 h-full w-full object-contain"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        draggable={false}
      />
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_6px_rgba(0,0,0,0.4)]" style={{ left: `${pos}%` }}>
        <div className="absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#6d46b8] shadow-lg">
          <MoveHorizontal className="h-5 w-5" />
        </div>
      </div>
      <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white">
        {t.before}
      </span>
      <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-[#6d46b8]/90 px-2.5 py-1 text-xs font-semibold text-white">
        {t.after}
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label={t.compareLabel}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
