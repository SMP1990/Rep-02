import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { TopHeader } from '../components/TopHeader';
import { normalizeLegalPages } from '../components/LegalPagesEditor';
import { PagesWorkspace } from '../components/pagesEditor/PagesWorkspace';
import { INITIAL_LANDING_CONTENT } from '../data/mockAdminData';
import { pagesDirtyKeys } from '../components/pagesEditor/pageList';
import { useUnsavedGuard } from '../utils/unsavedGuard';
import { PageTranslationsEditor } from '../components/PageTranslationsEditor';
import { FeatureItem, FaqItem } from '../types/admin';
import { 
  Sparkles,
  HelpCircle,
  Check,
  Plus,
  Trash2,
  RotateCcw,
  Eye,
  X,
  Layers,
  FileText,
  Languages
} from 'lucide-react';

interface ContentEditorPageProps {
  onOpenMobileMenu: () => void;
}

export const ContentEditorPage: React.FC<ContentEditorPageProps> = ({ onOpenMobileMenu }) => {
  const { 
    landingContent, 
    updateHeroContent, 
    updateFeaturesContent, 
    updateFaqsContent, 
    resetLandingContent,
    sitePages,
    updateSitePages,
    siteSettings
  } = useAdmin();

  const [activeTab, setActiveTab] = useState<'hero' | 'features' | 'faqs' | 'pages' | 'translations'>('hero');

  // Hero form local state
  const [heroForm, setHeroForm] = useState(landingContent.hero);
  const [pagesForm, setPagesForm] = useState<any>(sitePages);

  // Pages with unsaved changes: drives the save bar, the dots in the page
  // list and on the Pages tab, and the "leave without saving?" warning.
  const pagesDirty = React.useMemo(() => pagesDirtyKeys(pagesForm, sitePages, normalizeLegalPages), [pagesForm, sitePages]);
  useUnsavedGuard(pagesDirty.length > 0, 'You have unsaved changes in Pages. Leave without saving?');
  const savePages = React.useCallback(() => {
    const next = normalizeLegalPages(pagesForm);
    setPagesForm(next);
    updateSitePages(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagesForm]);

  // The site config arrives from the server a moment after the page
  // mounts; without this the editor would keep showing the defaults.
  const pagesTouched = React.useRef(false);
  React.useEffect(() => {
    if (!pagesTouched.current) setPagesForm(sitePages);
  }, [sitePages]);

  // Features local state
  const [featuresList, setFeaturesList] = useState<FeatureItem[]>(landingContent.features);
  const [showAddFeatureModal, setShowAddFeatureModal] = useState(false);
  const [newFeatureTitle, setNewFeatureTitle] = useState('');
  const [newFeatureDesc, setNewFeatureDesc] = useState('');
  const [newFeatureIcon, setNewFeatureIcon] = useState<FeatureItem['iconName']>('Sparkles');

  // FAQ local state
  const [faqsList, setFaqsList] = useState<FaqItem[]>(landingContent.faqs);
  const [showAddFaqModal, setShowAddFaqModal] = useState(false);
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');
  const [newFaqCategory, setNewFaqCategory] = useState('General');

  // Live Preview Modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Handlers for Hero
  const handleSaveHero = (e: React.FormEvent) => {
    e.preventDefault();
    updateHeroContent(heroForm);
  };

  // Handlers for Features
  const handleFeatureChange = (id: string, field: keyof FeatureItem, value: string) => {
    setFeaturesList(prev =>
      prev.map(item => item.id === id ? { ...item, [field]: value } : item)
    );
  };

  const handleDeleteFeature = (id: string) => {
    const updated = featuresList.filter(f => f.id !== id);
    setFeaturesList(updated);
    updateFeaturesContent(updated);
  };

  const handleAddFeatureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeatureTitle.trim() || !newFeatureDesc.trim()) return;

    const newFeature: FeatureItem = {
      id: `feat_${Date.now()}`,
      title: newFeatureTitle.trim(),
      description: newFeatureDesc.trim(),
      iconName: newFeatureIcon,
    };

    const updated = [...featuresList, newFeature];
    setFeaturesList(updated);
    updateFeaturesContent(updated);
    setShowAddFeatureModal(false);
    setNewFeatureTitle('');
    setNewFeatureDesc('');
  };

  const handleSaveAllFeatures = () => {
    updateFeaturesContent(featuresList);
  };

  // Handlers for FAQs
  const handleFaqChange = (id: string, field: keyof FaqItem, value: string) => {
    setFaqsList(prev =>
      prev.map(faq => faq.id === id ? { ...faq, [field]: value } : faq)
    );
  };

  const handleDeleteFaq = (id: string) => {
    const updated = faqsList.filter(f => f.id !== id);
    setFaqsList(updated);
    updateFaqsContent(updated);
  };

  const handleAddFaqSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) return;

    const newFaq: FaqItem = {
      id: `faq_${Date.now()}`,
      question: newFaqQuestion.trim(),
      answer: newFaqAnswer.trim(),
      category: newFaqCategory,
    };

    const updated = [...faqsList, newFaq];
    setFaqsList(updated);
    updateFaqsContent(updated);
    setShowAddFaqModal(false);
    setNewFaqQuestion('');
    setNewFaqAnswer('');
  };

  const handleSaveAllFaqs = () => {
    updateFaqsContent(faqsList);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset the Hero, Features and FAQs to their built-in content? This saves at once and cannot be undone. Pages and Translations are not affected.')) {
      resetLandingContent();
      // The forms show the built-in content at once (landingContent here
      // still holds the old values until the next render).
      setHeroForm(INITIAL_LANDING_CONTENT.hero);
      setFeaturesList(INITIAL_LANDING_CONTENT.features);
      setFaqsList(INITIAL_LANDING_CONTENT.faqs);
    }
  };

  return (
    <div className="animate-fade-in">
      <TopHeader
        title="Landing Content Editor"
        subtitle={`Live CMS for the main ${siteSettings?.siteName || "site"} marketing hero, feature highlights, and FAQs.`}
        onOpenMobileMenu={onOpenMobileMenu}
        actionButton={{
          label: "Live Preview",
          onClick: () => setShowPreviewModal(true),
          icon: Eye,
        }}
      />

      {/* TABS NAVIGATION & ACTIONS BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-white dark:bg-[#181224] rounded-2xl shadow-[0_10px_30px_rgba(140,80,120,0.08)] border border-[#e6799f]/15">
          <button
            onClick={() => setActiveTab('hero')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'hero'
                ? 'bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] text-white shadow-xs'
                : 'text-[#726c85] dark:text-[#b5a9cd] hover:text-[#4b2e83] hover:bg-[#f6f0f4] dark:hover:bg-[#201538]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Hero Section</span>
          </button>

          <button
            onClick={() => setActiveTab('features')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'features'
                ? 'bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] text-white shadow-xs'
                : 'text-[#726c85] dark:text-[#b5a9cd] hover:text-[#4b2e83] hover:bg-[#f6f0f4] dark:hover:bg-[#201538]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Features ({featuresList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('faqs')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'faqs'
                ? 'bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] text-white shadow-xs'
                : 'text-[#726c85] dark:text-[#b5a9cd] hover:text-[#4b2e83] hover:bg-[#f6f0f4] dark:hover:bg-[#201538]'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>FAQs ({faqsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('pages')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'pages'
                ? 'bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] text-white shadow-xs'
                : 'text-[#726c85] dark:text-[#b5a9cd] hover:text-[#4b2e83] hover:bg-[#f6f0f4] dark:hover:bg-[#201538]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Pages</span>
            {pagesDirty.length > 0 && <span className="w-2 h-2 rounded-full bg-amber-400" title="Unsaved changes" aria-label="Unsaved changes" />}
          </button>

          <button
            onClick={() => setActiveTab('translations')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'translations'
                ? 'bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] text-white shadow-xs'
                : 'text-[#726c85] dark:text-[#b5a9cd] hover:text-[#4b2e83] hover:bg-[#f6f0f4] dark:hover:bg-[#201538]'
            }`}
          >
            <Languages className="w-4 h-4" />
            <span>Translations</span>
          </button>

        </div>

        {/* Resets the Hero, Features and FAQs only, so it shows only on those tabs.
            Each page in the Pages tab has its own reset in its header. */}
        {(activeTab === 'hero' || activeTab === 'features' || activeTab === 'faqs') && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDefaults}
            title="Reset the Hero, Features and FAQs to their built-in content"
            className="px-3.5 py-2 text-xs font-semibold text-[#726c85] dark:text-[#b5a9cd] hover:text-rose-600 bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl hover:bg-rose-50 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset landing content</span>
          </button>
        </div>
        )}
      </div>

      {/* PAGES: About Us, Contact, Privacy, Terms and Legal — list on the left, one page's editor on the right */}
      {activeTab === 'pages' && (
        <PagesWorkspace
          pagesForm={pagesForm}
          dirtyKeys={pagesDirty}
          onChange={(next) => { pagesTouched.current = true; setPagesForm(next); }}
          onSave={savePages}
          onDiscard={() => { pagesTouched.current = false; setPagesForm(sitePages); }}
        />
      )}

      {/* TAB 1: HERO SECTION */}
      {activeTab === 'hero' && (
        <div className="bg-white dark:bg-[#181224] rounded-[22px] p-6 sm:p-8 shadow-[0_10px_30px_rgba(140,80,120,0.08)] border border-[#e6799f]/10">
          <div className="flex items-center justify-between pb-4 border-b border-[#f1e9fb] mb-6">
            <div>
              <h3 className="font-heading text-xl font-bold text-[#2e2440] dark:text-white">
                Hero Banner Content
              </h3>
              <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] mt-0.5">
                The primary headline, description, button labels, and trust slogans displayed to visitors.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#f1e9fb] text-[#6d46b8]">
              Primary Viewport
            </span>
          </div>

          <form onSubmit={handleSaveHero} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-2 uppercase tracking-wider">
                Hero Heading *
              </label>
              <input
                type="text"
                required
                value={heroForm.heading}
                onChange={(e) => setHeroForm({ ...heroForm, heading: e.target.value })}
                className="w-full px-4 py-3 text-base font-semibold text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] focus:ring-3 focus:ring-[#7c4fd1]/15 outline-hidden"
              />
              <p className="text-[11px] text-[#a29cb2] mt-1">Write <span className="font-mono font-bold">{'{platform}'}</span> where the rotating platform name (Facebook, TikTok, …) should appear. Leave it out to show plain text. Keep under 55 characters for mobile impact.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-2 uppercase tracking-wider">
                Hero Subtitle / Description *
              </label>
              <textarea
                rows={3}
                required
                value={heroForm.subtitle}
                onChange={(e) => setHeroForm({ ...heroForm, subtitle: e.target.value })}
                className="w-full px-4 py-3 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] focus:ring-3 focus:ring-[#7c4fd1]/15 outline-hidden leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-2 uppercase tracking-wider">
                  CTA Button Label
                </label>
                <input
                  type="text"
                  value={heroForm.ctaText}
                  onChange={(e) => setHeroForm({ ...heroForm, ctaText: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-2 uppercase tracking-wider">
                  Search Input Placeholder
                </label>
                <input
                  type="text"
                  value={heroForm.inputPlaceholder}
                  onChange={(e) => setHeroForm({ ...heroForm, inputPlaceholder: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-2 uppercase tracking-wider">
                  Social Proof / Trust Badge
                </label>
                <input
                  type="text"
                  value={heroForm.trustBadge}
                  onChange={(e) => setHeroForm({ ...heroForm, trustBadge: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-2 uppercase tracking-wider">
                  Compliance / Sub-Notice
                </label>
                <input
                  type="text"
                  value={heroForm.noticeText}
                  onChange={(e) => setHeroForm({ ...heroForm, noticeText: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#f1e9fb] flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-[#6d46b8] to-[#e6799f] hover:opacity-95 rounded-xl shadow-md shadow-[#7c4fd1]/20 cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Save Hero Section</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: FEATURES SECTION */}
      {activeTab === 'features' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading text-xl font-bold text-[#2e2440] dark:text-white">
                Feature Highlights Cards
              </h3>
              <p className="text-xs text-[#726c85] dark:text-[#b5a9cd]">
                Six value propositions shown beneath the downloader interface.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddFeatureModal(true)}
                className="px-4 py-2 text-xs font-bold text-white bg-[#6d46b8] hover:bg-[#5b3a9e] rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Feature</span>
              </button>

              <button
                onClick={handleSaveAllFeatures}
                className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#6d46b8] to-[#e6799f] rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save All Changes</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featuresList.map((feat) => (
              <div
                key={feat.id}
                className="bg-white dark:bg-[#181224] rounded-[20px] p-5 shadow-[0_10px_30px_rgba(140,80,120,0.08)] border border-[#e6799f]/10 relative group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#f1e9fb] text-[#6d46b8] flex items-center justify-center font-bold text-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <button
                    onClick={() => handleDeleteFeature(feat.id)}
                    title="Delete feature card"
                    className="p-1.5 text-[#a29cb2] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#726c85] dark:text-[#b5a9cd] uppercase tracking-wider mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={feat.title}
                      onChange={(e) => handleFeatureChange(feat.id, 'title', e.target.value)}
                      className="w-full px-3 py-2 text-sm font-semibold text-[#2e2440] dark:text-white bg-[#f6f0f4] dark:bg-[#201538] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:bg-white dark:focus:bg-[#181224] dark:focus:bg-[#181224] focus:border-[#7c4fd1] outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#726c85] dark:text-[#b5a9cd] uppercase tracking-wider mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={feat.description}
                      onChange={(e) => handleFeatureChange(feat.id, 'description', e.target.value)}
                      className="w-full px-3 py-2 text-xs text-[#2e2440] dark:text-white bg-[#f6f0f4] dark:bg-[#201538] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:bg-white dark:focus:bg-[#181224] dark:focus:bg-[#181224] focus:border-[#7c4fd1] outline-hidden leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: FAQ SECTION */}
      {activeTab === 'faqs' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading text-xl font-bold text-[#2e2440] dark:text-white">
                Frequently Asked Questions (FAQ)
              </h3>
              <p className="text-xs text-[#726c85] dark:text-[#b5a9cd]">
                Answers displayed to help users navigate legal, audio, and device download questions.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddFaqModal(true)}
                className="px-4 py-2 text-xs font-bold text-white bg-[#6d46b8] hover:bg-[#5b3a9e] rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add FAQ</span>
              </button>

              <button
                onClick={handleSaveAllFaqs}
                className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#6d46b8] to-[#e6799f] rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save All FAQs</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {faqsList.map((faq, index) => (
              <div
                key={faq.id}
                className="bg-white dark:bg-[#181224] rounded-[20px] p-5 shadow-[0_10px_30px_rgba(140,80,120,0.08)] border border-[#e6799f]/10"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#f1e9fb] text-[#6d46b8] font-bold text-xs flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-xs font-bold text-[#d9628c] uppercase tracking-wider">
                      {faq.category || 'General'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteFaq(faq.id)}
                    title="Delete FAQ"
                    className="p-1.5 text-[#a29cb2] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#726c85] dark:text-[#b5a9cd] uppercase tracking-wider mb-1">
                      Question
                    </label>
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) => handleFaqChange(faq.id, 'question', e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm font-semibold text-[#2e2440] dark:text-white bg-[#f6f0f4] dark:bg-[#201538] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:bg-white dark:focus:bg-[#181224] dark:focus:bg-[#181224] focus:border-[#7c4fd1] outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#726c85] dark:text-[#b5a9cd] uppercase tracking-wider mb-1">
                      Answer
                    </label>
                    <textarea
                      rows={3}
                      value={faq.answer}
                      onChange={(e) => handleFaqChange(faq.id, 'answer', e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm text-[#2e2440] dark:text-white bg-[#f6f0f4] dark:bg-[#201538] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:bg-white dark:focus:bg-[#181224] dark:focus:bg-[#181224] focus:border-[#7c4fd1] outline-hidden leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TRANSLATIONS: the page text from the Pages tab in every language */}
      {activeTab === 'translations' && (
        <PageTranslationsEditor onGoToPages={() => setActiveTab('pages')} />
      )}

      {/* Blog categories now live in Blog Manager, where the rest of the
          blog is managed. */}

      {/* ADD FEATURE MODAL */}
      {showAddFeatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#181224] rounded-[22px] p-6 shadow-2xl border border-white">
            <div className="flex items-center justify-between pb-4 border-b border-[#f1e9fb] mb-4">
              <h3 className="font-heading font-bold text-lg text-[#2e2440] dark:text-white">
                Add Feature Card
              </h3>
              <button onClick={() => setShowAddFeatureModal(false)} className="p-1 text-[#a29cb2]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddFeatureSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1">Feature Title *</label>
                <input
                  type="text"
                  required
                  value={newFeatureTitle}
                  onChange={(e) => setNewFeatureTitle(e.target.value)}
                  placeholder="e.g. Ultra Fast 4K Support"
                  className="w-full px-3.5 py-2 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1">Feature Description *</label>
                <textarea
                  rows={3}
                  required
                  value={newFeatureDesc}
                  onChange={(e) => setNewFeatureDesc(e.target.value)}
                  placeholder="Explain the benefit for video viewers..."
                  className="w-full px-3.5 py-2 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1">Icon Theme</label>
                <select
                  value={newFeatureIcon}
                  onChange={(e) => setNewFeatureIcon(e.target.value as any)}
                  className="w-full px-3.5 py-2 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
                >
                  <option value="Sparkles">Sparkles (Quality)</option>
                  <option value="Zap">Lightning (Speed)</option>
                  <option value="Music">Music (Audio MP3)</option>
                  <option value="Shield">Shield (Safe & Private)</option>
                  <option value="Smartphone">Smartphone (Mobile)</option>
                  <option value="Layers">Layers (Universal)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#f1e9fb]">
                <button
                  type="button"
                  onClick={() => setShowAddFeatureModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#726c85] dark:text-[#b5a9cd] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#6d46b8] to-[#e6799f] rounded-xl shadow-sm"
                >
                  Save Feature
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD FAQ MODAL */}
      {showAddFaqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#181224] rounded-[22px] p-6 shadow-2xl border border-white">
            <div className="flex items-center justify-between pb-4 border-b border-[#f1e9fb] mb-4">
              <h3 className="font-heading font-bold text-lg text-[#2e2440] dark:text-white">
                Add FAQ Item
              </h3>
              <button onClick={() => setShowAddFaqModal(false)} className="p-1 text-[#a29cb2]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddFaqSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1">Question *</label>
                <input
                  type="text"
                  required
                  value={newFaqQuestion}
                  onChange={(e) => setNewFaqQuestion(e.target.value)}
                  placeholder="e.g. Can I download Facebook reels on iPad?"
                  className="w-full px-3.5 py-2 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1">Answer *</label>
                <textarea
                  rows={3}
                  required
                  value={newFaqAnswer}
                  onChange={(e) => setNewFaqAnswer(e.target.value)}
                  placeholder="Provide a clear, helpful response..."
                  className="w-full px-3.5 py-2 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1">Category</label>
                <select
                  value={newFaqCategory}
                  onChange={(e) => setNewFaqCategory(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
                >
                  <option value="General">General</option>
                  <option value="Privacy">Privacy & Copyright</option>
                  <option value="Mobile">Mobile Devices</option>
                  <option value="Audio">Audio & Formats</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#f1e9fb]">
                <button
                  type="button"
                  onClick={() => setShowAddFaqModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#726c85] dark:text-[#b5a9cd] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#6d46b8] to-[#e6799f] rounded-xl shadow-sm"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIVE PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-4xl max-h-[90vh] bg-[#f6f0f4] dark:bg-[#201538] rounded-[24px] shadow-2xl border border-white flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 px-6 bg-white dark:bg-[#181224] border-b border-[#eae3ee] dark:border-[#2e1d4d] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-[#4b2e83] ml-2">
                  Public Landing Page Live Simulator
                </span>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1 text-[#a29cb2] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulated Public Site Preview */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-12">
              {/* Simulated Hero */}
              <div className="text-center max-w-2xl mx-auto space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#fdedf1] text-[#d9628c]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{heroForm.trustBadge}</span>
                </div>
                <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#2e2440] dark:text-white leading-tight">
                  {heroForm.heading}
                </h1>
                <p className="text-sm sm:text-base text-[#726c85] dark:text-[#b5a9cd] leading-relaxed">
                  {heroForm.subtitle}
                </p>

                {/* Simulated Input */}
                <div className="pt-3 max-w-lg mx-auto">
                  <div className="p-2 bg-white dark:bg-[#181224] rounded-2xl shadow-lg border border-[#eae3ee] dark:border-[#2e1d4d] flex items-center gap-2">
                    <input
                      disabled
                      placeholder={heroForm.inputPlaceholder}
                      className="w-full px-3 py-2 text-xs text-[#726c85] dark:text-[#b5a9cd] bg-transparent outline-hidden"
                    />
                    <button
                      disabled
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#4b2e83] to-[#e6799f] whitespace-nowrap opacity-90"
                    >
                      {heroForm.ctaText}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#a29cb2] mt-2">
                    {heroForm.noticeText}
                  </p>
                </div>
              </div>

              {/* Simulated Features Grid */}
              <div className="space-y-4 pt-4 border-t border-[#eae3ee] dark:border-[#2e1d4d]">
                <h3 className="font-heading text-xl font-bold text-center text-[#2e2440] dark:text-white">
                  Core Highlights
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {featuresList.slice(0, 3).map((f) => (
                    <div key={f.id} className="p-4 bg-white dark:bg-[#181224] rounded-2xl border border-white shadow-sm">
                      <div className="w-8 h-8 rounded-lg bg-[#f1e9fb] text-[#6d46b8] flex items-center justify-center mb-2">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-sm text-[#2e2440] dark:text-white">{f.title}</h4>
                      <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] mt-1 leading-relaxed">{f.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Simulated FAQs */}
              <div className="space-y-4 pt-4 border-t border-[#eae3ee] dark:border-[#2e1d4d]">
                <h3 className="font-heading text-xl font-bold text-center text-[#2e2440] dark:text-white">
                  Frequently Asked Questions
                </h3>
                <div className="space-y-2 max-w-xl mx-auto">
                  {faqsList.slice(0, 3).map((faq) => (
                    <div key={faq.id} className="p-4 bg-white dark:bg-[#181224] rounded-2xl border border-white shadow-sm">
                      <p className="font-bold text-xs text-[#2e2440] dark:text-white">{faq.question}</p>
                      <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] mt-1 leading-relaxed">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
