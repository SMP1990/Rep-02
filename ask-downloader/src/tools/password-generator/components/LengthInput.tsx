// The typed password length, next to the slider. While typing, the box may
// be empty or hold a number that is not finished yet ("1" on the way to
// "12"): only a complete, allowed length is used at once. On leaving the box
// (or Enter) it settles on a valid length. Digits only.
import { useRef, useState } from 'react';
import { MAX_LENGTH, MIN_LENGTH } from '../lib/generate';
import { Pencil } from 'lucide-react';

const clamp = (n: number) => Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, n));

export default function LengthInput({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  // null = not editing: the box shows the current length (also after the slider moves).
  const [draft, setDraft] = useState<string | null>(null);
  const justFocused = useRef(false);

  const commit = () => {
    if (draft === null) return;
    const n = parseInt(draft, 10);
    onChange(Number.isFinite(n) ? clamp(n) : value);
    setDraft(null);
  };

  return (
    <span className="relative inline-flex items-center">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        value={draft ?? String(value)}
        aria-label={label}
        // Select the whole number on entry, so typing replaces it. The click
        // that focused the box would otherwise drop the selection on mouseup.
        onFocus={(e) => {
          e.currentTarget.select();
          justFocused.current = true;
        }}
        onMouseUp={(e) => {
          if (justFocused.current) e.preventDefault();
          justFocused.current = false;
        }}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '').slice(0, 3);
          setDraft(digits);
          const n = parseInt(digits, 10);
          if (n >= MIN_LENGTH && n <= MAX_LENGTH) onChange(n);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit();
            e.currentTarget.blur();
          }
        }}
        className="w-24 rounded-xl border-2 border-[#a78bda] bg-[#faf6fd] py-1.5 pl-3 pr-7 text-center font-mono text-lg font-extrabold text-[#4b2e83] shadow-xs cursor-text transition-colors hover:border-[#6d46b8] focus:border-[#6d46b8] focus:outline-none focus:ring-2 focus:ring-[#a78bda]/40 dark:border-[#6d46b8] dark:bg-[#120d1f] dark:text-white"
      />
      <Pencil className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-[#a78bda]" aria-hidden="true" />
    </span>
  );
}
