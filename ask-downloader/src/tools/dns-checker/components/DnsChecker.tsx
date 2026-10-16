// The DNS Checker: domain + record type, then the server checks 16 public
// DNS servers and the domain's own name servers together (server/dns/).
import { useRef, useState, type FormEvent } from 'react';
import { Loader2, Search } from 'lucide-react';
import type { Strings } from '../i18n/en';
import { checkDns, RECORD_TYPES, type CheckResult, type ErrorCode, type RecordType } from '../lib/api';
import Results from './Results';

const ERRORS: Record<ErrorCode, keyof Strings> = {
  'bad-domain': 'errBadDomain', 'bad-type': 'errBadType', 'rate-limit': 'errRateLimit',
  busy: 'errBusy', failed: 'errFailed', network: 'errNetwork',
};

export default function DnsChecker({ t, lang }: { t: Strings; lang: string }) {
  const [domain, setDomain] = useState('');
  const [type, setType] = useState<RecordType>('A');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const running = useRef<AbortController | null>(null);

  const run = async (e?: FormEvent) => {
    e?.preventDefault();
    const name = domain.trim();
    if (!name) return setError(t.errBadDomain);
    running.current?.abort();
    const ctrl = new AbortController();
    running.current = ctrl;
    setBusy(true);
    setError(null);
    try {
      setResult(await checkDns(name, type, ctrl.signal));
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setError(t[ERRORS[err?.message as ErrorCode] ?? 'errFailed']);
    } finally {
      if (running.current === ctrl) setBusy(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl px-4" aria-label={t.title}>
      <form onSubmit={run} className="rounded-3xl bg-white/90 p-4 sm:p-6 shadow-xl shadow-[#6d46b8]/10 dark:bg-[#17112a]">
        <label htmlFor="dns-domain" className="mb-2 block font-bold text-slate-900 dark:text-white">{t.domainLabel}</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="dns-domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder={t.placeholder}
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            dir="ltr"
            maxLength={300}
            className="min-w-0 flex-1 rounded-2xl border-2 border-[#e9dcf7] bg-[#faf6fd] px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#a78bda] focus:outline-none dark:border-[#2c2142] dark:bg-[#120d1f] dark:text-white"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] px-6 py-3 font-bold text-white shadow-lg shadow-[#6d46b8]/30 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-70"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Search className="h-5 w-5" aria-hidden="true" />}
            {busy ? t.checking : t.check}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t.hint}</p>

        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-bold text-slate-900 dark:text-white">{t.typeLabel}</legend>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {RECORD_TYPES.map((rt) => (
              <label
                key={rt}
                title={t[`typeHelp${rt}` as keyof Strings]}
                className={`cursor-pointer rounded-xl border-2 px-2 py-2 text-center transition ${
                  type === rt
                    ? 'border-[#6d46b8] bg-[#f1e9fb] text-[#4b2e83] dark:border-[#a78bda] dark:bg-[#261b3b] dark:text-[#d1b9f7]'
                    : 'border-[#e9dcf7] bg-white text-slate-700 hover:border-[#a78bda] dark:border-[#2c2142] dark:bg-[#120d1f] dark:text-slate-300'
                }`}
              >
                <input type="radio" name="dns-type" value={rt} checked={type === rt} onChange={() => setType(rt)} className="sr-only" />
                <span className="block text-sm font-extrabold" dir="ltr">{rt}</span>
                <span className="block truncate text-[10px] leading-tight opacity-80">{t[`typeHelp${rt}` as keyof Strings]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div role="status" aria-live="polite">
          {error && <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
        </div>
      </form>

      {result && <Results t={t} lang={lang} result={result} />}
    </section>
  );
}
