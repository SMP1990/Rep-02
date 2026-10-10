import React from 'react';
import { Header } from '../components/Header.tsx';
import { Footer } from '../components/Footer.tsx';
import { Seo } from '../components/Seo.tsx';
import { buildWebPageSchema, buildBreadcrumbSchema, buildFaqSchema } from '../utils/seoSchema.ts';
import { useAdmin } from '../context/AdminContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import PasswordGenerator from '../tools/password-generator/components/PasswordGenerator.tsx';
import Guide, { faqItems } from '../tools/password-generator/components/Guide.tsx';
import { toolStrings } from '../tools/password-generator/i18n/index.ts';

const PATH = '/password-generator';

/**
 * /password-generator — lazy-loaded (App.tsx), so its code reaches only the
 * visitors of this page. Passwords are made in the browser: no server call,
 * no special headers, nothing stored.
 */
export const PasswordGeneratorPage: React.FC = () => {
  const { siteSettings } = useAdmin();
  const { t, currentLang } = useLanguage();

  const words = toolStrings(currentLang);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const title = `${words.title} - ${siteSettings.siteName}`;

  return (
    <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] text-[#2e2440] dark:text-[#f4eefb] flex flex-col transition-colors duration-200">
      <Seo
        title={title}
        description={words.subtitle}
        path={PATH}
        image={siteSettings.ogImage || undefined}
        jsonLd={[
          buildWebPageSchema(title, words.subtitle, origin + PATH),
          buildBreadcrumbSchema([
            { name: t.header?.home || 'Home', url: origin + '/' },
            { name: words.title, url: origin + PATH },
          ]),
          buildFaqSchema(faqItems(words)),
          {
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: words.title,
            description: words.subtitle,
            url: origin + PATH,
            applicationCategory: 'SecurityApplication',
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
        <PasswordGenerator t={words} />
        <Guide t={words} />
      </main>

      <Footer />
    </div>
  );
};
