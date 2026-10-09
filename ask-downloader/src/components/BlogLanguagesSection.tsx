import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Globe } from 'lucide-react';
import { useAdmin } from '../context/AdminContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { fill, langName } from '../utils/i18n.ts';
import { FlagIcon } from './FlagIcon.tsx';
import { BlogLanguageLink } from './PageLink';

// The cards keep their entrance and hover motion as real links.
const MotionBlogLanguageLink = motion.create(BlogLanguageLink);
import {
  BLOG_LANGUAGES,
  normalizeBlogLanguage,
  type BlogLanguage,
} from '../config/blogLanguages.ts';

/**
 * "Browse blogs by language" — one card per language that has published
 * articles, each opening that language's archive.
 *
 * Built on the same card system as the features section: same 3-column grid,
 * same rounded-2xl surface, same hover lift, so the page reads as one design
 * rather than a bolted-on widget.
 */
export const BlogLanguagesSection: React.FC = () => {
  const { blogPosts } = useAdmin();
  const { t, currentLang, currentLangInfo } = useLanguage();
  // Labels in the reader's language; the language's own name stays native,
  // as in every language picker.
  const blogsOf = (code: string) => fill(t.ui.blogsTitle, { lang: langName(code, currentLang) });
  const viewOf = (code: string) => fill(t.ui.viewBlogs, { lang: langName(code, currentLang) });

  const groups = useMemo(() => {
    const counts: Partial<Record<BlogLanguage, number>> = {};
    for (const p of blogPosts) {
      if (p.status !== 'published') continue;
      const code = normalizeBlogLanguage(p.language);
      counts[code] = (counts[code] || 0) + 1;
    }
    return BLOG_LANGUAGES
      .filter((l) => (counts[l.code] || 0) > 0)
      .map((l) => ({ ...l, count: counts[l.code] || 0 }));
  }, [blogPosts]);

  // One language is not a choice, so the section would be noise.
  if (groups.length < 2) return null;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 border-t border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#6d46b8] dark:text-[#d1b9f7] bg-[#f1e9fb] dark:bg-[#261b3b] px-3 py-1 rounded-full mb-3">
          <Globe className="w-3 h-3" />
          {t.blogLanguages?.badge || 'Multilingual'}
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {t.blogLanguages?.title || 'Browse blogs by language'}
        </h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2 max-w-xl mx-auto">
          {t.blogLanguages?.subtitle ||
            'Every guide is written by hand in its own language — not machine translated.'}
        </p>
      </div>

      {/* Flex-wrap rather than a fixed grid: with 4, 7 or 8 languages a rigid
          3-column grid strands the last card alone against the left edge.
          Centring the final row keeps any count looking deliberate. */}
      <div className="flex flex-wrap justify-center gap-6">
        {groups.map((l, index) => (
          <MotionBlogLanguageLink language={l.code}
            key={l.code}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: Math.min(index * 0.08, 0.4), duration: 0.45 }}
            whileHover={{ y: -6, scale: 1.02 }}
            aria-label={viewOf(l.code)}
            className="group text-left basis-full sm:basis-[calc(50%-0.75rem)] lg:basis-[calc(33.333%-1rem)] max-w-sm grow-0 bg-white dark:bg-[#181224] rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-xl hover:border-[#a78bda] dark:hover:border-[#6d46b8] transition-all duration-300 cursor-pointer flex flex-col"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              {/* A flag is 3:2, so it gets a 3:2 chip. Forcing one into the
                  square icon tile the features use crops the hoist side off —
                  Pakistan loses its white band, the UK loses its cross arms. */}
              <span className="w-16 h-[42px] rounded-lg overflow-hidden ring-1 ring-black/10 dark:ring-white/15 shadow-2xs shrink-0 group-hover:scale-110 group-hover:-rotate-2 transition-transform duration-300">
                <FlagIcon code={l.code} className="w-full h-full block" />
              </span>
              <span className="inline-flex items-baseline gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                <span className="text-sm font-extrabold text-slate-900 dark:text-white leading-none">
                  {l.count}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {l.count === 1
                    ? t.blogLanguages?.postSingular || 'post'
                    : t.blogLanguages?.postPlural || 'posts'}
                </span>
              </span>
            </div>

            {/* The language's own name stays native; the label is in the reader's language. */}
            <div className="min-w-0 mb-4">
              <h3 dir={l.dir} lang={l.code} className="text-base font-bold text-slate-900 dark:text-white mb-1 truncate group-hover:text-[#6d46b8] dark:group-hover:text-[#d1b9f7] transition-colors">
                {l.nativeName}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed truncate">
                {blogsOf(l.code)}
              </p>
            </div>

            <span
              className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800/80 inline-flex items-center gap-1.5 text-xs font-bold text-[#6d46b8] dark:text-[#d1b9f7] min-w-0"
            >
              <span className="truncate">{viewOf(l.code)}</span>
              <ArrowRight
                className={`w-3.5 h-3.5 shrink-0 transition-transform duration-300 ${
                  currentLangInfo?.dir === 'rtl'
                    ? 'rotate-180 group-hover:-translate-x-1'
                    : 'group-hover:translate-x-1'
                }`}
              />
            </span>
          </MotionBlogLanguageLink>
        ))}
      </div>
    </div>
  );
};
