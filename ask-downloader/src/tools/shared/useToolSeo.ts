// A tool page's SEO and FAQ: what the admin set in Tools SEO & FAQ (in the
// visitor's language), else the tool's built-in, translated defaults.
import { useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { useLanguage } from '../../context/LanguageContext';
import { toolPageById } from '../../config/toolPages';
import { defaultToolFaqs, type FaqPair } from '../defaultFaqs';
import { localizeText, localizeToolFaqs } from '../../utils/pageTranslations';

interface Defaults {
  /** The tool's name and subtitle in the visitor's language. */
  title: string;
  description: string;
  faq: FaqPair[];
}

export function useToolSeo(toolId: string, d: Defaults) {
  const { toolsContent, pageTranslations, siteSettings } = useAdmin();
  const { currentLang } = useLanguage();
  const c = toolsContent?.[toolId] || {};
  const siteName = siteSettings.siteName;
  const brand = (v: string) => v.split('{brand}').join(siteName);
  const text = (v: string | undefined, fallback: string) => {
    const r = v ? localizeText(v, currentLang, pageTranslations) : null;
    return r ? brand(r) : fallback;
  };
  const faq = c.faqs?.length
    ? localizeToolFaqs(c.faqs, defaultToolFaqs(toolId), d.faq, currentLang, pageTranslations)
    : d.faq;

  // Meta keywords for this page; the site's own keywords come back on leaving.
  const keywords = c.keywords || toolPageById(toolId)?.keywords || '';
  useEffect(() => {
    const tag = document.querySelector('meta[name="keywords"]');
    if (!tag || !keywords) return;
    const before = tag.getAttribute('content');
    tag.setAttribute('content', keywords);
    return () => {
      if (before !== null) tag.setAttribute('content', before);
    };
  }, [keywords]);

  return {
    title: text(c.metaTitle, `${d.title} - ${siteName}`),
    description: text(c.metaDescription, d.description),
    image: c.ogImage || siteSettings.ogImage || undefined,
    noindex: !!c.noindex,
    faq,
  };
}
