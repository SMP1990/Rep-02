import React from 'react';
import { useAdmin } from '../context/AdminContext';
import type { BlogLanguage } from '../config/blogLanguages.ts';

/**
 * The public URL of every page a visitor can reach. One table, so a link and
 * the router can never disagree about where a page lives.
 */
export const ROUTE_PATHS = {
  home: '/',
  'public-blog': '/blog',
  contact: '/contact',
  'about-us': '/about-us',
  'privacy-policy': '/privacy-policy',
  'terms-of-use': '/terms-of-use',
  legal: '/legal',
  'background-remover': '/background-remover',
} as const;

export type PublicRoute = keyof typeof ROUTE_PATHS;

/**
 * Classes for a "stretched link": the post title is the real link, and its
 * ::after box covers the whole card, so the card stays fully clickable.
 * The card needs `relative`. Anchor text is then the post title — the most
 * descriptive text a search engine could get for that link — rather than an
 * image or an empty wrapper.
 */
export const STRETCHED_LINK =
  "after:absolute after:inset-0 after:content-[''] after:rounded-[inherit] after:z-[1] focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-[#6d46b8] focus-visible:after:ring-offset-2";

type AnchorProps =Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'>;

/**
 * A real link for in-site navigation.
 *
 * The site used to navigate with `<button onClick>`. That works for a person
 * with a mouse, but a search engine only follows `<a href>`: with buttons,
 * Google found pages solely through the sitemap, and no ranking value flowed
 * between pages through internal links. Buttons also broke middle-click,
 * "open in new tab" and "copy link".
 *
 * This renders a plain `<a href>`. A normal left click is intercepted and
 * handed to the app's existing navigation function, so page changes stay
 * instant and nothing about routing behaves differently. A click with a
 * modifier key, or a middle click, is left to the browser.
 */
export const PageLink = React.forwardRef<
  HTMLAnchorElement,
  AnchorProps & { href: string; onNavigate: () => void; onBeforeNavigate?: () => void }
>(function PageLink({ href, onNavigate, onBeforeNavigate, children, ...rest }, ref) {
  return (
    <a
      ref={ref}
      href={href}
      {...rest}
      onClick={(e) => {
        if (
          e.defaultPrevented ||
          e.button !== 0 ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey ||
          (rest.target && rest.target !== '_self')
        ) {
          return;
        }
        e.preventDefault();
        onBeforeNavigate?.();
        onNavigate();
      }}
    >
      {children}
    </a>
  );
});

/** Link to one of the fixed pages: home, blog, contact, about, legal pages. */
export const RouteLink = React.forwardRef<
  HTMLAnchorElement,
  AnchorProps & { route: PublicRoute; onBeforeNavigate?: () => void }
>(function RouteLink({ route, ...rest }, ref) {
  const { setCurrentRoute } = useAdmin();
  return <PageLink ref={ref} href={ROUTE_PATHS[route]} onNavigate={() => setCurrentRoute(route)} {...rest} />;
});

/** Link to a single blog post. */
export const PostLink = React.forwardRef<
  HTMLAnchorElement,
  AnchorProps & { slug: string; onBeforeNavigate?: () => void }
>(function PostLink({ slug, ...rest }, ref) {
  const { navigateToBlogPost } = useAdmin();
  return <PageLink ref={ref} href={`/blog/${slug}`} onNavigate={() => navigateToBlogPost(slug)} {...rest} />;
});

/** Link to a language archive such as /blog/ur. */
export const BlogLanguageLink = React.forwardRef<
  HTMLAnchorElement,
  AnchorProps & { language: BlogLanguage; onBeforeNavigate?: () => void }
>(function BlogLanguageLink({ language, ...rest }, ref) {
  const { navigateToBlogLanguage } = useAdmin();
  return <PageLink ref={ref} href={`/blog/${language}`} onNavigate={() => navigateToBlogLanguage(language)} {...rest} />;
});

/**
 * Link to the downloader tool. Every platform's tool lives on the home page,
 * so the URL is `/`; the click also selects the platform and scrolls to it.
 */
export const DownloaderLink = React.forwardRef<
  HTMLAnchorElement,
  AnchorProps & { platform?: Parameters<ReturnType<typeof useAdmin>['navigateToDownloader']>[0]; onBeforeNavigate?: () => void }
>(function DownloaderLink({ platform, ...rest }, ref) {
  const { navigateToDownloader } = useAdmin();
  return <PageLink ref={ref} href="/" onNavigate={() => navigateToDownloader(platform)} {...rest} />;
});
