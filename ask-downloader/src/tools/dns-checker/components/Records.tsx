// A list of DNS records (value + TTL) with a Copy button.
import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { fill, type Strings } from '../i18n/en';
import type { DnsRecord } from '../lib/api';
import { copyText } from '../../password-generator/lib/clipboard';

const FIRST = 8; // long TXT lists stay short until asked

export default function Records({ t, records, type }: { t: Strings; records: DnsRecord[]; type: string }) {
  const [copied, setCopied] = useState(false);
  const [all, setAll] = useState(false);
  const list = all ? records : records.slice(0, FIRST);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    if (await copyText(records.map((r) => r.data).join('\n'))) setCopied(true);
  };

  return (
    <div>
      <ul className="space-y-1.5" dir="ltr">
        {list.map((r, i) => (
          <li key={i} className="flex items-start gap-3 rounded-xl bg-[#faf6fd] px-3 py-2 text-sm dark:bg-[#120d1f]">
            {r.type !== type && <span className="shrink-0 rounded-md bg-slate-200 px-1.5 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-200">{r.type}</span>}
            <code className="min-w-0 flex-1 break-all font-mono text-slate-900 dark:text-slate-100">{r.data}</code>
            <span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">{t.ttl} {r.ttl}</span>
          </li>
        ))}
      </ul>
      {records.length > FIRST && !all && (
        <button type="button" onClick={() => setAll(true)} className="mt-2 me-2 rounded-lg px-2 py-1 text-xs font-bold text-[#4b2e83] hover:bg-[#f1e9fb] dark:text-[#d1b9f7] dark:hover:bg-[#261b3b]">
          {fill(t.showAll, { n: records.length })}
        </button>
      )}
      <button
        type="button"
        onClick={copy}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-[#4b2e83] hover:bg-[#f1e9fb] dark:text-[#d1b9f7] dark:hover:bg-[#261b3b]"
      >
        {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
        {copied ? t.copied : t.copy}
      </button>
    </div>
  );
}
