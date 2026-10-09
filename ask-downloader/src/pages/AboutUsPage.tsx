import React from 'react';
import { Sparkles, Zap, ShieldCheck, Globe2, Music } from 'lucide-react';
import { Header } from '../components/Header.tsx';
import { Footer } from '../components/Footer.tsx';
import { Seo } from '../components/Seo.tsx';
import { buildWebPageSchema, buildBreadcrumbSchema } from '../utils/seoSchema.ts';
import { useAdmin } from '../context/AdminContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { aboutField, aboutHighlights, aboutHeadingIsAuthored } from '../utils/cmsField.ts';
import { DownloaderLink } from '../components/PageLink';
import { localizeAbout } from '../utils/pageTranslations';

export const AboutUsPage: React.FC = () => {
  const { siteSettings, sitePages, pageTranslations } = useAdmin();
  const { t, currentLang } = useLanguage();
  const ap = t.aboutPage || {};

  const description = ap.metaDescription;

  // Heading, intro, highlights and the call to action are all editable in
  // Content Editor -> Pages. Where the admin has left the shipped wording in
  // place, the visitor gets it in their own language instead.
  // In the visitor's language when the server has translated it.
  const about = localizeAbout(sitePages?.about, currentLang, pageTranslations);
  const aboutHeading = aboutField(about, 'heading', ap.heading);
  // Japanese puts its word for "about" after the site name. That belongs to
  // the translated heading only — an admin who wrote their own heading gets
  // exactly what they typed, with nothing appended.
  const headingSuffix = aboutHeadingIsAuthored(about) ? '' : ap.headingSuffix;
  const aboutIntro = aboutField(about, 'intro', ap.intro);
  const ctaHeading = aboutField(about, 'ctaHeading', ap.ctaHeading);
  const ctaText = aboutField(about, 'ctaText', ap.ctaText);

  // Icons stay in the code for the visual rhythm; the words come from the
  // dashboard or the dictionary, so the page can be edited without touching
  // the code and still reads in every language.
  const ICONS = [Globe2, Zap, ShieldCheck, Music];
  const points = aboutHighlights(about, [
    { title: ap.h1Title, desc: ap.h1Desc },
    { title: ap.h2Title, desc: ap.h2Desc },
    { title: ap.h3Title, desc: ap.h3Desc },
  ]).map((card, i) => ({ icon: ICONS[i % ICONS.length], ...card }));

  return (
    <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] text-[#2e2440] dark:text-[#f4eefb] flex flex-col transition-colors duration-200">
      <Seo
        title={`${ap.title} - ${siteSettings.siteName}`}
        description={description}
        path="/about-us"
        image={siteSettings.ogImage || undefined}
        jsonLd={[
          buildWebPageSchema(`${ap.title} - ${siteSettings.siteName}`, description, typeof window !== 'undefined' ? window.location.origin + '/about-us' : ''),
          buildBreadcrumbSchema([
            { name: t.header?.home || 'Home', url: typeof window !== 'undefined' ? window.location.origin + '/' : '' },
            { name: ap.title, url: typeof window !== 'undefined' ? window.location.origin + '/about-us' : '' },
          ]),
        ]}
      />
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 w-full">
        <div className="text-center mb-12 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#f1e9fb] dark:bg-[#261b3b] text-[#6d46b8] dark:text-[#d1b9f7] mx-auto flex items-center justify-center">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
            {aboutHeading ? `${aboutHeading} ` : ''}
            <span className="bg-gradient-to-r from-[#6d46b8] to-[#e6799f] bg-clip-text text-transparent">{siteSettings.siteName}</span>
            {headingSuffix ? ` ${headingSuffix}` : ''}
          </h1>
          <p className="text-sm sm:text-base text-[#635373] dark:text-[#b8a9cc] max-w-2xl mx-auto leading-relaxed whitespace-pre-line">
            {aboutIntro}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-12">
          {points.map((point, idx) => {
            const Icon = point.icon;
            return (
              <div
                key={idx}
                className="bg-white dark:bg-[#181224] rounded-2xl p-6 border border-[#eae3ee] dark:border-[#2e1d4d] shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-[#f1e9fb] dark:bg-[#261b3b] text-[#6d46b8] dark:text-[#d1b9f7] flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold mb-1.5">{point.title}</h3>
                <p className="text-xs sm:text-sm text-[#635373] dark:text-[#b8a9cc] leading-relaxed">{point.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#3d246e] to-[#201538] text-white shadow-md text-center space-y-4">
          <h2 className="text-lg sm:text-xl font-bold">{ctaHeading}</h2>
          <p className="text-sm text-white/80 max-w-lg mx-auto">{ctaText}</p>
          <DownloaderLink platform="facebook"
            className="inline-block px-6 py-2.5 rounded-xl text-sm font-bold bg-white text-[#4b2e83] hover:bg-slate-100 transition-colors shadow-sm cursor-pointer"
          >
            {ap.ctaButton}
          </DownloaderLink>
        </div>
      </main>

      <Footer />
    </div>
  );
};
