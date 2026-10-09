import React, { useState, useMemo, useEffect } from 'react';
import { fill, langName, authorLabel, uiDate, readTimeLabel } from '../utils/i18n.ts';
import { monthKey, monthLabel, monthCounts, monthFromUrl } from '../utils/months.ts';
import { useAdmin } from '../context/AdminContext';
import { useLanguage } from '../context/LanguageContext';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Seo } from '../components/Seo';
import { buildWebPageSchema, buildBreadcrumbSchema } from '../utils/seoSchema';
import { postCategoryLabel, getLocalizedCategory } from '../translations/blogPostsTranslations';
import { BLOG_LANGUAGES, blogLanguageInfo, normalizeBlogLanguage, type BlogLanguage } from '../config/blogLanguages.ts';
import { applyBrand } from '../config/brand.ts';
import { PageLink, PostLink, STRETCHED_LINK } from '../components/PageLink';
import { LanguageFilterSelect } from '../components/LanguageFilterSelect.tsx';
import { 
  Search,
  Calendar,
  Clock,
  ArrowRight,
  BookOpen 
} from 'lucide-react';
/** Shown when a post has no cover image, instead of a broken image. */
const BLOG_COVER_FALLBACK = 'data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 9%22%3E%3Cdefs%3E%3ClinearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22%3E%3Cstop offset=%220%22 stop-color=%22%236d46b8%22/%3E%3Cstop offset=%221%22 stop-color=%22%23e6799f%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width=%2216%22 height=%229%22 fill=%22url(%23g)%22/%3E%3C/svg%3E';

interface PublicBlogListingPageProps {
  /** When set, this is a single-language archive (/blog/ur) rather than the
   *  master archive. The page keeps the same design either way. */
  language?: BlogLanguage | null;
}

export const PublicBlogListingPage: React.FC<PublicBlogListingPageProps> = ({ language = null }) => {
  const { 
    blogPosts, 
    blogCategories,
    navigateToBlogListing,
    navigateToBlogLanguage,
    siteSettings,
    adminUser 
  } = useAdmin();
  const { t, currentLang, currentLangInfo, setContentLanguage, brand } = useLanguage();

  const isRtl = currentLangInfo?.dir === 'rtl';

  /** Null on the master archive; a language config on /blog/<code>. */
  const archive = language ? blogLanguageInfo(language) : null;
  const archivePath = archive ? `/blog/${archive.code}` : '/blog';

  // A single-language archive is a page about that language's articles, so
  // <html lang> should say so. The master archive has no single language.
  useEffect(() => {
    setContentLanguage(archive ? archive.code : null);
    return () => setContentLanguage(null);
  }, [archive, setContentLanguage]);

  /** How many published posts exist per language, for the picker's counts. */
  const languageCounts = useMemo(() => {
    const counts: Partial<Record<BlogLanguage, number>> = {};
    for (const p of blogPosts) {
      if (p.status !== 'published') continue;
      const code = normalizeBlogLanguage(p.language);
      counts[code] = (counts[code] || 0) + 1;
    }
    return counts;
  }, [blogPosts]);

  // On /blog the list follows the header language (Urdu reader -> Urdu
  // posts), falling back to English when that language has none yet.
  // "All Languages" in the picker (?lang=all) shows everything.
  const [showAll, setShowAll] = useState(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('lang') === 'all'
  );
  const uiHasPosts = (languageCounts[currentLang as BlogLanguage] || 0) > 0;
  const filterLang: string | null = language || (showAll ? null : uiHasPosts ? currentLang : 'en');
  const showFallbackNotice = !language && !showAll && !uiHasPosts && currentLang !== 'en';
  const chooseAllLanguages = () => {
    navigateToBlogListing();
    setShowAll(true);
    try { window.history.replaceState(window.history.state, '', '/blog?lang=all'); } catch {}
  };

  const totalPublished = useMemo(
    () => blogPosts.filter((p) => p.status === 'published').length,
    [blogPosts]
  );

  /** Keep the picker short: only languages that actually have something to
   *  read, plus whichever archive is open so it can show itself as selected. */
  const availableLanguages = useMemo(
    () => BLOG_LANGUAGES.filter((l) => (languageCounts[l.code] || 0) > 0 || l.code === language),
    [languageCounts, language]
  );

  /** hreflang set: every archive that actually has posts, plus the master
   *  archive as x-default. Tells search engines these are the same page in
   *  different languages rather than duplicates of each other. */
  const alternates = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return [
      { hreflang: 'x-default', href: `${origin}/blog` },
      ...BLOG_LANGUAGES.filter((l) => (languageCounts[l.code] || 0) > 0).map((l) => ({
        hreflang: l.code,
        href: `${origin}/blog/${l.code}`,
      })),
    ];
  }, [languageCounts]);

  const [searchQuery, setSearchQuery] = useState('');
  // Filters live in the address (?category=guides&month=2026-09) so sidebar
  // links land here filtered and a filtered view can be shared. The
  // canonical URL stays /blog, so search engines see no extra pages.
  const setParam = (key: string, value: string) => {
    try {
      const url = new URL(window.location.href);
      if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    } catch {}
  };

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  // ?category= holds the slug; categories may still be loading, so it is
  // matched to a name once they arrive.
  const [categorySlug] = useState(() =>
    typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('category') || ''
  );
  useEffect(() => {
    const found = categorySlug && blogCategories.find((c) => c.slug === categorySlug);
    if (found) setSelectedCategory(found.name);
  }, [categorySlug, blogCategories]);
  const chooseCategory = (name: string) => {
    setSelectedCategory(name);
    setParam('category', name === 'All' ? '' : blogCategories.find((c) => c.name === name)?.slug || '');
  };

  // "2026-09" or '' for all months.
  const [selectedMonth, setSelectedMonth] = useState<string>(monthFromUrl);
  const chooseMonth = (m: string) => {
    setSelectedMonth(m);
    setParam('month', m);
  };

  // Months that have posts in the current language, newest first.
  const months = useMemo(
    () => monthCounts(blogPosts.filter(
      (p) => p.status === 'published' && (!filterLang || normalizeBlogLanguage(p.language) === filterLang)
    )),
    [blogPosts, filterLang]
  );

  // Published posts, shown exactly as written. Category matching uses the
  // canonical name every post stores, so it works across languages.
  const publishedPosts = useMemo(() => {
    return blogPosts
      // `{brand}` an author wrote so the site could be renamed in Settings
      // without editing every article. Substituted here so the card shows the
      // site's name rather than the literal token, and so searching for the
      // name matches.
      .map(p => applyBrand(p, brand))
      .filter(p => p.status === 'published')
      .filter(p => {
        const matchesLang = !filterLang || normalizeBlogLanguage(p.language) === filterLang;
        const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
        const matchesMonth = !selectedMonth || monthKey(p.publishedAt) === selectedMonth;
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          !q ||
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          postCategoryLabel(p.category, p.language).toLowerCase().includes(q);
        return matchesLang && matchesCat && matchesMonth && matchesSearch;
      });
  }, [blogPosts, selectedCategory, selectedMonth, searchQuery, filterLang, brand]);

  // Paging keeps the page light as the blog grows — without it every
  // post (and its cover image) loads at once.
  const POSTS_PER_PAGE = 12;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(publishedPosts.length / POSTS_PER_PAGE));

  // A new search or category always starts from the first page.
  useEffect(() => { setPage(1); }, [searchQuery, selectedCategory, selectedMonth]);
  // Stay in range if posts disappear (e.g. a post was unpublished).
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const pagedPosts = useMemo(
    () => publishedPosts.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE),
    [publishedPosts, page]
  );

  const categories = useMemo(() => ['All', ...blogCategories.map(c => c.name)], [blogCategories]);

  return (
    <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#120d1c] text-[#2e2440] dark:text-[#f4eefb] flex flex-col transition-colors animate-fade-in">
      <Seo
        title={
          archive
            ? `${archive.blogsLabel} - ${siteSettings.siteName}`
            : `${t.blog?.title || 'Blog & Video Guides'} - ${siteSettings.siteName}`
        }
        description={
          archive
            ? `${archive.blogsLabel} — ${archive.name} articles on saving and converting social media video.`
            : t.blog?.subtitle || 'Read the latest guides, tutorials, and updates about downloading social media videos.'
        }
        path={archivePath}
        locale={archive ? archive.locale : undefined}
        alternates={alternates}
        image={siteSettings.ogImage || undefined}
        jsonLd={[
          buildWebPageSchema(
            archive ? `${archive.blogsLabel} - ${siteSettings.siteName}` : `Blog - ${siteSettings.siteName}`,
            archive ? archive.blogsLabel : t.blog?.subtitle || siteSettings.metaDescription,
            typeof window !== 'undefined' ? window.location.origin + archivePath : ''
          ),
          buildBreadcrumbSchema([
            { name: 'Home', url: typeof window !== 'undefined' ? window.location.origin + '/' : '' },
            { name: 'Blog', url: typeof window !== 'undefined' ? window.location.origin + '/blog' : '' },
            ...(archive
              ? [{ name: archive.blogsLabel, url: typeof window !== 'undefined' ? window.location.origin + archivePath : '' }]
              : []),
          ]),
        ]}
      />
      {/* PUBLIC TOP NAV */}
      <Header />

      {/* HERO BANNER */}
      <section className="py-12 sm:py-16 px-4 text-center max-w-4xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#f1e9fb] dark:bg-[#261b3b] text-[#6d46b8] dark:text-[#d1b9f7] border border-[#a78bda]/30 shadow-xs">
          {archive ? (
            <>
              <span aria-hidden="true">{archive.flag}</span>
              <span>{archive.nativeName}</span>
            </>
          ) : (
            <>
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t.blog?.title || `${brand} Knowledge Base & Tutorials`}</span>
            </>
          )}
        </div>
        <h1
          className="font-heading text-3xl sm:text-5xl font-bold text-[#2e2440] dark:text-white tracking-tight"
        >
          {archive ? fill(t.ui.blogsTitle, { lang: langName(archive.code, currentLang) }) : t.blog?.title}
        </h1>
        <p className="text-sm sm:text-base text-[#726c85] dark:text-[#b4adc5] max-w-2xl mx-auto leading-relaxed">
          {archive
            ? fill(publishedPosts.length === 1 ? t.blog.archiveOne : t.blog.archiveMany, { n: publishedPosts.length, lang: langName(archive.code, currentLang) })
            : t.blog?.subtitle}
        </p>
        {archive && (
          <PageLink href="/blog" onNavigate={navigateToBlogListing}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6d46b8] dark:text-[#d1b9f7] hover:underline cursor-pointer"
          >
            <span aria-hidden="true">🌐</span>
            <span>{t.blog?.allLanguages || 'All languages'}</span>
          </PageLink>
        )}

        {/* SEARCH BOX */}
        <div className="pt-4 max-w-md mx-auto">
          <div className="relative">
            <Search className={`w-4 h-4 text-[#a29cb2] absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.blog?.searchPlaceholder || 'Search tutorials, tips, or formats...'}
              className={`w-full ${isRtl ? 'pr-11 pl-4' : 'pl-11 pr-4'} py-3 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#1c152a] border border-[#eae3ee] dark:border-[#382b4f] rounded-2xl shadow-sm focus:border-[#7c4fd1] focus:ring-3 focus:ring-[#7c4fd1]/15 outline-hidden transition-all`}
            />
          </div>
        </div>
      </section>

      {/* LANGUAGE + CATEGORY FILTERS */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 w-full mb-8 space-y-3">
        {/* Language picker. Choosing a language moves to that language's own
            archive URL rather than filtering in place, so each language keeps
            exactly one canonical page and search engines see no duplicates. */}
        <div className="flex items-center justify-center sm:justify-start gap-2">
          <label
            htmlFor="blog-language-filter"
            className="text-xs font-bold text-[#726c85] dark:text-[#b4adc5] whitespace-nowrap"
          >
            {t.blog?.languageLabel || 'Language'}
          </label>
          <LanguageFilterSelect
            options={availableLanguages.map((l) => ({ ...l, count: languageCounts[l.code] || 0 }))}
            value={archive ? archive.code : showAll ? null : (filterLang as BlogLanguage)}
            totalCount={totalPublished}
            allLabel={t.blog?.allLanguages || 'All Languages'}
            onChange={(code) => (code ? navigateToBlogLanguage(code) : chooseAllLanguages())}
          />
          {months.length > 1 && (
            <select
              aria-label={t.blog?.monthLabel || 'Month'}
              value={selectedMonth}
              onChange={(e) => chooseMonth(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#1c152a] text-[#4b2e83] dark:text-[#d1b9f7] border border-[#eae3ee] dark:border-[#382b4f] cursor-pointer"
            >
              <option value="">{t.blog?.allMonths || 'All Months'}</option>
              {months.map((m) => (
                <option key={m.key} value={m.key}>
                  {monthLabel(m.key, currentLang)} ({m.count})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center justify-center sm:justify-start gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => chooseCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-gradient-to-r from-[#6d46b8] to-[#e6799f] text-white shadow-md shadow-[#7c4fd1]/20'
                  : 'bg-white dark:bg-[#1c152a] text-[#726c85] dark:text-[#b4adc5] hover:text-[#4b2e83] dark:hover:text-white hover:bg-[#f1e9fb] dark:hover:bg-[#261b3b] border border-[#eae3ee] dark:border-[#382b4f]'
              }`}
            >
              {cat === 'All' ? (t.blog?.allCategories || 'All') : getLocalizedCategory(cat, currentLang)}
            </button>
          ))}
        </div>
      </section>

      {/* PUBLISHED POSTS GRID */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 w-full flex-1 mb-16">
        {showFallbackNotice && (
          <p className="mb-6 text-center text-xs sm:text-sm font-semibold text-[#6d46b8] dark:text-[#d1b9f7] bg-[#f1e9fb] dark:bg-[#261b3b] rounded-xl px-4 py-2.5">
            {fill(t.blog.fallbackNotice, { lang: langName(currentLang, currentLang) })}
          </p>
        )}
        {publishedPosts.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#1c152a] rounded-[24px] border border-[#e6799f]/15 p-8">
            <BookOpen className="w-10 h-10 text-[#a29cb2] mx-auto mb-3 opacity-50" />
            <h3
              className="font-heading font-bold text-xl text-[#2e2440] dark:text-white"
            >
              {archive && !searchQuery && !selectedMonth && selectedCategory === 'All'
                ? t.blog.emptyLang
                : t.blog?.noPostsFound}
            </h3>
            <p className="text-xs text-[#726c85] dark:text-[#b4adc5] mt-1">
              {archive && !searchQuery && !selectedMonth && selectedCategory === 'All'
                ? t.blog.emptyLangHint
                : t.blog?.tryDifferentSearch}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {pagedPosts.map((post) => (
              <article
                key={post.id}
                className="relative bg-white dark:bg-[#1c152a] rounded-[22px] overflow-hidden shadow-[0_10px_30px_rgba(140,80,120,0.08)] border border-[#e6799f]/10 dark:border-[#382b4f] flex flex-col group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
              >
                {/* Image */}
                <div className="relative h-48 w-full bg-[#f1e9fb] dark:bg-[#261b3b] overflow-hidden">
                  <img
                    src={post.coverImage || BLOG_COVER_FALLBACK}
                    alt={post.coverImageAlt || post.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-white/95 dark:bg-[#1c152a]/95 text-[#4b2e83] dark:text-[#d1b9f7] shadow-xs">
                      {getLocalizedCategory(post.category, currentLang)}
                    </span>
                  </div>
                </div>

                {/* Body — written in the post's own language, so it carries its
                    own direction regardless of the interface language. */}
                <div
                  dir={blogLanguageInfo(post.language).dir}
                  lang={blogLanguageInfo(post.language).code}
                  className="p-6 flex-1 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs text-[#6b6480] dark:text-[#a29cb2] mb-2.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {uiDate(post.publishedAt, currentLang)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {readTimeLabel(post.readTime, t)}
                      </span>
                    </div>

                    <h2 className="font-heading font-bold text-lg text-[#2e2440] dark:text-white leading-snug group-hover:text-[#6d46b8] dark:group-hover:text-[#d1b9f7] transition-colors line-clamp-2 mb-2">
                      <PostLink slug={post.slug} className={STRETCHED_LINK}>
                        {post.title}
                      </PostLink>
                    </h2>

                    <p className="text-xs sm:text-sm text-[#726c85] dark:text-[#b4adc5] line-clamp-3 leading-relaxed">
                      {post.excerpt}
                    </p>
                  </div>

                  <div className="pt-4 mt-6 border-t border-[#f1e9fb] dark:border-[#2f2244] flex items-center justify-between text-xs font-bold text-[#6d46b8] dark:text-[#d1b9f7]">
                    <div className="flex items-center gap-2">
                      {(post.authorAvatar || adminUser?.avatar) && (
                        <img
                          src={post.authorAvatar || adminUser?.avatar}
                          alt={post.authorName || adminUser?.name}
                    loading="lazy"
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      )}
                      <span className="text-[#2e2440] dark:text-slate-200 text-xs font-semibold">{authorLabel(post.authorName || adminUser?.name, t)}</span>
                    </div>
                    <span className="flex items-center gap-1 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform text-[#c2416b] dark:text-[#e6799f]">
                      <span>{t.blog?.readArticle || 'Read Article'}</span>
                      <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav aria-label={t.blog.pages} className="flex items-center justify-center gap-2 mt-10 flex-wrap">
            <button
              onClick={() => setPage((n) => Math.max(1, n - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-[#e6799f]/30 dark:border-[#382b4f] text-[#2e2440] dark:text-slate-200 bg-white dark:bg-[#1c152a] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {t.blog.previous}
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                aria-current={n === page ? 'page' : undefined}
                className={`w-9 h-9 text-xs font-bold rounded-xl border cursor-pointer transition-colors ${
                  n === page
                    ? 'bg-gradient-to-r from-[#6d46b8] to-[#e6799f] text-white border-transparent'
                    : 'bg-white dark:bg-[#1c152a] text-[#2e2440] dark:text-slate-200 border-[#e6799f]/30 dark:border-[#382b4f] hover:border-[#6d46b8]'
                }`}
              >
                {n}
              </button>
            ))}

            <button
              onClick={() => setPage((n) => Math.min(totalPages, n + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-[#e6799f]/30 dark:border-[#382b4f] text-[#2e2440] dark:text-slate-200 bg-white dark:bg-[#1c152a] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {t.blog.next}
            </button>
          </nav>
        )}
      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  );
};
