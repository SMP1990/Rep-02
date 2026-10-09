import React, { useState, useMemo } from 'react';
import { useAdmin } from '../context/AdminContext';
import { BlogCategory } from '../types/admin';
import { 
  Tag,
  Plus,
  Edit3,
  Trash2,
  Search,
  AlertTriangle,
  Check,
  X,
  BookOpen,
  Copy,
  CheckCircle2,
  FolderKanban 
} from 'lucide-react';
import { smartSlug, cleanSlug } from '../utils/slug.ts';

export const BlogCategoriesManager: React.FC = () => {
  const { 
    blogCategories, 
    blogPosts, 
    addBlogCategory, 
    updateBlogCategory, 
    deleteBlogCategory,
    showToast 
  } = useAdmin();

  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state for Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(null);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formColor, setFormColor] = useState<BlogCategory['color']>('purple');
  const [formError, setFormError] = useState<string | null>(null);

  // Delete modal state
  const [deletingCategory, setDeletingCategory] = useState<BlogCategory | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState<string>('');

  // Copied slug state
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const COLOR_PALETTES: { id: BlogCategory['color']; label: string; bg: string; text: string; dot: string; border: string }[] = [
    { id: 'purple', label: 'Royal Purple', bg: 'bg-[#f1e9fb]', text: 'text-[#4b2e83]', dot: 'bg-[#6d46b8]', border: 'border-[#7c4fd1]/30' },
    { id: 'pink', label: 'Rose Pink', bg: 'bg-[#fdedf1]', text: 'text-[#c84d78]', dot: 'bg-[#e6799f]', border: 'border-[#e6799f]/30' },
    { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-50', text: 'text-indigo-800', dot: 'bg-indigo-600', border: 'border-indigo-300' },
    { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-50', text: 'text-emerald-800', dot: 'bg-emerald-600', border: 'border-emerald-300' },
    { id: 'amber', label: 'Warm Amber', bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-amber-500', border: 'border-amber-300' },
    { id: 'blue', label: 'Ocean Blue', bg: 'bg-sky-50', text: 'text-sky-800', dot: 'bg-sky-500', border: 'border-sky-300' },
  ];

  const getColorConfig = (color?: string) => {
    return COLOR_PALETTES.find(c => c.id === color) || COLOR_PALETTES[0];
  };

  // Filter categories by query
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return blogCategories;
    return blogCategories.filter(cat => 
      cat.name.toLowerCase().includes(q) ||
      cat.slug.toLowerCase().includes(q) ||
      (cat.description && cat.description.toLowerCase().includes(q))
    );
  }, [blogCategories, searchQuery]);

  // Statistics
  const totalPostsCount = blogPosts.length;
  
  const mostPopulatedCategory = useMemo(() => {
    if (blogCategories.length === 0) return null;
    let max = -1;
    let popular: { cat: BlogCategory; count: number } | null = null;
    blogCategories.forEach(cat => {
      const count = blogPosts.filter(p => p.category === cat.name).length;
      if (count > max) {
        max = count;
        popular = { cat, count };
      }
    });
    return popular;
  }, [blogCategories, blogPosts]);

  // Category slugs follow the same keyword-only rules as post slugs.
  const generateSlug = (text: string) => smartSlug(text) || cleanSlug(text);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormName('');
    setFormSlug('');
    setFormDesc('');
    setFormColor('purple');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: BlogCategory) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormDesc(cat.description || '');
    setFormColor(cat.color || 'purple');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingCategory) {
      setFormSlug(generateSlug(val));
    }
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = formName.trim();
    const trimmedSlug = formSlug.trim() || generateSlug(trimmedName);

    if (!trimmedName) {
      setFormError('Category name is required.');
      return;
    }

    if (editingCategory) {
      const res = updateBlogCategory(editingCategory.id, {
        name: trimmedName,
        slug: trimmedSlug,
        description: formDesc.trim(),
        color: formColor,
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to update category.');
        return;
      }
    } else {
      const res = addBlogCategory({
        name: trimmedName,
        slug: trimmedSlug,
        description: formDesc.trim(),
        color: formColor,
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to add category.');
        return;
      }
    }

    setIsModalOpen(false);
  };

  const handleOpenDelete = (cat: BlogCategory) => {
    if (blogCategories.length <= 1) {
      showToast('You must maintain at least one category.', 'error');
      return;
    }
    setDeletingCategory(cat);
    const other = blogCategories.filter(c => c.id !== cat.id);
    setReassignTargetId(other[0]?.id || '');
  };

  const handleConfirmDelete = () => {
    if (!deletingCategory) return;
    deleteBlogCategory(deletingCategory.id, reassignTargetId);
    setDeletingCategory(null);
  };

  const copySlugToClipboard = (slug: string) => {
    navigator.clipboard.writeText(`/category/${slug}`);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER & QUICK STATS */}
      <div className="bg-white dark:bg-[#181224] rounded-[22px] p-6 sm:p-8 shadow-[0_10px_30px_rgba(140,80,120,0.08)] border border-[#e6799f]/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#f1e9fb]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-[#f1e9fb] text-[#6d46b8]">
                <FolderKanban className="w-5 h-5" />
              </span>
              <h3 className="font-heading text-xl font-bold text-[#2e2440] dark:text-white">
                Blog Category Management
              </h3>
            </div>
            <p className="text-xs text-[#726c85] dark:text-[#b5a9cd]">
              Create, edit, and categorize SEO tutorials, video download guides, and public reader filters.
            </p>
          </div>

          <button
            id="btn-add-new-category"
            onClick={handleOpenAdd}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#6d46b8] to-[#e6799f] hover:opacity-95 shadow-md flex items-center gap-2 cursor-pointer self-start md:self-auto transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Category</span>
          </button>
        </div>

        {/* METRICS STRIP */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
          <div className="p-4 rounded-xl bg-[#f6f0f4] dark:bg-[#201538] border border-[#eae3ee] dark:border-[#2e1d4d]">
            <p className="text-[11px] font-bold text-[#726c85] dark:text-[#b5a9cd] uppercase tracking-wider">Total Categories</p>
            <p className="text-2xl font-extrabold text-[#4b2e83] mt-1">{blogCategories.length}</p>
            <p className="text-[11px] text-[#726c85] dark:text-[#b5a9cd] mt-0.5">Used across blog articles</p>
          </div>

          <div className="p-4 rounded-xl bg-[#f6f0f4] dark:bg-[#201538] border border-[#eae3ee] dark:border-[#2e1d4d]">
            <p className="text-[11px] font-bold text-[#726c85] dark:text-[#b5a9cd] uppercase tracking-wider">Total Articles Categorized</p>
            <p className="text-2xl font-extrabold text-[#2e2440] dark:text-white mt-1">{totalPostsCount}</p>
            <p className="text-[11px] text-[#726c85] dark:text-[#b5a9cd] mt-0.5">100% assigned to active taxonomy</p>
          </div>

          <div className="p-4 rounded-xl bg-[#f6f0f4] dark:bg-[#201538] border border-[#eae3ee] dark:border-[#2e1d4d]">
            <p className="text-[11px] font-bold text-[#726c85] dark:text-[#b5a9cd] uppercase tracking-wider">Most Active Category</p>
            <p className="text-lg font-bold text-[#6d46b8] mt-1.5 truncate">
              {mostPopulatedCategory ? mostPopulatedCategory.cat.name : 'None'}
            </p>
            <p className="text-[11px] text-[#726c85] dark:text-[#b5a9cd] mt-0.5">
              {mostPopulatedCategory ? `${mostPopulatedCategory.count} articles published` : 'No articles yet'}
            </p>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="bg-white dark:bg-[#181224] rounded-2xl p-4 shadow-[0_10px_30px_rgba(140,80,120,0.08)] border border-[#e6799f]/10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-[#a29cb2] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-categories"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories by name, slug, or description..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm text-[#2e2440] dark:text-white bg-[#f6f0f4] dark:bg-[#201538] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:bg-white dark:focus:bg-[#181224] dark:focus:bg-[#181224] focus:border-[#7c4fd1] outline-hidden transition-all"
          />
        </div>

        <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] self-end sm:self-center">
          Showing <strong className="text-[#4b2e83]">{filteredCategories.length}</strong> of {blogCategories.length} categories
        </p>
      </div>

      {/* CATEGORIES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredCategories.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white dark:bg-[#181224] rounded-[22px] border border-[#e6799f]/15 p-6">
            <Tag className="w-10 h-10 text-[#a29cb2] mx-auto mb-3 opacity-50" />
            <h4 className="font-heading font-bold text-base text-[#2e2440] dark:text-white">No categories found</h4>
            <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] mt-1 mb-4">Try a different search query or create a new category.</p>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#6d46b8] to-[#e6799f] rounded-xl cursor-pointer"
            >
              Add First Category
            </button>
          </div>
        ) : (
          filteredCategories.map((cat) => {
            const colorCfg = getColorConfig(cat.color);
            const attachedPosts = blogPosts.filter(p => p.category === cat.name);
            const postCount = attachedPosts.length;

            return (
              <div
                key={cat.id}
                className="bg-white dark:bg-[#181224] rounded-2xl p-5 sm:p-6 shadow-[0_10px_30px_rgba(140,80,120,0.06)] border border-[#e6799f]/10 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Category Header with Badge and Post Count */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${colorCfg.bg} ${colorCfg.text} border ${colorCfg.border}`}>
                      <span className={`w-2 h-2 rounded-full ${colorCfg.dot}`} />
                      {cat.name}
                    </span>

                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#f6f0f4] dark:bg-[#201538] text-[#726c85] dark:text-[#b5a9cd] border border-[#eae3ee] dark:border-[#2e1d4d]">
                      {postCount} {postCount === 1 ? 'article' : 'articles'}
                    </span>
                  </div>

                  {/* Slug and Description */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-[#6d46b8] bg-[#f1e9fb] px-2 py-0.5 rounded-md">
                      /category/{cat.slug}
                    </span>
                    <button
                      type="button"
                      onClick={() => copySlugToClipboard(cat.slug)}
                      title="Copy URL slug"
                      className="p-1 text-[#a29cb2] hover:text-[#4b2e83] transition-colors cursor-pointer"
                    >
                      {copiedSlug === cat.slug ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] leading-relaxed mb-4 min-h-[36px]">
                    {cat.description || 'No editorial guidance provided for this category.'}
                  </p>
                </div>

                {/* Footer Actions */}
                <div className="pt-4 border-t border-[#f1e9fb] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-[#a29cb2]">
                    {cat.createdAt ? `Created ${cat.createdAt}` : 'System taxonomy'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      id={`edit-cat-${cat.id}`}
                      onClick={() => handleOpenEdit(cat)}
                      className="px-3 py-1.5 text-xs font-semibold text-[#6d46b8] hover:bg-[#f1e9fb] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      id={`delete-cat-${cat.id}`}
                      onClick={() => handleOpenDelete(cat)}
                      className="px-3 py-1.5 text-xs font-semibold text-[#726c85] dark:text-[#b5a9cd] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      title={blogCategories.length <= 1 ? "Cannot delete the only remaining category" : "Delete category"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE / EDIT CATEGORY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-[#181224] rounded-[24px] p-6 sm:p-8 shadow-2xl border border-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#f1e9fb] mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#f1e9fb] text-[#6d46b8] flex items-center justify-center">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-[#2e2440] dark:text-white">
                    {editingCategory ? 'Edit Blog Category' : 'Create Blog Category'}
                  </h3>
                  <p className="text-xs text-[#726c85] dark:text-[#b5a9cd]">
                    {editingCategory ? 'Modify category name, slug, or theme color.' : 'Define a new taxonomy category for publishing articles.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-[#a29cb2] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSubmit} className="space-y-4">
              {/* Category Name */}
              <div>
                <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5 uppercase tracking-wider">
                  Category Name *
                </label>
                <input
                  id="input-category-name"
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Mobile & iOS"
                  className="w-full px-4 py-2.5 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden font-medium"
                />
              </div>

              {/* URL Slug */}
              <div>
                <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5 uppercase tracking-wider">
                  URL Slug
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2.5 text-xs text-[#726c85] dark:text-[#b5a9cd] bg-[#f6f0f4] dark:bg-[#201538] border border-r-0 border-[#eae3ee] dark:border-[#2e1d4d] rounded-l-xl select-none">
                    /category/
                  </span>
                  <input
                    id="input-category-slug"
                    type="text"
                    required
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="mobile-ios"
                    className="w-full px-3.5 py-2.5 text-xs font-mono text-[#6d46b8] bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-r-xl focus:border-[#7c4fd1] outline-hidden"
                  />
                </div>
              </div>

              {/* Color Theme Selector */}
              <div>
                <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-2 uppercase tracking-wider">
                  Badge Color Palette
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {COLOR_PALETTES.map((palette) => (
                    <button
                      key={palette.id}
                      type="button"
                      onClick={() => setFormColor(palette.id)}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all text-xs font-bold ${
                        formColor === palette.id
                          ? `${palette.bg} ${palette.text} ${palette.border} ring-2 ring-[#7c4fd1]/40`
                          : 'bg-white dark:bg-[#181224] border-[#eae3ee] dark:border-[#2e1d4d] text-[#726c85] dark:text-[#b5a9cd] hover:bg-[#f6f0f4] dark:hover:bg-[#201538]'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${palette.dot}`} />
                      <span className="truncate">{palette.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5 uppercase tracking-wider">
                  Editorial Guidance / Description
                </label>
                <textarea
                  id="input-category-desc"
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Explain what types of articles should be tagged with this category..."
                  className="w-full px-4 py-2.5 text-xs text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden leading-relaxed"
                />
              </div>

              {/* Live Preview Box */}
              <div className="p-3.5 rounded-xl bg-[#f6f0f4] dark:bg-[#201538] border border-[#eae3ee] dark:border-[#2e1d4d]">
                <p className="text-[11px] font-bold text-[#726c85] dark:text-[#b5a9cd] mb-2 uppercase tracking-wider">
                  Live Tag Preview
                </p>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${getColorConfig(formColor).bg} ${getColorConfig(formColor).text} border ${getColorConfig(formColor).border}`}>
                    <span className={`w-2 h-2 rounded-full ${getColorConfig(formColor).dot}`} />
                    {formName.trim() || 'Preview Name'}
                  </span>
                  <span className="text-[11px] text-[#726c85] dark:text-[#b5a9cd]">
                    Shows on article hero and card badges
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#f1e9fb]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#726c85] dark:text-[#b5a9cd] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-category"
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#6d46b8] to-[#e6799f] rounded-xl shadow-md cursor-pointer hover:opacity-95 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingCategory ? 'Update Category' : 'Save Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE & REASSIGN CONFIRMATION MODAL */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#181224] rounded-[24px] p-6 sm:p-7 shadow-2xl border border-white">
            <div className="flex items-center gap-3 mb-4 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-[#2e2440] dark:text-white">
                  Delete Category "{deletingCategory.name}"?
                </h3>
                <p className="text-xs text-[#726c85] dark:text-[#b5a9cd]">
                  This action removes the category from the blog taxonomy.
                </p>
              </div>
            </div>

            {/* Check if posts use this category */}
            {(() => {
              const affectedPosts = blogPosts.filter(p => p.category === deletingCategory.name);
              const remainingCategories = blogCategories.filter(c => c.id !== deletingCategory.id);

              return (
                <div className="space-y-4 text-xs text-[#726c85] dark:text-[#b5a9cd]">
                  {affectedPosts.length > 0 ? (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 space-y-2">
                      <p className="font-bold flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-amber-700" />
                        <span>{affectedPosts.length} article(s) are currently in this category:</span>
                      </p>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                        {affectedPosts.slice(0, 3).map(p => (
                          <li key={p.id} className="truncate">{p.title}</li>
                        ))}
                        {affectedPosts.length > 3 && (
                          <li>...and {affectedPosts.length - 3} more</li>
                        )}
                      </ul>
                      <div className="pt-2">
                        <label className="block text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                          Reassign these articles to:
                        </label>
                        <select
                          value={reassignTargetId}
                          onChange={(e) => setReassignTargetId(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-amber-300 rounded-lg outline-hidden font-semibold"
                        >
                          {remainingCategories.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#726c85] dark:text-[#b5a9cd]">
                      No blog articles currently use this category. It will be removed immediately.
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#f1e9fb]">
                    <button
                      type="button"
                      onClick={() => setDeletingCategory(null)}
                      className="px-4 py-2 text-xs font-semibold text-[#726c85] dark:text-[#b5a9cd] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      id="btn-confirm-delete-category"
                      type="button"
                      onClick={handleConfirmDelete}
                      className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm cursor-pointer transition-colors"
                    >
                      Delete Category
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
