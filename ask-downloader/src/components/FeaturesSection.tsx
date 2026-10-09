import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Shield, Zap, Smartphone, CheckCircle, Volume2, Video, Music, Download, Layers } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { useAdmin } from '../context/AdminContext';
import { applyBrand } from '../config/brand.ts';
import { localizeFeatures } from '../utils/pageTranslations';
import type { FeatureItem } from '../types/admin';

/** Icons the Content Editor offers for a feature card. */
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap, Shield, Video, Sparkles, Smartphone, Music, Download, Layers,
};

export const FeaturesSection: React.FC = () => {
  const { t, brand, currentLang } = useLanguage();
  const { landingContent, pageTranslations } = useAdmin();

  const builtIn = [
    {
      title: t.features.f1Title,
      description: t.features.f1Desc,
      icon: Sparkles,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/60',
      glow: 'group-hover:shadow-blue-500/20',
      border: 'hover:border-blue-300 dark:hover:border-blue-700',
    },
    {
      title: t.features.f2Title,
      description: t.features.f2Desc,
      icon: Zap,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60',
      glow: 'group-hover:shadow-amber-500/20',
      border: 'hover:border-amber-300 dark:hover:border-amber-700',
    },
    {
      title: t.features.f3Title,
      description: t.features.f3Desc,
      icon: Smartphone,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60',
      glow: 'group-hover:shadow-emerald-500/20',
      border: 'hover:border-emerald-300 dark:hover:border-emerald-700',
    },
    {
      title: t.features.f4Title,
      description: t.features.f4Desc,
      icon: Volume2,
      color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60',
      glow: 'group-hover:shadow-indigo-500/20',
      border: 'hover:border-indigo-300 dark:hover:border-indigo-700',
    },
    {
      title: t.features.f5Title,
      description: t.features.f5Desc,
      icon: CheckCircle,
      color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/60',
      glow: 'group-hover:shadow-teal-500/20',
      border: 'hover:border-teal-300 dark:hover:border-teal-700',
    },
    {
      title: t.features.f6Title,
      description: t.features.f6Desc,
      icon: Shield,
      color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/60',
      glow: 'group-hover:shadow-purple-500/20',
      border: 'hover:border-purple-300 dark:hover:border-purple-700',
    },
  ];

  // The cards from Content Editor -> Features, once the admin has changed
  // them, in the visitor's language. Until then (or if a card couldn't be
  // translated into this language) the built-in cards show, translated.
  const admin = localizeFeatures<FeatureItem>(landingContent?.features, currentLang, pageTranslations);
  const features = admin
    ? admin.map((f, i) => ({
        ...builtIn[i % builtIn.length],
        title: applyBrand(f.title || '', brand),
        description: applyBrand(f.description || '', brand),
        icon: ICONS[f.iconName] || Sparkles,
      }))
    : builtIn;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 border-t border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="text-center mb-10">
        <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-[#6d46b8] dark:text-[#d1b9f7] bg-[#f1e9fb] dark:bg-[#261b3b] px-3 py-1 rounded-full mb-3">
          {t.features?.badge || 'Industry-Grade Features'}
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {t.features.title}
        </h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2 max-w-xl mx-auto">
          {t.features.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feat, index) => {
          const Icon = feat.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.45 }}
              whileHover={{ y: -6, scale: 1.02 }}
              className={`group bg-white dark:bg-[#181224] rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-xl transition-all duration-300 ${feat.border}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feat.color} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-2xs`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 group-hover:text-[#6d46b8] dark:group-hover:text-[#d1b9f7] transition-colors">
                {feat.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {feat.description}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
