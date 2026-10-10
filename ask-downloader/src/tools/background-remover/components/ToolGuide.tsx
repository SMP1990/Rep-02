// "How to" steps and FAQ under the tool: real help for visitors, and the
// page text search engines read (the FAQ also goes out as FAQPage data).
import { ChevronDown, Download, ImageUp, Sparkles } from 'lucide-react';
import type { Strings } from '../i18n/en';

export function faqItems(t: Strings) {
  return [1, 2, 3, 4, 5].map((n) => ({
    question: t[`faq${n}Q` as keyof Strings] as string,
    answer: t[`faq${n}A` as keyof Strings] as string,
  }));
}

export default function ToolGuide({ t, faq = faqItems(t) }: { t: Strings; faq?: { question: string; answer: string }[] }) {
  const steps = [
    { icon: ImageUp, title: t.step1Title, desc: t.step1Desc },
    { icon: Sparkles, title: t.step2Title, desc: t.step2Desc },
    { icon: Download, title: t.step3Title, desc: t.step3Desc },
  ];
  return (
    <div className="mx-auto w-full max-w-5xl px-4">
      <section className="mt-14 sm:mt-20">
        <h2 className="mb-6 text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {t.howTitle}
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3 sm:gap-6">
          {steps.map(({ icon: Icon, title, desc }, i) => (
            <li
              key={title}
              className="relative rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800/80 dark:bg-[#181224]"
            >
              <span className="absolute top-4 end-5 text-4xl font-extrabold text-slate-100 dark:text-slate-800" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#f1e9fb] text-[#6d46b8] dark:bg-[#261b3b] dark:text-[#d1b9f7]">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mb-1 font-bold text-slate-900 dark:text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{desc}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14 sm:mt-20">
        <h2 className="mb-6 text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {t.faqTitle}
        </h2>
        <div className="mx-auto max-w-3xl space-y-3">
          {faq.map(({ question, answer }) => (
            <details
              key={question}
              className="group rounded-2xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800/80 dark:bg-[#181224]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-slate-900 dark:text-white [&::-webkit-details-marker]:hidden">
                {question}
                <ChevronDown className="h-4 w-4 shrink-0 text-[#6d46b8] transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
