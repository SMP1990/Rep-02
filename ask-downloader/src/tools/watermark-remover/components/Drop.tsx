// Drop or choose file(s), used by every tab.
import { useRef, useState, type ComponentType } from 'react';

type Props = {
  title: string; hint: string; accept: string; multiple?: boolean;
  icon: ComponentType<{ className?: string }>; onFiles: (files: File[]) => void;
};

export default function Drop({ title, hint, accept, multiple, icon: Icon, onFiles }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), input.current?.click())}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onFiles([...e.dataTransfer.files]); }}
      className={`group cursor-pointer rounded-3xl border-2 border-dashed px-6 py-10 text-center transition-all sm:py-14 ${
        over ? 'scale-[1.01] border-[#6d46b8] bg-[#f1e9fb] dark:bg-[#261b3b]' : 'border-[#a78bda]/60 bg-white/80 hover:border-[#6d46b8] hover:bg-[#f9f5fd] dark:bg-[#17112a] dark:hover:bg-[#1d1531]'
      }`}
    >
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => { onFiles([...(e.target.files || [])]); e.target.value = ''; }}
      />
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6d46b8] to-[#e6799f] text-white shadow-lg shadow-[#6d46b8]/25 transition-transform group-hover:scale-105">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </div>
      <p className="font-heading text-lg font-bold text-[#2e2440] dark:text-[#f4eefb] sm:text-xl">{title}</p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{hint}</p>
    </div>
  );
}
