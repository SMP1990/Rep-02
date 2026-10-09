import React from 'react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { fill } from '../utils/i18n.ts';
import { Loader2 } from 'lucide-react';
import { SocialPlatform } from '../types.ts';

interface LoadingAnimationProps {
  platform: SocialPlatform;
}

const PLATFORM_DISPLAY_NAMES: Record<SocialPlatform, string> = {
  universal: 'Social Media',
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  twitter: 'Twitter / X',
  pinterest: 'Pinterest',
  reddit: 'Reddit',
  threads: 'Threads',
  dailymotion: 'Dailymotion',
};

export const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ platform }) => {
  const { t } = useLanguage();
  const platformName = platform === 'universal' ? t.ui.socialMedia : PLATFORM_DISPLAY_NAMES[platform] || t.ui.socialMedia;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 my-8">
      <div className="bg-white dark:bg-[#181224] rounded-2xl px-6 py-10 sm:px-10 sm:py-12 border border-blue-100 dark:border-slate-800 shadow-lg shadow-blue-500/5 text-center flex flex-col items-center">
        {/* Animated spinner ring */}
        <div className="relative w-16 h-16 mb-6 flex items-center justify-center shrink-0">
          <div className="absolute inset-0 rounded-full border-4 border-blue-100 dark:border-blue-950 animate-ping opacity-30" />
          <div className="w-14 h-14 rounded-full border-[3px] border-blue-600 border-t-transparent animate-spin flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        </div>

        <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white mb-2 tracking-tight">
          {fill(t.ui.processing, { platform: platformName })}
        </h3>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-sm">
          {t.ui.pleaseWait}
        </p>
      </div>
    </div>
  );
};
