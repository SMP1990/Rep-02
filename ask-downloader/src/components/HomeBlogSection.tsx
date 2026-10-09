import React, { useState, useMemo } from 'react';
import { authorLabel } from '../utils/i18n.ts';
import { motion } from 'motion/react';
import { useAdmin } from '../context/AdminContext';
import { useLanguage } from '../context/LanguageContext';
import { BlogPost } from '../types/admin';
import { getLocalizedCategory } from '../translations/blogPostsTranslations';
import { normalizeBlogLanguage } from '../config/blogLanguages.ts';
import { blogLanguageInfo } from '../config/blogLanguages.ts';
import { applyBrand } from '../config/brand.ts';
import { RouteLink, PostLink, STRETCHED_LINK } from './PageLink';
import { 
  Activity, 
  Calendar, 
  ArrowRight, 
  Sparkles,
  Edit3,
  Pause,
  Play
} from 'lucide-react';

// Category badge color styling
const getCategoryBadgeStyle = (category: string) => {
  const cat = category?.toLowerCase() || '';
  if (cat.includes('travel')) return 'bg-[#c2410c] text-white';
  if (cat.includes('gaming')) return 'bg-[#0b5ed7] text-white';
  if (cat.includes('fashion')) return 'bg-[#c2185b] text-white';
  if (cat.includes('politic') || cat.includes('news')) return 'bg-[#c62828] text-white';
  if (cat.includes('tech') || cat.includes('format')) return 'bg-[#0e7490] text-white';
  if (cat.includes('sport')) return 'bg-[#ad1457] text-white';
  if (cat.includes('food') || cat.includes('cook')) return 'bg-[#b45309] text-white';
  if (cat.includes('guide')) return 'bg-[#6d46b8] text-white';
  if (cat.includes('tip')) return 'bg-[#047857] text-white';
  return 'bg-[#6d46b8] text-white';
};

// Fallback high-res cover images
const getPostImage = (post: BlogPost, fallbackIndex: number) => {
  if (post.coverImage && post.coverImage.trim().length > 0) {
    return post.coverImage;
  }
  const defaults = [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80',
  ];
  return defaults[fallbackIndex % defaults.length];
};

const formatDate = (dateStr?: string, lang = 'en') => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(lang, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export const HomeBlogSection: React.FC = () => {
  const { 
    blogPosts, 
    setCurrentRoute, 
    isAuthenticated,
    adminUser 
  } = useAdmin();
  const { t, brand, currentLang } = useLanguage();

  const [isPaused, setIsPaused] = useState(false);

  // Posts are shown exactly as written. The header language switcher changes
  // the interface around them, never the articles themselves. The one
  // substitution is `{brand}`, which an author writes so the site can be
  // renamed in Settings without editing every article.
  // The ticker follows the header language: an Urdu reader sees the Urdu
  // posts. If that language has no posts yet, English ones fill in.
  const publishedPosts = useMemo(() => {
    const live = blogPosts.map(p => applyBrand(p, brand)).filter(p => p.status === 'published');
    const inLang = (code: string) => live.filter(p => normalizeBlogLanguage(p.language) === code);
    const mine = inLang(currentLang);
    return mine.length ? mine : inLang('en').length ? inLang('en') : live;
  }, [blogPosts, brand, currentLang]);
  const activePosts = publishedPosts.length > 0 ? publishedPosts : blogPosts;

  // The ticker shows the newest posts, not the whole blog. Without a cap it
  // grew with the archive — once the multilingual posts landed it was
  // rendering 120 cards, which is both heavy and, on a fixed-length
  // animation, extremely fast.
  const MARQUEE_MAX = 12;
  let marqueeBaseList = activePosts.slice(0, MARQUEE_MAX);
  while (marqueeBaseList.length && marqueeBaseList.length < 6) {
    marqueeBaseList = [...marqueeBaseList, ...marqueeBaseList].slice(0, MARQUEE_MAX);
  }
  // Double it for smooth -50% CSS keyframe loop
  const infiniteMarqueeList = [...marqueeBaseList, ...marqueeBaseList];

  // Speed is set per card rather than per loop, so the ticker always drifts at
  // the same readable pace no matter how many cards are in it.
  const SECONDS_PER_CARD = 6;
  const marqueeDuration = Math.max(24, marqueeBaseList.length * SECONDS_PER_CARD);

  // "Hot" means popular relative to this blog, not a magic number: the top
  // third of the ticker by views earns the beacon.
  const hotThreshold = useMemo(() => {
    const views = marqueeBaseList.map((p) => p.views || 0).sort((a, b) => b - a);
    if (views.length < 3) return Infinity;
    return views[Math.max(0, Math.floor(views.length / 3) - 1)] || Infinity;
  }, [marqueeBaseList]);

  // Find priority featured post for bottom left
  const featuredPost = activePosts.find(p => 
    p.category.toLowerCase().includes('politic') || 
    p.id === 'post_politics' || 
    p.views > 400
  ) || activePosts[0];

  // Remaining list for side stacked cards
  const remainingForSide = activePosts.filter(p => p.id !== featuredPost?.id);
  const sidePosts = remainingForSide.slice(0, 3);

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 transition-colors">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5 pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#6d46b8] dark:text-[#d1b9f7] bg-[#f1e9fb] dark:bg-[#261b3b] px-2.5 py-0.5 rounded-full mb-1.5">
            {/* Live pulse — the small red beacon news tickers use to say
                "this is current". Purely decorative, so it is hidden from
                screen readers and stops moving under reduced-motion. */}
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.9)]" />
            </span>
            <Sparkles className="w-3 h-3 text-[#e6799f]" />
            <span>{t.homeBlog?.badge || 'Latest Articles & Guides'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight font-heading">
            {t.homeBlog?.title || 'Trending Stories & Media Tips'}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 max-w-lg">
            {t.homeBlog?.subtitle || 'Stay updated with social video archiving tips, creator tutorials, and trending industry news.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Pause / Play button for marquee control */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-[#231838] dark:hover:bg-[#2d1e47] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title={isPaused ? (t.homeBlog?.resumeTooltip || "Resume auto-scroll") : (t.homeBlog?.pauseTooltip || "Pause auto-scroll")}
          >
            {isPaused ? <Play className="w-3 h-3 text-emerald-500" /> : <Pause className="w-3 h-3 text-amber-500" />}
            <span className="hidden sm:inline text-[11px]">{isPaused ? (t.homeBlog?.play || "Play") : (t.homeBlog?.pause || "Pause")}</span>
          </button>

          {isAuthenticated && (
            <button
              onClick={() => setCurrentRoute('blog-manager')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#f1e9fb] dark:bg-[#261b3b] text-[#6d46b8] dark:text-[#d1b9f7] border border-[#a78bda]/30 hover:bg-[#e4d6f8] transition-all cursor-pointer shadow-2xs"
              title={t.homeBlog.manage}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{t.homeBlog?.adminBlog || 'Admin Blog'}</span>
            </button>
          )}

          <RouteLink route="public-blog"
            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-[#181224] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-[#2e1d4d] hover:border-[#6d46b8] dark:hover:border-[#e6799f] hover:text-[#6d46b8] dark:hover:text-[#e6799f] shadow-2xs transition-all cursor-pointer"
          >
            <span>{t.homeBlog?.viewAll || 'View All'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </RouteLink>
        </div>
      </div>

      {/* 2. TOP ROW: Infinite Continuous Marquee Rail (Right to Left at slow speed) */}
      <div className="relative overflow-hidden mb-6 py-1 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 group/marquee">
        {/* Soft edge fade masks for high-end look */}
        <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-[#f6f0f4] dark:from-[#0e0a17] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-[#f6f0f4] dark:from-[#0e0a17] to-transparent z-10 pointer-events-none" />

        {/* Marquee Track */}
        <div
          className="flex items-center gap-3 sm:gap-4 animate-marquee-slow"
          style={{
            animationPlayState: isPaused ? 'paused' : 'running',
            animationDuration: `${marqueeDuration}s`,
          }}
        >
          {infiniteMarqueeList.map((post, idx) => (
            <article
              key={`${post.id}-${idx}`}
              aria-hidden={idx >= marqueeBaseList.length || undefined}
              className="relative shrink-0 w-[245px] sm:w-[275px] md:w-[290px] bg-white dark:bg-[#181224] rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 dark:border-[#2e1d4d] shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer flex items-center gap-2.5 sm:gap-3 select-none"
            >
              {/* Compact Thumbnail */}
              <div className="relative w-14 sm:w-16 h-14 sm:h-16 rounded-lg sm:rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800">
                <img
                  src={getPostImage(post, idx)}
                  alt={post.coverImageAlt || post.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>
              {/* Only the genuinely popular posts get the beacon — put it on
                  every card and it stops meaning anything. */}
              {(post.views || 0) >= hotThreshold && (
                <span
                  className="absolute top-1.5 left-1.5 z-10 flex h-2.5 w-2.5"
                  title={t.homeBlog?.trendingNow || 'Trending now'}
                  aria-hidden="true"
                >
                  <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#181224] shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
                </span>
              )}

              {/* Title & Stats */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide leading-none ${getCategoryBadgeStyle(post.category)}`}>
                    {getLocalizedCategory(post.category, currentLang)}
                  </span>
                  <h3
                    dir={blogLanguageInfo(post.language).dir}
                    lang={blogLanguageInfo(post.language).code}
                    className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight hover:text-[#6d46b8] dark:hover:text-[#e6799f] transition-colors mt-1">
                    <PostLink
                      slug={post.slug}
                      className={STRETCHED_LINK}
                      tabIndex={idx >= marqueeBaseList.length ? -1 : undefined}
                    >
                      {post.title}
                    </PostLink>
                  </h3>
                </div>

                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1 font-medium">
                  <span className="truncate">{t.homeBlog.by} {authorLabel(post.authorName || adminUser?.name, t)}</span>
                  <span className="inline-flex items-center gap-0.5 text-slate-500 dark:text-slate-400 shrink-0">
                    <Activity className="w-2.5 h-2.5 text-[#6d46b8] dark:text-[#e6799f]" />
                    <span>{post.views || 150}</span>
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* 3. BOTTOM ROW: Featured Hero Card (Left) + Compact Stacked Cards (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Left Column: Featured Hero Card */}
        {featuredPost && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-7 xl:col-span-7 relative rounded-2xl overflow-hidden group cursor-pointer h-[260px] sm:h-[300px] lg:h-[320px] border border-slate-200/80 dark:border-[#2e1d4d] shadow-2xs hover:shadow-lg transition-all duration-300 flex flex-col justify-end"
          >
            {/* Cover Image */}
            <img
              src={getPostImage(featuredPost, 3)}
              alt={featuredPost.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-104 transition-transform duration-500 ease-out"
              loading="lazy"
              referrerPolicy="no-referrer"
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent transition-opacity duration-300" />

            {/* Content at Bottom */}
            <div className="z-10 p-4 sm:p-6">
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide mb-2 shadow-xs ${getCategoryBadgeStyle(featuredPost.category)}`}>
                {getLocalizedCategory(featuredPost.category, currentLang)}
              </span>

              <h3
                dir={blogLanguageInfo(featuredPost.language).dir}
                lang={blogLanguageInfo(featuredPost.language).code}
                className="text-base sm:text-xl font-bold font-heading text-white leading-snug mb-2 group-hover:text-pink-100 transition-colors line-clamp-2 sm:line-clamp-3">
                <PostLink slug={featuredPost.slug} className={STRETCHED_LINK}>
                  {featuredPost.title}
                </PostLink>
              </h3>

              <div className="text-[11px] text-slate-200/90 flex flex-wrap items-center gap-3 font-medium">
                <span>{t.homeBlog.by} {authorLabel(featuredPost.authorName || adminUser?.name, t)}</span>
                <span className="inline-flex items-center gap-1 text-slate-300">
                  <Activity className="w-3 h-3 text-[#e6799f]" />
                  <span>{featuredPost.views || 417} {t.homeBlog.views}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-slate-300">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>{formatDate(featuredPost.publishedAt, currentLang)}</span>
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Right Column: 3 Compact Stacked Cards */}
        <div className="lg:col-span-5 xl:col-span-5 flex flex-col justify-between gap-2.5 sm:gap-3">
          {sidePosts.map((post, idx) => (
            <motion.article
              key={post.id || idx}
              initial={{ opacity: 0, x: 12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.08, duration: 0.35 }}
              whileHover={{ x: 2 }}
              className="relative group bg-white dark:bg-[#181224] rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 dark:border-[#2e1d4d] shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex items-center gap-3 flex-1"
            >
              {/* Thumbnail */}
              <div className="relative w-16 sm:w-18 h-15 sm:h-16 rounded-lg sm:rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800">
                <img
                  src={getPostImage(post, idx + 4)}
                  alt={post.coverImageAlt || post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide leading-none ${getCategoryBadgeStyle(post.category)}`}>
                    {getLocalizedCategory(post.category, currentLang)}
                  </span>
                  <h3
                    dir={blogLanguageInfo(post.language).dir}
                    lang={blogLanguageInfo(post.language).code}
                    className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight group-hover:text-[#6d46b8] dark:group-hover:text-[#e6799f] transition-colors mt-1">
                    <PostLink slug={post.slug} className={STRETCHED_LINK}>
                      {post.title}
                    </PostLink>
                  </h3>
                </div>

                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1 font-medium">
                  <span className="truncate">{t.homeBlog.by} {authorLabel(post.authorName || adminUser?.name, t)}</span>
                  <span className="inline-flex items-center gap-0.5 text-slate-500 dark:text-slate-400 shrink-0">
                    <Activity className="w-2.5 h-2.5 text-[#6d46b8] dark:text-[#e6799f]" />
                    <span>{post.views || 120}</span>
                  </span>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};
