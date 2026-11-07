import React, { useState } from 'react';
import { Header } from '../components/Header.tsx';
import { Footer } from '../components/Footer.tsx';
import { Seo } from '../components/Seo.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { soundStrings } from '../tools/sounds/i18n/index.ts';

const PATH = '/report-content';
const REASONS = ['reasonCopyright', 'reasonHarmful', 'reasonPrivacy', 'reasonOther'] as const;
const field = 'w-full rounded-xl border border-[#d8c9e8] dark:border-[#3a2d52] bg-white dark:bg-[#171025] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6d46b8]';

/**
 * /report-content — anyone can tell us a sound should not be on the site.
 * The report goes to the same inbox as the contact form (Admin -> Messages, topic "legal").
 * A person reads it; nothing is ever deleted automatically.
 */
export const ReportContentPage: React.FC = () => {
  const { currentLang } = useLanguage();
  const s = soundStrings(currentLang);
  // /report-content?sound=<slug> fills the first box (the "Report this sound" link on a sound page).
  const preset = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('sound') : null;

  const [sound, setSound] = useState(preset ? `${window.location.origin}/sounds/${preset.slice(0, 80)}` : '');
  const [reason, setReason] = useState<(typeof REASONS)[number]>('reasonCopyright');
  const [details, setDetails] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [trap, setTrap] = useState(''); // hidden box: only robots fill it
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'failed' | 'invalid'>('idle');

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sound.trim() || !details.trim() || !name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setState('invalid'); return; }
    if (trap) { setState('done'); return; }
    setState('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), email: email.trim(), topic: 'legal',
          topicLabel: `Sound report: ${sound.trim()}`.slice(0, 80),
          // The admin reads English: the reason is sent in English whatever language the visitor uses.
          message: `Sound: ${sound.trim()}\nReason: ${({ reasonCopyright: 'Copyright', reasonHarmful: 'Harmful or offensive', reasonPrivacy: 'Voice or private information', reasonOther: 'Other' })[reason]}\n\n${details.trim()}`,
        }),
      });
      setState(res.ok ? 'done' : 'failed');
    } catch {
      setState('failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] text-[#2e2440] dark:text-[#f4eefb] flex flex-col transition-colors duration-200">
      <Seo title={s.reportTitle} description={s.reportIntro} path={PATH} />
      <Header />
      <main className="flex-1 w-full py-10 sm:py-14">
        <div className="max-w-xl mx-auto px-4">
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-[#341d5b] dark:text-[#d1b9f7] text-center">{s.reportTitle}</h1>
          <p className="mt-4 text-slate-600 dark:text-slate-300 leading-relaxed">{s.reportIntro}</p>

          {state === 'done' ? (
            <p className="mt-8 rounded-xl bg-green-50 dark:bg-green-950 border border-green-300 dark:border-green-800 p-4" role="status">{s.reportThanks}</p>
          ) : (
            <form onSubmit={send} className="mt-8 space-y-4" noValidate>
              <label className="block text-sm font-semibold">{s.reportSound}
                <input className={`${field} mt-1 font-normal`} value={sound} onChange={(e) => setSound(e.target.value)} maxLength={200} required />
              </label>
              <label className="block text-sm font-semibold">{s.reportReason}
                <select className={`${field} mt-1 font-normal`} value={reason} onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])}>
                  {REASONS.map((r) => <option key={r} value={r}>{s[r]}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold">{s.reportDetails}
                <textarea className={`${field} mt-1 font-normal min-h-[120px]`} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={3000} required />
              </label>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block text-sm font-semibold">{s.reportName}
                  <input className={`${field} mt-1 font-normal`} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="name" required />
                </label>
                <label className="block text-sm font-semibold">{s.reportEmail}
                  <input type="email" className={`${field} mt-1 font-normal`} value={email} onChange={(e) => setEmail(e.target.value)} maxLength={160} autoComplete="email" required />
                </label>
              </div>
              <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" value={trap} onChange={(e) => setTrap(e.target.value)} className="hidden" name="website" />
              {state === 'invalid' && <p className="text-red-600 text-sm" role="alert">{s.reportInvalid}</p>}
              {state === 'failed' && <p className="text-red-600 text-sm" role="alert">{s.reportFailed}</p>}
              <button type="submit" disabled={state === 'sending'} className="w-full rounded-xl bg-[#341d5b] text-white font-semibold px-6 py-3 hover:bg-[#4a2b80] disabled:opacity-60">
                {state === 'sending' ? s.reportSending : s.reportSend}
              </button>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">{s.reportNote}</p>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};
