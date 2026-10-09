import React from 'react';
import { useAdmin } from '../context/AdminContext';
import { useLanguage } from '../context/LanguageContext.tsx';
import { Sun, Moon, Check } from 'lucide-react';

interface ThemeToggleProps {
  variant?: 'pill' | 'icon' | 'cards';
  className?: string;
  id?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  variant = 'pill', 
  className = '',
  id = 'global-theme-toggle' 
}) => {
  const { theme, toggleTheme, setTheme } = useAdmin();
  const { t } = useLanguage();
  const isDark = theme === 'dark';

  // Variant 1: Compact Single Icon Toggle
  if (variant === 'icon') {
    return (
      <button
        id={id}
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? t.ui.switchLight : t.ui.switchDark}
        title={isDark ? t.ui.switchLight : t.ui.switchDark}
        className={`relative p-2 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center ${
          isDark
            ? 'bg-[#221838] border-[#3e2e5c] text-amber-300 hover:bg-[#2c1f48] shadow-xs'
            : 'bg-white dark:bg-[#181224] border-[#eae3ee] dark:border-[#2e1d4d] text-[#4b2e83] hover:bg-[#f1e9fb] shadow-xs'
        } ${className}`}
      >
        {isDark ? (
          <Moon className="w-4 h-4 transition-transform duration-300 rotate-0" />
        ) : (
          <Sun className="w-4 h-4 transition-transform duration-300 rotate-0 text-amber-500" />
        )}
      </button>
    );
  }

  // Variant 2: Dual-Icon Theme Toggle (Shows ONLY dark & light theme icons, NO text words)
  if (variant === 'pill') {
    return (
      <div
        id={id}
        className={`inline-flex items-center gap-1 p-1 rounded-xl border transition-all duration-200 shadow-xs ${
          isDark
            ? 'bg-[#1e1532] border-[#3e2d5c]'
            : 'bg-white dark:bg-[#181224] border-[#eae3ee] dark:border-[#2e1d4d]'
        } ${className}`}
        role="group"
        aria-label={t.ui.themeToggle}
      >
        <button
          type="button"
          onClick={() => setTheme('light')}
          aria-label={t.ui.lightTheme}
          title={t.ui.lightTheme}
          className={`p-1.5 rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center ${
            !isDark
              ? 'bg-[#fdedf1] text-amber-500 shadow-xs ring-1 ring-amber-400/20'
              : 'text-[#887c9f] hover:text-amber-300 hover:bg-[#2e1f4d]'
          }`}
        >
          <Sun className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setTheme('dark')}
          aria-label={t.ui.darkTheme}
          title={t.ui.darkTheme}
          className={`p-1.5 rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center ${
            isDark
              ? 'bg-[#2e1f4d] text-amber-300 shadow-xs ring-1 ring-amber-400/20'
              : 'text-[#887c9f] hover:text-[#4b2e83] hover:bg-[#f1e9fb]'
          }`}
        >
          <Moon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Variant 3: Visual Theme Selector Cards (for Settings / Appearance Tab)
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`} id={id}>
      {/* Light Theme Card */}
      <div
        onClick={() => setTheme('light')}
        className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
          !isDark
            ? 'border-[#7c4fd1] bg-white dark:bg-[#181224] shadow-md ring-2 ring-[#7c4fd1]/20'
            : 'border-[#2e2342] bg-[#181224] hover:border-[#483765]'
        }`}
      >
        <div>
          {/* Mini Visual Simulation */}
          <div className="h-24 w-full rounded-xl bg-[#f6f0f4] dark:bg-[#201538] p-2.5 border border-[#eae3ee] dark:border-[#2e1d4d] mb-4 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-md bg-gradient-to-r from-[#4b2e83] to-[#6d46b8]" />
                <div className="w-12 h-2 rounded-full bg-[#2e2440]/60" />
              </div>
              <div className="w-4 h-4 rounded-full bg-amber-400/80" />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="h-9 rounded-lg bg-white dark:bg-[#181224] shadow-xs border border-[#eae3ee]/80 p-1">
                <div className="w-6 h-1.5 rounded-full bg-[#6d46b8] mb-1" />
                <div className="w-4 h-1 rounded-full bg-[#726c85]/40" />
              </div>
              <div className="h-9 rounded-lg bg-white dark:bg-[#181224] shadow-xs border border-[#eae3ee]/80 p-1">
                <div className="w-6 h-1.5 rounded-full bg-[#e6799f] mb-1" />
                <div className="w-4 h-1 rounded-full bg-[#726c85]/40" />
              </div>
              <div className="h-9 rounded-lg bg-white dark:bg-[#181224] shadow-xs border border-[#eae3ee]/80 p-1">
                <div className="w-6 h-1.5 rounded-full bg-emerald-500 mb-1" />
                <div className="w-4 h-1 rounded-full bg-[#726c85]/40" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <h4 className="font-heading font-bold text-sm text-[#2e2440] dark:text-white">
                {t.ui.lightTheme}
              </h4>
            </div>
            {!isDark && (
              <span className="w-5 h-5 rounded-full bg-[#6d46b8] text-white flex items-center justify-center">
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
            )}
          </div>
          <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] leading-relaxed">
            {t.ui.lightDesc}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-[#eae3ee] dark:border-[#2e1d4d] flex items-center justify-between text-[11px] font-semibold text-[#726c85] dark:text-[#b5a9cd]">
          <span>{t.ui.standardContrast}</span>
          <span className="text-[#4b2e83] font-bold">{t.ui.defaultMode}</span>
        </div>
      </div>

      {/* Dark Theme Card */}
      <div
        onClick={() => setTheme('dark')}
        className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
          isDark
            ? 'border-[#7c4fd1] bg-[#1a1329] shadow-md ring-2 ring-[#7c4fd1]/30'
            : 'border-[#eae3ee] dark:border-[#2e1d4d] bg-white dark:bg-[#181224] hover:border-[#d8cde3]'
        }`}
      >
        <div>
          {/* Mini Visual Simulation */}
          <div className="h-24 w-full rounded-xl bg-[#0e0a17] p-2.5 border border-[#2e2342] mb-4 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-md bg-gradient-to-r from-[#7c4fd1] to-[#e6799f]" />
                <div className="w-12 h-2 rounded-full bg-[#f4eefb]/70" />
              </div>
              <div className="w-4 h-4 rounded-full bg-amber-300" />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="h-9 rounded-lg bg-[#181224] shadow-xs border border-[#2e2342] p-1">
                <div className="w-6 h-1.5 rounded-full bg-[#ba9cf5] mb-1" />
                <div className="w-4 h-1 rounded-full bg-[#887c9f]/60" />
              </div>
              <div className="h-9 rounded-lg bg-[#181224] shadow-xs border border-[#2e2342] p-1">
                <div className="w-6 h-1.5 rounded-full bg-[#e6799f] mb-1" />
                <div className="w-4 h-1 rounded-full bg-[#887c9f]/60" />
              </div>
              <div className="h-9 rounded-lg bg-[#181224] shadow-xs border border-[#2e2342] p-1">
                <div className="w-6 h-1.5 rounded-full bg-emerald-400 mb-1" />
                <div className="w-4 h-1 rounded-full bg-[#887c9f]/60" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-amber-300" />
              <h4 className="font-heading font-bold text-sm text-[#2e2440] dark:text-white">
                {t.ui.darkTheme}
              </h4>
            </div>
            {isDark && (
              <span className="w-5 h-5 rounded-full bg-[#7c4fd1] text-white flex items-center justify-center">
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
            )}
          </div>
          <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] leading-relaxed">
            {t.ui.darkDesc}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-[#eae3ee] dark:border-[#2e1d4d] flex items-center justify-between text-[11px] font-semibold text-[#726c85] dark:text-[#b5a9cd]">
          <span>{t.ui.nightMode}</span>
          <span className="text-[#a78bda] font-bold">{t.ui.darkOptimized}</span>
        </div>
      </div>
    </div>
  );
};
