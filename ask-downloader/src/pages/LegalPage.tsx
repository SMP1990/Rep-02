import React from 'react';
import { legalUpdatedLabel } from '../config/legal.ts';
import { Scale, Copyright, AlertTriangle, Mail } from 'lucide-react';
import { Header } from '../components/Header.tsx';
import { Footer } from '../components/Footer.tsx';
import { Seo } from '../components/Seo.tsx';
import { buildWebPageSchema, buildBreadcrumbSchema } from '../utils/seoSchema.ts';
import { useAdmin } from '../context/AdminContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { LegalSections } from '../components/LegalSections.tsx';
import { customLegalSections } from '../utils/legalContent.ts';
import { localizeLegalSections } from '../utils/pageTranslations.ts';

export const LegalPage: React.FC = () => {
  const { siteSettings, sitePages, pageTranslations } = useAdmin();
  const { t, currentLangInfo } = useLanguage();
  const lp = t.legalPage || {};

  // Same pattern as the Contact page: derive a department address from the
  // admin-configured contact email's own domain, instead of hardcoding one.
  const emailDomain = (siteSettings.contactEmail || 'support@example.com').split('@')[1] || 'example.com';
  const legalEmail = `legal@${emailDomain}`;
  const description = lp.metaDescription;

  // Text the admin wrote in Content Editor -> Pages; empty = built-in text.
  // ...shown in the visitor's language once the server has translated it.
  const custom = localizeLegalSections(customLegalSections(sitePages?.legal), currentLangInfo.code, pageTranslations);

  // The real date the policy text changed (Settings), never "today".
  const lastUpdated = legalUpdatedLabel(siteSettings?.legalUpdatedAt, currentLangInfo.code);

  return (
    <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] text-[#2e2440] dark:text-[#f4eefb] flex flex-col transition-colors duration-200">
      <Seo
        title={`${lp.title} - ${siteSettings.siteName}`}
        description={description}
        path="/legal"
        image={siteSettings.ogImage || undefined}
        jsonLd={[
          buildWebPageSchema(`${lp.title} - ${siteSettings.siteName}`, description, typeof window !== 'undefined' ? window.location.origin + '/legal' : ''),
          buildBreadcrumbSchema([
            { name: t.header?.home || 'Home', url: typeof window !== 'undefined' ? window.location.origin + '/' : '' },
            { name: lp.title, url: typeof window !== 'undefined' ? window.location.origin + '/legal' : '' },
          ]),
        ]}
      />
      <Header />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 w-full">
        <div className="text-center mb-10 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#f1e9fb] dark:bg-[#261b3b] text-[#6d46b8] dark:text-[#d1b9f7] mx-auto flex items-center justify-center">
            <Scale className="w-7 h-7" />
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight">{lp.title}</h1>
          <p className="text-sm text-[#726c85] dark:text-[#b5a9cd]">
            {t.legalCommon?.lastUpdated} {lastUpdated}
          </p>
        </div>

        <div className="space-y-6">
          {custom.length > 0 ? (
            <LegalSections sections={custom} icon={Scale} />
          ) : (
            <>
            <div className="bg-white dark:bg-[#181224] rounded-2xl p-6 sm:p-7 border border-[#eae3ee] dark:border-[#2e1d4d] shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-[#f1e9fb] dark:bg-[#261b3b] text-[#6d46b8] dark:text-[#d1b9f7] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4.5 h-4.5" />
                </div>
                <h2 className="text-base font-bold">{lp.affiliationTitle}</h2>
              </div>
              <p className="text-sm text-[#635373] dark:text-[#b8a9cc] leading-relaxed">{lp.affiliationBody}</p>
            </div>

            <div className="bg-white dark:bg-[#181224] rounded-2xl p-6 sm:p-7 border border-[#eae3ee] dark:border-[#2e1d4d] shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-[#f1e9fb] dark:bg-[#261b3b] text-[#6d46b8] dark:text-[#d1b9f7] flex items-center justify-center shrink-0">
                  <Copyright className="w-4.5 h-4.5" />
                </div>
                <h2 className="text-base font-bold">{lp.downloadsTitle}</h2>
              </div>
              <p className="text-sm text-[#635373] dark:text-[#b8a9cc] leading-relaxed">{lp.downloadsBody}</p>
            </div>

            <div className="bg-white dark:bg-[#181224] rounded-2xl p-6 sm:p-7 border border-[#eae3ee] dark:border-[#2e1d4d] shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Scale className="w-4.5 h-4.5" />
                </div>
                <h2 className="text-base font-bold">{lp.dmcaTitle}</h2>
              </div>
              <p className="text-sm text-[#635373] dark:text-[#b8a9cc] leading-relaxed">{lp.dmcaBody}</p>
            </div>
            </>
          )}

          <div className="bg-[#f1e9fb]/60 dark:bg-[#181224] rounded-2xl p-6 sm:p-7 border border-[#e1d5f3] dark:border-[#2e1d4d] flex items-start gap-3">
            <Mail className="w-5 h-5 text-[#6d46b8] dark:text-[#d1b9f7] shrink-0 mt-0.5" />
            <p className="text-sm text-[#635373] dark:text-[#b8a9cc] leading-relaxed">
              {lp.inquiries}{' '}
              <a href={`mailto:${legalEmail}`} className="font-semibold text-[#6d46b8] dark:text-[#d1b9f7] hover:underline">
                {legalEmail}
              </a>.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
