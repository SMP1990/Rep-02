import React from 'react';
import { legalUpdatedLabel } from '../config/legal.ts';
import { ShieldCheck, Cookie, Server, Mail, Database } from 'lucide-react';
import { Header } from '../components/Header.tsx';
import { Footer } from '../components/Footer.tsx';
import { Seo } from '../components/Seo.tsx';
import { buildWebPageSchema, buildBreadcrumbSchema } from '../utils/seoSchema.ts';
import { useAdmin } from '../context/AdminContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { LegalSections } from '../components/LegalSections.tsx';
import { customLegalSections } from '../utils/legalContent.ts';
import { localizeLegalSections } from '../utils/pageTranslations.ts';

export const PrivacyPolicyPage: React.FC = () => {
  const { siteSettings, sitePages, pageTranslations } = useAdmin();
  const { t, currentLangInfo } = useLanguage();
  const p = t.privacyPage || {};
  const description = p.metaDescription;

  // The copy lives in the dictionary so the page reads in whichever language
  // the header is set to; only the icons and the layout stay in the code.
  const sections = [
    { icon: Database, title: p.s1Title, body: [p.s1p1, p.s1p2] },
    { icon: Server, title: p.s2Title, body: [p.s2p1, p.s2p2] },
    { icon: Cookie, title: p.s3Title, body: [p.s3p1, p.s3p2] },
    { icon: ShieldCheck, title: p.s4Title, body: [p.s4p1] },
  ];

  // Text the admin wrote in Content Editor -> Pages; empty = built-in text.
  // ...shown in the visitor's language once the server has translated it.
  const custom = localizeLegalSections(customLegalSections(sitePages?.privacy), currentLangInfo.code, pageTranslations);

  // The real date the policy text changed (Settings), never "today".
  const lastUpdated = legalUpdatedLabel(siteSettings?.legalUpdatedAt, currentLangInfo.code);

  return (
    <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] text-[#2e2440] dark:text-[#f4eefb] flex flex-col transition-colors duration-200">
      <Seo
        title={`${p.title} - ${siteSettings.siteName}`}
        description={description}
        path="/privacy-policy"
        image={siteSettings.ogImage || undefined}
        jsonLd={[
          buildWebPageSchema(`${p.title} - ${siteSettings.siteName}`, description, typeof window !== 'undefined' ? window.location.origin + '/privacy-policy' : ''),
          buildBreadcrumbSchema([
            { name: t.header?.home || 'Home', url: typeof window !== 'undefined' ? window.location.origin + '/' : '' },
            { name: p.title, url: typeof window !== 'undefined' ? window.location.origin + '/privacy-policy' : '' },
          ]),
        ]}
      />
      <Header />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 w-full">
        <div className="text-center mb-10 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#f1e9fb] dark:bg-[#261b3b] text-[#6d46b8] dark:text-[#d1b9f7] mx-auto flex items-center justify-center">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight">{p.title}</h1>
          <p className="text-sm text-[#726c85] dark:text-[#b5a9cd]">
            {t.legalCommon?.lastUpdated} {lastUpdated}
          </p>
        </div>

        <div className="space-y-6">
          {custom.length > 0 ? (
            <LegalSections sections={custom} icon={ShieldCheck} />
          ) : (
            <>
            {sections.map((section, idx) => {
              const Icon = section.icon;
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#181224] rounded-2xl p-6 sm:p-7 border border-[#eae3ee] dark:border-[#2e1d4d] shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-[#f1e9fb] dark:bg-[#261b3b] text-[#6d46b8] dark:text-[#d1b9f7] flex items-center justify-center shrink-0">
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <h2 className="text-base font-bold">{section.title}</h2>
                  </div>
                  <div className="space-y-2.5 text-sm text-[#635373] dark:text-[#b8a9cc] leading-relaxed">
                    {section.body.map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              );
            })}
            </>
          )}

          <div className="bg-[#f1e9fb]/60 dark:bg-[#181224] rounded-2xl p-6 sm:p-7 border border-[#e1d5f3] dark:border-[#2e1d4d] flex items-start gap-3">
            <Mail className="w-5 h-5 text-[#6d46b8] dark:text-[#d1b9f7] shrink-0 mt-0.5" />
            <p className="text-sm text-[#635373] dark:text-[#b8a9cc] leading-relaxed">
              {p.contactNote}{' '}
              <a href={`mailto:${siteSettings.contactEmail}`} className="font-semibold text-[#6d46b8] dark:text-[#d1b9f7] hover:underline">
                {siteSettings.contactEmail}
              </a>.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
