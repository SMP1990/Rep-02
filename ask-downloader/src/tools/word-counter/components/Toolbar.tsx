// Paste / Copy / Clear under the text box.
import { Check, ClipboardPaste, Copy, Eraser } from 'lucide-react';
import type { Strings } from '../i18n/en';

// grow + nowrap: equal-ish buttons that move to a new row instead of
// breaking their words (long labels in some languages).
const btn =
  'inline-flex grow sm:grow-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100';
const light =
  `${btn} border border-[#d9c7f2] bg-white text-[#4b2e83] hover:bg-[#f6f0fc] dark:border-[#3a2b57] dark:bg-[#1d1530] dark:text-[#d1b9f7]`;

interface Props {
  t: Strings;
  empty: boolean;
  copied: boolean;
  onPaste: () => void;
  onCopy: () => void;
  onClear: () => void;
}

export default function Toolbar({ t, empty, copied, onPaste, onCopy, onClear }: Props) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" onClick={onPaste} className={`${btn} bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] text-white shadow-md shadow-[#6d46b8]/25 hover:brightness-110`}>
        <ClipboardPaste className="h-4 w-4" aria-hidden="true" />
        {t.paste}
      </button>
      <button type="button" onClick={onCopy} disabled={empty} className={light}>
        {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
        {copied ? t.copied : t.copy}
      </button>
      <button type="button" onClick={onClear} disabled={empty} className={light}>
        <Eraser className="h-4 w-4" aria-hidden="true" />
        {t.clear}
      </button>
    </div>
  );
}
