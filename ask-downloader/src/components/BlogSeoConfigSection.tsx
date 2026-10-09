import React, { useState, useMemo } from 'react';
import { useAdmin } from '../context/AdminContext';
import { 
  Search,
  Globe,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Tag,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Monitor,
  Link as LinkIcon 
} from 'lucide-react';

interface BlogSeoConfigSectionProps {
  metaTitle: string;
  onMetaTitleChange: (val: string) => void;
  metaDescription: string;
  onMetaDescriptionChange: (val: string) => void;
  metaKeywords: string[];
  onMetaKeywordsChange: (keywords: string[]) => void;
  canonicalUrl: string;
  onCanonicalUrlChange: (val: string) => void;
  postTitle: string;
  postExcerpt: string;
  postSlug: string;
  postCategory: string;
}

export const BlogSeoConfigSection: React.FC<BlogSeoConfigSectionProps> = ({
  metaTitle,
  onMetaTitleChange,
  metaDescription,
  onMetaDescriptionChange,
  metaKeywords,
  onMetaKeywordsChange,
  canonicalUrl,
  onCanonicalUrlChange,
  postTitle,
  postExcerpt,
  postSlug,
  postCategory,
}) => {
  const { siteSettings } = useAdmin();
  const [isExpanded, setIsExpanded] = useState(true);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [newKeyword, setNewKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'preview' | 'audit'>('general');

  // Title length analysis (optimal: 40-60 characters)
  const titleCharCount = metaTitle.length;
  const titleStatus = useMemo(() => {
    if (titleCharCount === 0) return { label: 'Empty (Will fallback to Post Title)', color: 'text-gray-400', barColor: 'bg-gray-200 dark:bg-white/10' };
    if (titleCharCount < 30) return { label: 'Short (30-60 chars recommended)', color: 'text-amber-500', barColor: 'bg-amber-400' };
    if (titleCharCount <= 60) return { label: 'Optimal length for Google', color: 'text-emerald-600 dark:text-emerald-400', barColor: 'bg-emerald-500' };
    return { label: 'May be truncated (>60 chars)', color: 'text-amber-600', barColor: 'bg-amber-500' };
  }, [titleCharCount]);

  // Description length analysis (optimal: 120-160 characters)
  const descCharCount = metaDescription.length;
  const descStatus = useMemo(() => {
    if (descCharCount === 0) return { label: 'Empty (Will fallback to Excerpt)', color: 'text-gray-400', barColor: 'bg-gray-200 dark:bg-white/10' };
    if (descCharCount < 70) return { label: 'Short (120-160 chars recommended)', color: 'text-amber-500', barColor: 'bg-amber-400' };
    if (descCharCount <= 160) return { label: 'Optimal length for search snippets', color: 'text-emerald-600 dark:text-emerald-400', barColor: 'bg-emerald-500' };
    return { label: 'May be truncated (>160 chars)', color: 'text-amber-600', barColor: 'bg-amber-500' };
  }, [descCharCount]);

  // Add a new keyword
  const handleAddKeyword = (rawKeyword?: string) => {
    const kw = (rawKeyword !== undefined ? rawKeyword : newKeyword).trim().toLowerCase();
    if (!kw) return;
    if (!metaKeywords.includes(kw)) {
      onMetaKeywordsChange([...metaKeywords, kw]);
    }
    if (rawKeyword === undefined) {
      setNewKeyword('');
    }
  };

  // Remove a keyword
  const handleRemoveKeyword = (keywordToRemove: string) => {
    onMetaKeywordsChange(metaKeywords.filter(k => k !== keywordToRemove));
  };

  // Handle key down in keyword input (Enter or comma)
  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  // Smart suggested keywords based on category and title
  const suggestedKeywords = useMemo(() => {
    const baseSuggestions = [
      'facebook video downloader',
      'save reels in 1080p',
      'mp3 audio extractor',
      'facebook video saver',
      'no watermark video',
      'high quality mp4',
      'social media archiving',
      'fast video stream'
    ];

    if (postCategory.toLowerCase().includes('guide')) {
      baseSuggestions.push('step by step guide', 'tutorial');
    }
    if (postCategory.toLowerCase().includes('tech') || postCategory.toLowerCase().includes('format')) {
      baseSuggestions.push('h264 codec', 'video bitrates', 'mp4 container');
    }

    return baseSuggestions.filter(s => !metaKeywords.includes(s)).slice(0, 6);
  }, [postCategory, metaKeywords]);

  // One-click quick sync from Post fields
  const handleAutoFill = () => {
    if (postTitle && !metaTitle) {
      onMetaTitleChange(postTitle);
    }
    if (postExcerpt && !metaDescription) {
      onMetaDescriptionChange(postExcerpt);
    }
    // Keywords are the author's call, and the canonical stays empty so the
    // post's own address is used automatically (see utils/canonical.ts).
  };

  // Live preview values
  const displayTitle = metaTitle || postTitle || 'How to Download Facebook Reels in 1080p HD';
  const displayDescription = metaDescription || postExcerpt || 'Discover the quickest step-by-step methods to download Facebook Reels in pristine 1080p resolution to your iPhone, Android, or PC without annoying watermarks.';
  const displaySlug = postSlug || 'how-to-download-facebook-reels-1080p';

  // SEO Score Checklist
  const seoChecklist = useMemo(() => {
    return [
      {
        id: 'title',
        title: 'Custom Meta Title',
        passed: metaTitle.trim().length >= 25 && metaTitle.trim().length <= 65,
        note: metaTitle ? `${metaTitle.length} characters (Recommended 30-60)` : 'Not set (using post title)',
      },
      {
        id: 'desc',
        title: 'Custom Meta Description',
        passed: metaDescription.trim().length >= 60 && metaDescription.trim().length <= 165,
        note: metaDescription ? `${metaDescription.length} characters (Recommended 120-160)` : 'Not set (using excerpt)',
      },
      {
        id: 'keywords',
        title: 'Meta Keywords Tags',
        passed: metaKeywords.length >= 3,
        note: `${metaKeywords.length} keywords configured (Recommended 3-8)`,
      },
      {
        id: 'slug',
        title: 'Clean Search Engine URL Slug',
        passed: displaySlug.length > 5 && !/[^a-z0-9-]/.test(displaySlug),
        note: `${typeof window !== 'undefined' ? window.location.host : 'yourdomain.com'}/blog/${displaySlug}`,
      },
    ];
  }, [metaTitle, metaDescription, metaKeywords, displaySlug]);

  const passedCount = seoChecklist.filter(c => c.passed).length;

  return (
    <div className="rounded-2xl border border-[#d8cce4] dark:border-white/10 bg-[#faf7fc] dark:bg-[#1a122c] overflow-hidden transition-all shadow-xs">
      {/* SECTION HEADER / ACCORDION TOGGLE */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none bg-gradient-to-r from-[#f5edf9] to-[#fcfafc] dark:from-[#211739] dark:to-[#1a122c] border-b border-[#eae3ee] dark:border-white/10 hover:brightness-98 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#6d46b8] to-[#9e5488] text-white flex items-center justify-center shadow-xs shrink-0">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-heading font-bold text-sm sm:text-base text-[#2e2440] dark:text-white">
                SEO & Search Engine Configuration
              </h4>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-[#6d46b8]/10 dark:bg-[#6d46b8]/30 text-[#6d46b8] dark:text-[#c4a9f3]">
                SERP Ready
              </span>
            </div>
            <p className="text-xs text-[#726c85] dark:text-[#a29cb2] mt-0.5">
              Customize meta titles, search descriptions, keywords, and preview Google SERP presentation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* SEO Health Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white dark:bg-[#150e24] border border-[#eae3ee] dark:border-white/10">
            <span className={`w-2 h-2 rounded-full ${passedCount >= 3 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="text-[#2e2440] dark:text-white font-semibold">
              SEO Score: {passedCount}/4
            </span>
          </div>

          <button
            type="button"
            className="p-1.5 text-[#726c85] dark:text-[#a29cb2] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white dark:hover:text-white rounded-lg transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* SECTION CONTENT */}
      {isExpanded && (
        <div className="p-5 sm:p-6 space-y-6">
          {/* SUB-TABS & ACTIONS BAR */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#eae3ee] dark:border-white/10">
            <div className="flex items-center gap-1 p-1 bg-[#ede6f3] dark:bg-white/5 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('general')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'general'
                    ? 'bg-white dark:bg-[#2d1b4e] text-[#6d46b8] dark:text-white shadow-xs'
                    : 'text-[#726c85] dark:text-[#a29cb2] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white dark:hover:text-white'
                }`}
              >
                Meta Configuration
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'preview'
                    ? 'bg-white dark:bg-[#2d1b4e] text-[#6d46b8] dark:text-white shadow-xs'
                    : 'text-[#726c85] dark:text-[#a29cb2] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white dark:hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Google SERP Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('audit')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'audit'
                    ? 'bg-white dark:bg-[#2d1b4e] text-[#6d46b8] dark:text-white shadow-xs'
                    : 'text-[#726c85] dark:text-[#a29cb2] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white dark:hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>SEO Audit ({passedCount}/4)</span>
              </button>
            </div>

            {/* Quick action button */}
            <button
              type="button"
              onClick={handleAutoFill}
              className="text-xs font-bold text-[#6d46b8] dark:text-[#c4a9f3] hover:underline flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              title="Populate empty SEO fields using the article's Title and Excerpt"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Auto-fill from Post Title & Excerpt</span>
            </button>
          </div>

          {/* TAB 1: META FIELDS */}
          {activeTab === 'general' && (
            <div className="space-y-5">
              {/* 1. CUSTOM META TITLE */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#2e2440] dark:text-white uppercase tracking-wider">
                    Custom Meta Title
                  </label>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-medium ${titleStatus.color}`}>
                      {titleStatus.label}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#726c85] dark:text-[#a29cb2] bg-white dark:bg-[#201538] px-1.5 py-0.5 rounded-md border border-[#eae3ee] dark:border-white/10">
                      {titleCharCount}/60
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => onMetaTitleChange(e.target.value)}
                    placeholder={postTitle || 'e.g., How to Download Facebook Reels in 1080p HD (Fast & Free)'}
                    className="w-full px-3.5 py-2.5 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#150e24] border border-[#eae3ee] dark:border-white/10 rounded-xl focus:border-[#7c4fd1] focus:ring-2 focus:ring-[#7c4fd1]/20 outline-hidden transition-all font-medium"
                  />
                  {postTitle && metaTitle !== postTitle && (
                    <button
                      type="button"
                      onClick={() => onMetaTitleChange(postTitle)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#6d46b8] dark:text-[#a78bda] hover:underline px-2 py-1 rounded bg-[#f6f0f4] dark:bg-white/10 cursor-pointer"
                      title="Use article title as meta title"
                    >
                      Use Title
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-100 dark:bg-white/5 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${titleStatus.barColor}`}
                    style={{ width: `${Math.min(100, (titleCharCount / 60) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#726c85] dark:text-[#a29cb2] mt-1">
                  Overrides the standard browser tab {'<title>'} tag and search result headline. If left blank, defaults to article title.
                </p>
              </div>

              {/* 2. CUSTOM META DESCRIPTION */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#2e2440] dark:text-white uppercase tracking-wider">
                    Custom Meta Description
                  </label>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-medium ${descStatus.color}`}>
                      {descStatus.label}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#726c85] dark:text-[#a29cb2] bg-white dark:bg-[#201538] px-1.5 py-0.5 rounded-md border border-[#eae3ee] dark:border-white/10">
                      {descCharCount}/160
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    rows={3}
                    value={metaDescription}
                    onChange={(e) => onMetaDescriptionChange(e.target.value)}
                    placeholder={postExcerpt || 'Provide a compelling, keyword-rich summary (120-160 characters) to attract clicks from search engine result pages...'}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#150e24] border border-[#eae3ee] dark:border-white/10 rounded-xl focus:border-[#7c4fd1] focus:ring-2 focus:ring-[#7c4fd1]/20 outline-hidden transition-all leading-relaxed"
                  />
                  {postExcerpt && metaDescription !== postExcerpt && (
                    <button
                      type="button"
                      onClick={() => onMetaDescriptionChange(postExcerpt)}
                      className="absolute right-2.5 bottom-3 text-[11px] font-bold text-[#6d46b8] dark:text-[#a78bda] hover:underline px-2 py-1 rounded bg-[#f6f0f4] dark:bg-white/10 cursor-pointer"
                      title="Use article excerpt as meta description"
                    >
                      Use Excerpt
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-100 dark:bg-white/5 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${descStatus.barColor}`}
                    style={{ width: `${Math.min(100, (descCharCount / 160) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#726c85] dark:text-[#a29cb2] mt-1">
                  Displayed as the snippet preview under the headline on Google, Bing, and social share cards.
                </p>
              </div>

              {/* 3. CUSTOM META KEYWORDS */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#2e2440] dark:text-white uppercase tracking-wider">
                    Custom Meta Keywords & Focus Tags
                  </label>
                  <span className="text-[11px] font-bold text-[#6d46b8] dark:text-[#c4a9f3]">
                    {metaKeywords.length} Keywords Configured
                  </span>
                </div>

                {/* Tag Pills Container */}
                <div className="p-3 bg-white dark:bg-[#150e24] border border-[#eae3ee] dark:border-white/10 rounded-xl space-y-3">
                  {/* Current Keywords List */}
                  {metaKeywords.length === 0 ? (
                    <p className="text-xs text-[#726c85] dark:text-[#a29cb2] italic">
                      No custom keywords added yet. Add relevant search terms below or click from suggested keywords.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {metaKeywords.map((kw, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#f1e9fb] dark:bg-[#2d1b4e] text-[#6d46b8] dark:text-[#c4a9f3] border border-[#e1d5f3] dark:border-[#3e276b] animate-fade-in group"
                        >
                          <Tag className="w-3 h-3 text-[#6d46b8] dark:text-[#a78bda]" />
                          <span>{kw}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveKeyword(kw)}
                            className="p-0.5 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-full transition-colors cursor-pointer"
                            title={`Remove keyword "${kw}"`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Add Keyword Input */}
                  <div className="flex items-center gap-2 pt-1 border-t border-[#eae3ee] dark:border-white/10">
                    <input
                      type="text"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyDown={handleKeywordKeyDown}
                      placeholder="Type a target keyword and press Enter or comma (e.g., 'facebook 1080p download')..."
                      className="flex-1 px-3 py-1.5 text-xs text-[#2e2440] dark:text-white bg-[#f8f5fa] dark:bg-[#1f1535] border border-[#eae3ee] dark:border-white/10 rounded-lg outline-hidden focus:border-[#7c4fd1]"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddKeyword()}
                      disabled={!newKeyword.trim()}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-[#6d46b8] hover:bg-[#5b389e] disabled:opacity-40 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {/* Preset Suggestions */}
                {suggestedKeywords.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[11px] font-semibold text-[#726c85] dark:text-[#a29cb2] mr-1">
                      Suggested:
                    </span>
                    {suggestedKeywords.map((sug, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => handleAddKeyword(sug)}
                        className="px-2 py-0.5 text-[11px] font-medium bg-[#f1e9fb]/70 dark:bg-white/5 hover:bg-[#f1e9fb] dark:hover:bg-white/10 text-[#6d46b8] dark:text-[#c4a9f3] rounded-md border border-[#e1d5f3]/60 dark:border-white/10 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>{sug}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. CANONICAL URL & PERMALINK CONFIG */}
              <div className="pt-2 border-t border-[#eae3ee] dark:border-white/10">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#2e2440] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-[#6d46b8]" />
                    <span>Canonical URL</span>
                  </label>
                  <span className="text-[11px] text-[#726c85] dark:text-[#a29cb2]">
                    Leave empty — the post's own URL is used automatically
                  </span>
                </div>
                <input
                  type="url"
                  value={canonicalUrl}
                  onChange={(e) => onCanonicalUrlChange(e.target.value)}
                  placeholder="Only if this article is a copy: URL of the original page"
                  className="w-full px-3.5 py-2 text-xs font-mono text-[#4b2e83] dark:text-[#c4a9f3] bg-white dark:bg-[#150e24] border border-[#eae3ee] dark:border-white/10 rounded-xl focus:border-[#7c4fd1] outline-hidden"
                />
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE SERP PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-heading font-bold text-xs sm:text-sm text-[#2e2440] dark:text-white">
                    Google Search Snippet Simulation
                  </h5>
                  <p className="text-[11px] text-[#726c85] dark:text-[#a29cb2]">
                    This is how this post appears when people search for your target keywords on Google.
                  </p>
                </div>

                {/* Device switch */}
                <div className="flex items-center gap-1 p-0.5 bg-[#ede6f3] dark:bg-white/10 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`p-1.5 rounded-md transition-colors ${
                      previewDevice === 'desktop'
                        ? 'bg-white dark:bg-[#2d1b4e] text-[#6d46b8] dark:text-white shadow-xs'
                        : 'text-[#726c85] dark:text-[#a29cb2]'
                    }`}
                    title="Desktop Google SERP Preview"
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`p-1.5 rounded-md transition-colors ${
                      previewDevice === 'mobile'
                        ? 'bg-white dark:bg-[#2d1b4e] text-[#6d46b8] dark:text-white shadow-xs'
                        : 'text-[#726c85] dark:text-[#a29cb2]'
                    }`}
                    title="Mobile Google SERP Preview"
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* SERP PREVIEW BOX */}
              <div className={`p-4 sm:p-5 bg-white dark:bg-[#150e24] rounded-2xl border border-[#eae3ee] dark:border-white/10 shadow-xs font-sans ${
                previewDevice === 'mobile' ? 'max-w-md mx-auto border-t-4 border-t-[#6d46b8]' : 'w-full'
              }`}>
                {/* Google Site identifier & breadcrumb */}
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#6d46b8] to-[#e6799f] text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                    F
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-semibold text-[#202124] dark:text-white leading-tight">
                      {siteSettings?.siteName || 'ASK Downloader'}
                    </span>
                    <span className="text-[11px] text-[#4d5156] dark:text-[#bdc1c6] truncate max-w-xs font-mono">
                      {window.location.host} › blog › {displaySlug}
                    </span>
                  </div>
                </div>

                {/* Google Clickable Blue Title */}
                <h3 className="text-base sm:text-lg font-medium text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer leading-snug line-clamp-2 my-1">
                  {displayTitle}
                </h3>

                {/* Google Snippet text */}
                <p className="text-xs sm:text-sm text-[#4d5156] dark:text-[#bdc1c6] leading-relaxed line-clamp-3">
                  <span className="text-[#70757a] dark:text-[#9aa0a6] mr-1.5">
                    {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} —
                  </span>
                  {displayDescription}
                </p>

                {/* Keywords badge in preview */}
                {metaKeywords.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-[#eae3ee] dark:border-white/10 flex items-center gap-1.5 overflow-x-auto text-[10px] text-[#70757a] dark:text-[#9aa0a6]">
                    <span className="font-bold">Configured Meta Keywords:</span>
                    {metaKeywords.slice(0, 4).map((kw, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-[#f6f0f4] dark:bg-white/10 rounded font-medium text-[#6d46b8] dark:text-[#c4a9f3]">
                        {kw}
                      </span>
                    ))}
                    {metaKeywords.length > 4 && <span>+{metaKeywords.length - 4} more</span>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SEO AUDIT CHECKLIST */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#eae3ee] dark:border-white/10">
                <span className="text-xs font-bold text-[#2e2440] dark:text-white uppercase tracking-wider">
                  Pre-Publish SEO Checklist
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  passedCount >= 3 
                    ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400' 
                    : 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400'
                }`}>
                  {passedCount === 4 ? 'All Good! 100% Optimized' : `${passedCount} of 4 items optimized`}
                </span>
              </div>

              <div className="space-y-2">
                {seoChecklist.map((item) => (
                  <div 
                    key={item.id} 
                    className="p-3 rounded-xl bg-white dark:bg-[#150e24] border border-[#eae3ee] dark:border-white/10 flex items-start gap-3"
                  >
                    {item.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h6 className="text-xs font-bold text-[#2e2440] dark:text-white">
                          {item.title}
                        </h6>
                        <span className={`text-[10px] font-extrabold uppercase ${
                          item.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                        }`}>
                          {item.passed ? 'Passed' : 'Needs Attention'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#726c85] dark:text-[#a29cb2] mt-0.5">
                        {item.note}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
