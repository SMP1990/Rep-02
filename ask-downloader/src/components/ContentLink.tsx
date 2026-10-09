import React from 'react';
import { PostLink } from './PageLink';
import { isBlogLanguage } from '../config/blogLanguages.ts';

/**
 * A [text](url) link inside a blog post.
 *  - /blog/<slug> on this site -> in-app link (no page reload), still a real
 *    <a href> that Google follows: internal linking.
 *  - other same-site paths -> plain link.
 *  - other sites -> new tab, rel="noopener noreferrer".
 * Anything that is not http(s), a site path, #anchor or mailto: is shown as
 * plain text, so a "javascript:" link can never run.
 */
const CLASS = 'font-semibold text-[#6d46b8] dark:text-[#a78bda] underline decoration-[#6d46b8]/40 underline-offset-2 hover:decoration-[#6d46b8]';

export function safeHref(raw: string): string | null {
  const url = raw.trim();
  if (/^(https?:\/\/|mailto:)/i.test(url)) return url;
  if (/^\/(?!\/)/.test(url) || url.startsWith('#')) return url;
  return null;
}

export const ContentLink: React.FC<{ text: string; url: string }> = ({ text, url }) => {
  const href = safeHref(url);
  if (!href) return <>{text}</>;

  let path = href;
  if (/^https?:\/\//i.test(href) && typeof window !== 'undefined') {
    try {
      const u = new URL(href);
      if (u.host === window.location.host) path = u.pathname + u.search + u.hash;
    } catch {}
  }

  const post = path.match(/^\/blog\/([a-z0-9-]+)\/?$/);
  // /blog/ur is a language archive, not a post.
  if (post && !isBlogLanguage(post[1])) return <PostLink slug={post[1]} className={CLASS}>{text}</PostLink>;
  if (path.startsWith('/') || path.startsWith('#') || path.startsWith('mailto:')) {
    return <a href={path} className={CLASS}>{text}</a>;
  }
  return <a href={href} target="_blank" rel="noopener noreferrer" className={CLASS}>{text}</a>;
};
