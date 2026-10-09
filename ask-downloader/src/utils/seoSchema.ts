/**
 * JSON-LD Structured Data Builders
 * ------------------------------------------------------------
 * Small, reusable helpers that build valid schema.org objects.
 * Nothing here hard-codes a domain — every function takes the
 * current origin/URL as a parameter, so it always reflects
 * whatever domain the site is actually running on.
 * ------------------------------------------------------------
 */

/**
 * `sameAs` is how a search engine connects this site to the brand's profiles
 * on other platforms. It is the single strongest off-page signal a site can
 * emit about itself, and it is what a Knowledge Panel is built from.
 */
export function buildOrganizationSchema(
  siteName: string,
  origin: string,
  logoUrl?: string,
  sameAs?: string[],
  contact?: { email?: string; phone?: string }
) {
  const profiles = (sameAs || []).map((u) => String(u).trim()).filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteName,
    url: origin,
    ...(logoUrl ? { logo: logoUrl } : {}),
    ...(profiles.length ? { sameAs: profiles } : {}),
    ...(contact?.email || contact?.phone
      ? {
          contactPoint: [
            {
              '@type': 'ContactPoint',
              contactType: 'customer support',
              ...(contact.email ? { email: contact.email } : {}),
              ...(contact.phone ? { telephone: contact.phone } : {}),
              availableLanguage: ['English', 'Urdu'],
            },
          ],
        }
      : {}),
  };
}

/** Collects the social profile URLs an admin has filled in, in a stable order. */
export function socialProfileUrls(s: Record<string, any> | undefined | null): string[] {
  if (!s) return [];
  return [
    s.socialFacebook, s.socialInstagram, s.socialYoutube,
    s.socialTiktok, s.socialTwitter, s.socialLinkedin,
  ].map((u) => String(u || '').trim()).filter(Boolean);
}

export function buildWebsiteSchema(siteName: string, origin: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: origin,
  };
}

export function buildWebPageSchema(title: string, description: string, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url,
  };
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export interface ArticleSchemaInput {
  headline: string;
  description: string;
  image?: string;
  datePublished?: string;
  authorName?: string;
  url: string;
  /** BCP-47 code of the language the article is written in. */
  inLanguage?: string;
  dateModified?: string;
  /** Publisher block — Google needs it before an article is rich-result eligible. */
  publisherName?: string;
  publisherLogo?: string;
}

export function buildArticleSchema(input: ArticleSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    ...(input.image ? { image: [input.image] } : {}),
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
    ...(input.authorName ? { author: { '@type': 'Person', name: input.authorName } } : {}),
    ...(input.publisherName
      ? {
          publisher: {
            '@type': 'Organization',
            name: input.publisherName,
            ...(input.publisherLogo
              ? { logo: { '@type': 'ImageObject', url: input.publisherLogo } }
              : {}),
          },
        }
      : {}),
    ...(input.inLanguage ? { inLanguage: input.inLanguage } : {}),
    mainEntityOfPage: { '@type': 'WebPage', '@id': input.url },
  };
}

export interface FaqItemInput {
  question: string;
  answer: string;
}

export function buildFaqSchema(items: FaqItemInput[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

/** Pulls "acme" out of https://twitter.com/acme or https://x.com/acme. */
export function twitterHandleFromUrl(url?: string): string | undefined {
  const m = String(url || '').match(/(?:twitter\.com|x\.com)\/@?([A-Za-z0-9_]{1,15})/i);
  return m ? m[1] : undefined;
}
