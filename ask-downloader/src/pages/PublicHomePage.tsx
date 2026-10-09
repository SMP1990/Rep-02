import React, { useState, useEffect, useRef } from 'react';

import { fill } from '../utils/i18n.ts';
import { useGsapHome } from '../hooks/useGsapHome.ts';
import { motion, AnimatePresence } from 'motion/react';
import { Header } from '../components/Header.tsx';
import { DualToolSection } from '../components/DualToolSection.tsx';
import { HomeBlogSection } from '../components/HomeBlogSection.tsx';
import { BlogLanguagesSection } from '../components/BlogLanguagesSection.tsx';
import { FeaturesSection } from '../components/FeaturesSection.tsx';
import { HowToGuide } from '../components/HowToGuide.tsx';
import { FaqSection } from '../components/FaqSection.tsx';
import { Footer } from '../components/Footer.tsx';
import { DownloadProgressBar } from '../components/DownloadProgressBar.tsx';
import { Seo } from '../components/Seo.tsx';
import { heroField } from '../utils/heroContent.ts';
import { localizeHero, localizeFaqs } from '../utils/pageTranslations.ts';
import { buildOrganizationSchema, buildWebsiteSchema, buildWebPageSchema, buildFaqSchema, socialProfileUrls } from '../utils/seoSchema.ts';
import { useAdmin } from '../context/AdminContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { 
  ExtractedVideoInfo, 
  VideoQualityOption, 
  DownloadProgressState
} from '../types.ts';
import { 
  downloadWithProgress, 
  parseBytesFromEstimate 
} from '../utils/downloadManager.ts';
import { 
  Sparkles,
  Video,
  Music,
  Instagram,
  Twitter,
  Pin,
  MessageSquare,
  AtSign,
  Tv,
} from 'lucide-react';

export const PublicHomePage: React.FC = () => {
  const { 
    landingContent, 
    recordDownloadCompleted, 
    showToast,
    activeSocialPlatform,
    navigateToDownloader,
    homeResetKey,
    siteSettings,
    pageTranslations
  } = useAdmin();
  const { t, currentLang } = useLanguage();
  // The admin's hero and FAQ text, in the visitor's language once translated.
  const hero = localizeHero(landingContent?.hero, currentLang, pageTranslations);
  const faqs = localizeFaqs(landingContent?.faqs, currentLang, pageTranslations);
  const rootRef = useRef<HTMLDivElement>(null);

  // Split the admin's heading around the {platform} token.
  const heroHeadingRaw = heroField(hero, 'heading', t.hero?.titlePrefix);
  const heroShowsPlatform = heroHeadingRaw.includes('{platform}');
  const [heroHeadingBefore, heroHeadingAfter = ''] = heroShowsPlatform
    ? heroHeadingRaw.split('{platform}')
    : [heroHeadingRaw];
  // The page <title> is the site's name and tagline — the same string the
  // server puts in the raw HTML, so crawlers and the browser tab agree. It
  // used to be built from the hero heading, and since a translated heading is
  // split into two parts around the platform highlight, the tab (and Google)
  // got only the first half: "Download videos of".
  const homeTitle = [siteSettings.siteName, siteSettings.siteTagline].map((x) => String(x || '').trim()).filter(Boolean).join(' - ');
  useGsapHome(rootRef);

  // Progress and active downloading tracking
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgressState | null>(null);

  const platforms = [
    'Facebook',
    'TikTok',
    'Instagram',
    'Twitter',
    'Pinterest',
    'Reddit',
    'Threads',
    'Dailymotion',
  ];
  const [platformIndex, setPlatformIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPlatformIndex((prev) => (prev + 1) % platforms.length);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  // Handle video download with chunk progression and audio/toast notification
  const formatBytesLabel = (bytes: number) => {
    if (!bytes) return '';
    const units = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(1))} ${units[i]}`;
  };

  const handleDownloadQuality = async (quality: VideoQualityOption, video: ExtractedVideoInfo) => {
    const qualityId = `${video.id}_${quality.id}`;
    setDownloadingId(qualityId);

    const isAudio = quality.format === 'MP3' || String(quality.quality || '').includes('Audio');
    const extension = isAudio ? 'mp3' : 'mp4';
    const cleanTitle = (video.title || 'fdownloader_video')
      .replace(/[^\w\s-]/gi, '')
      .trim()
      .substring(0, 40)
      .replace(/\s+/g, '_');
    const filename = `${cleanTitle}_${String(quality.quality || 'video').replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;

    const estBytes = parseBytesFromEstimate(quality.fileSizeEstimate) || 18 * 1024 * 1024;

    try {
      setDownloadProgress({
        isActive: true,
        status: 'downloading',
        quality,
        video,
        videoTitle: video.title || 'Social Video',
        thumbnailUrl: video.thumbnailUrl,
        progressPercent: 5,
        bytesLoaded: 0,
        totalBytes: estBytes,
        speedBytesPerSec: 2.8 * 1024 * 1024,
        etaSeconds: 6,
        filename,
      });

      // Route through our own server proxy rather than fetching the raw
      // external URL directly from the browser — a direct cross-origin
      // fetch can fail with a CORS error depending on the source host,
      // which used to silently trigger a fake placeholder download instead
      // of a clear error. The server-side proxy isn't subject to CORS.
      const mp3Param = quality.format === 'MP3' ? '&format=mp3' : '';
      const proxiedUrl = `/api/video/download-proxy?url=${encodeURIComponent(quality.downloadUrl)}&name=${encodeURIComponent(filename)}${mp3Param}`;

      // Use downloadWithProgress
      const result = await downloadWithProgress({
        url: proxiedUrl,
        filename,
        estimatedBytes: estBytes,
        onStatusChange: (status) => {
          setDownloadProgress((prev) => prev ? { ...prev, status } : null);
        },
        onProgress: (p) => {
          setDownloadProgress((prev) => prev ? {
            ...prev,
            progressPercent: p.percent,
            bytesLoaded: p.loaded,
            totalBytes: p.total,
            speedBytesPerSec: p.speed,
            etaSeconds: p.eta,
            status: 'downloading',
          } : null);
        },
      });

      // Notify admin context of successful download (triggers toast & chime)
      recordDownloadCompleted({
        videoTitle: video.title || 'Social Media Video',
        platform: (video.platform || 'facebook') as any,
        quality: quality.quality,
        // Prefer the real number of bytes we just downloaded; fall back to
        // the estimate shown on the card.
        fileSize: result?.finalBytes ? formatBytesLabel(result.finalBytes) : (quality.fileSizeEstimate || ''),
        ipCountry: 'US',
      });

      showToast(fill(t.ui.downloadedToast, { file: filename }), 'success');
    } catch (err: any) {
      // Be honest: the download failed. Saying it "started in the browser"
      // when nothing is downloading only hides the real problem.
      console.error('Download stream error:', err);
      showToast(currentLang === 'en' && err?.message ? `Download failed — ${err.message}` : t.ui.downloadFailed, 'error');
    } finally {
      setTimeout(() => {
        setDownloadingId(null);
        setDownloadProgress(null);
      }, 1500);
    }
  };

  const handleSaveToHistory = (video: ExtractedVideoInfo, qualityLabel: string) => {
    // Optionally persist to local history
    console.log('Saved to history:', video.title, qualityLabel);
  };

  return (
    <div ref={rootRef} className="relative min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] text-[#2e2440] dark:text-[#f4eefb] flex flex-col transition-colors duration-200">
      <Seo
        title={homeTitle}
        description={heroField(hero, 'subtitle', t.hero?.subtitle) || siteSettings.metaDescription}
        path="/"
        image={siteSettings.ogImage || undefined}
        jsonLd={[
          buildOrganizationSchema(
            siteSettings.siteName,
            typeof window !== 'undefined' ? window.location.origin : '',
            siteSettings.logoUrl || undefined,
            socialProfileUrls(siteSettings),
            { email: siteSettings.contactEmail, phone: siteSettings.contactPhone }
          ),
          buildWebsiteSchema(siteSettings.siteName, typeof window !== 'undefined' ? window.location.origin : ''),
          buildWebPageSchema(
            homeTitle,
            heroField(hero, 'subtitle', t.hero?.subtitle) || siteSettings.metaDescription,
            typeof window !== 'undefined' ? window.location.origin + '/' : ''
          ),
          // The FAQ schema was written but never attached to a page, so
          // search engines never saw the questions. They come from the
          // same Content Editor list the page shows.
          ...(faqs.length ? [buildFaqSchema(faqs)] : []),
        ]}
      />
      {/* Dynamic Ambient Floating Gradient Orbs */}
      {/* GSAP: scroll progress + cursor spotlight */}
      <div data-gsap="progress" className="fixed top-0 left-0 right-0 h-[3px] z-[60] origin-left bg-gradient-to-r from-[#4b2e83] via-[#6d46b8] to-[#e6799f] pointer-events-none" style={{ transform: 'scaleX(0)' }} />
      <div data-gsap="spotlight" className="pointer-events-none fixed top-0 left-0 z-0 w-[520px] h-[520px] -ml-[260px] -mt-[260px] rounded-full opacity-0 bg-[radial-gradient(circle,rgba(109,70,184,0.14)_0%,transparent_65%)] dark:bg-[radial-gradient(circle,rgba(167,139,218,0.16)_0%,transparent_65%)]" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
       <div data-gsap="orbs" className="absolute inset-0">
       <div data-gsap="orbs-mouse" className="absolute inset-0">
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            data-gsap="particle"
            className="absolute rounded-full bg-[#a78bda] dark:bg-[#d1b9f7] opacity-0"
            style={{ width: 4 + (i % 3) * 2, height: 4 + (i % 3) * 2, left: `${(i * 37) % 96 + 2}%`, top: `${(i * 53) % 80 + 6}vh`, boxShadow: '0 0 10px 2px rgba(167,139,218,0.55)' }}
          />
        ))}
        <div className="absolute -top-24 left-1/4 w-96 h-96 bg-[#6d46b8]/15 dark:bg-[#6d46b8]/20 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-[#e6799f]/15 dark:bg-[#e6799f]/20 rounded-full blur-3xl animate-float-reverse" />
        <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-blue-500/10 dark:bg-blue-500/15 rounded-full blur-3xl animate-float-slow" />
       </div>
       </div>
      </div>

      {/* 1. MODERN RESPONSIVE STICKY HEADER */}
      <Header />

      {/* 2. HERO HEADLINE & QUICK PLATFORM PILLS */}
      <motion.section 
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 pt-8 sm:pt-12 pb-4 sm:pb-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center"
      >
        <div className="max-w-3xl mx-auto space-y-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#f1e9fb] dark:bg-[#261b3b] text-[#6d46b8] dark:text-[#d1b9f7] border border-[#a78bda]/30 shadow-2xs hover:shadow-sm transition-all"
          >
            <Sparkles className="w-4 h-4 text-[#e6799f] animate-spin" style={{ animationDuration: '8s' }} />
            <span>{heroField(hero, 'trustBadge', t.hero?.badge)}</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="font-heading text-xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#2e2440] dark:text-[#f4eefb] leading-[1.25] flex flex-wrap items-center justify-center gap-x-2"
          >
            {/* The heading comes from Content Editor. "{platform}" marks where
                the rotating platform name goes; without it the heading is
                shown as plain text and no platform name is appended. */}
            <span>{heroHeadingBefore}</span>
            {heroShowsPlatform && (
            <span className="inline-block min-w-[170px] sm:min-w-[230px] md:min-w-[280px] text-left sm:text-center">
              <AnimatePresence mode="wait">
                <motion.span
                  key={platforms[platformIndex]}
                  initial={{ opacity: 0, y: 15, scale: 0.94, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -15, scale: 0.94, filter: 'blur(4px)' }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="inline-block bg-gradient-to-r from-[#4b2e83] via-[#6d46b8] to-[#e6799f] bg-clip-text text-transparent"
                >
                  {platforms[platformIndex]}
                </motion.span>
              </AnimatePresence>
            </span>
            )}
            {heroHeadingAfter && <span>{heroHeadingAfter}</span>}
            <span className="w-full block mt-2 text-base sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-[#4b2e83] via-[#6d46b8] to-[#e6799f] bg-clip-text text-transparent animate-gradient-shift">
              {t.hero?.titleHighlight || 'Videos in 1080p Full HD'}
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-sm sm:text-base text-[#5e5473] dark:text-[#b5a9cd] leading-relaxed max-w-2xl mx-auto"
          >
            {heroField(hero, 'subtitle', t.hero?.subtitle)}
          </motion.p>
        </div>

        {/* Quick Platform Selectors with spring hover — intentionally wider
            than the text column above so all supported platforms have room
            to sit on a single row on larger screens. */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="pt-4 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2"
        >
            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigateToDownloader('facebook')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer shadow-xs ${
                activeSocialPlatform === 'facebook'
                  ? 'bg-blue-600 text-white ring-2 ring-blue-400/50 shadow-md shadow-blue-500/20'
                  : 'bg-white dark:bg-[#181224] text-slate-700 dark:text-slate-200 border border-[#eae3ee] dark:border-[#2e1d4d] hover:bg-blue-50 dark:hover:bg-blue-950/40'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-blue-500 group-hover:text-white" />
              <span>Facebook</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigateToDownloader('tiktok')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer shadow-xs ${
                activeSocialPlatform === 'tiktok'
                  ? 'bg-teal-600 text-white ring-2 ring-teal-400/50 shadow-md shadow-teal-500/20'
                  : 'bg-white dark:bg-[#181224] text-slate-700 dark:text-slate-200 border border-[#eae3ee] dark:border-[#2e1d4d] hover:bg-teal-50 dark:hover:bg-teal-950/40'
              }`}
            >
              <Music className="w-3.5 h-3.5 text-teal-500" />
              <span>TikTok</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigateToDownloader('instagram')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer shadow-xs ${
                activeSocialPlatform === 'instagram'
                  ? 'bg-pink-600 text-white ring-2 ring-pink-400/50 shadow-md shadow-pink-500/20'
                  : 'bg-white dark:bg-[#181224] text-slate-700 dark:text-slate-200 border border-[#eae3ee] dark:border-[#2e1d4d] hover:bg-pink-50 dark:hover:bg-pink-950/40'
              }`}
            >
              <Instagram className="w-3.5 h-3.5 text-pink-500" />
              <span>Instagram</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigateToDownloader('twitter')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer shadow-xs ${
                activeSocialPlatform === 'twitter'
                  ? 'bg-sky-600 text-white ring-2 ring-sky-400/50 shadow-md shadow-sky-500/20'
                  : 'bg-white dark:bg-[#181224] text-slate-700 dark:text-slate-200 border border-[#eae3ee] dark:border-[#2e1d4d] hover:bg-sky-50 dark:hover:bg-sky-950/40'
              }`}
            >
              <Twitter className="w-3.5 h-3.5 text-sky-500" />
              <span>Twitter / X</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigateToDownloader('pinterest')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer shadow-xs ${
                activeSocialPlatform === 'pinterest'
                  ? 'bg-red-600 text-white ring-2 ring-red-400/50 shadow-md shadow-red-500/20'
                  : 'bg-white dark:bg-[#181224] text-slate-700 dark:text-slate-200 border border-[#eae3ee] dark:border-[#2e1d4d] hover:bg-red-50 dark:hover:bg-red-950/40'
              }`}
            >
              <Pin className="w-3.5 h-3.5 text-red-500" />
              <span>Pinterest</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigateToDownloader('reddit')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer shadow-xs ${
                activeSocialPlatform === 'reddit'
                  ? 'bg-orange-600 text-white ring-2 ring-orange-400/50 shadow-md shadow-orange-500/20'
                  : 'bg-white dark:bg-[#181224] text-slate-700 dark:text-slate-200 border border-[#eae3ee] dark:border-[#2e1d4d] hover:bg-orange-50 dark:hover:bg-orange-950/40'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-orange-500" />
              <span>Reddit</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigateToDownloader('threads')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer shadow-xs ${
                activeSocialPlatform === 'threads'
                  ? 'bg-slate-900 text-white ring-2 ring-slate-500/50 shadow-md shadow-slate-500/20'
                  : 'bg-white dark:bg-[#181224] text-slate-700 dark:text-slate-200 border border-[#eae3ee] dark:border-[#2e1d4d] hover:bg-slate-100 dark:hover:bg-slate-800/40'
              }`}
            >
              <AtSign className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
              <span>Threads</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigateToDownloader('dailymotion')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer shadow-xs ${
                activeSocialPlatform === 'dailymotion'
                  ? 'bg-violet-600 text-white ring-2 ring-violet-400/50 shadow-md shadow-violet-500/20'
                  : 'bg-white dark:bg-[#181224] text-slate-700 dark:text-slate-200 border border-[#eae3ee] dark:border-[#2e1d4d] hover:bg-violet-50 dark:hover:bg-violet-950/40'
              }`}
            >
              <Tv className="w-3.5 h-3.5 text-violet-500" />
              <span>Dailymotion</span>
            </motion.button>
        </motion.div>
      </motion.section>

      {/* 3. CORE VIDEO DOWNLOADER INTERFACE (Directly on Home Page) */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        id="section-social-tools" 
        className="relative z-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full pt-4 pb-12"
      >
        <DualToolSection
          onDownloadQuality={handleDownloadQuality}
          downloadingId={downloadingId}
          downloadProgress={downloadProgress}
          onSaveToHistory={handleSaveToHistory}
          resetSignal={homeResetKey}
        />
      </motion.section>

      {/* ACTIVE DOWNLOAD PROGRESS BAR POPUP (IF DOWNLOADING) */}
      {downloadProgress && (
        <div className="fixed bottom-6 right-6 z-50 w-84 sm:w-96 shadow-2xl rounded-2xl animate-in slide-in-from-bottom duration-200">
          <DownloadProgressBar 
            progressState={downloadProgress}
            onCancel={() => setDownloadProgress(null)}
            onDismiss={() => setDownloadProgress(null)}
            onRetry={() => {}}
          />
        </div>
      )}

      {/* 4. BLOG & STORIES SECTION (Linked to Backend Dashboard) */}
      <motion.section 
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6 }}
        id="section-home-blog" data-gsap-scope
        className="relative z-10 py-6 max-w-7xl mx-auto w-full"
      >
        <HomeBlogSection />
      </motion.section>

      {/* 4b. BROWSE BLOGS BY LANGUAGE */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6 }}
        data-gsap-scope
        className="relative z-10 py-6 max-w-7xl mx-auto w-full"
      >
        <BlogLanguagesSection />
      </motion.section>

      {/* 5. FEATURES SECTION (Why Choose <brand>) */}
      <motion.section 
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6 }}
        data-gsap-scope
        className="relative z-10 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full"
      >
        <FeaturesSection />
      </motion.section>

      {/* 5. HOW TO USE GUIDE */}
      <motion.section 
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6 }}
        data-gsap-scope
        className="relative z-10 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full"
      >
        <HowToGuide />
      </motion.section>

      {/* 6. FREQUENTLY ASKED QUESTIONS */}
      <motion.section 
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6 }}
        data-gsap-scope
        className="relative z-10 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full"
      >
        <FaqSection />
      </motion.section>

      {/* 7. FOOTER */}
      <Footer />
    </div>
  );
};
