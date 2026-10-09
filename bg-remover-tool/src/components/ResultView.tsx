import { Download, Info, RotateCcw } from 'lucide-react';
import { fill, type Strings } from '../i18n/en';
import CompareSlider from './CompareSlider';

interface Props {
  t: Strings;
  before: string;
  after: string;
  width: number;
  height: number;
  resized: boolean;
  fileName: string;
  onReset: () => void;
}

export default function ResultView({ t, before, after, width, height, resized, fileName, onReset }: Props) {
  return (
    <div className="rounded-3xl bg-white/90 p-4 sm:p-6 shadow-xl shadow-[#6d46b8]/10 dark:bg-[#17112a]">
      <CompareSlider t={t} before={before} after={after} width={width} height={height} />
      {resized && (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Info className="h-3.5 w-3.5" />
          {fill(t.resizedNote, { w: width, h: height })}
        </p>
      )}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <a
          href={after}
          download={fileName}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6d46b8] px-6 py-3 text-sm font-bold text-white shadow-md shadow-[#6d46b8]/30 transition-all hover:bg-[#5a37a0] active:scale-95"
        >
          <Download className="h-4 w-4" />
          {t.downloadPng}
        </a>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#a78bda]/50 bg-white px-6 py-3 text-sm font-bold text-[#4b2e83] transition-all hover:bg-[#f1e9fb] active:scale-95 dark:bg-transparent dark:text-[#d1b9f7] dark:hover:bg-[#261b3b]"
        >
          <RotateCcw className="h-4 w-4" />
          {t.newImage}
        </button>
      </div>
    </div>
  );
}
