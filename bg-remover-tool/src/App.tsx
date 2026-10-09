// Standalone demo page. On the site, only <BackgroundRemover /> is used and
// the page around it (header, SEO text, FAQ) comes from the site itself.
import BackgroundRemover from './components/BackgroundRemover';
import { en } from './i18n/en';

export default function App() {
  return (
    <main className="min-h-screen bg-[#f6f0f4] py-10 sm:py-16 dark:bg-[#0e0a17]">
      <header className="mx-auto mb-8 max-w-3xl px-4 text-center">
        <h1 className="font-heading text-3xl sm:text-5xl font-bold">
          <span className="bg-gradient-to-r from-[#4b2e83] via-[#6d46b8] to-[#e6799f] bg-clip-text text-transparent dark:from-[#d1b9f7] dark:via-[#a78bda] dark:to-[#e6799f]">
            {en.title}
          </span>
        </h1>
        <p className="mt-3 text-base sm:text-lg text-slate-600 dark:text-slate-300">{en.subtitle}</p>
      </header>
      <BackgroundRemover />
    </main>
  );
}
