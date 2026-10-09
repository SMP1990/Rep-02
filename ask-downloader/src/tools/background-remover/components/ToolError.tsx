import { AlertTriangle, RotateCcw } from 'lucide-react';
import { fill, type ErrorCode, type Strings } from '../i18n/en';
import { MAX_FILE_MB } from '../lib/image';

interface Props {
  t: Strings;
  code: ErrorCode;
  onRetry: () => void;
}

export default function ToolError({ t, code, onRetry }: Props) {
  return (
    <div role="alert" className="rounded-3xl border border-red-200 bg-red-50/90 p-6 sm:p-7 shadow-lg shadow-red-500/5 dark:border-red-900/60 dark:bg-red-950/30">
      <div className="flex items-start gap-4">
        <div className="shrink-0 rounded-xl bg-red-100 p-3 text-red-700 dark:bg-red-900/50 dark:text-red-300">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h2 className="mb-1 text-base sm:text-lg font-bold text-red-950 dark:text-red-200">{t.errorTitle}</h2>
          <p className="mb-4 text-sm leading-relaxed text-red-800/90 dark:text-red-300/90">
            {fill(t.errors[code], { n: MAX_FILE_MB })}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-700 active:scale-95"
          >
            <RotateCcw className="h-4 w-4" />
            {t.tryAgain}
          </button>
        </div>
      </div>
    </div>
  );
}
