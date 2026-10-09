import React, { useMemo } from 'react';
import { readTimeLabel } from '../utils/i18n.ts';
import { BlogPost, BlogCategory } from '../types/admin';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedCategory } from '../translations/blogPostsTranslations';
import { blogLanguageInfo } from '../config/blogLanguages.ts';
import { 
  Search,
  X,
  ChevronRight,
  AlertCircle,
  Tag,
  Clock,
  Maximize2,
  Minimize2,
  ExternalLink 
} from 'lucide-react';

export interface BlogSearchResultsProps {
  query: string;
  onQueryChange?: (query: string) => void;
  posts: BlogPost[];
  isOpen: boolean;
  onClose: () => void;
  onSelectPost: (slug: string) => void;
  mode?: 'dropdown' | 'modal';
  onToggleMode?: () => void;
  selectedCategory?: string;
  onSelectCategory?: (cat: string) => void;
  categories?: BlogCategory[];
  onViewAll?: () => void;
  className?: string;
}

export const BlogSearchResults: React.FC<BlogSearchResultsProps> = ({
  query,
  onQueryChange,
  posts,
  isOpen,
  onClose,
  onSelectPost,
  mode = 'dropdown',
  onToggleMode,
  selectedCategory = 'All',
  onSelectCategory,
  categories = [],
  onViewAll,
  className = ''
}) => {
  const { t, currentLang } = useLanguage();

  // Filter posts strictly by Title or Category
  const filteredPosts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((post) => {
      // Only search published articles for public readers
      if (post.status !== 'published') return false;

      // Category chip filter (if selected)
      if (selectedCategory && selectedCategory !== 'All') {
        if (post.category.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // If no query string, show results matching selected category
      if (!q) return true;

      // Check title and category match
      const titleMatch = post.title.toLowerCase().includes(q);
      const categoryMatch = post.category.toLowerCase().includes(q);

      return titleMatch || categoryMatch;
    });
  }, [posts, query, selectedCategory]);

  // Helper to highlight matching text in title
  const highlightMatch = (text: string, search: string) => {
    if (!search.trim()) return text;
    const parts = text.split(new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === search.toLowerCase() ? (
            <mark
              key={i}
              className="bg-amber-200 dark:bg-amber-400/30 text-[#4b2e83] dark:text-amber-200 font-extrabold px-0.5 rounded-sm"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  if (!isOpen) return null;

  // Render Inner Content used by both Dropdown and Modal
  const resultsContent = (
    <div className="flex flex-col h-full max-h-[75vh]">
      {/* Category Pills Bar (Filtering by Category) */}
      {categories.length > 0 && (
        <div className="px-4 py-2.5 bg-[#f6f0f4] dark:bg-[#150e24] border-b border-[#eae3ee] dark:border-white/10 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#726c85] dark:text-[#a29cb2] mr-1 flex items-center gap-1">
            <Tag className="w-3 h-3 text-[#6d46b8]" />
            <span>{t.blogPost?.categories || 'Category:'}</span>
          </span>
          <button
            type="button"
            onClick={() => onSelectCategory && onSelectCategory('All')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
              selectedCategory === 'All'
                ? 'bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] text-white shadow-xs'
                : 'bg-white dark:bg-[#201538] text-[#726c85] dark:text-[#c4bed3] hover:text-[#4b2e83] border border-[#eae3ee] dark:border-white/10'
            }`}
          >
            {t.blog?.allCategories || 'All'}
          </button>
          {categories.map((cat) => {
            const isSelected = selectedCategory?.toLowerCase() === cat.name.toLowerCase();
            return (
              <button
                type="button"
                key={cat.id || cat.name}
                onClick={() => onSelectCategory && onSelectCategory(cat.name)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] text-white shadow-xs'
                    : 'bg-white dark:bg-[#201538] text-[#726c85] dark:text-[#c4bed3] hover:text-[#4b2e83] border border-[#eae3ee] dark:border-white/10'
                }`}
              >
                {getLocalizedCategory(cat.name, currentLang)}
              </button>
            );
          })}
        </div>
      )}

      {/* Results Header Info Bar */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-[#eae3ee] dark:border-white/5 text-[11px] font-bold text-[#726c85] dark:text-[#a29cb2] bg-[#fbf9fc] dark:bg-[#1a122e]">
        <div className="flex items-center gap-2">
          <span>
            {query.trim() ? (
              <>
                Matching articles for <span className="text-[#6d46b8] dark:text-[#a78bda]">"{query}"</span>
              </>
            ) : (
              'All published articles'
            )}
          </span>
          <span className="px-1.5 py-0.5 rounded-full bg-[#eae3ee] dark:bg-white/10 text-[10px] font-extrabold text-[#4b2e83] dark:text-[#f1e9fb]">
            {filteredPosts.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onToggleMode && (
            <button
              type="button"
              onClick={onToggleMode}
              className="hover:text-[#4b2e83] dark:hover:text-white p-1 rounded transition-colors flex items-center gap-1 cursor-pointer"
              title={mode === 'dropdown' ? 'Expand to modal' : 'Switch to dropdown'}
            >
              {mode === 'dropdown' ? (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[10px]">Expand</span>
                </>
              ) : (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[10px]">Compact</span>
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="hover:text-red-500 p-1 rounded transition-colors cursor-pointer"
            title={t.ui.closeResults}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable Results List */}
      <div className="p-3 overflow-y-auto flex-1 space-y-2">
        {filteredPosts.length === 0 ? (
          <div className="py-8 text-center px-4">
            <AlertCircle className="w-9 h-9 text-amber-500/80 mx-auto mb-2" />
            <h4 className="font-heading font-bold text-sm text-[#2e2440] dark:text-white">
              {t.blog?.noPostsFound || 'No matching articles found'}
            </h4>
            <p className="text-xs text-[#726c85] dark:text-[#a29cb2] mt-1 max-w-sm mx-auto">
              {t.blog?.tryDifferentSearch || 'No articles match your search. Try checking for typos or clear category filters.'}
            </p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <div
              key={post.id}
              onClick={() => {
                onClose();
                onSelectPost(post.slug);
              }}
              className="p-3 rounded-xl bg-[#f6f0f4]/80 dark:bg-[#201538] hover:bg-[#ede3f7] dark:hover:bg-[#2d1b4e] border border-[#eae3ee] dark:border-white/5 flex items-center gap-3 cursor-pointer transition-all group"
            >
              {/* Cover Image Thumbnail */}
              <div className="w-14 h-12 sm:w-16 sm:h-14 rounded-lg overflow-hidden shrink-0 bg-[#e7ddf3] dark:bg-[#150e24]">
                <img
                  src={post.coverImage}
                  alt={post.coverImageAlt || post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>

              {/* Title & Metadata */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-white dark:bg-[#150e24] text-[#6d46b8] dark:text-[#a78bda] border border-[#eae3ee] dark:border-white/10 shadow-2xs">
                    {highlightMatch(getLocalizedCategory(post.category, currentLang), query)}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#f6f0f4] dark:bg-[#201538] text-[#726c85] dark:text-[#b5a9cd] shrink-0"
                    title={`Written in ${blogLanguageInfo(post.language).name}`}
                  >
                    {blogLanguageInfo(post.language).flag}
                  </span>
                  <span className="text-[10px] text-[#a29cb2]">&bull;</span>
                  <span className="text-[10px] text-[#a29cb2] flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {readTimeLabel(post.readTime, t)}
                  </span>
                </div>

                <h4 className="font-heading font-bold text-xs sm:text-sm text-[#2e2440] dark:text-white group-hover:text-[#6d46b8] dark:group-hover:text-[#a78bda] transition-colors line-clamp-1 leading-snug">
                  {highlightMatch(post.title, query)}
                </h4>

                <p className="text-[11px] text-[#726c85] dark:text-[#a29cb2] line-clamp-1 mt-0.5">
                  {post.excerpt}
                </p>
              </div>

              {/* Arrow Icon */}
              <div className="w-7 h-7 rounded-lg bg-white dark:bg-[#150e24] border border-[#eae3ee] dark:border-white/10 flex items-center justify-center text-[#a29cb2] group-hover:text-[#6d46b8] dark:group-hover:text-[#a78bda] shrink-0 transition-colors">
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Results Footer */}
      <div className="p-3 bg-[#f6f0f4] dark:bg-[#150e24] border-t border-[#eae3ee] dark:border-white/10 flex items-center justify-between text-xs text-[#726c85] dark:text-[#a29cb2] px-4 shrink-0">
        <span className="text-[11px]">
          Press <kbd className="px-1.5 py-0.5 font-mono text-[9px] bg-white dark:bg-[#201538] rounded border border-[#eae3ee] dark:border-white/10">Esc</kbd> to close
        </span>
        {onViewAll && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onViewAll();
            }}
            className="font-bold text-[#6d46b8] dark:text-[#a78bda] hover:underline cursor-pointer flex items-center gap-1 text-[11px]"
          >
            <span>{t.blog?.allCategories || 'All Articles Directory'}</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );

  // 1. DROPDOWN MODE (Anchored floating box)
  if (mode === 'dropdown') {
    return (
      <div
        id="blog-search-dropdown"
        className={`absolute right-0 top-full mt-2 w-80 sm:w-96 md:w-[450px] bg-white dark:bg-[#181129] rounded-2xl shadow-2xl border border-[#eae3ee] dark:border-white/10 overflow-hidden z-50 animate-fade-in ${className}`}
      >
        {resultsContent}
      </div>
    );
  }

  // 2. MODAL MODE (Centered backdrop overlay)
  return (
    <div
      id="blog-search-modal"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl bg-white dark:bg-[#181129] rounded-[24px] shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden z-50 flex flex-col ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Search Bar Header */}
        <div className="p-4 sm:p-5 border-b border-[#eae3ee] dark:border-white/10 flex items-center gap-3 bg-[#fbf9fc] dark:bg-[#1f1535]">
          <div className="w-9 h-9 rounded-xl bg-[#f1e9fb] dark:bg-[#2d1b4e] text-[#6d46b8] dark:text-[#a78bda] flex items-center justify-center shrink-0">
            <Search className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0">
            {onQueryChange ? (
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder={t.ui.searchArticlesPh}
                className="w-full bg-transparent text-sm sm:text-base font-semibold text-[#2e2440] dark:text-white placeholder-[#a29cb2] outline-hidden"
              />
            ) : (
              <>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6d46b8] dark:text-[#a78bda] block">
                  {t.ui.searchByTitle}
                </span>
                <span className="text-sm font-bold text-[#2e2440] dark:text-white truncate block">
                  {query ? `"${query}"` : 'Type in the header input to search'}
                </span>
              </>
            )}
          </div>

          {onQueryChange && query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              className="p-1 text-[#a29cb2] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white dark:hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#a29cb2] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white dark:hover:text-white rounded-lg transition-colors cursor-pointer ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {resultsContent}
      </div>
    </div>
  );
};
