import React, { useState, useMemo, useRef, useEffect } from 'react';
import { authorLabel, readTimeLabel } from '../utils/i18n.ts';
import { readerError } from '../utils/publicErrors.ts';
import { fill, langName } from '../utils/i18n.ts';
import { useAdmin } from '../context/AdminContext';
import { useLanguage } from '../context/LanguageContext';
import { BlogSearchResults } from '../components/BlogSearchResults';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Seo } from '../components/Seo';
import { buildArticleSchema, buildBreadcrumbSchema, twitterHandleFromUrl } from '../utils/seoSchema';
import { getLocalizedCategory } from '../translations/blogPostsTranslations';
import { blogLanguageInfo, normalizeBlogLanguage } from '../config/blogLanguages.ts';
import { applyBrand } from '../config/brand.ts';
import { monthCounts, monthLabel } from '../utils/months.ts';
import { relatedPosts } from '../utils/relatedPosts.ts';
import { effectiveCanonical } from '../utils/canonical.ts';
import { RelatedPosts } from '../components/RelatedPosts';
import { ContentLink } from '../components/ContentLink';
import { NotFoundPage, PostLoadingPage } from './NotFoundPage';
import { RouteLink, PostLink, DownloaderLink, STRETCHED_LINK } from '../components/PageLink';
import { 
  ArrowLeft,
  Calendar,
  Clock,
  Share2,
  Copy,
  Check,
  Tag,
  BookOpen,
  ChevronRight,
  Twitter,
  Facebook,
  Linkedin,
  MessageSquare,
  Send,
  Mail,
  Globe,
  Sparkles,
  Heart,
  Instagram,
  Youtube,
  Music2,
  Search,
  RefreshCw,
  X 
} from 'lucide-react';
/** Shown when a post has no cover image, instead of a broken image. */
const BLOG_COVER_FALLBACK = 'data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 9%22%3E%3Cdefs%3E%3ClinearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22%3E%3Cstop offset=%220%22 stop-color=%22%236d46b8%22/%3E%3Cstop offset=%221%22 stop-color=%22%23e6799f%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width=%2216%22 height=%229%22 fill=%22url(%23g)%22/%3E%3C/svg%3E';

/**
 * Turns the inline markdown inside one line of post text into React nodes.
 *
 * Recognised: `**bold**`, `*italic*` and `[text](url)` links (the editor's
 * Link button). Anything else — including a stray asterisk — is left exactly
 * as the author typed it. `![...](...)` is an image, never a link.
 *
 * This used to be handled by a single regex that matched a bold run only at
 * the very start of a list item, so a bold word mid-sentence, a second bold
 * in the same line, and every bold inside a paragraph, heading or quote
 * reached the reader as literal asterisks.
 */
const INLINE_MARKS = /\*\*([\s\S]+?)\*\*|\*([^*\n]+?)\*|(?<!!)\[([^\]\n]+)\]\(([^)\s]+)\)/g;

/** "2026-09-08" -> "Sep 8, 2026" in the article's language; unparseable text is shown as-is. */
export function formatPostDate(value: string, lang: string): string {
  const d = new Date(`${value}T00:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}/.test(value) || isNaN(d.getTime())) return value;
  try {
    return d.toLocaleDateString(lang, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return value;
  }
}

/** The editor's pre-filled bio; until an author rewrites it, readers see it in their language. */
const DEFAULT_AUTHOR_BIO = 'Writes guides on downloading and saving social media video and audio content.';

export function renderInline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  // A fresh regex each call: the /g lastIndex is per-object state, and a
  // shared one would skip matches on every other line.
  const re = new RegExp(INLINE_MARKS.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      out.push(
        <strong key={key++} className="text-[#2e2440] dark:text-white font-bold">
          {m[1]}
        </strong>
      );
    } else if (m[2] !== undefined) {
      out.push(<em key={key++}>{m[2]}</em>);
    } else {
      out.push(<ContentLink key={key++} text={m[3]} url={m[4]} />);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length ? out : [text];
}

export const PublicBlogPostPage: React.FC = () => {
  const {
    blogPosts,
    blogCategories,
    activeBlogSlug, 
    navigateToBlogPost, 
    setCurrentRoute, 
    addSubscriber,
    blogComments,
    addBlogComment,
    getCommentsForPost,
    showToast,
    siteSettings,
    adminUser,
    isAuthenticated,
    blogLoaded,
  } = useAdmin();
  const { t, currentLang, currentLangInfo, setContentLanguage, brand } = useLanguage();

  // Switching the header language while reading a post opens the same
  // article in that language (post_1 -> post_1__ur), when it exists.
  // Only a real switch does this, so a shared link always opens as sent.
  const siblingIn = (lang: string) => {
    const cur = blogPosts.find((p) => p.slug === activeBlogSlug);
    if (!cur) return undefined;
    const base = String(cur.id).split('__')[0];
    const id = lang === 'en' ? base : `${base}__${lang}`;
    return blogPosts.find((p) => p.id === id && p.status === 'published')
      || (lang === 'en' ? undefined : blogPosts.find((p) => p.id === base && normalizeBlogLanguage(p.language) === lang));
  };
  const prevLang = useRef(currentLang);
  useEffect(() => {
    if (prevLang.current === currentLang) return;
    prevLang.current = currentLang;
    // No version in that language: fall back to the English original, which
    // more readers understand than another translation.
    const cur = blogPosts.find((p) => p.slug === activeBlogSlug);
    const target = siblingIn(currentLang) || (cur && normalizeBlogLanguage(cur.language) !== 'en' ? siblingIn('en') : undefined);
    if (target && target.slug !== activeBlogSlug) navigateToBlogPost(target.slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLang]);
  const isRtl = currentLangInfo?.dir === 'rtl';


  // Centralized social links (Settings -> Website Identity & SEO). Every
  // icon block on this page reuses this same filtered list, so an icon
  // only ever shows if the admin has actually set that URL.
  const allSocialLinks = [
    { key: 'facebook', url: siteSettings.socialFacebook, label: 'Facebook', Icon: Facebook },
    { key: 'twitter', url: siteSettings.socialTwitter, label: 'Twitter / X', Icon: Twitter },
    { key: 'instagram', url: siteSettings.socialInstagram, label: 'Instagram', Icon: Instagram },
    { key: 'linkedin', url: siteSettings.socialLinkedin, label: 'LinkedIn', Icon: Linkedin },
    { key: 'youtube', url: siteSettings.socialYoutube, label: 'YouTube', Icon: Youtube },
  ].filter((s) => !!s.url);
  const topBarSocialLinks = allSocialLinks;
  const authorSocialLinks = allSocialLinks.filter((s) => ['twitter', 'facebook', 'linkedin'].includes(s.key));
  const sidebarSocialLinks = allSocialLinks.length > 0 || siteSettings.socialTiktok
    ? [...allSocialLinks, ...(siteSettings.socialTiktok ? [{ key: 'tiktok', url: siteSettings.socialTiktok, label: 'TikTok', Icon: Music2 }] : [])]
    : [];

  // The post at this address — and only that post. An unknown slug used to
  // show the first post in the list, so every mistyped link looked like a
  // working page and search engines saw endless copies of one article.
  // Drafts are visible only to a signed-in admin previewing them.
  const rawPost = useMemo(() => {
    const found = blogPosts.find(p => p.slug === activeBlogSlug);
    if (!found) return undefined;
    return found.status === 'published' || isAuthenticated ? found : undefined;
  }, [blogPosts, activeBlogSlug, isAuthenticated]);

  // The post is shown exactly as written — the header language switcher
  // changes the interface around it, never the article.
  //
  // The one substitution is `{brand}`: an author writes it so the site can be
  // renamed in Settings without editing every article. It was only ever
  // replaced in the UI dictionary, so posts using it published the literal
  // token ("Open {brand}:") to readers.
  const currentPost = useMemo(
    () => (rawPost ? applyBrand(rawPost, brand) : rawPost),
    [rawPost, brand]
  );
  /** The post's own language — independent of the interface language, so an
   *  Arabic article reads RTL even while the site is being browsed in English.
   *  Applied to the article container, never to <html>, which belongs to the
   *  header's interface-language switcher. */
  const postLang = blogLanguageInfo(currentPost?.language);

  // <html lang> should describe the article a reader is on, not the menu
  // language around it. Cleared on unmount so other pages go back to the
  // interface language.
  useEffect(() => {
    setContentLanguage(currentPost ? postLang.code : null);
    return () => setContentLanguage(null);
  }, [currentPost, postLang.code, setContentLanguage]);

  // Approved comments for this post
  // Approved comments come from the SERVER, so every visitor sees the
  // same list. They used to come from the reader's own browser, where
  // an approved comment was visible to nobody but the admin.
  const [serverComments, setServerComments] = useState<any[]>([]);
  const loadComments = React.useCallback(() => {
    const id = currentPost?.id;
    if (!id) return;
    fetch(`/api/blog/${id}/comments`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && Array.isArray(d.comments)) setServerComments(d.comments); })
      .catch(() => {});
  }, [currentPost?.id]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const approvedComments = useMemo(() => {
    if (!currentPost) return [];
    // Server list is authoritative; the local one only helps the admin
    // see a change immediately after moderating.
    return serverComments.length ? serverComments : getCommentsForPost(currentPost.id, true);
  }, [currentPost, serverComments, blogComments, getCommentsForPost]);

  const localizedBlogPosts = blogPosts;

  // Recent posts for sidebar (3 latest published posts excluding current)
  // Someone reading an Arabic article is unlikely to want three English
  // suggestions, so same-language posts come first and other languages only
  // fill the remaining slots.
  // Posts on the same topic, shown under the article (internal linking).
  const related = useMemo(
    () => (rawPost ? relatedPosts(rawPost, blogPosts).map((p) => applyBrand(p, brand)) : []),
    [rawPost, blogPosts, brand]
  );

  const recentPosts = useMemo(() => {
    // Skip posts already linked under the article, so the sidebar adds new links.
    const relatedIds = new Set(related.map((p) => p.id));
    const others = blogPosts.filter(
      (p) => p.status === 'published' && p.id !== rawPost?.id && !relatedIds.has(p.id)
    );
    const lang = normalizeBlogLanguage(rawPost?.language);
    const sameLanguage = others.filter((p) => normalizeBlogLanguage(p.language) === lang);
    const rest = others.filter((p) => normalizeBlogLanguage(p.language) !== lang);
    return [...sameLanguage, ...rest].slice(0, 3);
  }, [blogPosts, rawPost, related]);

  // Category counts with localized names
  const categoriesWithCounts = useMemo(() => {
    return blogCategories.map(cat => ({
      ...cat,
      localizedName: getLocalizedCategory(cat.name, currentLang),
      count: blogPosts.filter(p => p.category === cat.name && p.status === 'published').length
    }));
  }, [blogCategories, blogPosts, currentLang]);

  // Archives widget: the 12 newest months that have published posts.
  const archiveMonths = useMemo(
    () => monthCounts(blogPosts.filter((p) => p.status === 'published')).slice(0, 12),
    [blogPosts]
  );
  // Opens a filtered /blog (e.g. /blog?month=2026-09) without a full reload.
  const openFiltered = (e: React.MouseEvent, query: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    setCurrentRoute('public-blog');
    window.history.replaceState(window.history.state, '', `/blog?${query}`);
  };

  // Search system state for single blog post page
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [navSearchQuery, setNavSearchQuery] = useState('');
  const [isHeaderSearchFocused, setIsHeaderSearchFocused] = useState(false);
  const [selectedSearchCategory, setSelectedSearchCategory] = useState('All');
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const headerSearchContainerRef = useRef<HTMLDivElement>(null);

  // Count this read on the server, once per post per visit, so the
  // dashboard's view numbers reflect real visitors.
  const countedSlug = useRef('');
  useEffect(() => {
    const slug = currentPost?.slug;
    if (!slug || countedSlug.current === slug) return;
    countedSlug.current = slug;
    fetch(`/api/blog/${encodeURIComponent(slug)}/view`, { method: 'POST' }).catch(() => {});
  }, [currentPost?.slug]);

  // Close header dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerSearchContainerRef.current && !headerSearchContainerRef.current.contains(event.target as Node)) {
        setIsHeaderSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sidebar widget search results
  const sidebarSearchResults = useMemo(() => {
    if (!sidebarSearchQuery.trim()) return [];
    const query = sidebarSearchQuery.toLowerCase().trim();
    return localizedBlogPosts
      .filter(p => p.status === 'published')
      .filter(p => 
        p.title.toLowerCase().includes(query) ||
        p.excerpt.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      )
      .slice(0, 5);
  }, [localizedBlogPosts, sidebarSearchQuery]);

  // Keyboard shortcut listener (Cmd+K / Ctrl+K or Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSearchOpen) setIsSearchOpen(false);
        if (isHeaderSearchFocused) setIsHeaderSearchFocused(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, isHeaderSearchFocused]);

  // SEO values for this post — rendered via the <Seo> component in the JSX below.
  const seoTitle = currentPost ? (currentPost.metaTitle || `${currentPost.title} - ${siteSettings.siteName} Blog`) : `Blog - ${siteSettings.siteName}`;
  const seoDescription = currentPost ? (currentPost.metaDescription || currentPost.excerpt) : siteSettings.metaDescription;
  const seoPath = currentPost ? `/blog/${currentPost.slug}` : '/blog';
  const seoOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  // A stored canonical is honoured only if it points at another live page;
  // a stale copy of this post's own (or an old) URL is ignored.
  const canonical = currentPost
    ? effectiveCanonical(currentPost.canonicalUrl, currentPost.slug, new Set(blogPosts.filter((p) => p.status === 'published').map((p) => p.slug)))
    : '';

  /** The same article in other languages. Translated siblings share a base id
   *  ("post_1" / "post_1__ur"), so hreflang can point at each other and search
   *  engines treat them as versions rather than duplicates. A post with no
   *  siblings gets no alternates at all. */
  const postAlternates = useMemo(() => {
    if (!currentPost) return [];
    const baseId = String(currentPost.id).split('__')[0];
    const family = blogPosts.filter(
      (p) =>
        p.status === 'published' &&
        (p.id === baseId || String(p.id).startsWith(`${baseId}__`))
    );
    if (family.length < 2) return [];
    return family.map((p) => ({
      hreflang: normalizeBlogLanguage(p.language),
      href: `${seoOrigin}/blog/${p.slug}`,
    }));
  }, [blogPosts, currentPost, seoOrigin]);

  // The byline shown on the article always reflects the current admin's
  // real profile (Settings -> My Profile) rather than whatever was stored
  // on the post, so updating your name/photo once updates every article.
  const displayAuthorName = authorLabel(currentPost?.authorName || adminUser?.name, t);
  const displayAuthorAvatar = currentPost?.authorAvatar || adminUser?.avatar;

  // Meta keywords tag (legacy, low SEO weight today, kept for completeness)
  useEffect(() => {
    if (!currentPost?.metaKeywords || currentPost.metaKeywords.length === 0) return;
    let metaKeywordsTag = document.querySelector('meta[name="keywords"]');
    if (!metaKeywordsTag) {
      metaKeywordsTag = document.createElement('meta');
      metaKeywordsTag.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywordsTag);
    }
    metaKeywordsTag.setAttribute('content', currentPost.metaKeywords.join(', '));
  }, [currentPost]);

  // Copy link state
  const [copied, setCopied] = useState(false);

  // Comment Form state
  const [commentName, setCommentName] = useState('');
  const [commentEmail, setCommentEmail] = useState('');
  const [commentWebsite, setCommentWebsite] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentSubmittedNotice, setCommentSubmittedNotice] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Sidebar Newsletter state
  const [sidebarEmail, setSidebarEmail] = useState('');
  const [sidebarSubscribed, setSidebarSubscribed] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    showToast(t.blogPost.linkCopied, 'info');
    setTimeout(() => setCopied(false), 2200);
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(`"${currentPost?.title}" - Read on ${brand} Blog`);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const handleShareFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  const handleShareLinkedIn = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
  };

  // Submit comment handler
  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPost) return;

    if (!commentName.trim() || !commentEmail.trim() || !commentText.trim()) {
      showToast(t.blogPost.fillRequired, 'error');
      return;
    }

    setCommentSubmitting(true);
    const result = addBlogComment({
      postId: currentPost.id,
      authorName: commentName,
      authorEmail: commentEmail,
      website: commentWebsite,
      content: commentText,
    });

    setCommentSubmitting(false);

    if (result.success) {
      setCommentSubmittedNotice(true);
      setTimeout(loadComments, 800);
      setCommentName('');
      setCommentEmail('');
      setCommentWebsite('');
      setCommentText('');
      setTimeout(() => {
        setCommentSubmittedNotice(false);
      }, 7000);
    } else {
      showToast(readerError(result.error, t, currentLang, 'commentFailed'), 'error');
    }
  };

  // Sidebar newsletter submit
  const handleSidebarSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sidebarEmail.trim()) return;

    const res = addSubscriber(sidebarEmail, 'Single Blog Post Sidebar');
    if (res.success) {
      setSidebarSubscribed(true);
      setSidebarEmail('');
      showToast(t.blogPost.subscribedToast, 'success');
      setTimeout(() => setSidebarSubscribed(false), 4000);
    } else {
      showToast(readerError(res.error, t, currentLang, 'subscribeFailed'), 'error');
    }
  };

  /**
   * Renders a post's markdown body.
   *
   * This walks the text line by line rather than splitting it into blank-line
   * blocks first. The editor commonly writes a heading and the list under it
   * with no blank line between them, and the old block-first version only
   * looked at a block's first line: the heading matched, and the whole list
   * was swallowed into the <h3> as one run-on string, bullets and all. Every
   * line now decides its own kind, and consecutive list lines are gathered
   * into a single list.
   */
  const renderFormattedContent = (content: string) => {
    const out: React.ReactNode[] = [];
    let para: string[] = [];
    let quote: string[] = [];
    let items: string[] = [];
    let ordered = false;
    let key = 0;

    const listClass =
      'my-5 space-y-2.5 text-sm sm:text-base text-[#4a4257] dark:text-[#c4bed3] leading-relaxed ps-5 marker:text-[#6d46b8] marker:font-semibold';

    const flushPara = () => {
      if (!para.length) return;
      const text = para.join(' ').trim();
      para = [];
      if (!text) return;
      out.push(
        <p key={key++} className="my-4 text-base sm:text-lg text-[#4a4257] dark:text-[#c4bed3] leading-relaxed">
          {renderInline(text)}
        </p>
      );
    };

    const flushQuote = () => {
      if (!quote.length) return;
      const text = quote.join(' ').trim();
      quote = [];
      if (!text) return;
      out.push(
        <blockquote
          key={key++}
          className="p-5 my-6 rounded-2xl bg-[#f1e9fb]/80 dark:bg-[#201538] border-s-4 border-[#6d46b8] text-sm sm:text-base text-[#4b2e83] dark:text-[#d3c2fa] italic leading-relaxed shadow-xs"
        >
          {renderInline(text)}
        </blockquote>
      );
    };

    const flushList = () => {
      if (!items.length) return;
      const rows = items;
      items = [];
      const children = rows.map((item, i) => (
        <li key={i} className="leading-relaxed">
          {renderInline(item)}
        </li>
      ));
      // A numbered list keeps its numbers. It used to be forced into a <ul>,
      // which stripped "1." and showed a bullet, so the order of a how-to
      // guide was lost.
      out.push(
        ordered ? (
          <ol key={key++} className={`${listClass} list-decimal`}>
            {children}
          </ol>
        ) : (
          <ul key={key++} className={`${listClass} list-disc`}>
            {children}
          </ul>
        )
      );
    };

    const flushAll = () => {
      flushPara();
      flushQuote();
      flushList();
    };

    for (const rawLine of content.split('\n')) {
      const line = rawLine.trim();

      if (!line) {
        flushAll();
        continue;
      }

      // Images inside the post body, written by the editor as
      // ![alt](url "caption"){left|center|right}{small|medium|large}.
      // Rendered responsively so they never overflow a phone screen, and
      // lazily so they don't slow the page.
      const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)(\{[a-z|]*\})?$/);
      if (imageMatch) {
        flushAll();
        const [, alt, src, caption, options = ''] = imageMatch;
        const align = /right/.test(options) ? 'right' : /left/.test(options) ? 'left' : 'center';
        const size = /small/.test(options) ? 'small' : /large/.test(options) ? 'large' : 'medium';
        // Alignment floats on wide screens only — on a phone every image
        // stays full width so text never gets squeezed into a column.
        const figureClass =
          align === 'left'
            ? 'my-7 sm:float-left sm:me-6 sm:mb-4 sm:max-w-[45%]'
            : align === 'right'
            ? 'my-7 sm:float-right sm:ms-6 sm:mb-4 sm:max-w-[45%]'
            : 'my-7 mx-auto';
        const widthClass =
          align === 'center' ? (size === 'small' ? 'max-w-sm' : size === 'large' ? 'max-w-full' : 'max-w-2xl') : '';
        out.push(
          <figure key={key++} className={`${figureClass} ${widthClass} clear-none`}>
            <img
              src={src}
              alt={alt || caption || 'Illustration for this article'}
              loading="lazy"
              decoding="async"
              className="w-full max-w-full h-auto rounded-2xl border border-[#eae3ee] dark:border-white/10 shadow-xs"
            />
            {caption && (
              <figcaption className="mt-2 text-center text-xs text-[#726c85] dark:text-[#b5a9cd] italic">
                {caption}
              </figcaption>
            )}
          </figure>
        );
        continue;
      }

      if (line.startsWith('### ')) {
        flushAll();
        out.push(
          <h3
            key={key++}
            className="font-heading text-xl sm:text-2xl font-bold text-[#2e2440] dark:text-[#f1e9fb] mt-8 mb-3.5 tracking-tight"
          >
            {renderInline(line.slice(4).trim())}
          </h3>
        );
        continue;
      }

      if (line.startsWith('## ')) {
        flushAll();
        out.push(
          <h2
            key={key++}
            className="font-heading text-2xl sm:text-3xl font-extrabold text-[#2e2440] dark:text-[#f1e9fb] mt-10 mb-4 tracking-tight border-b border-[#eae3ee] dark:border-white/10 pb-2"
          >
            {renderInline(line.slice(3).trim())}
          </h2>
        );
        continue;
      }

      if (line.startsWith('> ')) {
        flushPara();
        flushList();
        quote.push(line.replace(/^>\s?/, ''));
        continue;
      }

      const listMatch = line.match(/^(-\s|\*\s|\d+\.\s)/);
      if (listMatch) {
        flushPara();
        flushQuote();
        // The marker on the first item decides the list's kind, so a stray
        // "2." partway down doesn't split one list into two.
        if (!items.length) ordered = /^\d+\.\s/.test(line);
        items.push(line.slice(listMatch[0].length).trim());
        continue;
      }

      flushQuote();
      flushList();
      para.push(line);
    }

    flushAll();
    return out;
  };

  if (!currentPost) {
    // A brand-new post may not have arrived from the server yet; only once
    // the list is in is a missing slug really missing.
    return blogLoaded ? <NotFoundPage variant="post" /> : <PostLoadingPage />;
  }

  return (
    <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] text-[#2e2440] dark:text-[#f1e9fb] flex flex-col font-sans transition-colors duration-200">
      <Seo
        title={seoTitle}
        description={seoDescription}
        path={seoPath}
        image={currentPost.coverImage || siteSettings.ogImage || undefined}
        imageAlt={currentPost.coverImage ? currentPost.coverImageAlt || currentPost.title : undefined}
        type="article"
        locale={postLang.locale}
        alternates={postAlternates}
        article={{
          publishedTime: currentPost.publishedAt,
          modifiedTime: currentPost.updatedAt || currentPost.publishedAt,
          author: displayAuthorName,
          section: currentPost.category,
          tags: currentPost.metaKeywords || [],
        }}
        twitterHandle={twitterHandleFromUrl(siteSettings.socialTwitter)}
        canonicalUrl={canonical || undefined}
        jsonLd={[
          buildArticleSchema({
            headline: currentPost.title,
            description: seoDescription,
            image: currentPost.coverImage,
            datePublished: currentPost.publishedAt,
            authorName: currentPost.authorName,
            url: canonical || `${seoOrigin}${seoPath}`,
            inLanguage: postLang.code,
            dateModified: currentPost.updatedAt || currentPost.publishedAt,
            publisherName: siteSettings.siteName,
            publisherLogo: siteSettings.logoUrl || undefined,
          }),
          buildBreadcrumbSchema([
            { name: 'Home', url: `${seoOrigin}/` },
            { name: 'Blog', url: `${seoOrigin}/blog` },
            { name: currentPost.title, url: `${seoOrigin}${seoPath}` },
          ]),
        ]}
      />
      
      {/* 1. TOP SOCIAL & BRAND BAR (matching screenshot aesthetic) */}
      <div className="bg-[#4b2e83] dark:bg-[#150e24] text-white/80 text-xs py-2 px-4 sm:px-8 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>{t.blogPost.editorial}</span>
          </div>
          
          {topBarSocialLinks.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-white/60 hidden sm:inline">{t.blogPost.followChannels}</span>
              <div className="flex items-center gap-2">
                {topBarSocialLinks.map(({ key, url, label, Icon }) => (
                  <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors" title={label}>
                    <Icon className="w-3.5 h-3.5" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. MAIN HEADER & NAVBAR */}
      <Header />

      {/* ========================================================================= */}
      {/* INTERACTIVE SEARCH MODAL OVERLAY (BlogSearchResults Component)            */}
      {/* ========================================================================= */}
      <BlogSearchResults
        query={navSearchQuery}
        onQueryChange={setNavSearchQuery}
        posts={localizedBlogPosts}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectPost={(slug) => {
          setIsSearchOpen(false);
          setNavSearchQuery('');
          navigateToBlogPost(slug);
        }}
        mode="modal"
        onToggleMode={() => {
          setIsSearchOpen(false);
          setIsHeaderSearchFocused(true);
        }}
        selectedCategory={selectedSearchCategory}
        onSelectCategory={setSelectedSearchCategory}
        categories={blogCategories}
        onViewAll={() => setCurrentRoute('public-blog')}
      />

      {/* 3. BREADCRUMBS ROW */}
      <div className="bg-white/60 dark:bg-[#161026]/60 border-b border-[#eae3ee] dark:border-white/5 py-3 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
          {/* Real links in an ordered list, marked up as a breadcrumb trail.
              "Home" used to point at the blog listing, not the home page. */}
          <nav aria-label={t.blogPost.breadcrumb} className="min-w-0">
            <ol className="flex items-center gap-2 text-[#726c85] dark:text-[#a29cb2] flex-wrap">
              <li>
                <RouteLink
                  route="home"
                  className="hover:text-[#6d46b8] dark:hover:text-[#a78bda] font-medium transition-colors"
                >
                  {t.blogPost?.breadcrumbHome || 'Home'}
                </RouteLink>
              </li>
              <li aria-hidden="true">
                <ChevronRight className={`w-3.5 h-3.5 text-[#a29cb2] ${isRtl ? 'rotate-180' : ''}`} />
              </li>
              <li>
                <RouteLink
                  route="public-blog"
                  className="hover:text-[#6d46b8] dark:hover:text-[#a78bda] font-medium transition-colors"
                >
                  {t.blogPost?.breadcrumbBlog || 'Blog'}
                </RouteLink>
              </li>
              <li aria-hidden="true">
                <ChevronRight className={`w-3.5 h-3.5 text-[#a29cb2] ${isRtl ? 'rotate-180' : ''}`} />
              </li>
              <li className="min-w-0">
                <span
                  aria-current="page"
                  className="block text-[#6d46b8] dark:text-[#c4bed3] font-semibold truncate max-w-[280px] sm:max-w-md"
                >
                  {currentPost.title}
                </span>
              </li>
            </ol>
          </nav>

          <RouteLink
            route="public-blog"
            className="text-xs font-bold text-[#6d46b8] dark:text-[#a78bda] hover:underline flex items-center gap-1 shrink-0"
          >
            <ArrowLeft className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
            <span className="hidden sm:inline">{t.blog?.allCategories || 'All Articles'}</span>
          </RouteLink>
        </div>
      </div>

      {/* 4. MAIN TWO-COLUMN CONTENT LAYOUT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          
          {/* ========================================================================= */}
          {/* LEFT COLUMN: MAIN ARTICLE (~68% width on desktop)                          */}
          {/* ========================================================================= */}
          <main className="lg:col-span-8 flex flex-col space-y-8">
            
            {/* Article Card */}
            <article className="bg-white dark:bg-[#181129] rounded-[24px] p-6 sm:p-10 shadow-[0_10px_35px_rgba(140,80,120,0.07)] border border-[#e6799f]/15 dark:border-white/10">
              
              {/* Featured Cover Image with Rounded Corners */}
              <div className="w-full h-64 sm:h-96 md:h-[420px] rounded-[20px] overflow-hidden shadow-sm border border-[#eae3ee] dark:border-white/10 relative bg-[#f1e9fb] dark:bg-[#201538] mb-6">
                <img
                  src={currentPost.coverImage || BLOG_COVER_FALLBACK}
                  alt={currentPost.coverImageAlt || currentPost.title}
                    loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Row below image: Category Tag, Share Icons, Comment Count */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#eae3ee] dark:border-white/10 mb-6">
                {/* Category Pill Tag */}
                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-[#f1e9fb] dark:bg-[#2e1d4d] text-[#6d46b8] dark:text-[#d3c2fa] border border-[#a78bda]/30">
                    {getLocalizedCategory(currentPost.category, currentLang)}
                  </span>
                  
                  {/* Read time badge */}
                  <span className="text-xs text-[#726c85] dark:text-[#a29cb2] flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-[#a29cb2]" />
                    {readTimeLabel(currentPost.readTime, t)}
                  </span>
                </div>

                {/* Share icons + comment count */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-[#726c85] dark:text-[#a29cb2] font-semibold mr-1">
                    <Share2 className="w-3.5 h-3.5 text-[#6d46b8]" />
                    <span className="hidden sm:inline">{t.blogPost?.share || 'Share'}:</span>
                  </div>

                  {/* Share buttons */}
                  <button
                    onClick={handleShareFacebook}
                    title={fill(t.blogPost.shareOn, { network: 'Facebook' })}
                    className="w-8 h-8 rounded-lg bg-[#f6f0f4] dark:bg-white/5 hover:bg-[#1877f2] hover:text-white text-[#726c85] dark:text-[#c4bed3] flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Facebook className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handleShareTwitter}
                    title={fill(t.blogPost.shareOn, { network: 'Twitter / X' })}
                    className="w-8 h-8 rounded-lg bg-[#f6f0f4] dark:bg-white/5 hover:bg-[#000000] hover:text-white text-[#726c85] dark:text-[#c4bed3] flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Twitter className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handleShareLinkedIn}
                    title={fill(t.blogPost.shareOn, { network: 'LinkedIn' })}
                    className="w-8 h-8 rounded-lg bg-[#f6f0f4] dark:bg-white/5 hover:bg-[#0a66c2] hover:text-white text-[#726c85] dark:text-[#c4bed3] flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Linkedin className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handleCopyLink}
                    title={copied ? (t.blogPost?.copied || 'Copied!') : (t.blogPost?.copyLink || 'Copy Link')}
                    className="w-8 h-8 rounded-lg bg-[#f6f0f4] dark:bg-white/5 hover:bg-[#6d46b8] hover:text-white text-[#726c85] dark:text-[#c4bed3] flex items-center justify-center transition-all cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  {/* Comment Count Tag */}
                  <a
                    href="#comments-section"
                    className="flex items-center gap-1.5 px-3 py-1 bg-[#f6f0f4] dark:bg-white/5 hover:bg-[#f1e9fb] dark:hover:bg-white/10 rounded-lg text-xs font-bold text-[#6d46b8] dark:text-[#d3c2fa] transition-colors ml-2"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{approvedComments.length}</span>
                  </a>
                </div>
              </div>

              {normalizeBlogLanguage(currentPost.language) !== currentLang && !siblingIn(currentLang) && (
                <p className="mb-4 text-xs font-semibold text-[#6d46b8] dark:text-[#d1b9f7] bg-[#f1e9fb] dark:bg-[#261b3b] rounded-xl px-3 py-2">
                  {fill(t.blogPost.notTranslated, { lang: langName(currentLang, currentLang) })}
                </p>
              )}

              {/* Large Bold Post Title — carries the post's own direction, not
                  the interface language's, so an Arabic headline reads RTL even
                  while the site is browsed in English. */}
              <h1
                dir={postLang.dir}
                lang={postLang.code}
                className="font-heading text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#2e2440] dark:text-white leading-tight tracking-tight mb-4">
                {currentPost.title}
              </h1>

              {/* Meta Line: Author Name, Published Date, Comment Count */}
              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-[#726c85] dark:text-[#a29cb2] pb-6 mb-8 border-b border-[#eae3ee] dark:border-white/10">
                <div className="flex items-center gap-2 font-semibold text-[#2e2440] dark:text-white">
                  {displayAuthorAvatar ? (
                    <img
                      src={displayAuthorAvatar}
                      alt={displayAuthorName}
                    loading="lazy"
                      className="w-7 h-7 rounded-full object-cover border border-[#6d46b8]/30"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#6d46b8] text-white flex items-center justify-center font-bold text-xs">
                      {displayAuthorName.charAt(0)}
                    </div>
                  )}
                  <span>{displayAuthorName}</span>
                </div>

                <span>&bull;</span>

                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#6d46b8]" />
                  <time dateTime={currentPost.publishedAt}>{formatPostDate(currentPost.publishedAt, currentLang)}</time>
                </div>

                {currentPost.updatedAt && currentPost.updatedAt > currentPost.publishedAt && (
                  <>
                    <span>&bull;</span>
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                      <RefreshCw className="w-4 h-4" />
                      <span>{t.legalCommon?.lastUpdated || 'Last updated:'}</span>
                      <time dateTime={currentPost.updatedAt}>{formatPostDate(currentPost.updatedAt, currentLang)}</time>
                    </div>
                  </>
                )}

                <span>&bull;</span>

                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-[#6d46b8]" />
                  <span>{approvedComments.length} {t.blogPost?.comments || 'Comments'}</span>
                </div>
              </div>

              {/* Post Body with Paragraphs, H2/H3, quotes, lists */}
              <div
                dir={postLang.dir}
                lang={postLang.code}
                className="prose prose-purple max-w-none text-[#4a4257] dark:text-[#c4bed3]">
                {renderFormattedContent(currentPost.content)}
              </div>

              {/* Article Keywords & SEO Tags */}
              {currentPost.metaKeywords && currentPost.metaKeywords.length > 0 && (
                <div className="mt-8 pt-6 border-t border-[#eae3ee] dark:border-white/10 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#726c85] dark:text-[#a29cb2] flex items-center gap-1.5 mr-1">
                    <Tag className="w-3.5 h-3.5 text-[#6d46b8] dark:text-[#a78bda]" />
                    <span>{t.blogPost?.focusTopics || 'Focus Topics:'}</span>
                  </span>
                  {currentPost.metaKeywords.map((kw, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-[#f1e9fb] dark:bg-[#201538] text-[#6d46b8] dark:text-[#c4a9f3] border border-[#e1d5f3] dark:border-white/10 transition-colors"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              )}

              {/* Inline Promotional Tool Callout (matching reference banner aesthetic) */}
              <div className="mt-10 p-6 rounded-2xl bg-gradient-to-r from-[#4b2e83] via-[#6d46b8] to-[#9e5488] text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-5">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-extrabold uppercase tracking-wider text-[#f0a8bf]">
                    <Sparkles className="w-4 h-4" />
                    <span>{t.blogPost?.freeExtractor || 'Free Video Extractor'}</span>
                  </div>
                  <h4 className="font-heading font-bold text-lg sm:text-xl text-white">
                    {t.blogPost?.promoTitle || 'Download Any Public Facebook Video or Reel in 1080p'}
                  </h4>
                  <p className="text-xs text-white/80 max-w-md">
                    {t.blogPost?.promoSubtitle || 'No software installation required. Fast, lossless, and converted directly to MP4 or MP3.'}
                  </p>
                </div>
                <DownloaderLink
                  className="inline-block px-5 py-2.5 bg-white dark:bg-[#181224] text-[#4b2e83] font-bold text-xs rounded-xl shadow-sm hover:bg-[#f1e9fb] transition-all whitespace-nowrap cursor-pointer"
                >
                  {t.blogPost?.tryNow || `Try ${brand} Now`}
                </DownloaderLink>
              </div>

              {/* Author Bio Box at the End of Article */}
              <div className="mt-12 p-6 sm:p-8 rounded-2xl bg-[#f6f0f4] dark:bg-[#201538] border border-[#eae3ee] dark:border-white/10 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5">
                <div className="relative">
                  {displayAuthorAvatar ? (
                    <img
                      src={displayAuthorAvatar}
                      alt={displayAuthorName}
                    loading="lazy"
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-white dark:border-[#2e2440] shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-[#4b2e83] to-[#6d46b8] text-white flex items-center justify-center font-bold text-2xl shadow-md">
                      {displayAuthorName.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-heading font-bold text-lg text-[#2e2440] dark:text-white">
                        {displayAuthorName}
                      </h4>
                      <p className="text-xs font-semibold text-[#6d46b8] dark:text-[#a78bda]">
                        {currentPost.authorRole && currentPost.authorRole.trim() !== 'Content Editor' ? currentPost.authorRole : t.blogPost.defaultRole}
                      </p>
                    </div>

                    {/* Author social icons */}
                    {authorSocialLinks.length > 0 && (
                      <div className="flex items-center justify-center gap-2">
                        {authorSocialLinks.map(({ key, url, label, Icon }) => (
                          <a key={key} href={url} target="_blank" rel="noopener noreferrer" title={label} className="p-1.5 text-[#726c85] dark:text-[#b5a9cd] hover:text-[#6d46b8] dark:hover:text-white rounded-lg transition-colors">
                            <Icon className="w-4 h-4" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-[#726c85] dark:text-[#c4bed3] leading-relaxed">
                    {currentPost.authorBio && currentPost.authorBio.trim() !== DEFAULT_AUTHOR_BIO ? currentPost.authorBio : t.blogPost.defaultBio}
                  </p>
                </div>
              </div>
            </article>

            <RelatedPosts
              posts={related}
              heading={t.blogPost?.relatedPosts || 'Related Articles'}
              dir={postLang.dir}
              lang={postLang.code}
            />

            {/* ===================================================================== */}
            {/* COMMENT SYSTEM: APPROVED COMMENTS LIST & "LEAVE A REPLY" FORM         */}
            {/* ===================================================================== */}
            <section id="comments-section" className="bg-white dark:bg-[#181129] rounded-[24px] p-6 sm:p-10 shadow-[0_10px_35px_rgba(140,80,120,0.07)] border border-[#e6799f]/15 dark:border-white/10 space-y-8">
              
              {/* Approved Comments Display Header */}
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[#eae3ee] dark:border-white/10">
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="w-5 h-5 text-[#6d46b8]" />
                    <h3 className="font-heading font-bold text-xl text-[#2e2440] dark:text-white">
                      {t.blogPost?.comments || 'Comments'} ({approvedComments.length})
                    </h3>
                  </div>
                  <span className="text-xs text-[#726c85] dark:text-[#a29cb2]">
                    {t.blogPost?.moderatedDiscussion || 'Moderated discussion'}
                  </span>
                </div>

                {/* Comments List */}
                {approvedComments.length === 0 ? (
                  <div className="py-8 text-center bg-[#f6f0f4]/60 dark:bg-[#201538]/60 rounded-2xl mt-6 p-6">
                    <MessageSquare className="w-8 h-8 text-[#a29cb2] mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-semibold text-[#2e2440] dark:text-white">
                      {t.blogPost?.noCommentsYet || 'No comments yet'}
                    </p>
                    <p className="text-xs text-[#726c85] dark:text-[#a29cb2] mt-1">
                      {t.blogPost?.noCommentsDesc || 'Be the first to share your thoughts, tips, or questions about this article below.'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#eae3ee] dark:divide-white/10 mt-4">
                    {approvedComments.map((comment) => (
                      <div key={comment.id} className="py-5 first:pt-2 flex gap-4">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#6d46b8] to-[#e6799f] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                          {comment.authorName.charAt(0).toUpperCase()}
                        </div>

                        {/* Content */}
                        <div className="flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[#2e2440] dark:text-white">
                                {comment.authorName}
                              </span>
                              {comment.website && (
                                <a 
                                  href={comment.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-[11px] text-[#6d46b8] dark:text-[#a78bda] hover:underline flex items-center gap-0.5"
                                >
                                  <Globe className="w-3 h-3" />
                                  <span>Website</span>
                                </a>
                              )}
                            </div>
                            <span className="text-[11px] text-[#a29cb2]">
                              {comment.createdAt}
                            </span>
                          </div>

                          <p className="text-xs sm:text-sm text-[#4a4257] dark:text-[#c4bed3] leading-relaxed">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* LEAVE A REPLY FORM */}
              <div className="pt-6 border-t border-[#eae3ee] dark:border-white/10">
                <div className="mb-6">
                  <h3 className="font-heading font-extrabold text-xl sm:text-2xl text-[#2e2440] dark:text-white uppercase tracking-wide">
                    {t.blogPost?.leaveReply || 'Leave a Reply'}
                  </h3>
                  <p className="text-xs text-[#726c85] dark:text-[#a29cb2] mt-1">
                    {t.blogPost?.leaveReplySubtitle || 'Your email address will not be published. Required fields are marked *'}
                  </p>
                </div>

                {/* Submission Success Alert */}
                {commentSubmittedNotice && (
                  <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2.5 animate-fade-in">
                    <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold">{t.blogPost.commentThanks}</p>
                      <p className="mt-0.5 text-emerald-700 dark:text-emerald-300">
                        {t.blogPost.commentQueue}
                      </p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleCommentSubmit} className="space-y-4">
                  {/* Name field */}
                  <div>
                    <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5">
                      {t.blogPost?.formName || 'Name'} *
                    </label>
                    <input
                      type="text"
                      required
                      value={commentName}
                      onChange={(e) => setCommentName(e.target.value)}
                      placeholder={t.blogPost.namePh}
                      className="w-full px-4 py-2.5 text-sm text-[#2e2440] dark:text-white bg-[#f6f0f4] dark:bg-[#201538] border border-[#eae3ee] dark:border-white/10 rounded-xl focus:outline-hidden focus:border-[#6d46b8] focus:bg-white dark:focus:bg-[#181224] dark:focus:bg-[#181224] dark:focus:bg-[#1a1329] transition-all"
                    />
                  </div>

                  {/* Email & Website fields (2 Columns) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5">
                        {t.blogPost?.formEmail || 'Email'} * <span className="text-[11px] font-normal text-[#a29cb2]">{t.blogPost.notPublished}</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={commentEmail}
                        onChange={(e) => setCommentEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-4 py-2.5 text-sm text-[#2e2440] dark:text-white bg-[#f6f0f4] dark:bg-[#201538] border border-[#eae3ee] dark:border-white/10 rounded-xl focus:outline-hidden focus:border-[#6d46b8] focus:bg-white dark:focus:bg-[#181224] dark:focus:bg-[#181224] dark:focus:bg-[#1a1329] transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5">
                        {t.blogPost?.formWebsite || 'Website'} <span className="text-[11px] font-normal text-[#a29cb2]">{t.blogPost.optional}</span>
                      </label>
                      <input
                        type="url"
                        value={commentWebsite}
                        onChange={(e) => setCommentWebsite(e.target.value)}
                        placeholder="https://yourwebsite.com"
                        className="w-full px-4 py-2.5 text-sm text-[#2e2440] dark:text-white bg-[#f6f0f4] dark:bg-[#201538] border border-[#eae3ee] dark:border-white/10 rounded-xl focus:outline-hidden focus:border-[#6d46b8] focus:bg-white dark:focus:bg-[#181224] dark:focus:bg-[#181224] dark:focus:bg-[#1a1329] transition-all"
                      />
                    </div>
                  </div>

                  {/* Comment textarea */}
                  <div>
                    <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5">
                      {t.blogPost?.formComment || 'Comment'} *
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={t.blogPost.commentPh}
                      className="w-full px-4 py-3 text-sm text-[#2e2440] dark:text-white bg-[#f6f0f4] dark:bg-[#201538] border border-[#eae3ee] dark:border-white/10 rounded-xl focus:outline-hidden focus:border-[#6d46b8] focus:bg-white dark:focus:bg-[#181224] dark:focus:bg-[#181224] dark:focus:bg-[#1a1329] transition-all resize-y"
                    ></textarea>
                  </div>

                  {/* Submit button */}
                  <div>
                    <button
                      type="submit"
                      disabled={commentSubmitting}
                      className="w-full sm:w-auto px-8 py-3 text-xs font-extrabold uppercase tracking-wider text-white bg-gradient-to-r from-[#4b2e83] via-[#6d46b8] to-[#9e5488] hover:opacity-95 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Send className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                      <span>{commentSubmitting ? (t.blogPost?.submitting || 'Submitting...') : (t.blogPost?.submitComment || 'Submit Comment')}</span>
                    </button>
                  </div>
                </form>
              </div>
            </section>
          </main>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: STACKED SIDEBAR WIDGETS (~32% width on desktop)              */}
          {/* ========================================================================= */}
          <aside className="lg:col-span-4 flex flex-col space-y-6">
            
            {/* WIDGET 0: SIDEBAR SEARCH WIDGET (Search Icon and System) */}
            <div className="bg-white dark:bg-[#181129] rounded-[22px] p-5 sm:p-6 shadow-[0_10px_30px_rgba(140,80,120,0.07)] border border-[#e6799f]/15 dark:border-white/10">
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[#eae3ee] dark:border-white/10">
                <Search className="w-4 h-4 text-[#6d46b8]" />
                <h3 className="font-heading font-extrabold text-sm uppercase tracking-wider text-[#2e2440] dark:text-white">
                  {t.blogPost?.searchBlog || 'Search Blog'}
                </h3>
              </div>

              <div className="relative">
                <Search className={`w-4 h-4 text-[#a29cb2] absolute ${isRtl ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2`} />
                <input
                  type="text"
                  value={sidebarSearchQuery}
                  onChange={(e) => setSidebarSearchQuery(e.target.value)}
                  placeholder={t.blog?.searchPlaceholder || 'Search articles, topics...'}
                  className={`w-full ${isRtl ? 'pr-10 pl-9' : 'pl-10 pr-9'} py-2.5 text-xs text-[#2e2440] dark:text-white bg-[#f6f0f4] dark:bg-[#201538] border border-[#eae3ee] dark:border-white/10 rounded-xl focus:outline-hidden focus:border-[#6d46b8] focus:bg-white dark:focus:bg-[#181224] dark:focus:bg-[#181224] dark:focus:bg-[#150e24] transition-all`}
                />
                {sidebarSearchQuery && (
                  <button
                    onClick={() => setSidebarSearchQuery('')}
                    className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-[#a29cb2] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white dark:hover:text-white p-0.5`}
                    aria-label={t.blogPost.clearSearch}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Instant Search Results Dropdown in Sidebar */}
              {sidebarSearchQuery.trim() !== '' && (
                <div className="mt-3 pt-3 border-t border-[#eae3ee] dark:border-white/10 space-y-2 max-h-72 overflow-y-auto">
                  {sidebarSearchResults.length === 0 ? (
                    <div className="py-4 text-center">
                      <p className="text-xs text-[#726c85] dark:text-[#a29cb2]">
                        {t.blogPost.noMatching}
                      </p>
                    </div>
                  ) : (
                    sidebarSearchResults.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSidebarSearchQuery('');
                          navigateToBlogPost(item.slug);
                        }}
                        className="p-2.5 rounded-xl bg-[#f6f0f4] dark:bg-[#201538] hover:bg-[#ede3f7] dark:hover:bg-[#2d1b4e] flex items-center gap-3 cursor-pointer transition-all group"
                      >
                        <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-[#e7ddf3]">
                          <img
                            src={item.coverImage || BLOG_COVER_FALLBACK}
                            alt={item.coverImageAlt || item.title}
                    loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] font-extrabold text-[#6d46b8] dark:text-[#a78bda] uppercase tracking-wider block">
                            {item.category}
                          </span>
                          <h5 className="font-heading font-bold text-xs text-[#2e2440] dark:text-white group-hover:text-[#6d46b8] dark:group-hover:text-[#a78bda] truncate transition-colors">
                            {item.title}
                          </h5>
                          <span className="text-[10px] text-[#a29cb2] block">
                            {readTimeLabel(item.readTime, t)}
                          </span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-[#a29cb2] group-hover:text-[#6d46b8] shrink-0" />
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* WIDGET 1: Top Feature Promo Widget (matching top blue/purple banner in screenshot) */}
            <div className="bg-gradient-to-br from-[#4b2e83] to-[#6d46b8] text-white rounded-[22px] p-6 shadow-md border border-white/10 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
              <span className="inline-block px-3 py-0.5 rounded-full bg-amber-400 text-[#4b2e83] text-[10px] font-black uppercase tracking-wider mb-2">
                {t.blogPost?.suiteBadge || '#1 Social Downloader'}
              </span>
              <h3 className="font-heading font-extrabold text-lg text-white">
                {t.blogPost?.suiteTitle || `${brand} Tool Suite`}
              </h3>
              <p className="text-xs text-white/80 mt-1 mb-4 leading-relaxed">
                {t.blogPost?.suiteSubtitle || 'Save Facebook Watch, Creator Reels, and Stories in 1080p Full HD with zero audio sync lag.'}
              </p>
              <DownloaderLink
                className="block text-center w-full py-2.5 px-4 bg-white dark:bg-[#181224] text-[#4b2e83] text-xs font-bold rounded-xl hover:bg-[#f1e9fb] transition-colors shadow-sm cursor-pointer"
              >
                {t.blogPost?.launchDownloader || 'Launch Downloader'}
              </DownloaderLink>
            </div>

            {/* WIDGET 2: RECENT POSTS WIDGET */}
            <div className="bg-white dark:bg-[#181129] rounded-[22px] p-6 shadow-[0_10px_30px_rgba(140,80,120,0.07)] border border-[#e6799f]/15 dark:border-white/10">
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#eae3ee] dark:border-white/10">
                <BookOpen className="w-4 h-4 text-[#6d46b8]" />
                <h3 className="font-heading font-extrabold text-sm uppercase tracking-wider text-[#2e2440] dark:text-white">
                  {t.blogPost?.recentPosts || 'Recent Posts'}
                </h3>
              </div>

              <div className="space-y-4">
                {recentPosts.map((post) => (
                  <div
                    key={post.id}
                    className="relative flex items-center gap-3.5 group"
                  >
                    {/* Thumbnail */}
                    <div className="w-20 h-16 rounded-xl overflow-hidden bg-[#f1e9fb] dark:bg-[#201538] shrink-0 border border-[#eae3ee] dark:border-white/10">
                      <img
                        src={post.coverImage || BLOG_COVER_FALLBACK}
                        alt={post.coverImageAlt || post.title}
                    loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    {/* Meta & Title */}
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-extrabold text-[#6d46b8] dark:text-[#a78bda] uppercase tracking-wider">
                        {getLocalizedCategory(post.category, currentLang)}
                      </span>
                      <h4 className="font-heading font-bold text-xs text-[#2e2440] dark:text-white line-clamp-2 group-hover:text-[#6d46b8] dark:group-hover:text-[#a78bda] transition-colors leading-snug">
                        <PostLink slug={post.slug} className={STRETCHED_LINK}>
                          {post.title}
                        </PostLink>
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-[#a29cb2] mt-1">
                        <span>{authorLabel(post.authorName || adminUser?.name, t)}</span>
                        <span>&bull;</span>
                        <span>{formatPostDate(post.publishedAt, currentLang)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* WIDGET 3: CATEGORIES WIDGET (Pill / Row Items) */}
            <div id="sidebar-categories-widget" className="bg-white dark:bg-[#181129] rounded-[22px] p-6 shadow-[0_10px_30px_rgba(140,80,120,0.07)] border border-[#e6799f]/15 dark:border-white/10">
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#eae3ee] dark:border-white/10">
                <Tag className="w-4 h-4 text-[#6d46b8]" />
                <h3 className="font-heading font-extrabold text-sm uppercase tracking-wider text-[#2e2440] dark:text-white">
                  {t.blogPost?.categories || 'Categories'}
                </h3>
              </div>

              <div className="space-y-2">
                {categoriesWithCounts.map((cat) => (
                  <a
                    href={`/blog?category=${encodeURIComponent(cat.slug)}`}
                    onClick={(e) => openFiltered(e, `category=${encodeURIComponent(cat.slug)}`)}
                    key={cat.id}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#f6f0f4] dark:bg-[#201538] hover:bg-[#f1e9fb] dark:hover:bg-[#2a1b4d] text-[#2e2440] dark:text-white text-xs font-bold transition-colors cursor-pointer text-left group"
                  >
                    <span className="group-hover:text-[#6d46b8] dark:group-hover:text-[#a78bda] transition-colors">
                      {cat.localizedName || cat.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-white dark:bg-[#150f24] text-[#6d46b8] dark:text-[#a78bda] font-extrabold shadow-xs">
                      {cat.count}
                    </span>
                  </a>
                ))}
              </div>
            </div>

            {/* WIDGET: ARCHIVES (month-wise) */}
            {archiveMonths.length > 1 && (
              <div id="sidebar-archives-widget" className="bg-white dark:bg-[#181129] rounded-[22px] p-6 shadow-[0_10px_30px_rgba(140,80,120,0.07)] border border-[#e6799f]/15 dark:border-white/10">
                <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#eae3ee] dark:border-white/10">
                  <Calendar className="w-4 h-4 text-[#6d46b8]" />
                  <h3 className="font-heading font-extrabold text-sm uppercase tracking-wider text-[#2e2440] dark:text-white">
                    {t.blogPost?.archives || 'Archives'}
                  </h3>
                </div>
                <div className="space-y-2">
                  {archiveMonths.map((m) => (
                    <a
                      key={m.key}
                      href={`/blog?month=${m.key}`}
                      onClick={(e) => openFiltered(e, `month=${m.key}`)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#f6f0f4] dark:bg-[#201538] hover:bg-[#f1e9fb] dark:hover:bg-[#2a1b4d] text-[#2e2440] dark:text-white text-xs font-bold transition-colors group"
                    >
                      <span className="group-hover:text-[#6d46b8] dark:group-hover:text-[#a78bda] transition-colors">
                        {monthLabel(m.key, currentLang)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-white dark:bg-[#150f24] text-[#6d46b8] dark:text-[#a78bda] font-extrabold shadow-xs">
                        {m.count}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* WIDGET 4: NEWSLETTER WIDGET */}
            <div id="sidebar-newsletter-widget" className="bg-gradient-to-br from-[#4b2e83] via-[#6d46b8] to-[#9e5488] text-white rounded-[22px] p-6 shadow-md border border-white/15">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-[#f0a8bf]" />
                <h3 className="font-heading font-extrabold text-sm uppercase tracking-wider text-white">
                  {t.blog?.newsletterTitle || 'Join Our Newsletter'}
                </h3>
              </div>

              <p className="text-xs text-white/80 leading-relaxed mb-4">
                {t.blog?.newsletterDesc || 'Subscribe to receive new video extraction techniques, codec guides, and platform updates weekly.'}
              </p>

              {sidebarSubscribed ? (
                <div className="p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-emerald-200 text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>{t.blog?.subscribed || 'Subscribed! Check your inbox soon.'}</span>
                </div>
              ) : (
                <form onSubmit={handleSidebarSubscribe} className="space-y-2.5">
                  <input
                    type="email"
                    required
                    value={sidebarEmail}
                    onChange={(e) => setSidebarEmail(e.target.value)}
                    placeholder={t.blog?.enterEmail || 'Enter your email address'}
                    className="w-full px-3.5 py-2.5 text-xs text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-300"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-white dark:bg-[#181224] text-[#4b2e83] text-xs font-black uppercase tracking-wider rounded-xl hover:bg-[#f1e9fb] transition-all shadow-sm cursor-pointer"
                  >
                    {t.blog?.subscribe || 'Subscribe'}
                  </button>
                </form>
              )}
            </div>

            {/* WIDGET 5: FOLLOW US WIDGET */}
            {sidebarSocialLinks.length > 0 && (
              <div className="bg-white dark:bg-[#181129] rounded-[22px] p-6 shadow-[0_10px_30px_rgba(140,80,120,0.07)] border border-[#e6799f]/15 dark:border-white/10">
                <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#eae3ee] dark:border-white/10">
                  <Heart className="w-4 h-4 text-[#6d46b8]" />
                  <h3 className="font-heading font-extrabold text-sm uppercase tracking-wider text-[#2e2440] dark:text-white">
                    {t.blogPost?.followUs || 'Follow Us'}
                  </h3>
                </div>

                <p className="text-xs text-[#726c85] dark:text-[#a29cb2] mb-4 leading-relaxed">
                  {t.blogPost?.followUsDesc || 'Connect with our editorial creators across global social networks.'}
                </p>

                <div className="flex flex-wrap gap-2">
                  {siteSettings.socialFacebook && (
                    <a
                      href={siteSettings.socialFacebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-xl bg-[#f6f0f4] dark:bg-[#201538] hover:bg-[#1877f2] hover:text-white text-[#726c85] dark:text-[#c4bed3] flex items-center justify-center transition-all cursor-pointer"
                      title="Facebook"
                    >
                      <Facebook className="w-4 h-4" />
                    </a>
                  )}
                  {siteSettings.socialTwitter && (
                    <a
                      href={siteSettings.socialTwitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-xl bg-[#f6f0f4] dark:bg-[#201538] hover:bg-black hover:text-white text-[#726c85] dark:text-[#c4bed3] flex items-center justify-center transition-all cursor-pointer"
                      title="Twitter / X"
                    >
                      <Twitter className="w-4 h-4" />
                    </a>
                  )}
                  {siteSettings.socialInstagram && (
                    <a
                      href={siteSettings.socialInstagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-xl bg-[#f6f0f4] dark:bg-[#201538] hover:bg-gradient-to-tr hover:from-amber-500 hover:to-pink-500 hover:text-white text-[#726c85] dark:text-[#c4bed3] flex items-center justify-center transition-all cursor-pointer"
                      title="Instagram"
                    >
                      <Instagram className="w-4 h-4" />
                    </a>
                  )}
                  {siteSettings.socialLinkedin && (
                    <a
                      href={siteSettings.socialLinkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-xl bg-[#f6f0f4] dark:bg-[#201538] hover:bg-[#0a66c2] hover:text-white text-[#726c85] dark:text-[#c4bed3] flex items-center justify-center transition-all cursor-pointer"
                      title="LinkedIn"
                    >
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}
                  {siteSettings.socialYoutube && (
                    <a
                      href={siteSettings.socialYoutube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-xl bg-[#f6f0f4] dark:bg-[#201538] hover:bg-[#ff0000] hover:text-white text-[#726c85] dark:text-[#c4bed3] flex items-center justify-center transition-all cursor-pointer"
                      title="YouTube"
                    >
                      <Youtube className="w-4 h-4" />
                    </a>
                  )}
                  {siteSettings.socialTiktok && (
                    <a
                      href={siteSettings.socialTiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-xl bg-[#f6f0f4] dark:bg-[#201538] hover:bg-black hover:text-white text-[#726c85] dark:text-[#c4bed3] flex items-center justify-center transition-all cursor-pointer"
                      title="TikTok"
                    >
                      <Music2 className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            )}

          </aside>
        </div>
      </div>

      {/* FOOTER */}
      <Footer />
    </div>
  );
};
