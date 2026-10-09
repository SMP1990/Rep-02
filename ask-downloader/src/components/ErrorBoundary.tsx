import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { EXTRA_TRANSLATIONS } from '../translations/extra/index.ts';

/** Works even if the language provider itself crashed. */
const uiWords = () => {
  let lang = 'en';
  try { lang = localStorage.getItem('fdownloader_lang') || 'en'; } catch {}
  return (EXTRA_TRANSLATIONS[lang] || EXTRA_TRANSLATIONS.en).ui;
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches any JavaScript error thrown while rendering a component
 * anywhere below it in the tree, and shows a friendly recovery screen
 * instead of leaving the visitor looking at a blank white page.
 *
 * This does NOT catch errors in event handlers, async code, or the
 * server itself \u2014 only errors thrown during React's render phase \u2014
 * which is exactly the class of bug that otherwise blanks the whole app.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // This project's React install has no bundled/installed type declarations
  // for class components' inherited `this.props`/`this.state`, so they're
  // declared explicitly here as a compile-time-only hint (no runtime effect
  // — React itself still sets these normally via the base constructor).
  declare props: ErrorBoundaryProps;
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught a rendering error:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.href = '/';
  };

  render() {
    const w = uiWords();
    const { hasError } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] flex items-center justify-center p-6">
          <div className="bg-white dark:bg-[#181224] rounded-[24px] p-8 max-w-md w-full text-center shadow-lg border border-[#eae3ee] dark:border-white/10">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="font-heading text-xl font-extrabold text-[#2e2440] dark:text-white mb-2">
              {w.wentWrong}
            </h2>
            <p className="text-sm text-[#726c85] dark:text-[#b5a9cd] mb-6 leading-relaxed">
              {w.wentWrongMsg}
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] hover:from-[#3b2369] hover:to-[#5a369e] text-white shadow-sm transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              {w.backHome}
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}
