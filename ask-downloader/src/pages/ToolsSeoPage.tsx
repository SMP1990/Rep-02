import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, ImageIcon, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { TopHeader } from '../components/TopHeader';
import { MediaPicker } from '../components/MediaPicker';
import { useAdmin } from '../context/AdminContext';
import { TOOL_PAGE_LIST, type ToolFaq, type ToolSeo, type ToolsContent } from '../config/toolPages';
import { defaultToolFaqs } from '../tools/defaultFaqs';

/**
 * Admin -> Tools SEO & FAQ. Every tool in src/config/toolPages.ts appears
 * here on its own: title, description, keywords, share image, "hide from
 * search engines", and its FAQ. Empty fields keep the built-in defaults.
 * The admin writes in English; the site translates the text into every
 * language (Content Editor -> Translations shows and corrects it).
 */
const card = 'bg-white dark:bg-[#181129] rounded-2xl border border-[#eae3ee] dark:border-white/10 shadow-xs';
const input =
  'w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#f6f0f4] dark:bg-[#0e0a17] border border-[#eae3ee] dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#6d46b8]/40';
const muted = 'text-xs text-[#726c85] dark:text-[#b5a9cd]';

const faqKey = (list: { question: string; answer: string }[]) =>
  JSON.stringify(list.map((f) => [f.question.trim(), f.answer.trim()]));

function Counter({ value, best }: { value: string; best: number }) {
  const n = value.length;
  return (
    <span className={`text-[11px] font-semibold ${n > best ? 'text-amber-600' : 'text-[#726c85] dark:text-[#b5a9cd]'}`}>
      {n}/{best}
    </span>
  );
}

export const ToolsSeoPage: React.FC<{ onOpenMobileMenu: () => void }> = ({ onOpenMobileMenu }) => {
  const { toolsContent, setToolsContent, siteSettings, showToast } = useAdmin();
  const [draft, setDraft] = useState<ToolsContent>(toolsContent);
  const [active, setActive] = useState(TOOL_PAGE_LIST[0].id);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState(false);

  // The saved values arrive with the site config; start from them.
  useEffect(() => setDraft(toolsContent), [toolsContent]);

  const tool = TOOL_PAGE_LIST.find((t) => t.id === active)!;
  const c: ToolSeo = draft[active] || {};
  const builtInFaqs = useMemo(() => defaultToolFaqs(active), [active]);
  const faqs: ToolFaq[] = c.faqs ?? builtInFaqs.map((f, i) => ({ id: `builtin_${i}`, ...f }));
  const customFaq = !!c.faqs;
  const dirty = JSON.stringify(draft) !== JSON.stringify(toolsContent);
  const siteName = siteSettings.siteName;

  const update = (patch: Partial<ToolSeo>) => setDraft((d) => ({ ...d, [active]: { ...(d[active] || {}), ...patch } }));
  const setFaqs = (list: ToolFaq[]) => update({ faqs: list });
  const editFaq = (i: number, patch: Partial<ToolFaq>) => setFaqs(faqs.map((f, k) => (k === i ? { ...f, ...patch } : f)));
  const moveFaq = (i: number, by: number) => {
    const list = [...faqs];
    const j = i + by;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setFaqs(list);
  };

  const save = async () => {
    // A FAQ left exactly as built in is not stored: the built-in one keeps
    // its human translations in every language.
    const clean: ToolsContent = {};
    for (const id of Object.keys(draft)) {
      const next: ToolSeo = { ...(draft[id] || {}) };
      if (next.faqs && faqKey(next.faqs) === faqKey(defaultToolFaqs(id))) delete next.faqs;
      clean[id] = next;
    }
    setSaving(true);
    const r = await fetch('/api/admin/tools-content', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolsContent: clean }),
    })
      .then((x) => x.json())
      .catch(() => ({ success: false }));
    setSaving(false);
    if (!r.success) return showToast('Could not save. Please try again.', 'error');
    setToolsContent(r.toolsContent);
    showToast('Saved. New text is being translated into all languages.', 'success');
  };

  const title = (c.metaTitle || '').split('{brand}').join(siteName) || `${tool.seoTitle} - ${siteName}`;
  const description = c.metaDescription || tool.seoDescription;

  return (
    <div className="animate-fade-in">
      <TopHeader
        title="Tools SEO & FAQ"
        subtitle="Search engine settings and FAQs for every tool page. Empty fields use the built-in text."
        onOpenMobileMenu={onOpenMobileMenu}
      />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Tool list */}
        <nav className={`${card} p-2 h-fit`} aria-label="Tools">
          {TOOL_PAGE_LIST.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer ${
                t.id === active ? 'bg-[#6d46b8] text-white' : 'hover:bg-[#f6f0f4] dark:hover:bg-white/5'
              }`}
            >
              {t.name}
              {draft[t.id]?.noindex && <span className="ml-1 text-[10px] font-bold opacity-80">(hidden)</span>}
            </button>
          ))}
        </nav>

        <div className="space-y-6 min-w-0">
          {/* SEO fields */}
          <section className={`${card} p-5 space-y-4`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold">{tool.name} — SEO</h2>
              <a href={tool.path} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs font-bold text-[#6d46b8]">
                View page <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <label className="block">
              <span className="flex justify-between text-xs font-bold mb-1">
                Meta title <Counter value={title} best={60} />
              </span>
              <input
                className={input}
                value={c.metaTitle || ''}
                placeholder={`${tool.seoTitle} - {brand}`}
                onChange={(e) => update({ metaTitle: e.target.value })}
              />
              <span className={muted}>{'{brand}'} is replaced by the site name. Best under 60 characters.</span>
            </label>

            <label className="block">
              <span className="flex justify-between text-xs font-bold mb-1">
                Meta description <Counter value={description} best={160} />
              </span>
              <textarea
                className={`${input} min-h-[80px]`}
                value={c.metaDescription || ''}
                placeholder={tool.seoDescription}
                onChange={(e) => update({ metaDescription: e.target.value })}
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold mb-1 block">Keywords (comma separated)</span>
              <input className={input} value={c.keywords || ''} placeholder={tool.keywords} onChange={(e) => update({ keywords: e.target.value })} />
            </label>

            <div>
              <span className="text-xs font-bold mb-1 block">Share image (Facebook, WhatsApp, X)</span>
              <div className="flex flex-wrap items-center gap-3">
                {c.ogImage ? (
                  <img src={c.ogImage} alt="" className="h-16 w-28 rounded-lg object-cover border border-[#eae3ee] dark:border-white/10" />
                ) : (
                  <span className={`${muted} inline-flex items-center gap-1`}>
                    <ImageIcon className="w-4 h-4" /> Site share image (Settings)
                  </span>
                )}
                <button type="button" onClick={() => setPicker(true)} className="px-3 py-2 rounded-xl text-xs font-bold bg-[#f1e9fb] text-[#4b2e83] dark:bg-white/10 dark:text-[#d1b9f7] cursor-pointer">
                  Choose from Media Library
                </button>
                {c.ogImage && (
                  <button type="button" onClick={() => update({ ogImage: '' })} className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 cursor-pointer">
                    Remove
                  </button>
                )}
              </div>
              <input
                className={`${input} mt-2`}
                value={c.ogImage || ''}
                placeholder="/uploads/... or https://..."
                onChange={(e) => update({ ogImage: e.target.value })}
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#6d46b8]" checked={!!c.noindex} onChange={(e) => update({ noindex: e.target.checked })} />
              <span className="text-sm">
                <b>Hide from search engines</b>
                <span className={`block ${muted}`}>Adds "noindex" and leaves the page out of the sitemap. The page still works for visitors.</span>
              </span>
            </label>

            {/* Google preview */}
            <div className="rounded-xl border border-[#eae3ee] dark:border-white/10 p-4 bg-[#fcfafd] dark:bg-[#0e0a17]">
              <p className={`${muted} mb-1`}>Google preview</p>
              <p className="text-[#1a0dab] dark:text-[#8ab4f8] text-lg leading-snug truncate">{title}</p>
              <p className="text-[#006621] dark:text-[#7fbf8f] text-xs">{(typeof window !== 'undefined' ? window.location.host : '') + tool.path}</p>
              <p className="text-sm text-[#4d5156] dark:text-[#bdc1c6] line-clamp-2">{description}</p>
            </div>
          </section>

          {/* FAQ */}
          <section className={`${card} p-5`}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
              <h2 className="text-sm font-bold">{tool.name} — FAQ</h2>
              {customFaq && (
                <button
                  type="button"
                  onClick={() => update({ faqs: undefined })}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#6d46b8] hover:bg-[#f6f0f4] dark:hover:bg-white/5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Back to the built-in FAQ
                </button>
              )}
            </div>
            <p className={`${muted} mb-4`}>
              {customFaq
                ? 'Your FAQ. New or changed questions are translated into all languages automatically after saving.'
                : 'This is the built-in FAQ, already translated into all 11 languages. Edit it to make it your own.'}
            </p>

            <ol className="space-y-3">
              {faqs.map((f, i) => (
                <li key={f.id} className="rounded-xl border border-[#eae3ee] dark:border-white/10 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-[#6d46b8]">Q{i + 1}</span>
                    <input className={input} value={f.question} placeholder="Question" onChange={(e) => editFaq(i, { question: e.target.value })} />
                    <button type="button" aria-label="Move up" onClick={() => moveFaq(i, -1)} className="p-2 rounded-lg hover:bg-[#f6f0f4] dark:hover:bg-white/5 cursor-pointer">
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button type="button" aria-label="Move down" onClick={() => moveFaq(i, 1)} className="p-2 rounded-lg hover:bg-[#f6f0f4] dark:hover:bg-white/5 cursor-pointer">
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete question"
                      onClick={() => setFaqs(faqs.filter((_, k) => k !== i))}
                      className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea className={`${input} min-h-[70px]`} value={f.answer} placeholder="Answer" onChange={(e) => editFaq(i, { answer: e.target.value })} />
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => setFaqs([...faqs, { id: `faq_${Date.now()}`, question: '', answer: '' }])}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#f1e9fb] text-[#4b2e83] dark:bg-white/10 dark:text-[#d1b9f7] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add question
            </button>
          </section>

          <div className="sticky bottom-4 flex justify-end">
            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#6d46b8] hover:bg-[#4b2e83] text-white text-sm font-bold shadow-lg disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" /> {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
            </button>
          </div>
        </div>
      </div>

      <MediaPicker
        open={picker}
        title="Share image"
        accept={['image']}
        onClose={() => setPicker(false)}
        onSelect={(f) => {
          update({ ogImage: f.url });
          setPicker(false);
        }}
      />
    </div>
  );
};
