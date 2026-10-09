import React, { useState, useMemo, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import { TopHeader } from '../components/TopHeader';
import { BlogActionFAB } from '../components/BlogActionFAB';
import { BlogSeoConfigSection } from '../components/BlogSeoConfigSection';
import { BlogCategoriesManager } from '../components/BlogCategoriesManager';
import { BlogPost } from '../types/admin';
import { smartSlug, cleanSlug, slugWarnings, uniqueSlug } from '../utils/slug.ts';
import { monthKey, monthLabel, monthCounts } from '../utils/months.ts';
import { storedCanonical } from '../utils/canonical.ts';
import { BLOG_LANGUAGES, DEFAULT_BLOG_LANGUAGE, normalizeBlogLanguage, blogLanguageInfo, type BlogLanguage } from '../config/blogLanguages.ts';
import { 
  BookOpen,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Check,
  Clock,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  Quote,
  Link2,
  Code,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  MessageSquare,
  Globe,
  CheckCircle2,
  Image as ImageIcon,
  Tag,
} from 'lucide-react';
import { MediaPicker } from '../components/MediaPicker';

interface BlogManagerPageProps {
  onOpenMobileMenu: () => void;
}

export const BlogManagerPage: React.FC<BlogManagerPageProps> = ({ onOpenMobileMenu }) => {
  const { 
    blogPosts, 
    showToast,
    blogCategories,
    addBlogPost, 
    updateBlogPost, 
    deleteBlogPost, 
    togglePostStatus, 
    navigateToBlogPost,
    blogComments,
    approveBlogComment,
    rejectBlogComment,
    deleteBlogComment,
    toggleCommentStatus,
    pendingCommentsCount,
    adminUser 
  } = useAdmin();

  // Active Tab: 'articles' or 'comments'
  const [activeTab, setActiveTab] = useState<'articles' | 'comments' | 'categories'>('articles');
  const [saveError, setSaveError] = useState('');



  // Posts Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [languageFilter, setLanguageFilter] = useState<BlogLanguage | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Comments Filtering
  const [commentSearch, setCommentSearch] = useState('');
  const [commentFilter, setCommentFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Modal editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formCategory, setFormCategory] = useState<string>('Guides');
  const [formLanguage, setFormLanguage] = useState<BlogLanguage>(DEFAULT_BLOG_LANGUAGE);
  const [formExcerpt, setFormExcerpt] = useState('');
  const [formCoverImage, setFormCoverImage] = useState('');
  const [formCoverImageAlt, setFormCoverImageAlt] = useState('');
  const [coverError, setCoverError] = useState('');
  const [inlineError, setInlineError] = useState('');
  // Details asked for right after an in-post image is uploaded.
  const [pendingImageUrl, setPendingImageUrl] = useState('');
  const [imgAlt, setImgAlt] = useState('');
  const [imgCaption, setImgCaption] = useState('');
  const [imgAlign, setImgAlign] = useState<'left' | 'center' | 'right'>('center');
  const [imgSize, setImgSize] = useState<'small' | 'medium' | 'large'>('medium');

  const confirmInlineImage = () => {
    const alt = imgAlt.replace(/[[\]]/g, '');
    const caption = imgCaption.replace(/"/g, "'");
    const opts = `{${imgAlign}|${imgSize}}`;
    insertAtCursor(`![${alt}](${pendingImageUrl}${caption ? ` "${caption}"` : ''})${opts}`);
    setPendingImageUrl('');
  };

  // Cancelling only drops the image from this post; it stays in the Media Library.
  const cancelInlineImage = () => {
    setPendingImageUrl('');
  };

  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [inlinePickerOpen, setInlinePickerOpen] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

  // The image stays in the Media Library (it may be used elsewhere); only
  // this post stops using it. Unused files are deleted from the library.
  const handleCoverRemove = () => {
    setFormCoverImage('');
    setCoverError('');
  };
  const [formContent, setFormContent] = useState('');
  const [formStatus, setFormStatus] = useState<'published' | 'draft'>('published');
  const [formAuthorName, setFormAuthorName] = useState('Admin');
  const [formAuthorAvatar, setFormAuthorAvatar] = useState('');
  const [formAuthorRole, setFormAuthorRole] = useState('Senior Video Specialist');
  const [formAuthorBio, setFormAuthorBio] = useState('Digital media strategist and technology reviewer passionate about high-quality video encoding, web optimization, and modern web software tools.');
  const [formReadTime, setFormReadTime] = useState('4 min read');

  // SEO Configuration Fields
  const [formMetaTitle, setFormMetaTitle] = useState('');
  const [formMetaDescription, setFormMetaDescription] = useState('');
  const [formMetaKeywords, setFormMetaKeywords] = useState<string[]>([]);
  const [formCanonicalUrl, setFormCanonicalUrl] = useState('');

  // Image Presets for quick selection
  const imagePresets = [
    'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80',
  ];

  // Month filter ("2026-09"), newest month first in the dropdown.
  const [monthFilter, setMonthFilter] = useState('');
  const postMonths = useMemo(() => monthCounts(blogPosts), [blogPosts]);

  // Filtered posts
  const filteredPosts = useMemo(() => {
    return blogPosts.filter((post) => {
      const matchesSearch = 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        blogLanguageInfo(post.language).name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        blogLanguageInfo(post.language).nativeName.includes(searchQuery);

      const matchesCat = selectedCategory === 'All' || post.category === selectedCategory;
      const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
      const matchesLang =
        languageFilter === 'all' || normalizeBlogLanguage(post.language) === languageFilter;

      const matchesMonth = !monthFilter || monthKey(post.publishedAt) === monthFilter;

      return matchesSearch && matchesCat && matchesStatus && matchesLang && matchesMonth;
    });
  }, [blogPosts, searchQuery, selectedCategory, statusFilter, languageFilter, monthFilter]);

  // The admin table also needs paging once the blog grows.
  const ADMIN_PER_PAGE = 15;
  const [postPage, setPostPage] = useState(1);
  const postPages = Math.max(1, Math.ceil(filteredPosts.length / ADMIN_PER_PAGE));
  useEffect(() => { setPostPage(1); }, [searchQuery, selectedCategory, statusFilter, languageFilter, monthFilter]);
  useEffect(() => { if (postPage > postPages) setPostPage(postPages); }, [postPage, postPages]);
  const pagedPosts = useMemo(
    () => filteredPosts.slice((postPage - 1) * ADMIN_PER_PAGE, postPage * ADMIN_PER_PAGE),
    [filteredPosts, postPage]
  );

  // Filtered comments
  const filteredComments = useMemo(() => {
    return blogComments.filter((comment) => {
      const matchesSearch =
        comment.authorName.toLowerCase().includes(commentSearch.toLowerCase()) ||
        comment.authorEmail.toLowerCase().includes(commentSearch.toLowerCase()) ||
        comment.content.toLowerCase().includes(commentSearch.toLowerCase()) ||
        comment.postTitle.toLowerCase().includes(commentSearch.toLowerCase());

      const matchesStatus = commentFilter === 'all' || comment.status === commentFilter;

      return matchesSearch && matchesStatus;
    });
  }, [blogComments, commentSearch, commentFilter]);

  const approvedCount = blogComments.filter(c => c.status === 'approved').length;

  const handleOpenCreate = (initialStatus: 'published' | 'draft' = 'published') => {
    setEditingPostId(null);
    setFormTitle('');
    setFormSlug('');
    setFormCategory(blogCategories[0]?.name || 'Guides');
    setFormLanguage(DEFAULT_BLOG_LANGUAGE);
    setFormExcerpt('');
    setFormCoverImage(''); // start empty so the upload box is the first thing shown
    setFormCoverImageAlt('');
    // Starts empty: sample text left in by mistake used to get published.
    setFormContent('');
    setFormStatus(initialStatus);
    setFormAuthorName(adminUser?.name || 'Admin');
    setFormAuthorAvatar(adminUser?.avatar || '');
    setFormAuthorRole('Content Editor');
    setFormAuthorBio('Writes guides on downloading and saving social media video and audio content.');
    setFormReadTime('4 min read');
    setFormMetaTitle('');
    setFormMetaDescription('');
    setFormMetaKeywords([]); // the author picks this post's own keywords
    setFormCanonicalUrl('');
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (post: BlogPost) => {
    setEditingPostId(post.id);
    setFormTitle(post.title);
    setFormSlug(post.slug);
    setFormCategory(post.category);
    setFormLanguage(normalizeBlogLanguage(post.language));
    setFormExcerpt(post.excerpt);
    setFormCoverImage(post.coverImage);
    setFormCoverImageAlt(post.coverImageAlt || '');
    setFormContent(post.content);
    setFormStatus(post.status);
    setFormAuthorName(post.authorName || adminUser?.name || 'Admin');
    setFormAuthorAvatar(post.authorAvatar || '');
    setFormAuthorRole(post.authorRole || 'Content Editor');
    setFormAuthorBio(post.authorBio || 'Writes guides on downloading and saving social media video and audio content.');
    setFormReadTime(post.readTime);
    setFormMetaTitle(post.metaTitle || post.title);
    setFormMetaDescription(post.metaDescription || post.excerpt);
    setFormMetaKeywords(post.metaKeywords || []);
    // Empty unless it points somewhere else: the post's own URL is automatic.
    setFormCanonicalUrl(storedCanonical(post.canonicalUrl || '', [post.slug]));
    setIsEditorOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setFormTitle(val);
    if (!editingPostId) {
      setFormSlug(smartSlug(val));
    }
  };

  // Text formatting insertion helper
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('blog-content-area') as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end) || 'text';
    const replacement = `${prefix}${selectedText}${suffix}`;

    const newContent = text.substring(0, start) + replacement + text.substring(end);
    setFormContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 50);
  };

  /** Inserts an image at the cursor, as markdown the blog renderer
   * understands: ![alt](url "caption"). Several images can be added
   * anywhere in the post and keep their position after saving. */
  const insertAtCursor = (snippet: string) => {
    const textarea = document.getElementById('blog-content-area') as HTMLTextAreaElement | null;
    const text = formContent;
    const at = textarea ? textarea.selectionStart : text.length;
    const before = text.slice(0, at).replace(/\n*$/, '');
    const after = text.slice(at).replace(/^\n*/, '');
    const next = `${before}${before ? '\n\n' : ''}${snippet}${after ? '\n\n' : ''}${after}`;
    setFormContent(next);
    setTimeout(() => {
      textarea?.focus();
      const pos = (before ? before.length + 2 : 0) + snippet.length;
      textarea?.setSelectionRange(pos, pos);
    }, 50);
  };

  /** An image picked from the Media Library for the post body: set its ALT,
   * caption, alignment and size in the panel below the editor, then insert. */
  const handleInlineImagePicked = (url: string) => {
    setInlineError('');
    setPendingImageUrl(url);
    setImgAlt('');
    setImgCaption('');
    setImgAlign('center');
    setImgSize('medium');
  };

  const handleSavePost = (e: React.FormEvent) => {
    e.preventDefault();
    // Silently doing nothing left the admin staring at a form that would
    // not save, with no clue why. Say what is missing instead.
    const missing: string[] = [];
    if (!formTitle.trim()) missing.push('a title');
    if (!formSlug.trim() && !formTitle.trim()) missing.push('a slug');
    if (!formExcerpt.trim()) missing.push('a short excerpt');
    if (!formContent.trim()) missing.push('some content');
    if (missing.length) {
      setSaveError(`Please add ${missing.join(' and ')} before saving.`);
      return;
    }
    setSaveError('');

    // Two posts sharing a slug means one of them can never be opened —
    // the URL only ever matches the first. Make it unique instead of
    // silently breaking a post.
    // A typed slug is only tidied; an empty one is built from the title.
    const wanted = formSlug.trim() ? cleanSlug(formSlug) : smartSlug(formTitle);
    if (!wanted) {
      setSaveError('This title has no English words to build a URL from. Please type an English URL slug, e.g. "facebook-video-downloader".');
      return;
    }
    // /blog/<code> is a language archive, so a post can never own that slug.
    const isTaken = (x: string) =>
      BLOG_LANGUAGES.some((l) => l.code === x) || blogPosts.some((p) => p.slug === x && p.id !== editingPostId);
    const langName = BLOG_LANGUAGES.find((l) => l.code === formLanguage)?.name || '';
    const slug = uniqueSlug(wanted, isTaken, [formCategory, langName]);
    if (slug !== wanted) {
      showToast(`"${wanted}" is already in use, so this post was saved as "${slug}".`, 'info');
    }

    const postPayload = {
      title: formTitle,
      slug,
      category: formCategory,
      language: formLanguage,
      excerpt: formExcerpt,
      coverImage: formCoverImage,
      coverImageAlt: formCoverImageAlt.trim(),
      content: formContent,
      status: formStatus,
      authorName: formAuthorName,
      authorAvatar: formAuthorAvatar || undefined,
      authorRole: formAuthorRole,
      authorBio: formAuthorBio,
      readTime: formReadTime,
      metaTitle: formMetaTitle.trim() || formTitle,
      metaDescription: formMetaDescription.trim() || formExcerpt,
      metaKeywords: formMetaKeywords,
      // Never store the post's own address (old or new slug): it is computed
      // on the page, so it stays right after a slug or domain change.
      canonicalUrl: storedCanonical(formCanonicalUrl, [slug, blogPosts.find((p) => p.id === editingPostId)?.slug || '']),
    };

    if (editingPostId) {
      updateBlogPost(editingPostId, postPayload);
    } else {
      addBlogPost(postPayload);
    }

    setIsEditorOpen(false);
  };

  return (
    <div className="animate-fade-in">
      <TopHeader
        title="Blog Manager"
        subtitle="Manage public articles, draft tutorials, categories, and reader comments."
        onOpenMobileMenu={onOpenMobileMenu}
        actionButton={{
          label: "Add New Post",
          onClick: () => handleOpenCreate('published'),
          icon: Plus,
        }}
      />

      {/* TOP NAVIGATION TABS: ARTICLES vs COMMENTS */}
      <div className="flex items-center gap-2 mb-6 border-b border-[#eae3ee] dark:border-white/10 pb-1">
        <button
          onClick={() => setActiveTab('articles')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'articles'
              ? 'bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] text-white shadow-sm'
              : 'text-[#726c85] dark:text-[#b5a9cd] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white hover:bg-[#f6f0f4] dark:hover:bg-[#201538]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Articles</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            activeTab === 'articles' ? 'bg-white/20 text-white' : 'bg-[#eae3ee] text-[#726c85] dark:text-[#b5a9cd]'
          }`}>
            {blogPosts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('comments')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'comments'
              ? 'bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] text-white shadow-sm'
              : 'text-[#726c85] dark:text-[#b5a9cd] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white hover:bg-[#f6f0f4] dark:hover:bg-[#201538]'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Comments</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            activeTab === 'comments' ? 'bg-white/20 text-white' : 'bg-[#eae3ee] text-[#726c85] dark:text-[#b5a9cd]'
          }`}>
            {blogComments.length}
          </span>
          {pendingCommentsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-amber-400 text-[#4b2e83] shadow-xs animate-pulse">
              {pendingCommentsCount} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] text-white shadow-sm'
              : 'text-[#726c85] dark:text-[#b5a9cd] hover:text-[#2e2440] dark:hover:text-white hover:bg-[#f6f0f4] dark:hover:bg-[#201538]'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Categories</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            activeTab === 'categories' ? 'bg-white/20 text-white' : 'bg-[#eae3ee] text-[#726c85] dark:text-[#b5a9cd]'
          }`}>
            {blogCategories.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 3: BLOG CATEGORIES (moved here from Content Editor, where it
          did not belong — categories are part of managing the blog) */}
      {activeTab === 'categories' && <BlogCategoriesManager />}

      {/* ========================================================================= */}
      {/* TAB 1: ARTICLES MANAGER                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'articles' && (
        <>
          {/* FILTER AND STATS TOOLBAR */}
          <div className="bg-white dark:bg-[#181224] rounded-2xl p-4 sm:p-5 shadow-[0_10px_30px_rgba(140,80,120,0.08)] border border-[#e6799f]/10 mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#a29cb2] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts by title, excerpt, or category..."
                className="w-full pl-10 pr-4 py-2 text-sm text-[#2e2440] dark:text-white bg-[#f6f0f4] dark:bg-[#201538] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:outline-hidden focus:border-[#7c4fd1] focus:bg-white dark:focus:bg-[#181224] dark:focus:bg-[#181224] transition-all"
              />
            </div>

            {/* Category & Status Filter */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Dropdown Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold text-[#4b2e83] bg-[#f6f0f4] dark:bg-[#201538] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl outline-hidden cursor-pointer"
              >
                <option value="All">All Categories ({blogPosts.length})</option>
                {blogCategories.map((c) => {
                  const count = blogPosts.filter(p => p.category === c.name).length;
                  return (
                    <option key={c.id} value={c.name}>
                      {c.name} ({count})
                    </option>
                  );
                })}
              </select>

              {/* Language filter — same pattern as the category dropdown so the
                  toolbar stays one visual system. */}
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value as BlogLanguage | 'all')}
                aria-label="Filter posts by language"
                className="px-3 py-1.5 text-xs font-bold text-[#4b2e83] bg-[#f6f0f4] dark:bg-[#201538] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl outline-hidden cursor-pointer"
              >
                <option value="all">🌐 All Languages ({blogPosts.length})</option>
                {BLOG_LANGUAGES.map((l) => {
                  const count = blogPosts.filter(
                    (p) => normalizeBlogLanguage(p.language) === l.code
                  ).length;
                  return (
                    <option key={l.code} value={l.code}>
                      {l.flag}  {l.nativeName} ({count})
                    </option>
                  );
                })}
              </select>

              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                aria-label="Filter posts by month"
                className="px-3 py-1.5 text-xs font-bold text-[#4b2e83] bg-[#f6f0f4] dark:bg-[#201538] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl outline-hidden cursor-pointer"
              >
                <option value="">📅 All Months ({blogPosts.length})</option>
                {postMonths.map((m) => (
                  <option key={m.key} value={m.key}>
                    {monthLabel(m.key)} ({m.count})
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 p-1 bg-[#f6f0f4] dark:bg-[#201538] rounded-xl border border-[#eae3ee] dark:border-[#2e1d4d]">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-white dark:bg-[#181224] text-[#4b2e83] shadow-xs'
                      : 'text-[#726c85] dark:text-[#b5a9cd] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white'
                  }`}
                >
                  All ({blogPosts.length})
                </button>
                <button
                  onClick={() => setStatusFilter('published')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'published'
                      ? 'bg-white dark:bg-[#181224] text-emerald-700 shadow-xs'
                      : 'text-[#726c85] dark:text-[#b5a9cd] hover:text-emerald-700'
                  }`}
                >
                  Published ({blogPosts.filter(p => p.status === 'published').length})
                </button>
                <button
                  onClick={() => setStatusFilter('draft')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'draft'
                      ? 'bg-white dark:bg-[#181224] text-amber-700 shadow-xs'
                      : 'text-[#726c85] dark:text-[#b5a9cd] hover:text-amber-700'
                  }`}
                >
                  Drafts ({blogPosts.filter(p => p.status === 'draft').length})
                </button>
              </div>
            </div>
          </div>

          {/* BLOG POSTS LIST */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-white dark:bg-[#181224] rounded-[22px] border border-[#e6799f]/15 p-6">
                <BookOpen className="w-10 h-10 text-[#a29cb2] mx-auto mb-3 opacity-50" />
                <h3 className="font-heading font-bold text-lg text-[#2e2440] dark:text-white">No articles found</h3>
                <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] mt-1 mb-4">Create your first blog tutorial or adjust your search filter.</p>
                <button
                  onClick={() => handleOpenCreate('published')}
                  className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#6d46b8] to-[#e6799f] rounded-xl shadow-md cursor-pointer"
                >
                  Write First Article
                </button>
              </div>
            ) : (
              pagedPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white dark:bg-[#181224] rounded-[22px] overflow-hidden shadow-[0_10px_30px_rgba(140,80,120,0.08)] border border-[#e6799f]/10 flex flex-col group hover:shadow-lg transition-all"
                >
                  {/* Cover Image */}
                  <div className="relative h-44 w-full bg-[#f1e9fb] overflow-hidden">
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-white/95 text-[#4b2e83] shadow-xs">
                        {post.category}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      {/* Which language this post is written in. */}
                      <span
                        className="px-2 py-1 rounded-lg text-[11px] font-bold shadow-xs bg-white/95 dark:bg-[#181224]/95 text-[#4b2e83] dark:text-[#d1b9f7] border border-white/60 dark:border-white/10 inline-flex items-center gap-1"
                        title={`Written in ${blogLanguageInfo(post.language).name}`}
                      >
                        <span aria-hidden="true">{blogLanguageInfo(post.language).flag}</span>
                        <span>{blogLanguageInfo(post.language).nativeName}</span>
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-xs ${
                        post.status === 'published'
                          ? 'bg-emerald-700 text-white'
                          : 'bg-amber-700 text-white'
                      }`}>
                        {post.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  </div>

                  {/* Content Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-[#6b6480] dark:text-[#a29cb2] mb-2 font-medium">
                        <span>{post.publishedAt}</span>
                        <span>&bull;</span>
                        <span>{post.readTime}</span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1 text-[#6d46b8]">
                          <MessageSquare className="w-3 h-3" />
                          <span>{blogComments.filter(c => c.postId === post.id && c.status === 'approved').length}</span>
                        </span>
                        {post.metaKeywords && post.metaKeywords.length > 0 && (
                          <>
                            <span>&bull;</span>
                            <span 
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40"
                              title={`Configured SEO with ${post.metaKeywords.length} keywords`}
                            >
                              <Search className="w-2.5 h-2.5" />
                              <span>SEO ({post.metaKeywords.length})</span>
                            </span>
                          </>
                        )}
                      </div>

                      <h4 className="font-heading font-bold text-base text-[#2e2440] dark:text-white group-hover:text-[#6d46b8] transition-colors leading-snug line-clamp-2 mb-2">
                        {post.title}
                      </h4>

                      <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] line-clamp-2 leading-relaxed mb-4">
                        {post.excerpt}
                      </p>
                    </div>

                    {/* Author & Controls */}
                    <div className="pt-4 border-t border-[#eae3ee] dark:border-[#2e1d4d] flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#4a4257] dark:text-[#cfc6de]">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#6d46b8] to-[#e6799f] text-white flex items-center justify-center text-[10px] font-bold">
                          {post.authorName.charAt(0)}
                        </div>
                        <span className="truncate max-w-[100px]">{post.authorName}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Toggle published status */}
                        <button
                          onClick={() => togglePostStatus(post.id)}
                          title={post.status === 'published' ? 'Unpublish to draft' : 'Publish now'}
                          className="p-1.5 text-[#726c85] dark:text-[#b5a9cd] hover:text-[#6d46b8] rounded-lg transition-colors cursor-pointer"
                        >
                          {post.status === 'published' ? (
                            <ToggleRight className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-amber-500" />
                          )}
                        </button>

                        {/* Edit post */}
                        <button
                          onClick={() => handleOpenEdit(post)}
                          title="Edit Article"
                          className="p-1.5 text-[#726c85] dark:text-[#b5a9cd] hover:text-[#6d46b8] rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Delete post */}
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete "${post.title}"?`)) {
                              deleteBlogPost(post.id);
                            }
                          }}
                          title="Delete Article"
                          className="p-1.5 text-[#726c85] dark:text-[#b5a9cd] hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        {/* View in public post view */}
                        <button
                          onClick={() => navigateToBlogPost(post.slug)}
                          title="View Single Post Page"
                          className="p-1.5 text-[#6d46b8] hover:text-[#4b2e83] rounded-lg transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {postPages > 1 && (
            <nav aria-label="Article pages" className="flex items-center justify-center gap-2 mt-6 flex-wrap">
              <button
                onClick={() => setPostPage((n) => Math.max(1, n - 1))}
                disabled={postPage === 1}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#eae3ee] dark:border-[#2e1d4d] text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>
              <span className="text-xs font-bold text-[#726c85] dark:text-[#b5a9cd]">
                Page {postPage} of {postPages} · {filteredPosts.length} articles
              </span>
              <button
                onClick={() => setPostPage((n) => Math.min(postPages, n + 1))}
                disabled={postPage === postPages}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#eae3ee] dark:border-[#2e1d4d] text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: COMMENTS TAB (Requested Feature)                                   */}
      {/* ========================================================================= */}
      {activeTab === 'comments' && (
        <div className="space-y-6">
          
          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[#181224] rounded-2xl p-4 shadow-sm border border-[#eae3ee] dark:border-[#2e1d4d] flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-[#f1e9fb] text-[#6d46b8] flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] font-semibold uppercase tracking-wider">Total Comments</p>
                <h4 className="text-xl font-heading font-extrabold text-[#2e2440] dark:text-white">{blogComments.length}</h4>
              </div>
            </div>

            <div className="bg-white dark:bg-[#181224] rounded-2xl p-4 shadow-sm border border-[#eae3ee] dark:border-[#2e1d4d] flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] font-semibold uppercase tracking-wider">Pending Moderation</p>
                <h4 className="text-xl font-heading font-extrabold text-amber-600">{pendingCommentsCount}</h4>
              </div>
            </div>

            <div className="bg-white dark:bg-[#181224] rounded-2xl p-4 shadow-sm border border-[#eae3ee] dark:border-[#2e1d4d] flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] font-semibold uppercase tracking-wider">Approved Live</p>
                <h4 className="text-xl font-heading font-extrabold text-emerald-600">{approvedCount}</h4>
              </div>
            </div>
          </div>

          {/* FILTER & SEARCH BAR */}
          <div className="bg-white dark:bg-[#181224] rounded-2xl p-4 sm:p-5 shadow-[0_10px_30px_rgba(140,80,120,0.08)] border border-[#e6799f]/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#a29cb2] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={commentSearch}
                onChange={(e) => setCommentSearch(e.target.value)}
                placeholder="Search by author name, email, content, or post..."
                className="w-full pl-10 pr-4 py-2 text-sm text-[#2e2440] dark:text-white bg-[#f6f0f4] dark:bg-[#201538] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:outline-hidden focus:border-[#7c4fd1] focus:bg-white dark:focus:bg-[#181224] dark:focus:bg-[#181224] transition-all"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1 p-1 bg-[#f6f0f4] dark:bg-[#201538] rounded-xl border border-[#eae3ee] dark:border-[#2e1d4d]">
              <button
                onClick={() => setCommentFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  commentFilter === 'all'
                    ? 'bg-white dark:bg-[#181224] text-[#4b2e83] shadow-xs'
                    : 'text-[#726c85] dark:text-[#b5a9cd] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white'
                }`}
              >
                All ({blogComments.length})
              </button>
              <button
                onClick={() => setCommentFilter('pending')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  commentFilter === 'pending'
                    ? 'bg-white dark:bg-[#181224] text-amber-700 shadow-xs'
                    : 'text-[#726c85] dark:text-[#b5a9cd] hover:text-amber-700'
                }`}
              >
                Pending ({pendingCommentsCount})
              </button>
              <button
                onClick={() => setCommentFilter('approved')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  commentFilter === 'approved'
                    ? 'bg-white dark:bg-[#181224] text-emerald-700 shadow-xs'
                    : 'text-[#726c85] dark:text-[#b5a9cd] hover:text-emerald-700'
                }`}
              >
                Approved ({approvedCount})
              </button>
              <button
                onClick={() => setCommentFilter('rejected')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  commentFilter === 'rejected'
                    ? 'bg-white dark:bg-[#181224] text-rose-700 shadow-xs'
                    : 'text-[#726c85] dark:text-[#b5a9cd] hover:text-rose-700'
                }`}
              >
                Rejected ({blogComments.filter((c) => c.status === 'rejected').length})
              </button>
            </div>
          </div>

          {/* COMMENTS LIST */}
          <div className="space-y-4">
            {filteredComments.length === 0 ? (
              <div className="bg-white dark:bg-[#181224] rounded-[22px] p-12 text-center border border-[#eae3ee] dark:border-[#2e1d4d]">
                <MessageSquare className="w-12 h-12 text-[#a29cb2] mx-auto mb-3 opacity-40" />
                <h4 className="font-heading font-bold text-lg text-[#2e2440] dark:text-white">No comments found</h4>
                <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] mt-1">
                  {commentSearch || commentFilter !== 'all'
                    ? 'No comments match your current search query or filter.'
                    : 'Reader comments submitted from blog articles will appear here for review.'}
                </p>
              </div>
            ) : (
              filteredComments.map((comment) => (
                <div
                  key={comment.id}
                  className="bg-white dark:bg-[#181224] rounded-[22px] p-5 sm:p-6 shadow-[0_8px_25px_rgba(140,80,120,0.06)] border border-[#e6799f]/10 transition-all hover:border-[#6d46b8]/30"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    
                    {/* Commenter Info & Body */}
                    <div className="flex-1 space-y-3">
                      {/* Top Meta Line */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#6d46b8] to-[#9e5488] text-white flex items-center justify-center text-xs font-bold">
                            {comment.authorName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-sm text-[#2e2440] dark:text-white">{comment.authorName}</span>
                            <span className="text-xs text-[#726c85] dark:text-[#b5a9cd] ml-2">({comment.authorEmail})</span>
                          </div>
                        </div>

                        {comment.website && (
                          <a
                            href={comment.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#6d46b8] hover:underline flex items-center gap-1"
                          >
                            <Globe className="w-3 h-3" />
                            <span>{comment.website.replace(/^https?:\/\//, '')}</span>
                          </a>
                        )}

                        <span className="text-xs text-[#a29cb2] ml-auto">
                          {comment.createdAt}
                        </span>
                      </div>

                      {/* Belongs to Post */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-[#726c85] dark:text-[#b5a9cd] font-semibold">Post:</span>
                        <button
                          onClick={() => navigateToBlogPost(comment.postSlug)}
                          className="font-bold text-[#6d46b8] hover:underline flex items-center gap-1 cursor-pointer truncate max-w-lg text-left"
                        >
                          <span>{comment.postTitle}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </button>
                      </div>

                      {/* Comment Content Box */}
                      <div className="p-4 rounded-xl bg-[#f6f0f4] dark:bg-[#201538] border border-[#eae3ee] dark:border-[#2e1d4d] text-xs sm:text-sm text-[#3d334d] leading-relaxed">
                        {comment.content}
                      </div>
                    </div>

                    {/* Status & Actions Column */}
                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#eae3ee] dark:border-[#2e1d4d]">
                      {/* Status Tag */}
                      <div>
                        {comment.status === 'pending' && (
                          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5 shadow-xs">
                            <Clock className="w-3 h-3" />
                            <span>Pending</span>
                          </span>
                        )}
                        {comment.status === 'approved' && (
                          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-xs">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approved</span>
                          </span>
                        )}
                        {comment.status === 'rejected' && (
                          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5 shadow-xs">
                            <X className="w-3 h-3" />
                            <span>Rejected</span>
                          </span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {comment.status !== 'approved' && (
                          <button
                            onClick={() => approveBlogComment(comment.id)}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                            title="Approve and show on the blog post"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                        )}

                        {comment.status !== 'rejected' && (
                          <button
                            onClick={() => rejectBlogComment(comment.id)}
                            className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                            title="Reject — it stays hidden from the blog"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        )}

                        {comment.status === 'approved' && (
                          <button
                            onClick={() => toggleCommentStatus(comment.id)}
                            className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                            title="Move back to pending"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Unapprove</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (window.confirm(`Delete comment from ${comment.authorName}?`)) {
                              deleteBlogComment(comment.id);
                            }
                          }}
                          className="p-1.5 text-[#a29cb2] hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          title="Delete comment permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FULL POST EDITOR MODAL                                                    */}
      {/* ========================================================================= */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-4xl max-h-[92vh] bg-white dark:bg-[#181224] rounded-[24px] shadow-2xl border border-white flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 px-6 bg-white dark:bg-[#181224] border-b border-[#eae3ee] dark:border-[#2e1d4d] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#f1e9fb] text-[#6d46b8] flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-[#2e2440] dark:text-white">
                    {editingPostId 
                      ? 'Edit Article' 
                      : formStatus === 'draft' 
                      ? 'Create New Draft' 
                      : 'Write New Article'}
                  </h3>
                  <p className="text-xs text-[#726c85] dark:text-[#b5a9cd]">
                    {editingPostId 
                      ? 'Update post metadata, author bio, and save changes.' 
                      : formStatus === 'draft' 
                      ? 'Draft notes and working outline. Saved internally as a draft.' 
                      : 'Fill in metadata, upload cover image, and format rich content for publication.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-1 text-[#a29cb2] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Scrollable Body */}
            <form onSubmit={handleSavePost} noValidate className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
              {/* Language — first field, because it sets the writing direction
                  of everything below it. */}
              <div className="rounded-xl border border-[#eae3ee] dark:border-[#2e1d4d] bg-[#faf7fd] dark:bg-[#1c1430] p-4">
                <label
                  htmlFor="blog-language"
                  className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5 uppercase tracking-wider"
                >
                  Language *
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <select
                    id="blog-language"
                    value={formLanguage}
                    onChange={(e) => setFormLanguage(e.target.value as BlogLanguage)}
                    className="w-full sm:w-72 px-3.5 py-2.5 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden font-medium cursor-pointer"
                  >
                    {BLOG_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.flag}  {l.nativeName} — {l.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-[#6b6480] dark:text-[#b5a9cd] leading-snug">
                    The language this article is written in. It decides which archive the
                    post appears in.
                    {blogLanguageInfo(formLanguage).dir === 'rtl' && (
                      <span className="block font-semibold text-[#6d46b8] dark:text-[#d1b9f7] mt-0.5">
                        Right-to-left — the editor and the published page will both read RTL.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Title & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5 uppercase tracking-wider">
                    Article Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    dir={blogLanguageInfo(formLanguage).dir}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. How to Save Facebook Audio in 320kbps MP3"
                    className="w-full px-4 py-2.5 text-base font-semibold text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5 uppercase tracking-wider">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    required
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    onBlur={() => setFormSlug(cleanSlug(formSlug))}
                    placeholder="save-facebook-audio-mp3"
                    className="w-full px-3.5 py-2.5 text-xs font-mono text-[#6d46b8] bg-[#f6f0f4] dark:bg-[#201538] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
                  />
                  <p className="mt-1.5 text-[11px] font-mono text-[#726c85] dark:text-[#b5a9cd] break-all">
                    /blog/{cleanSlug(formSlug) || smartSlug(formTitle) || '…'}
                  </p>
                  {slugWarnings(cleanSlug(formSlug)).map((w) => (
                    <p key={w} className="text-[11px] text-amber-600 dark:text-amber-400">⚠ {w}</p>
                  ))}
                  {editingPostId && formSlug && blogPosts.find((p) => p.id === editingPostId)?.slug !== cleanSlug(formSlug) && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                      ↪ The old URL will 301-redirect here automatically after saving.
                    </p>
                  )}
                </div>
              </div>

              {/* Category, Read Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5 uppercase tracking-wider">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden font-medium cursor-pointer"
                  >
                    {blogCategories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5 uppercase tracking-wider">
                    Estimated Read Time
                  </label>
                  <input
                    type="text"
                    value={formReadTime}
                    onChange={(e) => setFormReadTime(e.target.value)}
                    placeholder="4 min read"
                    className="w-full px-3.5 py-2.5 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
                  />
                </div>
              </div>

              {/* Author Info Section (Name, Role, Bio) */}
              <div className="p-4 rounded-xl bg-[#f6f0f4] dark:bg-[#201538] border border-[#eae3ee] dark:border-[#2e1d4d] space-y-3">
                <span className="text-xs font-bold text-[#4b2e83] uppercase tracking-wider block">
                  Author Details & Bio Box
                </span>
                
                {/* Author photo — uploaded from the device, shown on the
                    post, the listing and the author box. */}
                <div className="flex items-center gap-3 mb-3">
                  <button type="button" onClick={() => setAvatarPickerOpen(true)} className="relative group cursor-pointer shrink-0 rounded-full" title="Choose author photo">
                    {formAuthorAvatar ? (
                      <img src={formAuthorAvatar} alt={formAuthorName} className="w-14 h-14 rounded-full object-cover border-2 border-[#eae3ee] dark:border-[#2e1d4d]" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-[#f1e9fb] dark:bg-[#241a38] border-2 border-dashed border-[#eae3ee] dark:border-[#2e1d4d] flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-[#6d46b8]" />
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center text-[9px] font-bold text-white transition-opacity opacity-0 group-hover:opacity-100">
                      Change
                    </div>
                  </button>
                  <MediaPicker open={avatarPickerOpen} title="Author photo" accept={['image']}
                    onClose={() => setAvatarPickerOpen(false)} onSelect={(f) => setFormAuthorAvatar(f.url)} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#2e2440] dark:text-white">Author Photo</p>
                    <p className="text-[11px] text-[#726c85] dark:text-[#b5a9cd]">Click the circle to choose from the Media Library or upload.</p>
                    {formAuthorAvatar && (
                      <button type="button" onClick={() => setFormAuthorAvatar('')}
                        className="text-[11px] font-bold text-rose-600 cursor-pointer mt-0.5">Remove photo</button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1">
                      Author Name
                    </label>
                    <input
                      type="text"
                      value={formAuthorName}
                      onChange={(e) => setFormAuthorName(e.target.value)}
                      placeholder="Admin"
                      className="w-full px-3 py-2 text-xs text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl outline-hidden focus:border-[#7c4fd1]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1">
                      Author Title / Role
                    </label>
                    <input
                      type="text"
                      value={formAuthorRole}
                      onChange={(e) => setFormAuthorRole(e.target.value)}
                      placeholder="Senior Video Specialist"
                      className="w-full px-3 py-2 text-xs text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl outline-hidden focus:border-[#7c4fd1]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1">
                    Short Bio (displayed in author bio box)
                  </label>
                  <textarea
                    rows={2}
                    value={formAuthorBio}
                    onChange={(e) => setFormAuthorBio(e.target.value)}
                    placeholder="Digital media strategist and technology reviewer..."
                    className="w-full px-3 py-2 text-xs text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl outline-hidden focus:border-[#7c4fd1] leading-relaxed"
                  />
                </div>
              </div>

              {/* Short Excerpt */}
              <div>
                <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5 uppercase tracking-wider">
                  Summary Excerpt (Meta Description) *
                </label>
                <textarea
                  rows={2}
                  required
                  value={formExcerpt}
                  dir={blogLanguageInfo(formLanguage).dir}
                  onChange={(e) => setFormExcerpt(e.target.value)}
                  placeholder="A concise 1-2 sentence preview for search engines and blog cards..."
                  className="w-full px-3.5 py-2 text-xs text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden leading-relaxed"
                />
              </div>

              {/* Cover Image: upload from the device first, URL still supported */}
              <div>
                <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5 uppercase tracking-wider">
                  Featured Image
                </label>

                {formCoverImage ? (
                  <div className="relative rounded-xl overflow-hidden border border-[#eae3ee] dark:border-[#2e1d4d] mb-2">
                    <img src={formCoverImage} alt="Featured image preview" className="w-full h-40 object-cover" />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button type="button" onClick={() => setCoverPickerOpen(true)}
                        className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-white/95 text-[#2e2440] cursor-pointer shadow-sm hover:bg-white">
                        Replace
                      </button>
                      <button type="button" onClick={handleCoverRemove}
                        className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-white/95 text-rose-600 cursor-pointer shadow-sm hover:bg-white">
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setCoverPickerOpen(true)}
                    className="flex flex-col items-center justify-center gap-1.5 w-full h-32 rounded-xl border-2 border-dashed cursor-pointer mb-2 transition-colors border-[#eae3ee] dark:border-[#2e1d4d] hover:border-[#6d46b8]">
                    <ImageIcon className="w-6 h-6 text-[#6d46b8]" />
                    <span className="text-xs font-bold text-[#2e2440] dark:text-white">Set Featured Image</span>
                    <span className="text-[11px] text-[#726c85] dark:text-[#b5a9cd]">Choose from the Media Library or upload a new image</span>
                  </button>
                )}

                {coverError && <p className="text-[11px] font-semibold text-rose-600 mb-2">{coverError}</p>}
                <MediaPicker open={coverPickerOpen} title="Featured image" accept={['image']}
                  onClose={() => setCoverPickerOpen(false)}
                  onSelect={(f) => { setFormCoverImage(f.url); setCoverError(''); }} />

                <details className="group">
                  <summary className="text-[11px] text-[#726c85] dark:text-[#b5a9cd] cursor-pointer select-none">Or paste an image URL / pick a preset</summary>
                  <div className="mt-2">
                    <input
                      type="text"
                      inputMode="url"
                      value={formCoverImage}
                      onChange={(e) => setFormCoverImage(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-3.5 py-2 text-xs text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden font-mono"
                    />
                    <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-1">
                      <span className="text-[11px] text-[#726c85] dark:text-[#b5a9cd] whitespace-nowrap">Presets:</span>
                      {imagePresets.map((img, idx) => (
                        <button type="button" key={idx} onClick={() => setFormCoverImage(img)}
                          className={`w-10 h-7 rounded-lg overflow-hidden border shrink-0 transition-transform ${
                            formCoverImage === img ? 'border-[#6d46b8] ring-2 ring-[#6d46b8]/30 scale-105' : 'border-[#eae3ee] dark:border-[#2e1d4d] opacity-70 hover:opacity-100'
                          }`}>
                          <img src={img} alt="Preset" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </details>
                {formCoverImage && (
                  <div className="mt-3">
                    <label className="block text-[11px] font-bold text-[#2e2440] dark:text-white mb-1">
                      Image ALT text <span className="font-normal text-[#726c85]">(describe the picture, include the focus keyword)</span>
                    </label>
                    <input
                      type="text"
                      maxLength={160}
                      value={formCoverImageAlt}
                      onChange={(e) => setFormCoverImageAlt(e.target.value)}
                      placeholder={formTitle || 'e.g. Downloading a Facebook reel in 1080p on a phone'}
                      className="w-full px-3.5 py-2 text-xs text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
                    />
                    {!formCoverImageAlt.trim() && (
                      <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">⚠ Empty — the post title will be used as ALT.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Content Editor with Formatting Toolbar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#2e2440] dark:text-white uppercase tracking-wider">
                    Article Body Content (Markdown Supported) *
                  </label>
                  <span className="text-[11px] text-[#726c85] dark:text-[#b5a9cd]">
                    Supports ## Headings, lists, quotes
                  </span>
                </div>

                {/* Formatting Toolbar */}
                <div className="flex items-center gap-1 p-1.5 bg-[#f6f0f4] dark:bg-[#201538] border border-[#eae3ee] dark:border-[#2e1d4d] border-b-0 rounded-t-xl overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => insertFormatting('**', '**')}
                    title="Bold"
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#181224] dark:hover:bg-[#181224] text-[#2e2440] dark:text-white cursor-pointer"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('*', '*')}
                    title="Italic"
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#181224] dark:hover:bg-[#181224] text-[#2e2440] dark:text-white cursor-pointer"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <div className="h-4 w-px bg-[#eae3ee] mx-1" />
                  <button
                    type="button"
                    onClick={() => insertFormatting('## ', '')}
                    title="Heading 2"
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#181224] dark:hover:bg-[#181224] text-[#2e2440] dark:text-white cursor-pointer"
                  >
                    <Heading1 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('### ', '')}
                    title="Heading 3"
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#181224] dark:hover:bg-[#181224] text-[#2e2440] dark:text-white cursor-pointer"
                  >
                    <Heading2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="h-4 w-px bg-[#eae3ee] mx-1" />
                  <button
                    type="button"
                    onClick={() => insertFormatting('- ', '')}
                    title="Bullet List"
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#181224] dark:hover:bg-[#181224] text-[#2e2440] dark:text-white cursor-pointer"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('[', '](/blog/)')}
                    title="Link: select the words, click, then put the page address inside ( )"
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#181224] text-[#2e2440] dark:text-white cursor-pointer inline-flex items-center gap-1"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold">Link</span>
                  </button>
                  <button
                    type="button"
                    title="Insert an image from the Media Library"
                    onClick={() => setInlinePickerOpen(true)}
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#181224] text-[#2e2440] dark:text-white cursor-pointer inline-flex items-center gap-1"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold">Image</span>
                  </button>
                  <MediaPicker open={inlinePickerOpen} title="Insert image into the post" accept={['image']}
                    onClose={() => setInlinePickerOpen(false)} onSelect={(f) => handleInlineImagePicked(f.url)} />
                  {inlineError && (
                    <span className="text-[10px] font-semibold text-rose-600 ml-1">{inlineError}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => insertFormatting('> ', '')}
                    title="Blockquote"
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#181224] dark:hover:bg-[#181224] text-[#2e2440] dark:text-white cursor-pointer"
                  >
                    <Quote className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('`', '`')}
                    title="Inline Code"
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#181224] dark:hover:bg-[#181224] text-[#2e2440] dark:text-white cursor-pointer"
                  >
                    <Code className="w-3.5 h-3.5" />
                  </button>
                </div>

                <textarea
                  id="blog-content-area"
                  rows={10}
                  required
                  value={formContent}
                  dir={blogLanguageInfo(formLanguage).dir}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder={"Write your article here.\n\nStart with a short paragraph that uses your focus keyword.\n\n## First main section (H2)\nShort paragraphs, 2-4 sentences.\n\n### Sub-section (H3)\n- Bullet point\n- Bullet point\n\nLinks: [link text](/blog/other-post-slug)"}
                  className="w-full p-4 text-sm font-sans text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-b-xl focus:border-[#7c4fd1] outline-hidden leading-relaxed resize-y font-normal"
                />
              </div>

              {/* SEO & Search Engine Configuration Section */}
              <BlogSeoConfigSection
                metaTitle={formMetaTitle}
                onMetaTitleChange={setFormMetaTitle}
                metaDescription={formMetaDescription}
                onMetaDescriptionChange={setFormMetaDescription}
                metaKeywords={formMetaKeywords}
                onMetaKeywordsChange={setFormMetaKeywords}
                canonicalUrl={formCanonicalUrl}
                onCanonicalUrlChange={setFormCanonicalUrl}
                postTitle={formTitle}
                postExcerpt={formExcerpt}
                postSlug={formSlug}
                postCategory={formCategory}
              />

              {/* Status Selector */}
              <div className="p-4 rounded-xl bg-[#f6f0f4] dark:bg-[#201538] border border-[#eae3ee] dark:border-[#2e1d4d] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-[#2e2440] dark:text-white uppercase tracking-wider block">
                    Publication Status
                  </span>
                  <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] mt-0.5">
                    {formStatus === 'published'
                      ? 'Will appear immediately on public blog directory and RSS.'
                      : 'Saved as draft. Only visible within this admin dashboard.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormStatus('draft')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      formStatus === 'draft'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-white dark:bg-[#181224] text-[#726c85] dark:text-[#b5a9cd] border border-[#eae3ee] dark:border-[#2e1d4d]'
                    }`}
                  >
                    Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStatus('published')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      formStatus === 'published'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-[#181224] text-[#726c85] dark:text-[#b5a9cd] border border-[#eae3ee] dark:border-[#2e1d4d]'
                    }`}
                  >
                    Published
                  </button>
                </div>
              </div>

              {/* Details for the image just uploaded into the post */}
              {pendingImageUrl && (
                <div className="rounded-2xl border border-[#6d46b8]/40 bg-[#f6f0f4] dark:bg-[#241a38] p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <img src={pendingImageUrl} alt="" className="w-24 h-16 object-cover rounded-lg border border-[#eae3ee] dark:border-[#2e1d4d]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-extrabold text-[#2e2440] dark:text-white mb-1">Image details</p>
                      <input
                        value={imgAlt}
                        onChange={(e) => setImgAlt(e.target.value)}
                        placeholder="Alt text — describe the image (helps SEO and screen readers)"
                        className="w-full px-3 py-1.5 mb-2 text-xs rounded-lg border border-[#eae3ee] dark:border-[#2e1d4d] bg-white dark:bg-[#181224] text-[#2e2440] dark:text-white outline-hidden focus:border-[#7c4fd1]"
                      />
                      <input
                        value={imgCaption}
                        onChange={(e) => setImgCaption(e.target.value)}
                        placeholder="Caption shown under the image (optional)"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#eae3ee] dark:border-[#2e1d4d] bg-white dark:bg-[#181224] text-[#2e2440] dark:text-white outline-hidden focus:border-[#7c4fd1]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-[#726c85] dark:text-[#b5a9cd]">Align:</span>
                      {(['left', 'center', 'right'] as const).map((a) => (
                        <button key={a} type="button" onClick={() => setImgAlign(a)}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg cursor-pointer capitalize ${
                            imgAlign === a ? 'bg-[#6d46b8] text-white' : 'bg-white dark:bg-[#181224] text-[#726c85] dark:text-[#b5a9cd] border border-[#eae3ee] dark:border-[#2e1d4d]'
                          }`}>{a}</button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-[#726c85] dark:text-[#b5a9cd]">Size:</span>
                      {(['small', 'medium', 'large'] as const).map((s) => (
                        <button key={s} type="button" onClick={() => setImgSize(s)}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg cursor-pointer capitalize ${
                            imgSize === s ? 'bg-[#6d46b8] text-white' : 'bg-white dark:bg-[#181224] text-[#726c85] dark:text-[#b5a9cd] border border-[#eae3ee] dark:border-[#2e1d4d]'
                          }`}>{s}</button>
                      ))}
                    </div>
                    <div className="ml-auto flex gap-2">
                      <button type="button" onClick={cancelInlineImage}
                        className="px-3 py-1.5 text-[11px] font-bold text-[#726c85] dark:text-[#b5a9cd] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-lg cursor-pointer">Cancel</button>
                      <button type="button" onClick={confirmInlineImage}
                        className="px-4 py-1.5 text-[11px] font-bold text-white bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] rounded-lg cursor-pointer">Insert Image</button>
                    </div>
                  </div>
                  <p className="text-[10px] text-[#726c85] dark:text-[#b5a9cd]">Left and right alignment applies on wider screens; on phones the image always fills the width.</p>
                </div>
              )}

              {/* Form Action Buttons */}
              {saveError && (
                <p className="text-xs font-semibold text-rose-600 text-right" role="alert">{saveError}</p>
              )}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#eae3ee] dark:border-[#2e1d4d]">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-[#726c85] dark:text-[#b5a9cd] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#6d46b8] to-[#e6799f] hover:opacity-95 rounded-xl shadow-md cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{formStatus === 'published' ? 'Publish Article' : 'Save Draft'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) for quick New Post / Draft creation */}
      {!isEditorOpen && activeTab === 'articles' && (
        <BlogActionFAB
          onNewPost={() => handleOpenCreate('published')}
          onNewDraft={() => handleOpenCreate('draft')}
        />
      )}
    </div>
  );
};
