import React from 'react';
import type { BlogPost } from '../types/admin';
import { PostLink, STRETCHED_LINK } from './PageLink';
import { getLocalizedCategory } from '../translations/blogPostsTranslations';
import { Link2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';

/** Shown when a post has no cover image. */
const FALLBACK =
  'data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 9%22%3E%3Crect width=%2216%22 height=%229%22 fill=%22%23e9dff7%22/%3E%3C/svg%3E';

interface Props {
  posts: BlogPost[];
  heading: string;
  dir?: 'ltr' | 'rtl';
  lang?: string;
}

/** "Related articles" cards under a post — real links, so Google follows them too. */
export const RelatedPosts: React.FC<Props> = ({ posts, heading, dir, lang }) => {
  const { currentLang } = useLanguage();
  if (!posts.length) return null;
  return (
    <section
      aria-labelledby="related-heading"
      className="bg-white dark:bg-[#181129] rounded-[24px] p-6 sm:p-8 shadow-[0_10px_35px_rgba(140,80,120,0.07)] border border-[#e6799f]/15 dark:border-white/10"
    >
      <h2 id="related-heading" className="flex items-center gap-2 font-heading font-extrabold text-lg sm:text-xl text-[#2e2440] dark:text-white mb-5">
        <Link2 className="w-5 h-5 text-[#6d46b8]" />
        {heading}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" dir={dir} lang={lang}>
        {posts.map((p) => (
          <article key={p.id} className="relative group rounded-2xl overflow-hidden border border-[#eae3ee] dark:border-white/10 bg-[#faf7fc] dark:bg-[#201538] hover:shadow-md transition-shadow">
            <div className="h-32 bg-[#f1e9fb] dark:bg-[#2a1b4d] overflow-hidden">
              <img
                src={p.coverImage || FALLBACK}
                alt={p.coverImageAlt || p.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-3.5">
              <span className="text-[10px] font-extrabold text-[#6d46b8] dark:text-[#a78bda] uppercase tracking-wider">
                {getLocalizedCategory(p.category, currentLang)}
              </span>
              <h3 className="mt-1 font-heading font-bold text-sm leading-snug text-[#2e2440] dark:text-white line-clamp-3 group-hover:text-[#6d46b8] dark:group-hover:text-[#a78bda] transition-colors">
                <PostLink slug={p.slug} className={STRETCHED_LINK}>{p.title}</PostLink>
              </h3>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
