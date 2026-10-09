// Numbers for the hidden test mode (?test=1 / ?test=2, see lib/testMode.ts).
// Developer-only, never shown to normal visitors, so it is not translated.
import { useEffect, useState } from 'react';
import { onTestLog } from '../lib/testMode';

export default function TestPanel() {
  const [lines, setLines] = useState<string[]>([]);
  useEffect(() => onTestLog(setLines), []);
  return (
    <pre dir="ltr" className="mt-6 whitespace-pre-wrap break-words rounded-2xl border-2 border-dashed border-amber-500 bg-amber-50 p-3 text-left font-mono text-[11px] leading-snug text-slate-800 dark:bg-slate-900 dark:text-slate-100">
      {lines.join('\n')}
    </pre>
  );
}
