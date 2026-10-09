import { useAdmin } from '../context/AdminContext';
import React, { useEffect } from 'react';

/**
 * Seo Component
 * ------------------------------------------------------------
 * Drop this into any page to manage its title, meta description,
 * canonical URL, Open Graph / Twitter Card tags, and JSON-LD
 * structured data — all in one consistent place, instead of each
 * page hand-rolling its own document.title / meta tag logic.
 *
 * The canonical URL and og:url are always built from the current
 * browser origin (window.location.origin), never a hard-coded
 * domain, so this works correctly no matter what domain the site
 * is deployed to — today or after a future domain change.
 *
 * Usage:
 *   <Seo
 *     title="About Us - ASK Downloader"
 *     description="..."
 *     path="/about-us"
 *     jsonLd={buildWebPageSchema(...)}
 *   />
 * ------------------------------------------------------------
 */

interface SeoProps {
  title: string;
  description: string;
  /** Path only, e.g. "/", "/about-us", "/blog/my-post" — combined with the current origin. */
  path: string;
  /** Absolute image URL for social share previews. Omit if none is configured. */
  image?: string;
  /** Describes the share image for screen readers and social platforms. */
  imageAlt?: string;
  type?: 'website' | 'article';
  /** Set true for pages that should never appear in search results (e.g. admin/login). */
  noindex?: boolean;
  /** One schema.org object, or several (e.g. WebPage + BreadcrumbList). */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Overrides the computed canonical URL (origin + path) — use when an
   * admin has set a specific canonical URL for this piece of content. */
  canonicalUrl?: string;
  /** BCP-47 / Open Graph locale for this page's CONTENT, e.g. "ar_AR".
   * A blog post keeps its own locale whatever language the interface is in. */
  locale?: string;
  /** Article-specific Open Graph data. Facebook, LinkedIn and X read these
   * when someone shares a post — they decide how the card looks and whether
   * the share is attributed to an author. */
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    section?: string;
    tags?: string[];
  };
  /** @username for twitter:site / twitter:creator, without the @. */
  twitterHandle?: string;
  /** Other language versions of this same page, for hreflang. Pass the full
   * set including this page; an "x-default" entry is added by the caller when
   * one of them is the neutral landing point. */
  alternates?: { hreflang: string; href: string }[];
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  if (typeof document === 'undefined') return;
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Replaces every hreflang link this component wrote, so stale alternates from
 *  a previous page never linger after client-side navigation. */
function setAlternates(entries: { hreflang: string; href: string }[]) {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('link[data-seo-alt]').forEach((l) => l.remove());
  entries.forEach(({ hreflang, href }) => {
    const el = document.createElement('link');
    el.setAttribute('rel', 'alternate');
    el.setAttribute('hreflang', hreflang);
    el.setAttribute('href', href);
    el.setAttribute('data-seo-alt', 'true');
    document.head.appendChild(el);
  });
}

function upsertLink(rel: string, href: string) {
  if (typeof document === 'undefined') return;
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export const Seo: React.FC<SeoProps> = ({
  title,
  description,
  path,
  image: imageSrc,
  imageAlt,
  type = 'website',
  noindex = false,
  jsonLd,
  canonicalUrl,
  locale,
  alternates,
  article,
  twitterHandle,
}) => {
  // Social platforms need a full address; Media Library images are /uploads/... paths.
  const image = imageSrc && imageSrc.startsWith('/') && typeof window !== 'undefined'
    ? window.location.origin + imageSrc
    : imageSrc;
  const { siteSettings } = useAdmin();
  const siteName = siteSettings?.siteName || '';
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : '';
  const alternatesKey = alternates ? JSON.stringify(alternates) : '';
  const articleKey = article ? JSON.stringify(article) : '';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const origin = window.location.origin;
    const url = canonicalUrl || `${origin}${path}`;

    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    // A page that asks not to be indexed has no canonical address to offer —
    // pointing one at it (a 404, a sign-in page) sends search engines mixed
    // signals. It comes back as soon as the visitor moves to a real page.
    if (noindex) {
      document.head.querySelector('link[rel="canonical"]')?.remove();
    } else {
      upsertLink('canonical', url);
    }

    // The site's own name, so a shared link shows the brand.
    if (siteName) upsertMeta('property', 'og:site_name', siteName);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:url', url);
    if (image) upsertMeta('property', 'og:image', image);
    if (image && imageAlt) upsertMeta('property', 'og:image:alt', imageAlt);
    if (locale) upsertMeta('property', 'og:locale', locale);

    setAlternates(alternates || []);

    // Article metadata — only meaningful on a post, cleared elsewhere so a
    // previous article's date never leaks onto the next page.
    document.querySelectorAll('meta[data-seo-article]').forEach((m) => m.remove());
    if (article) {
      const addArticle = (prop: string, content: string) => {
        const el = document.createElement('meta');
        el.setAttribute('property', prop);
        el.setAttribute('content', content);
        el.setAttribute('data-seo-article', 'true');
        document.head.appendChild(el);
      };
      if (article.publishedTime) addArticle('article:published_time', article.publishedTime);
      if (article.modifiedTime) addArticle('article:modified_time', article.modifiedTime);
      if (article.author) addArticle('article:author', article.author);
      if (article.section) addArticle('article:section', article.section);
      (article.tags || []).slice(0, 8).forEach((tag) => addArticle('article:tag', tag));
    }

    upsertMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    if (twitterHandle) {
      const handle = twitterHandle.startsWith('@') ? twitterHandle : `@${twitterHandle}`;
      upsertMeta('name', 'twitter:site', handle);
      if (article?.author) upsertMeta('name', 'twitter:creator', handle);
    }
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    if (image) upsertMeta('name', 'twitter:image', image);
    if (image && imageAlt) upsertMeta('name', 'twitter:image:alt', imageAlt);

    // Replace any JSON-LD this component previously injected (avoids
    // stacking stale structured data when navigating between pages).
    document.querySelectorAll('script[data-seo-jsonld]').forEach((s) => s.remove());
    if (jsonLd) {
      const entries = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      entries.forEach((entry) => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-seo-jsonld', 'true');
        script.textContent = JSON.stringify(entry);
        document.head.appendChild(script);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, path, image, imageAlt, type, noindex, jsonLdKey, canonicalUrl, siteName, locale, alternatesKey, articleKey, twitterHandle]);

  return null;
};
