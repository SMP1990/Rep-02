import React, { useState } from 'react';
import { isAuthored } from '../utils/cmsField.ts';
import { INITIAL_SITE_SETTINGS } from '../data/mockAdminData';
import { readerError } from '../utils/publicErrors.ts';
import { motion } from 'motion/react';
import { 
  Mail, 
  Phone, 
  Sparkles, 
  Check, 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin, 
  Youtube,
  Globe,
  Heart,
  MessageCircle,
  X
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useLanguage } from '../context/LanguageContext';
import { RouteLink, DownloaderLink } from './PageLink';

// Simple TikTok glyph (lucide-react has no official TikTok icon)
const TikTokIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M16.6 5.82c-.9-.98-1.4-2.25-1.4-3.62h-3.2v13.58c0 1.6-1.3 2.9-2.9 2.9s-2.9-1.3-2.9-2.9 1.3-2.9 2.9-2.9c.3 0 .58.04.85.13V9.7a6.2 6.2 0 0 0-.85-.06A6.14 6.14 0 0 0 3 15.78 6.14 6.14 0 0 0 9.1 21.9a6.14 6.14 0 0 0 6.1-6.12V8.9a9.3 9.3 0 0 0 5.3 1.64V7.3a5.6 5.6 0 0 1-3.9-1.48Z" />
  </svg>
);

export const Footer: React.FC = () => {
  const { addSubscriber, showToast, siteSettings } = useAdmin();
  const { t, currentLang } = useLanguage();

  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast(t.footer.emailRequired, 'error');
      return;
    }

    const result = addSubscriber(email, 'Newsletter Banner Subscription');
    if (result.success) {
      setIsSubscribed(true);
      setEmail('');
      showToast(t.footer.subscribed, 'success');
      setTimeout(() => setIsSubscribed(false), 5000);
    } else {
      showToast(readerError(result.error, t, currentLang, 'subscribeFailed'), 'error');
    }
  };

  // Centralized social links — every icon below reads from siteSettings
  // (Settings -> Website Identity & SEO). An icon only renders if the
  // admin has actually filled in that URL, so nothing dead ever shows.
  const socialLinks = [
    { key: 'socialFacebook', url: siteSettings.socialFacebook, label: 'Facebook', Icon: Facebook, fill: true },
    { key: 'socialTwitter', url: siteSettings.socialTwitter, label: 'Twitter / X', Icon: Twitter, fill: true },
    { key: 'socialInstagram', url: siteSettings.socialInstagram, label: 'Instagram', Icon: Instagram, fill: false },
    { key: 'socialYoutube', url: siteSettings.socialYoutube, label: 'YouTube', Icon: Youtube, fill: false },
    { key: 'socialTiktok', url: siteSettings.socialTiktok, label: 'TikTok', Icon: TikTokIcon, fill: false },
    { key: 'socialLinkedin', url: siteSettings.socialLinkedin, label: 'LinkedIn', Icon: Linkedin, fill: true },
  ].filter((s) => !!s.url);

  const whatsappHref = siteSettings.whatsappNumber
    ? `https://wa.me/${siteSettings.whatsappNumber.replace(/[^0-9]/g, '')}`
    : null;

  return (
    <footer className="w-full relative mt-24 text-[#4a3b56] dark:text-[#d1c8de] font-sans">
      
      {/* 1. FLOATING NEWSLETTER BANNER CARD */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 -mb-16 sm:-mb-20">
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative bg-gradient-to-r from-[#3a1d63] via-[#5c339c] to-[#993b77] dark:from-[#261343] dark:via-[#422170] dark:to-[#6e2954] text-white rounded-[28px] sm:rounded-[36px] shadow-2xl shadow-[#5c339c]/25 overflow-hidden border border-white/20 p-6 sm:p-8 md:p-10"
        >
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-[#e6799f]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-[#a78bda]/25 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center relative z-10">
            <div className="lg:col-span-5 flex justify-center lg:justify-start items-center relative">
              <motion.div 
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="relative w-64 sm:w-72 md:w-80 h-32 sm:h-36 flex items-center justify-center"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-[#f0a8bf]" />
                </div>
              </motion.div>
            </div>

            <div className="lg:col-span-7 space-y-3.5 text-center lg:text-left">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold text-white tracking-tight leading-snug">
                {t.footer?.newsletterTitle || 'Get new download tips & platform updates in your inbox'}
              </h2>

              <p className="text-xs sm:text-sm text-[#f5d9e5] font-normal">
                {t.footer?.newsletterSubtitle || 'No spam — just occasional updates when we add a new platform or feature.'}
              </p>

              {isSubscribed ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3.5 bg-white/20 backdrop-blur-md border border-white/40 rounded-full text-white text-xs sm:text-sm font-semibold flex items-center justify-center lg:justify-start gap-2 max-w-lg"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-400 text-slate-900 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span>{t.footer.subscribedThanks}</span>
                </motion.div>
              ) : (
                <form 
                  onSubmit={handleSubscribe}
                  className="relative max-w-lg flex items-center bg-white/15 backdrop-blur-md border border-white/30 rounded-full p-1.5 focus-within:border-white focus-within:ring-2 focus-within:ring-[#f0a8bf]/50 transition-all shadow-inner"
                >
                  <div className="pl-3.5 pr-2 text-white/80 shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>

                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.footer.emailPlaceholder}
                    className="w-full bg-transparent text-white placeholder:text-white/70 text-xs sm:text-sm font-medium focus:outline-hidden py-2"
                  />

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    className="px-6 py-2.5 rounded-full bg-white dark:bg-[#181224] hover:bg-[#fff5f8] text-[#3a1d63] hover:text-[#993b77] font-bold text-xs sm:text-sm shadow-md transition-all shrink-0 cursor-pointer"
                  >
                    {t.footer?.subscribeBtn || 'Subscribe'}
                  </motion.button>
                </form>
              )}

              <p className="text-[11px] sm:text-xs text-[#f5d9e5]/90 leading-relaxed pt-0.5">
                {t.footer?.privacyNote || 'You will be able to unsubscribe at any time.'}<br className="hidden sm:inline" />{' '}
                <span>{t.footer?.readPrivacy || 'Read our privacy policy'} </span>
                <RouteLink route="privacy-policy"
                  className="underline font-semibold hover:text-white transition-colors cursor-pointer"
                >
                  {t.footer?.here || 'here'}
                </RouteLink>
              </p>
            </div>
          </div>
        </motion.div>
      </div>


      {/* 2. MAIN FOOTER BODY */}
      <div className="w-full bg-[#faf6fa] dark:bg-[#120c1f] rounded-t-[36px] sm:rounded-t-[48px] border-t border-[#ede3f0] dark:border-[#27193b] pt-24 sm:pt-28 pb-12 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-8 lg:gap-8 pb-12">
            
            {/* COLUMN 1: BRAND */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#4b2e83] via-[#6d46b8] to-[#e6799f] p-0.5 shadow-xs">
                  <div className="w-full h-full bg-[#341d5b] rounded-[10px] flex items-center justify-center text-white">
                    <Sparkles className="w-4.5 h-4.5 text-[#f0a8bf]" />
                  </div>
                </div>
                <div>
                  <span className="font-heading font-extrabold text-xl sm:text-2xl tracking-tight text-[#2e2440] dark:text-[#f4eefb]">
                    {siteSettings.siteName}
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-[#69587a] dark:text-[#a99bb8] leading-relaxed max-w-sm">
                {isAuthored(siteSettings.siteTagline, INITIAL_SITE_SETTINGS.siteTagline) ? siteSettings.siteTagline : t.footer.brandBio}
              </p>

              {socialLinks.length > 0 && (
                <div className="flex items-center gap-2.5 pt-1 flex-wrap">
                  {socialLinks.map(({ key, url, label, Icon, fill }) => (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={label}
                      className="w-8 h-8 rounded-full bg-[#2e2440] dark:bg-[#261b3b] text-white hover:bg-[#6d46b8] dark:hover:bg-[#e6799f] dark:hover:text-[#181224] flex items-center justify-center transition-all shadow-xs border border-[#4b2e83]/20 dark:border-[#4b2e83]/40"
                    >
                      <Icon className={`w-3.5 h-3.5 ${fill ? 'fill-current' : ''}`} />
                    </a>
                  ))}
                </div>
              )}
            </div>


            {/* COLUMN 2: COMPANY */}
            <div className="lg:col-span-2 space-y-3">
              <h3 className="text-sm font-heading font-bold text-[#2e2440] dark:text-[#f4eefb] tracking-tight">
                {t.footer?.company || 'Company'}
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-[#635373] dark:text-[#a99bb8]">
                <li>
                  <RouteLink route="about-us" 
                    className="hover:text-[#6d46b8] dark:hover:text-[#f0a8bf] transition-colors cursor-pointer"
                  >
                    {t.footer?.aboutUs || 'About Us'}
                  </RouteLink>
                </li>
                <li>
                  <RouteLink route="public-blog" 
                    className="hover:text-[#6d46b8] dark:hover:text-[#f0a8bf] transition-colors cursor-pointer"
                  >
                    {t.header.blog}
                  </RouteLink>
                </li>
                <li>
                  <RouteLink route="contact" 
                    className="hover:text-[#6d46b8] dark:hover:text-[#f0a8bf] transition-colors cursor-pointer"
                  >
                    {t.footer.contactUs || t.header.contact}
                  </RouteLink>
                </li>
              </ul>
            </div>


            {/* COLUMN 3: DOWNLOADERS */}
            <div className="lg:col-span-2 space-y-3">
              <h3 className="text-sm font-heading font-bold text-[#2e2440] dark:text-[#f4eefb] tracking-tight">
                {t.footer.downloaders}
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-[#635373] dark:text-[#a99bb8]">
                <li>
                  <DownloaderLink platform="facebook" 
                    className="hover:text-[#6d46b8] dark:hover:text-[#f0a8bf] transition-colors cursor-pointer"
                  >
                    Facebook
                  </DownloaderLink>
                </li>
                <li>
                  <DownloaderLink platform="instagram" 
                    className="hover:text-[#6d46b8] dark:hover:text-[#f0a8bf] transition-colors cursor-pointer"
                  >
                    Instagram
                  </DownloaderLink>
                </li>
                <li>
                  <DownloaderLink platform="tiktok" 
                    className="hover:text-[#6d46b8] dark:hover:text-[#f0a8bf] transition-colors cursor-pointer"
                  >
                    TikTok
                  </DownloaderLink>
                </li>
                <li>
                  <DownloaderLink platform="twitter" 
                    className="hover:text-[#6d46b8] dark:hover:text-[#f0a8bf] transition-colors cursor-pointer"
                  >
                    Twitter / X
                  </DownloaderLink>
                </li>
              </ul>
            </div>


            {/* COLUMN 4: CONTACT US */}
            <div className="lg:col-span-2 space-y-3">
              <h3 className="text-sm font-heading font-bold text-[#2e2440] dark:text-[#f4eefb] tracking-tight">
                {t.footer?.contactUs || 'Contact Us'}
              </h3>
              <ul className="space-y-3 text-xs sm:text-sm text-[#635373] dark:text-[#a99bb8]">
                {siteSettings.contactPhone && (
                  <li className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-[#6d46b8] dark:text-[#e6799f] shrink-0" />
                    <a 
                      href={`tel:${siteSettings.contactPhone.replace(/[^0-9+]/g, '')}`}
                      className="hover:text-[#6d46b8] dark:text-[#d1c8de] dark:hover:text-[#f0a8bf] transition-colors"
                    >
                      {siteSettings.contactPhone}
                    </a>
                  </li>
                )}
                <li className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#6d46b8] dark:text-[#e6799f] shrink-0" />
                  <a 
                    href={`mailto:${siteSettings.contactEmail}`}
                    className="hover:text-[#6d46b8] dark:text-[#d1c8de] dark:hover:text-[#f0a8bf] transition-colors truncate"
                  >
                    {siteSettings.contactEmail}
                  </a>
                </li>
                {whatsappHref && (
                  <li className="flex items-center gap-2.5">
                    <MessageCircle className="w-4 h-4 text-[#6d46b8] dark:text-[#e6799f] shrink-0" />
                    <a 
                      href={whatsappHref}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-[#6d46b8] dark:text-[#d1c8de] dark:hover:text-[#f0a8bf] transition-colors"
                    >
                      {t.ui.chatWhatsapp}
                    </a>
                  </li>
                )}
              </ul>
            </div>

          </div>


          {/* 3. BOTTOM SUB-FOOTER / COPYRIGHT & LEGAL ROW */}
          <div className="pt-8 mt-4 border-t border-[#ede3f0] dark:border-[#27193b] flex flex-col items-center gap-4 text-xs text-[#7a6b8a] dark:text-[#9e8fae]">
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
              <div className="text-center sm:text-left space-y-1">
                <p>&copy; {new Date().getFullYear()} {siteSettings.siteName}. {t.footer.rights}</p>
                <p className="text-[11px] flex items-center justify-center sm:justify-start gap-1">
                  {t.footer.developedWith} <Heart className="w-3 h-3 fill-[#e6799f] text-[#e6799f] inline" /> {t.footer.by}{' '}
                  <a
                    href="https://digitalshayan.online"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-[#c2416b] dark:text-[#e6799f] hover:underline"
                  >
                    Digitalshayan.online
                  </a>
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-6 text-xs">
                <RouteLink route="privacy-policy"
                  className="hover:text-[#6d46b8] dark:hover:text-[#f0a8bf] transition-colors cursor-pointer"
                >
                  {t.footer?.privacyPolicy || 'Privacy Policy'}
                </RouteLink>
                <RouteLink route="terms-of-use"
                  className="hover:text-[#6d46b8] dark:hover:text-[#f0a8bf] transition-colors cursor-pointer"
                >
                  {t.footer?.termsOfUse || 'Terms of Use'}
                </RouteLink>
                <RouteLink route="legal"
                  className="hover:text-[#6d46b8] dark:hover:text-[#f0a8bf] transition-colors cursor-pointer"
                >
                  {t.footer?.legal || 'Legal'}
                </RouteLink>
                <button
                  type="button"
                  onClick={() => setActiveModal('sitemap')}
                  className="hover:text-[#6d46b8] dark:hover:text-[#f0a8bf] transition-colors cursor-pointer"
                >
                  {t.footer?.sitemap || 'Site Map'}
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>


      {/* 4. SITE MAP MODAL */}
      {activeModal === 'sitemap' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-[#181224] rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 dark:border-[#352554] shadow-2xl relative text-slate-800 dark:text-slate-200 space-y-4"
          >
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-10 h-10 rounded-xl bg-[#f1e9fb] dark:bg-[#261b3b] text-[#6d46b8] dark:text-[#f0a8bf] flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold font-heading text-[#2e2440] dark:text-[#f4eefb]">{t.footer?.sitemap || 'Site Map'}</h3>
            <div className="text-xs text-[#635373] dark:text-[#b8a9cc] space-y-2 max-h-72 overflow-y-auto pr-2 grid grid-cols-2 gap-2">
              <DownloaderLink platform="facebook" onBeforeNavigate={() => setActiveModal(null)} className="text-left font-bold text-[#6d46b8] dark:text-[#f0a8bf] hover:underline">Facebook</DownloaderLink>
              <DownloaderLink platform="tiktok" onBeforeNavigate={() => setActiveModal(null)} className="text-left font-bold text-[#6d46b8] dark:text-[#f0a8bf] hover:underline">TikTok</DownloaderLink>
              <DownloaderLink platform="instagram" onBeforeNavigate={() => setActiveModal(null)} className="text-left font-bold text-[#6d46b8] dark:text-[#f0a8bf] hover:underline">Instagram</DownloaderLink>
              <DownloaderLink platform="twitter" onBeforeNavigate={() => setActiveModal(null)} className="text-left font-bold text-[#6d46b8] dark:text-[#f0a8bf] hover:underline">Twitter / X</DownloaderLink>
              <RouteLink route="public-blog" onBeforeNavigate={() => setActiveModal(null)} className="text-left font-bold text-[#6d46b8] dark:text-[#f0a8bf] hover:underline">{t.footer?.blogTutorials || 'Blog & Tutorials'}</RouteLink>
              <RouteLink route="about-us" onBeforeNavigate={() => setActiveModal(null)} className="text-left font-bold text-[#6d46b8] dark:text-[#f0a8bf] hover:underline">{t.footer?.aboutUs || 'About Us'}</RouteLink>
              <RouteLink route="contact" onBeforeNavigate={() => setActiveModal(null)} className="text-left font-bold text-[#6d46b8] dark:text-[#f0a8bf] hover:underline">{t.footer?.contactUs || 'Contact Support'}</RouteLink>
              <RouteLink route="privacy-policy" onBeforeNavigate={() => setActiveModal(null)} className="text-left font-bold text-[#6d46b8] dark:text-[#f0a8bf] hover:underline">{t.footer?.privacyPolicy || 'Privacy Policy'}</RouteLink>
              <RouteLink route="terms-of-use" onBeforeNavigate={() => setActiveModal(null)} className="text-left font-bold text-[#6d46b8] dark:text-[#f0a8bf] hover:underline">{t.footer?.termsOfUse || 'Terms of Use'}</RouteLink>
              <RouteLink route="legal" onBeforeNavigate={() => setActiveModal(null)} className="text-left font-bold text-[#6d46b8] dark:text-[#f0a8bf] hover:underline">{t.footer?.legal || 'Legal'}</RouteLink>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] hover:from-[#3b2369] hover:to-[#5a369e] text-white shadow-sm transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </footer>
  );
};
