import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { applyBrand } from '../config/brand.ts';
import { useAdmin } from '../context/AdminContext';
import { INITIAL_LANDING_CONTENT } from '../data/mockAdminData';
import { localizeFaqs, shippedFaqIndex } from '../utils/pageTranslations';

interface FaqItem {
  question: string;
  answer: string;
}

export const FaqSection: React.FC = () => {
  const { t, brand, currentLang } = useLanguage();
  // FAQs come from Content Editor. They used to be hardcoded here, so
  // whatever the admin wrote was never shown to visitors.
  const { landingContent, pageTranslations } = useAdmin();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const defaultFaqs: FaqItem[] = [
    {
      question: t.faq?.q1 || 'Where are downloaded videos saved on my device?',
      answer: t.faq?.a1 || 'Videos are typically saved in your browser\'s default "Downloads" folder on Windows, Mac, Android, and iOS. On iPhone/iPad, you can tap the Downloads icon in Safari\'s URL bar and save directly to Photos.',
    },
    {
      question: t.faq?.q2 || 'Can I download private videos or stories?',
      answer: t.faq?.a2 || 'No, private videos require account login and private credentials that our server does not access. Our tool works with all public videos, reels, shorts, and stories across supported platforms.',
    },
    {
      question: t.faq?.q3 || `Is ${brand} completely free to use?`,
      answer: t.faq?.a3 || `Yes, ${brand} is 100% free with unlimited downloads. There are no subscriptions, registration requirements, or hidden paywalls.`,
    },
    {
      question: t.faq?.q4 || 'Why did my video download fail or show an error?',
      answer: t.faq?.a4 || 'Common reasons include: the video was deleted or set to private, the link was incomplete, or the platform changed its security tokens. Please verify the URL works in an incognito window and try again.',
    },
    {
      question: t.faq?.q5 || 'Can I extract high-quality audio (MP3) from videos?',
      answer: t.faq?.a5 || 'Yes! After submitting the video link, simply select the MP3 Audio option from the available quality list to save crystal clear 320kbps audio.',
    },
  ];

  // Anything the admin has entered wins; the built-in list is only a
  // fallback for a site that has not set up its own FAQs yet.
  // Marketing copy may write {brand}; readers see the saved site name, while
  // the Content Editor still shows the token so it stays renameable.
  // The FAQs the site ships with are a placeholder, not the admin's words:
  // while they are unchanged, every reader gets the FAQ in their own language.
  // Translated into the visitor's language once the server has done it.
  const authored = localizeFaqs(landingContent?.faqs, currentLang, pageTranslations);
  const key = (list: any[]) => JSON.stringify(list.map((f) => [String(f.question).trim(), String(f.answer).trim()]));
  const isShipped = key(authored) === key((INITIAL_LANDING_CONTENT.faqs || []).filter((f: any) => f?.question && f?.answer));
  // A built-in FAQ the admin kept unchanged inside their own list still
  // reads in the visitor's language, from the dictionary.
  // (Matched before {brand} is filled in, since the shipped text holds the token.)
  const adminFaqs = isShipped ? [] : authored.map((f) => {
    const i = shippedFaqIndex(f);
    return i >= 0 && defaultFaqs[i] ? { ...f, ...defaultFaqs[i] } : applyBrand(f, brand);
  });
  const faqs: FaqItem[] = adminFaqs.length ? adminFaqs : defaultFaqs;

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 border-t border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="text-center mb-10">
        <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-[#6d46b8] dark:text-[#d1b9f7] bg-[#f1e9fb] dark:bg-[#261b3b] px-3 py-1 rounded-full mb-3">
          {t.faq?.badge || 'Instant Answers'}
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {t.faq.title}
        </h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2">
          {t.faq.subtitle}
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06, duration: 0.35 }}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isOpen
                  ? 'bg-white dark:bg-[#181224] border-[#6d46b8]/40 dark:border-[#a78bda]/40 shadow-md shadow-[#4b2e83]/5'
                  : 'bg-white dark:bg-[#181224] border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(index)}
                className="w-full p-4 sm:p-5 text-left font-bold text-slate-900 dark:text-white text-sm sm:text-base flex items-center justify-between gap-4 cursor-pointer"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg transition-colors ${isOpen ? 'bg-[#f1e9fb] dark:bg-[#261b3b] text-[#6d46b8] dark:text-[#d1b9f7]' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <span className={isOpen ? 'text-[#4b2e83] dark:text-[#f4eefb]' : ''}>
                    {faq.question}
                  </span>
                </div>

                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="shrink-0"
                >
                  <ChevronDown
                    className={`w-5 h-5 ${
                      isOpen ? 'text-[#6d46b8] dark:text-[#d1b9f7]' : 'text-slate-400'
                    }`}
                  />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/80">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
