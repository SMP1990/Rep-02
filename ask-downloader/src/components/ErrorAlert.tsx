import React from 'react';
import { AlertTriangle, Lock, Link2Off, RefreshCw, HelpCircle } from 'lucide-react';
import { ExtractionError } from '../types.ts';
import { useLanguage } from '../context/LanguageContext.tsx';

// Server and validation messages are written in English; every other
// language gets the matching translated message for the error type.
const KIND: Record<string, string> = {
  INVALID_URL: 'invalid', PRIVATE_VIDEO: 'private', RATE_LIMIT_EXCEEDED: 'rate',
  MAINTENANCE_MODE: 'maint', NOT_FOUND: 'notFound', FORBIDDEN: 'forbidden',
};

interface ErrorAlertProps {
  error: ExtractionError;
  onRetry: () => void;
  platform?: 'facebook' | 'instagram';
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ error: raw, onRetry, platform }) => {
  const { t, currentLang } = useLanguage();
  const kind = KIND[raw.code] || 'server';
  const error = currentLang === 'en' ? raw : {
    ...raw,
    title: t.errors[`${kind}Title`],
    message: t.errors[`${kind}Msg`],
    tip: t.errors[`${kind}Tip`] || (raw.tip ? t.errors.serverTip : undefined),
  };
  const isPrivate = error.code === 'PRIVATE_VIDEO';
  const isInvalidUrl = error.code === 'INVALID_URL';
  const isInstagram =
    platform === 'instagram' ||
    raw.title.toLowerCase().includes('instagram') ||
    raw.message.toLowerCase().includes('instagram');

  return (
    <div className="w-full max-w-2xl mx-auto px-4 my-8 animate-shake">
      <div className="bg-red-50/90 border border-red-200 rounded-2xl p-6 sm:p-7 shadow-lg shadow-red-500/5 text-slate-800">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-100 text-red-700 rounded-xl shrink-0">
            {isPrivate ? (
              <Lock className="w-6 h-6" />
            ) : isInvalidUrl ? (
              <Link2Off className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>

          <div className="flex-1">
            <h3 className="text-base sm:text-lg font-bold text-red-950 mb-1">
              {error.title}
            </h3>
            <p className="text-sm text-red-800/90 leading-relaxed mb-4">
              {error.message}
            </p>

            {/* Helpful Troubleshooting Tips */}
            {error.tip && (
              <div className="bg-white/80 border border-red-200/70 rounded-xl p-3 mb-4 text-xs text-slate-700 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900">{t.ui.troubleTip} </span>
                  <span>{error.tip}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                id="btn-retry-error"
                onClick={onRetry}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold text-xs sm:text-sm rounded-lg shadow-xs transition-colors"
                title={t.ui.clearError}
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t.ui.tryAnother}</span>
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-red-700/60 text-white font-mono text-[10px] border border-red-500/40">
                  Esc
                </kbd>
              </button>

              <span className="text-xs text-red-700/80">
                {isInstagram
                  ? t.errors.noteInstagram
                  : t.errors.noteFacebook}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
