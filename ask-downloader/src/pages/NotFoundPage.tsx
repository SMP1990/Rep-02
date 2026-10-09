import React, { useMemo } from 'react';
import { Home, BookOpen, Mail, ArrowRight, SearchX, FileQuestion } from 'lucide-react';
import { Header } from '../components/Header.tsx';
import { Footer } from '../components/Footer.tsx';
import { Seo } from '../components/Seo.tsx';
import { RouteLink, PostLink, STRETCHED_LINK } from '../components/PageLink';
import { useAdmin } from '../context/AdminContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { applyBrand } from '../config/brand.ts';
import { blogLanguageInfo, normalizeBlogLanguage } from '../config/blogLanguages.ts';

/**
 * Shown for any address that is not a page on this site, and for a blog
 * post that doesn't exist (or is a draft the visitor can't see).
 *
 * The server answers these with a real 404 status and `noindex`, so search
 * engines drop the address instead of indexing it as a copy of another page.
 * For a person it is a way back in: the main pages and the newest guides are
 * one click away, so a broken link doesn't end the visit.
 */
export const NotFoundPage: React.FC<{ variant?: 'page' | 'post' }> = ({ variant = 'page' }) => {
  const { siteSettings, blogPosts } = useAdmin();
  const { t, currentLang, brand } = useLanguage();
  const nf = t.notFound || {};
  const isPost = variant === 'post';

  // The newest published guides, in the visitor's interface language when
  // there are enough of them, otherwise from the whole blog.
  const latest = useMemo(() => {
    const published = blogPosts.filter((p) => p.status === 'published').map((p) => applyBrand(p, brand));
    const inLang = published.filter((p) => normalizeBlogLanguage(p.language) === currentLang);
    return (inLang.length >= 3 ? inLang : published).slice(0, 4);
  }, [blogPosts, currentLang, brand]);

  const Icon = isPost ? FileQuestion : SearchX;

  return (
    <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] text-[#2e2440] dark:text-[#f4eefb] flex flex-col transition-colors duration-200">
      <Seo
        title={`${nf.title} - ${siteSettings.siteName}`}
        description={nf.body}
        path={typeof window !== 'undefined' ? window.location.pathname : '/'}
        noindex
      />
      <Header />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <section className="text-center space-y-5">
          <div className="relative mx-auto w-fit">
            <p
              aria-hidden="true"
              className="font-heading font-extrabold leading-none tracking-tight text-[88px] sm:text-[128px] bg-gradient-to-br from-[#4b2e83] via-[#6d46b8] to-[#e6799f] bg-clip-text text-transparent select-none"
            >
              404
            </p>
            <span className="absolute -top-2 -end-6 sm:-end-8 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] shadow-md flex items-center justify-center rotate-12">
              <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-[#6d46b8] dark:text-[#d1b9f7]" />
            </span>
          </div>

          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-[#f1e9fb] dark:bg-[#261b3b] text-[#6d46b8] dark:text-[#d1b9f7] border border-[#a78bda]/30">
            {nf.badge}
          </span>

          <h1 className="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight">
            {isPost ? nf.postHeading : nf.heading}
          </h1>
          <p className="max-w-xl mx-auto text-sm sm:text-base text-[#635373] dark:text-[#b8a9cc] leading-relaxed">
            {isPost ? nf.postBody : nf.body}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <RouteLink
              route="home"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#4b2e83] via-[#6d46b8] to-[#e6799f] shadow-md shadow-[#6d46b8]/20 hover:opacity-95 transition-opacity"
            >
              <Home className="w-4 h-4" />
              {nf.homeBtn}
            </RouteLink>
            <RouteLink
              route="public-blog"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-white dark:bg-[#181224] text-[#4b2e83] dark:text-[#d1b9f7] border border-[#eae3ee] dark:border-[#2e1d4d] hover:border-[#6d46b8] transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              {nf.blogBtn}
            </RouteLink>
            <RouteLink
              route="contact"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#635373] dark:text-[#b8a9cc] hover:text-[#6d46b8] dark:hover:text-[#d1b9f7] transition-colors"
            >
              <Mail className="w-4 h-4" />
              {nf.contactBtn}
            </RouteLink>
          </div>
        </section>

        {latest.length > 0 && (
          <section className="mt-14 sm:mt-16" aria-labelledby="nf-latest">
            <h2 id="nf-latest" className="text-sm font-extrabold uppercase tracking-wider text-[#726c85] dark:text-[#b5a9cd] mb-4 text-center">
              {nf.latestTitle}
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {latest.map((post) => {
                const info = blogLanguageInfo(post.language);
                return (
                  <li
                    key={post.id}
                    className="relative group bg-white dark:bg-[#181224] rounded-2xl p-4 border border-[#eae3ee] dark:border-[#2e1d4d] shadow-2xs hover:shadow-md hover:border-[#a78bda] transition-all flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0" dir={info.dir} lang={info.code}>
                      <h3 className="text-sm font-bold leading-snug line-clamp-2 group-hover:text-[#6d46b8] dark:group-hover:text-[#d1b9f7] transition-colors">
                        <PostLink slug={post.slug} className={STRETCHED_LINK}>
                          {post.title}
                        </PostLink>
                      </h3>
                      <p className="mt-1 text-xs text-[#726c85] dark:text-[#b5a9cd] line-clamp-1">{post.excerpt}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 shrink-0 text-[#a78bda] rtl:rotate-180 group-hover:translate-x-0.5 transition-transform" />
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

/** Placeholder while the post list is still on its way from the server. */
export const PostLoadingPage: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-10" aria-busy="true">
        <div className="flex items-center gap-3 text-sm font-semibold text-[#726c85] dark:text-[#b5a9cd]">
          <span className="w-5 h-5 rounded-full border-2 border-[#6d46b8] border-t-transparent animate-spin" />
          {t.notFound?.loading}
        </div>
      </main>
      <Footer />
    </div>
  );
};
