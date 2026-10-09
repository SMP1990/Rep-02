import React from 'react';
import { motion } from 'motion/react';
import { Copy, Download, PlaySquare } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';

export const HowToGuide: React.FC = () => {
  const { t } = useLanguage();

  const steps = [
    {
      step: '01',
      title: t.howTo.step1Title,
      desc: t.howTo.step1Desc,
      icon: Copy,
      badge: t.howTo.step1Badge,
      color: 'from-blue-500 to-indigo-600 text-blue-600 bg-blue-50 dark:bg-blue-950/60',
    },
    {
      step: '02',
      title: t.howTo.step2Title,
      desc: t.howTo.step2Desc,
      icon: PlaySquare,
      badge: t.howTo.step2Badge,
      color: 'from-purple-500 to-pink-600 text-purple-600 bg-purple-50 dark:bg-purple-950/60',
    },
    {
      step: '03',
      title: t.howTo.step3Title,
      desc: t.howTo.step3Desc,
      icon: Download,
      badge: t.howTo.step3Badge,
      color: 'from-pink-500 to-rose-600 text-pink-600 bg-pink-50 dark:bg-pink-950/60',
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 border-t border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="text-center mb-10">
        <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-[#6d46b8] dark:text-[#d1b9f7] bg-[#f1e9fb] dark:bg-[#261b3b] px-3 py-1 rounded-full mb-3">
          {t.howTo?.badge || '3-Step Quick Tutorial'}
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {t.howTo.title}
        </h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2 max-w-xl mx-auto">
          {t.howTo.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        {steps.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.12, duration: 0.5 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group bg-white dark:bg-[#181224] rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-xl transition-all duration-300 relative flex flex-col items-center text-center overflow-hidden"
            >
              {/* Subtle Step Number in Background */}
              <span className="absolute top-2 right-4 text-5xl font-black text-slate-200 dark:text-[#3b2c5c] select-none pointer-events-none group-hover:text-purple-200 dark:group-hover:text-[#4d3a75] transition-colors">
                {item.step}
              </span>

              <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center mb-4 font-bold text-lg shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="w-7 h-7" />
              </div>

              <span className="inline-block px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold mb-3">
                {item.badge}
              </span>

              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 group-hover:text-[#6d46b8] dark:group-hover:text-[#d1b9f7] transition-colors">
                {item.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
