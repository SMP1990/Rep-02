import React, { useState, useRef } from 'react';
import { 
  Mail,
  MessageSquare,
  Send,
  Clock,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  AlertCircle,
  Copy,
  Check,
  RotateCcw,
  ArrowRight 
} from 'lucide-react';
import { Header } from '../components/Header.tsx';
import { Footer } from '../components/Footer.tsx';
import { Seo } from '../components/Seo.tsx';
import { buildWebPageSchema, buildBreadcrumbSchema } from '../utils/seoSchema.ts';
import { useAdmin } from '../context/AdminContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { contactField } from '../utils/cmsField.ts';
import { localizeContact } from '../utils/pageTranslations.ts';
import { DownloaderLink } from '../components/PageLink';

interface FormState {
  name: string;
  email: string;
  topic: 'download-issue' | 'feature-request' | 'business' | 'feedback' | 'legal';
  message: string;
}

// Honeypot field name — real users never see or fill this (hidden off-screen),
// but simple spam bots that auto-fill every input on a page will.
const HONEYPOT_FIELD_NAME = 'website_url';

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

export const PublicContactPage: React.FC = () => {
  const { showToast, siteSettings, sitePages, pageTranslations } = useAdmin();
  // Heading, intro and the response-time note are edited in
  // Content Editor -> Pages, not written in the code.
  const { t, currentLangInfo } = useLanguage();
  // In the visitor's language when the server has translated it.
  const pageContent = localizeContact(sitePages?.contact, currentLangInfo.code, pageTranslations);
  const c = t.contact || {};

  const isRtl = currentLangInfo?.dir === 'rtl';

  const [formData, setFormData] = useState<FormState>({
    name: '',
    email: '',
    topic: 'download-issue',
    message: ''
  });

  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean; message?: boolean }>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<FormState | null>(null);
  const [createdTicketId, setCreatedTicketId] = useState<string>('');
  const [copiedTicketId, setCopiedTicketId] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const validate = (values: FormState): FormErrors => {
    const newErrors: FormErrors = {};

    // Name validation
    const trimmedName = values.name.trim();
    if (!trimmedName) {
      newErrors.name = c.errName;
    } else if (trimmedName.length < 2) {
      newErrors.name = c.errNameShort;
    }

    // Email validation
    const trimmedEmail = values.email.trim();
    if (!trimmedEmail) {
      newErrors.email = c.errEmail;
    } else if (!emailRegex.test(trimmedEmail)) {
      newErrors.email = c.errEmailInvalid;
    }

    // Message validation
    const trimmedMessage = values.message.trim();
    if (!trimmedMessage) {
      newErrors.message = c.errMessage;
    } else if (trimmedMessage.length < 10) {
      newErrors.message = String(c.errMessageShort || '').replace('{count}', String(trimmedMessage.length));
    }

    return newErrors;
  };

  const handleBlur = (field: keyof FormErrors) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const currentErrors = validate(formData);
    setErrors(currentErrors);
  };

  const handleChange = (field: keyof FormState, value: string) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    if (touched[field as keyof FormErrors]) {
      const currentErrors = validate(updated);
      setErrors(currentErrors);
    }
  };

  // What the visitor sees, in their own language.
  const getTopicLabel = (topic: string) => {
    switch (topic) {
      case 'download-issue': return c.topicDownload;
      case 'feature-request': return c.topicFeature;
      case 'business': return c.topicBusiness;
      case 'feedback': return c.topicGeneral;
      case 'legal': return c.topicLegal;
      default: return c.topicGeneral;
    }
  };

  // What goes to the admin dashboard. The admin reads every message in one
  // place, so the topic is filed in one fixed language rather than whichever
  // one the visitor happened to be browsing in.
  const getTopicLabelForAdmin = (topic: string) => {
    switch (topic) {
      case 'download-issue': return 'Video Download Issue (URL not parsing)';
      case 'feature-request': return 'New Platform or Feature Request';
      case 'business': return 'Business & Partnership Inquiries';
      case 'feedback': return 'General Feedback or Compliment';
      case 'legal': return 'Copyright / DMCA Takedown';
      default: return 'General Inquiry';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Spam bots that auto-fill every field on a page will fill this hidden
    // one too. Pretend to succeed so the bot doesn't learn to skip it, but
    // never actually store the message.
    if (honeypot.trim() !== '') {
      setSubmittedData({ ...formData });
      setSubmitted(true);
      setCreatedTicketId(`TICK-${Date.now().toString().slice(-6)}`);
      return;
    }

    // Mark all fields as touched
    setTouched({ name: true, email: true, message: true });

    const formValidationErrors = validate(formData);
    setErrors(formValidationErrors);

    if (Object.keys(formValidationErrors).length > 0) {
      if (formValidationErrors.name) {
        nameInputRef.current?.focus();
      } else if (formValidationErrors.email) {
        emailInputRef.current?.focus();
      } else if (formValidationErrors.message) {
        messageInputRef.current?.focus();
      }
      showToast(c.errFix, 'error');
      return;
    }

    setIsSubmitting(true);

    // Send to the SERVER so the message actually reaches the admin.
    // It used to be stored in this visitor's own browser, where the
    // admin could never see it.
    (async () => {
      let ticketId = '';
      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            email: formData.email.trim(),
            topic: formData.topic,
            topicLabel: getTopicLabelForAdmin(formData.topic),
            message: formData.message.trim(),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          setIsSubmitting(false);
          setErrors({ message: data.error || c.errSendFail });
          return;
        }
        ticketId = data.messageId;
      } catch {
        setIsSubmitting(false);
        setErrors({ message: c.errNetwork });
        return;
      }

      setIsSubmitting(false);
      setSubmittedData({ ...formData });
      setSubmitted(true);
      setCreatedTicketId(ticketId);

      // Trigger user-facing success toast notification
      showToast(c.toastSuccess, 'success');

      // Reset form fields
      setFormData({
        name: '',
        email: '',
        topic: 'download-issue',
        message: ''
      });
      setTouched({});
      setErrors({});
    })();
  };

  const handleCopyTicketId = () => {
    if (!createdTicketId) return;
    navigator.clipboard.writeText(createdTicketId);
    setCopiedTicketId(true);
    showToast(c.toastCopied, 'info');
    setTimeout(() => setCopiedTicketId(false), 2000);
  };

  const handleResetForm = () => {
    setSubmitted(false);
    setSubmittedData(null);
    setCreatedTicketId('');
    setTouched({});
    setErrors({});
  };

  // Derive department emails from the admin-configured contact email's own
  // domain (Settings page) instead of hardcoding one — this way the contact
  // addresses always follow whatever domain the site is actually running on.
  const emailDomain = (siteSettings.contactEmail || 'support@example.com').split('@')[1] || 'example.com';

  const contactCards = [
    {
      icon: Mail,
      title: c.cardSupportTitle,
      desc: c.cardSupportDesc,
      contact: `support@${emailDomain}`,
      badge: c.cardSupportBadge,
      badgeColor: 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300'
    },
    {
      icon: ShieldCheck,
      title: c.cardLegalTitle,
      desc: c.cardLegalDesc,
      contact: `legal@${emailDomain}`,
      badge: c.cardLegalBadge,
      badgeColor: 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300'
    },
    {
      icon: MessageSquare,
      title: c.cardPartnersTitle,
      desc: c.cardPartnersDesc,
      contact: `partners@${emailDomain}`,
      badge: c.cardPartnersBadge,
      badgeColor: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
    }
  ];

  // Heading, intro and the response-time note are edited in Content Editor ->
  // Pages. Where the admin has left the shipped wording in place, the visitor
  // gets it in their own language instead.
  const heading = contactField(pageContent, 'heading', c.cmsHeading);
  const intro = contactField(pageContent, 'intro', c.cmsIntro);
  const responseTime = contactField(pageContent, 'responseTime', c.cmsResponseTime);

  return (
    <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] text-[#2e2440] dark:text-[#f4eefb] flex flex-col transition-colors duration-200">
      <Seo
        title={`${c.title} - ${siteSettings.siteName}`}
        description={c.subtitle}
        path="/contact"
        image={siteSettings.ogImage || undefined}
        jsonLd={[
          buildWebPageSchema(
            `${c.title} - ${siteSettings.siteName}`,
            c.subtitle || siteSettings.metaDescription,
            typeof window !== 'undefined' ? window.location.origin + '/contact' : ''
          ),
          buildBreadcrumbSchema([
            { name: t.header?.home || 'Home', url: typeof window !== 'undefined' ? window.location.origin + '/' : '' },
            { name: t.header?.contact || 'Contact', url: typeof window !== 'undefined' ? window.location.origin + '/contact' : '' },
          ]),
        ]}
      />
      {/* GLOBAL MODERN RESPONSIVE HEADER */}
      <Header />

      {/* HERO SECTION */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 w-full">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#f1e9fb] dark:bg-[#261b3b] text-[#6d46b8] dark:text-[#d1b9f7] border border-[#a78bda]/30 shadow-2xs">
            <Mail className="w-4 h-4 text-[#6d46b8] dark:text-[#f0a8bf]" />
            <span>{c.badge}</span>
          </div>

          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#2e2440] dark:text-[#f4eefb]">
            {heading}
          </h1>

          <p className="text-sm sm:text-base text-[#5e5473] dark:text-[#b5a9cd] leading-relaxed">
            {intro}
          </p>

          {responseTime && (
            <p className="text-xs font-semibold text-[#6d46b8] dark:text-[#d1b9f7]">{responseTime}</p>
          )}
          {pageContent?.officeNote && (
            <p className="text-xs text-[#726c85] dark:text-[#b5a9cd]">{pageContent.officeNote}</p>
          )}
        </div>

        {/* 3 QUICK CONTACT CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {contactCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                id={`contact-card-${idx}`}
                className="p-6 rounded-2xl bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-[#f1e9fb] dark:bg-[#261b3b] text-[#6d46b8] dark:text-[#d1b9f7] flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${card.badgeColor}`}>
                      {card.badge}
                    </span>
                  </div>

                  <h2 className="text-base font-bold text-[#2e2440] dark:text-[#f4eefb] mb-1">
                    {card.title}
                  </h2>
                  <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] leading-relaxed mb-4">
                    {card.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#eae3ee]/80 dark:border-[#2e1d4d]/80">
                  <a
                    href={`mailto:${card.contact}`}
                    id={`contact-link-${idx}`}
                    className="text-xs font-bold text-[#6d46b8] dark:text-[#d1b9f7] hover:underline flex items-center gap-1.5"
                  >
                    <span>{card.contact}</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* MAIN CONTACT FORM & FAQ SPLIT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: INTERACTIVE CONTACT FORM */}
          <div className="lg:col-span-7 bg-white dark:bg-[#181224] p-6 sm:p-8 rounded-3xl border border-[#eae3ee] dark:border-[#2e1d4d] shadow-sm">
            <h2 className="text-xl font-bold text-[#2e2440] dark:text-[#f4eefb] mb-2 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#6d46b8]" />
              {c.formTitle}
            </h2>
            <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] mb-6">
              {c.formSubtitle}
            </p>

            {submitted ? (
              <div 
                id="contact-success-state"
                className="p-6 sm:p-8 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-5 animate-in fade-in"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/80 text-emerald-600 dark:text-emerald-300 mx-auto flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-1.5">
                  <span className="inline-block px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                    {c.successBadge}
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold text-emerald-900 dark:text-emerald-100">
                    {c.successHeading}
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 max-w-md mx-auto leading-relaxed">
                    {c.successBody}
                  </p>
                </div>

                {/* Ticket Reference Badge with Copy Action */}
                {createdTicketId && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                    <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-[#181224] border border-emerald-300 dark:border-emerald-700/80 text-xs font-mono text-emerald-900 dark:text-emerald-200 shadow-2xs">
                      <span className="text-emerald-600 dark:text-emerald-400 font-sans font-bold">{c.ticketIdLabel}</span>
                      <span className="font-bold">{createdTicketId}</span>
                    </div>
                    <button
                      type="button"
                      id="copy-ticket-btn"
                      onClick={handleCopyTicketId}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-100/80 dark:bg-emerald-900/50 hover:bg-emerald-200 dark:hover:bg-emerald-800/60 border border-emerald-300 dark:border-emerald-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                      title={c.copyIdTitle}
                    >
                      {copiedTicketId ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{c.copied}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{c.copyId}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Submission Summary Recap Card */}
                {submittedData && (
                  <div className="text-left bg-white/90 dark:bg-[#181224]/90 rounded-xl p-4 border border-emerald-200/80 dark:border-emerald-800/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-[#726c85] dark:text-[#b5a9cd] font-medium">{c.recapTopic}</span>
                      <span className="font-bold text-[#2e2440] dark:text-white truncate max-w-[200px]">
                        {getTopicLabel(submittedData.topic)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-[#726c85] dark:text-[#b5a9cd] font-medium">{c.recapContact}</span>
                      <span className="font-mono text-[#2e2440] dark:text-white truncate max-w-[200px]">
                        {submittedData.name} ({submittedData.email})
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#726c85] dark:text-[#b5a9cd] font-medium">{c.recapTurnaround}</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {c.turnaroundValue}
                      </span>
                    </div>
                  </div>
                )}

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    id="send-another-message-btn"
                    onClick={handleResetForm}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{c.sendAnother}</span>
                  </button>

                  <DownloaderLink platform="facebook"
                    id="back-to-downloader-btn"
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] hover:opacity-95 transition-opacity cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <span>{c.useDownloader}</span>
                    <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                  </DownloaderLink>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* Honeypot: hidden from real users, catches simple spam bots */}
                <div className="absolute -left-[9999px] w-px h-px overflow-hidden" aria-hidden="true">
                  <label htmlFor={HONEYPOT_FIELD_NAME}>{t.ui.honeypot}</label>
                  <input
                    type="text"
                    id={HONEYPOT_FIELD_NAME}
                    name={HONEYPOT_FIELD_NAME}
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Sender Name Field */}
                  <div>
                    <label htmlFor="contact-name" className="block text-xs font-bold text-[#2e2440] dark:text-[#f4eefb] mb-1.5">
                      {c.name} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        ref={nameInputRef}
                        id="contact-name"
                        type="text"
                        placeholder={c.namePlaceholder}
                        value={formData.name}
                        onChange={e => handleChange('name', e.target.value)}
                        onBlur={() => handleBlur('name')}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-colors focus:outline-hidden ${
                          touched.name && errors.name
                            ? 'border-rose-400 dark:border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 text-[#2e2440] dark:text-white focus:ring-2 focus:ring-rose-400'
                            : touched.name && !errors.name && formData.name.trim()
                            ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/10 text-[#2e2440] dark:text-white focus:ring-2 focus:ring-[#6d46b8]'
                            : 'border-[#eae3ee] dark:border-[#2e1d4d] bg-slate-50/50 dark:bg-[#1f1630] text-[#2e2440] dark:text-white focus:ring-2 focus:ring-[#6d46b8]'
                        }`}
                        aria-invalid={touched.name && !!errors.name}
                        aria-describedby={touched.name && errors.name ? 'contact-name-error' : undefined}
                      />
                      {touched.name && !errors.name && formData.name.trim() && (
                        <Check className={`w-4 h-4 text-emerald-500 absolute ${isRtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 pointer-events-none`} />
                      )}
                    </div>
                    {touched.name && errors.name && (
                      <p id="contact-name-error" className="text-xs text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.name}</span>
                      </p>
                    )}
                  </div>

                  {/* Email Address Field */}
                  <div>
                    <label htmlFor="contact-email" className="block text-xs font-bold text-[#2e2440] dark:text-[#f4eefb] mb-1.5">
                      {c.email} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        ref={emailInputRef}
                        id="contact-email"
                        type="email"
                        placeholder={c.emailPlaceholder}
                        value={formData.email}
                        onChange={e => handleChange('email', e.target.value)}
                        onBlur={() => handleBlur('email')}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-colors focus:outline-hidden ${
                          touched.email && errors.email
                            ? 'border-rose-400 dark:border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 text-[#2e2440] dark:text-white focus:ring-2 focus:ring-rose-400'
                            : touched.email && !errors.email && formData.email.trim()
                            ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/10 text-[#2e2440] dark:text-white focus:ring-2 focus:ring-[#6d46b8]'
                            : 'border-[#eae3ee] dark:border-[#2e1d4d] bg-slate-50/50 dark:bg-[#1f1630] text-[#2e2440] dark:text-white focus:ring-2 focus:ring-[#6d46b8]'
                        }`}
                        aria-invalid={touched.email && !!errors.email}
                        aria-describedby={touched.email && errors.email ? 'contact-email-error' : undefined}
                      />
                      {touched.email && !errors.email && formData.email.trim() && (
                        <Check className={`w-4 h-4 text-emerald-500 absolute ${isRtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 pointer-events-none`} />
                      )}
                    </div>
                    {touched.email && errors.email && (
                      <p id="contact-email-error" className="text-xs text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.email}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Category Topic Field */}
                <div>
                  <label htmlFor="contact-topic" className="block text-xs font-bold text-[#2e2440] dark:text-[#f4eefb] mb-1.5">
                    {c.topic}
                  </label>
                  <select
                    id="contact-topic"
                    value={formData.topic}
                    onChange={e => handleChange('topic', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#eae3ee] dark:border-[#2e1d4d] bg-slate-50/50 dark:bg-[#1f1630] text-sm text-[#2e2440] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#6d46b8]"
                  >
                    <option value="download-issue">{c.topicDownload}</option>
                    <option value="feature-request">{c.topicFeature}</option>
                    <option value="business">{c.topicBusiness}</option>
                    <option value="feedback">{c.topicGeneral}</option>
                    <option value="legal">{c.topicLegal}</option>
                  </select>
                </div>

                {/* Message Textarea Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="contact-message" className="block text-xs font-bold text-[#2e2440] dark:text-[#f4eefb]">
                      {c.message} <span className="text-rose-500">*</span>
                    </label>
                    <span className={`text-[11px] font-mono ${
                      formData.message.trim().length >= 10
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-[#726c85] dark:text-[#b5a9cd]'
                    }`}>
                      {formData.message.length} {c.charsLabel} {formData.message.trim().length < 10 && c.charsMin}
                    </span>
                  </div>
                  <textarea
                    ref={messageInputRef}
                    id="contact-message"
                    rows={5}
                    placeholder={c.messagePlaceholder}
                    value={formData.message}
                    onChange={e => handleChange('message', e.target.value)}
                    onBlur={() => handleBlur('message')}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-colors focus:outline-hidden resize-y ${
                      touched.message && errors.message
                        ? 'border-rose-400 dark:border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 text-[#2e2440] dark:text-white focus:ring-2 focus:ring-rose-400'
                        : touched.message && !errors.message && formData.message.trim()
                        ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/10 text-[#2e2440] dark:text-white focus:ring-2 focus:ring-[#6d46b8]'
                        : 'border-[#eae3ee] dark:border-[#2e1d4d] bg-slate-50/50 dark:bg-[#1f1630] text-[#2e2440] dark:text-white focus:ring-2 focus:ring-[#6d46b8]'
                    }`}
                    aria-invalid={touched.message && !!errors.message}
                    aria-describedby={touched.message && errors.message ? 'contact-message-error' : undefined}
                  />
                  {touched.message && errors.message && (
                    <p id="contact-message-error" className="text-xs text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.message}</span>
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    id="contact-submit-button"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#4b2e83] via-[#6d46b8] to-[#e6799f] hover:opacity-95 shadow-md shadow-[#6d46b8]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Send className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
                    <span>{isSubmitting ? c.sending : c.sendMessage}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* RIGHT: QUICK FAQS & DOWNLOAD SHORTCUT */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Quick Answer Box */}
            <div className="bg-white dark:bg-[#181224] p-6 rounded-3xl border border-[#eae3ee] dark:border-[#2e1d4d] shadow-sm space-y-4">
              <h3 className="text-base font-bold text-[#2e2440] dark:text-[#f4eefb] flex items-center gap-2">
                <HelpCircle className="w-4.5 h-4.5 text-[#6d46b8]" />
                {c.faqBoxTitle}
              </h3>

              <div className="space-y-3 text-xs">
                {[
                  { q: c.faqQ1, a: c.faqA1 },
                  { q: c.faqQ2, a: c.faqA2 },
                  { q: c.faqQ3, a: c.faqA3 },
                ].map((item, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-[#1f1630]">
                    <p className="font-bold text-[#2e2440] dark:text-[#f4eefb] mb-1">{item.q}</p>
                    <p className="text-[#726c85] dark:text-[#b5a9cd] leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Downloader Shortcut CTA */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-[#3d246e] to-[#201538] text-white shadow-md relative overflow-hidden">
              <div className="relative z-10 space-y-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/15 text-[#f0a8bf]">
                  {c.ctaBadge}
                </span>
                <h3 className="text-lg font-bold">
                  {c.ctaHeading}
                </h3>
                <p className="text-xs text-white/80 leading-relaxed">
                  {c.ctaText}
                </p>
                <DownloaderLink platform="facebook"
                  id="contact-faq-downloader-cta"
                  className="inline-block px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#181224] text-[#4b2e83] hover:bg-slate-100 transition-colors shadow-sm cursor-pointer"
                >
                  {c.ctaButton} {isRtl ? '←' : '→'}
                </DownloaderLink>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  );
};

