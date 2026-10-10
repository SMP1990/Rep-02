import React from 'react';
import { Header } from '../components/Header.tsx';
import { Footer } from '../components/Footer.tsx';
import { Seo } from '../components/Seo.tsx';
import { buildWebPageSchema, buildBreadcrumbSchema, buildFaqSchema } from '../utils/seoSchema.ts';
import { useLanguage } from '../context/LanguageContext.tsx';
import { useToolSeo } from '../tools/shared/useToolSeo.ts';
import BackgroundRemover from '../tools/background-remover/components/BackgroundRemover.tsx';
import ToolGuide, { faqItems } from '../tools/background-remover/components/ToolGuide.tsx';
import { toolStrings } from '../tools/background-remover/i18n/index.ts';
import { useOwnDocument } from '../tools/background-remover/useOwnDocument.ts';

const PATH = '/background-remover';

/**
 * /background-remover — the Background Remover tool on its own page. This
 * page is lazy-loaded (App.tsx), so the tool's code never reaches visitors of
 * other pages; its AI files load from a CDN only once someone uses it.
 */
export const BackgroundRemoverPage: React.FC = () => {
  const { t, currentLang } = useLanguage();
  useOwnDocument(PATH);

  const words = toolStrings(currentLang);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  // Admin -> Tools SEO & FAQ, else the built-in words.
  const seo = useToolSeo('background-remover', { title: words.title, description: words.subtitle, faq: faqItems(words) });
  const title = seo.title;

  return (
    <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] text-[#2e2440] dark:text-[#f4eefb] flex flex-col transition-colors duration-200">
      <Seo
        title={title}
        description={seo.description}
        path={PATH}
        image={seo.image}
        noindex={seo.noindex}
        jsonLd={[
          buildWebPageSchema(title, seo.description, origin + PATH),
          buildBreadcrumbSchema([
            { name: t.header?.home || 'Home', url: origin + '/' },
            { name: words.title, url: origin + PATH },
          ]),
          buildFaqSchema(seo.faq),
          {
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: words.title,
            description: seo.description,
            url: origin + PATH,
            applicationCategory: 'MultimediaApplication',
            operatingSystem: 'Any (web browser)',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          },
        ]}
      />
      <Header />

      <main className="flex-1 w-full py-10 sm:py-14">
        <div className="max-w-3xl mx-auto px-4 text-center mb-8 sm:mb-10">
          <h1 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-[#4b2e83] via-[#6d46b8] to-[#e6799f] bg-clip-text text-transparent dark:from-[#d1b9f7] dark:via-[#a78bda] dark:to-[#e6799f]">
              {words.title}
            </span>
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-600 dark:text-slate-300">{words.subtitle}</p>
        </div>
        <BackgroundRemover t={words} />
        <ToolGuide t={words} faq={seo.faq} />
      </main>

      <Footer />
    </div>
  );
};
