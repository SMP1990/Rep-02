import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  ClipboardPaste, 
  X, 
  Sparkles, 
  ArrowRight,
  CheckCircle2,
  Video,
  Instagram,
  Music,
  Twitter,
  Pin,
  MessageSquare,
  AtSign,
  Tv,
  RefreshCw,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { 
  ExtractedVideoInfo, 
  VideoQualityOption, 
  ExtractionStatus, 
  ExtractionError, 
  DownloadProgressState,
  SocialPlatform 
} from '../types.ts';
import { 
  validateFacebookUrl, 
  validateInstagramUrl, 
  validateTikTokUrl,
  validateTwitterUrl,
  validatePinterestUrl,
  validateRedditUrl,
  validateThreadsUrl,
  validateDailymotionUrl,
  detectPlatform 
} from '../utils/validation.ts';
import { detectSocialUrlInClipboard } from '../utils/clipboardManager.ts';
import { VideoResultCard } from './VideoResultCard.tsx';
import { ErrorAlert } from './ErrorAlert.tsx';
import { LoadingAnimation } from './LoadingAnimation.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { applyBrand } from '../config/brand.ts';
import { heroField } from '../utils/heroContent.ts';
import { useAdmin } from '../context/AdminContext';
import { localizeHero } from '../utils/pageTranslations';

interface ToolPlatformCardProps {
  platform: SocialPlatform;
  onDownloadQuality: (quality: VideoQualityOption, video: ExtractedVideoInfo) => void;
  downloadingId: string | null;
  downloadProgress?: DownloadProgressState | null;
  onSaveToHistory: (video: ExtractedVideoInfo, qualityLabel: string) => void;
  onSwitchToPlatform: (url: string, targetPlatform: SocialPlatform) => void;
  externalUrl?: string | null;
}

export const ToolPlatformCard: React.FC<ToolPlatformCardProps> = ({
  platform,
  onDownloadQuality,
  downloadingId,
  downloadProgress,
  onSwitchToPlatform,
  externalUrl,
}) => {
  const { t, brand, currentLang } = useLanguage();
  // Text the admin sets in Content Editor wins over the built-in defaults,
  // so the dashboard actually controls what the hero area says — in the
  // visitor's language once the server has translated it.
  const { landingContent, pageTranslations } = useAdmin();
  const heroText = applyBrand(localizeHero(landingContent?.hero, currentLang, pageTranslations), brand);
  const isUniversal = platform === 'universal';
  const isFb = platform === 'facebook';
  const isIg = platform === 'instagram';
  const isTt = platform === 'tiktok';
  const isTw = platform === 'twitter';
  const isPin = platform === 'pinterest';
  const isRd = platform === 'reddit';
  const isTh = platform === 'threads';
  const isDm = platform === 'dailymotion';

  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<ExtractionStatus>('idle');
  const [result, setResult] = useState<ExtractedVideoInfo | null>(null);
  const [error, setError] = useState<ExtractionError | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const [crossUrl, setCrossUrl] = useState<{ url: string; target: SocialPlatform } | null>(null);

  // Sync external URL when deep link or history item is passed
  useEffect(() => {
    if (!externalUrl) return;
    const detected = detectPlatform(externalUrl);
    if (isUniversal) {
      if (detected !== 'unknown') {
        onSwitchToPlatform(externalUrl, detected as SocialPlatform);
      } else {
        setUrl(externalUrl);
        processUrl(externalUrl);
      }
      return;
    }
    if (detected === platform) {
      setUrl(externalUrl);
      processUrl(externalUrl);
    }
  }, [externalUrl, platform]);

  const processUrl = async (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) return;

    const detected = detectPlatform(trimmed);

    if (isUniversal && detected === 'unknown') {
      setError({
        code: 'INVALID_URL',
        title: 'Unsupported URL',
        message: 'Please paste a valid video URL from Facebook, TikTok, Instagram, Twitter, Pinterest, Reddit, Threads, Dailymotion.',
        tip: 'Make sure the URL is copied directly from the post share or copy link option.'
      });
      setStatus('error');
      return;
    }

    const activePlatform = isUniversal ? (detected as SocialPlatform) : platform;
    const isTargetFb = activePlatform === 'facebook';
    const isTargetIg = activePlatform === 'instagram';
    const isTargetTt = activePlatform === 'tiktok';
    const isTargetTw = activePlatform === 'twitter';
    const isTargetPin = activePlatform === 'pinterest';
    const isTargetRd = activePlatform === 'reddit';
    const isTargetTh = activePlatform === 'threads';
    const isTargetDm = activePlatform === 'dailymotion';

    // Cross-platform detection (only if not universal)
    if (!isUniversal && detected !== 'unknown' && detected !== platform) {
      setCrossUrl({ url: trimmed, target: detected as SocialPlatform });
      return;
    }
    setCrossUrl(null);

    setUrl(trimmed);
    setError(null);
    setResult(null);
    setStatus('validating');
    setHasSaved(false);

    // Platform validation
    let validation;
    if (isTargetFb) validation = validateFacebookUrl(trimmed);
    else if (isTargetIg) validation = validateInstagramUrl(trimmed);
    else if (isTargetTt) validation = validateTikTokUrl(trimmed);
    else if (isTargetTw) validation = validateTwitterUrl(trimmed);
    else if (isTargetPin) validation = validatePinterestUrl(trimmed);
    else if (isTargetRd) validation = validateRedditUrl(trimmed);
    else if (isTargetTh) validation = validateThreadsUrl(trimmed);
    else if (isTargetDm) validation = validateDailymotionUrl(trimmed);

    if (!validation.isValid) {
      setError({
        code: 'INVALID_URL',
        title: isTargetFb 
          ? 'Invalid Facebook URL' 
          : isTargetIg 
          ? 'Invalid Instagram URL' 
          : isTargetTt 
          ? 'Invalid TikTok URL'
          : isTargetTw
          ? 'Invalid Twitter / X URL'
          : isTargetPin
          ? 'Invalid Pinterest URL'
          : isTargetRd
          ? 'Invalid Reddit URL'
          : isTargetTh
          ? 'Invalid Threads URL'
          : isTargetDm
          ? 'Invalid Dailymotion URL'
          : 'Invalid URL',
        message: validation.errorMessage || 'Please enter a valid video link.',
        tip: 'Copy the link directly from the post share or copy link option.',
      });
      setStatus('error');
      return;
    }

    setStatus('fetching');

    try {
      const response = await fetch('/api/video/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed, platform: activePlatform }),
      });

      const data = await response.json();
      await new Promise((resolve) => setTimeout(resolve, 600));

      if (!response.ok) {
        setError({
          code: data.error || 'SERVER_ERROR',
          title: data.title || 'Extraction Failed',
          message: data.message || 'Unable to retrieve video information.',
          tip: data.tip || 'Verify that the video or post is public and accessible.',
        });
        setStatus('error');
        return;
      }

      if (!data.data) {
        setError({
          code: 'SERVER_ERROR',
          title: 'We Couldn’t Fetch This Video',
          message: 'Sorry about that — there’s a short delay on our end and we couldn’t retrieve this video right now.',
          tip: 'Please wait a moment and try again.',
        });
        setStatus('error');
        return;
      }

      const extracted: ExtractedVideoInfo = data.data;
      extracted.platform = activePlatform;

      setResult(extracted);
      setStatus('ready');
      window.history.replaceState(null, '', `?url=${encodeURIComponent(extracted.originalUrl || trimmed)}`);
    } catch (err) {
      console.error(`${activePlatform} extraction error:`, err);
      setError({
        code: 'SERVER_ERROR',
        title: 'We Couldn’t Fetch This Video',
        message: 'Sorry about that — there’s a short delay on our end and we couldn’t retrieve this video right now.',
        tip: 'Please check your connection and try again in a moment.',
      });
      setStatus('error');
    }
  };

  const handlePaste = async () => {
    try {
      const detectResult = await detectSocialUrlInClipboard(platform);
      if (detectResult.hasValidUrl && detectResult.url) {
        setUrl(detectResult.url);
        processUrl(detectResult.url);
        return;
      }
      if (detectResult.rawText) {
        setUrl(detectResult.rawText);
        processUrl(detectResult.rawText);
        return;
      }
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text.trim()) {
          setUrl(text.trim());
          processUrl(text.trim());
        }
      }
    } catch {
      // Fallback
    }
  };

  const handleReset = () => {
    setUrl('');
    setResult(null);
    setError(null);
    setStatus('idle');
    setCrossUrl(null);
  };

  // Card theme classes
  const headerGradient = isUniversal
    ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600'
    : isFb
    ? 'bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-700'
    : isIg
    ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600'
    : isTt
    ? 'bg-gradient-to-r from-teal-600 via-cyan-600 to-slate-900'
    : isTw
    ? 'bg-gradient-to-r from-sky-500 via-blue-600 to-slate-900'
    : isPin
    ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700'
    : isRd
    ? 'bg-gradient-to-r from-orange-600 via-orange-500 to-red-600'
    : isTh
    ? 'bg-gradient-to-r from-slate-900 via-zinc-900 to-neutral-900'
    : isDm
    ? 'bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-600'
    : 'bg-gradient-to-r from-sky-700 via-blue-600 to-indigo-700';

  const cardBorder = isUniversal
    ? 'border-indigo-200/90 dark:border-indigo-900/60 shadow-xl shadow-indigo-500/5'
    : isFb
    ? 'border-blue-200/90 dark:border-blue-900/60 shadow-xl shadow-blue-500/5'
    : isIg
    ? 'border-rose-200/90 dark:border-rose-900/60 shadow-xl shadow-rose-500/5'
    : isTt
    ? 'border-teal-200/90 dark:border-teal-900/60 shadow-xl shadow-teal-500/5'
    : isTw
    ? 'border-sky-200/90 dark:border-sky-900/60 shadow-xl shadow-sky-500/5'
    : isPin
    ? 'border-red-200/90 dark:border-red-900/60 shadow-xl shadow-red-500/5'
    : isRd
    ? 'border-orange-200/90 dark:border-orange-900/60 shadow-xl shadow-orange-500/5'
    : isTh
    ? 'border-zinc-300/90 dark:border-zinc-800/80 shadow-xl shadow-zinc-500/5'
    : isDm
    ? 'border-blue-200/90 dark:border-blue-900/60 shadow-xl shadow-blue-500/5'
    : 'border-sky-200/90 dark:border-sky-900/60 shadow-xl shadow-sky-500/5';

  const submitButtonGradient = isUniversal
    ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 shadow-md shadow-indigo-500/25 focus:ring-indigo-500'
    : isFb
    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-600/25 focus:ring-blue-500'
    : isIg
    ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:opacity-95 shadow-md shadow-rose-500/25 focus:ring-rose-500'
    : isTt
    ? 'bg-gradient-to-r from-teal-500 via-cyan-600 to-slate-800 hover:opacity-95 shadow-md shadow-teal-500/25 focus:ring-teal-500'
    : isTw
    ? 'bg-gradient-to-r from-sky-500 via-blue-600 to-slate-800 hover:opacity-95 shadow-md shadow-sky-500/25 focus:ring-sky-500'
    : isPin
    ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:opacity-95 shadow-md shadow-red-500/25 focus:ring-red-500'
    : isRd
    ? 'bg-gradient-to-r from-orange-600 via-orange-500 to-red-600 hover:opacity-95 shadow-md shadow-orange-500/25 focus:ring-orange-500'
    : isTh
    ? 'bg-gradient-to-r from-zinc-900 via-black to-zinc-900 hover:opacity-95 shadow-md shadow-zinc-900/25 focus:ring-zinc-500'
    : isDm
    ? 'bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-600 hover:opacity-95 shadow-md shadow-blue-600/25 focus:ring-blue-500'
    : 'bg-gradient-to-r from-sky-700 via-blue-600 to-indigo-700 hover:opacity-95 shadow-md shadow-sky-600/25 focus:ring-sky-500';

  const accentFocusRing = isUniversal
    ? 'focus:ring-indigo-500 dark:focus:ring-indigo-400'
    : isFb
    ? 'focus:ring-blue-500 dark:focus:ring-blue-400'
    : isIg
    ? 'focus:ring-rose-500 dark:focus:ring-rose-400'
    : isTt
    ? 'focus:ring-teal-500 dark:focus:ring-teal-400'
    : isTw
    ? 'focus:ring-sky-500 dark:focus:ring-sky-400'
    : isPin
    ? 'focus:ring-red-500 dark:focus:ring-red-400'
    : isRd
    ? 'focus:ring-orange-500 dark:focus:ring-orange-400'
    : isTh
    ? 'focus:ring-zinc-500 dark:focus:ring-zinc-400'
    : isDm
    ? 'focus:ring-blue-500 dark:focus:ring-blue-400'
    : 'focus:ring-sky-500 dark:focus:ring-sky-400';

  const pasteTextColor = isUniversal
    ? 'text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60'
    : isFb
    ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60'
    : isIg
    ? 'text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60'
    : isTt
    ? 'text-teal-600 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/60'
    : isTw
    ? 'text-sky-600 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/60'
    : isPin
    ? 'text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/60'
    : isRd
    ? 'text-orange-600 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/60'
    : isTh
    ? 'text-zinc-900 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
    : isDm
    ? 'text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/60'
    : 'text-sky-600 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/60';

  return (
    <motion.div 
      id={`card-${platform}-tool`}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col bg-white dark:bg-[#181224] rounded-2xl border ${cardBorder} dark:shadow-black/40 overflow-hidden transition-all duration-300`}
    >
      {/* Tool Header with subtle shimmer background */}
      <div className={`${headerGradient} p-4 sm:p-5 text-white flex items-center justify-between relative overflow-hidden`}>
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white ring-1 ring-white/25 shadow-inner">
            {isUniversal ? (
              <Sparkles className="w-5 h-5" />
            ) : isFb ? (
              <Video className="w-5 h-5" />
            ) : isIg ? (
              <Instagram className="w-5 h-5" />
            ) : isTt ? (
              <Music className="w-5 h-5" />
            ) : isTw ? (
              <Twitter className="w-5 h-5" />
            ) : isPin ? (
              <Pin className="w-5 h-5" />
            ) : isRd ? (
              <MessageSquare className="w-5 h-5" />
            ) : isTh ? (
              <AtSign className="w-5 h-5" />
            ) : isDm ? (
              <Tv className="w-5 h-5" />
            ) : (
              <Video className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight">
                {isUniversal
                  ? t.tools?.universal || 'All Platforms'
                  : isFb 
                  ? t.tools?.facebook || 'Facebook' 
                  : isIg 
                  ? t.tools?.instagram || 'Instagram' 
                  : isTt 
                  ? t.tools?.tiktok || 'TikTok' 
                  : isTw 
                  ? t.tools?.twitter || 'Twitter / X' 
                  : isPin
                  ? t.tools?.pinterest || 'Pinterest'
                  : isRd
                  ? t.tools?.reddit || 'Reddit'
                  : isTh
                  ? t.tools?.threads || 'Threads'
                  : isDm
                  ? t.tools?.dailymotion || 'Dailymotion'
                  : t.ui.allPlatforms}
              </h2>
              <span className="px-2 py-0.5 bg-white/20 text-white font-extrabold text-[10px] rounded uppercase tracking-wider backdrop-blur-xs">
                {isUniversal ? t.ui.allInOne : isFb ? 'FB HD' : isIg ? 'IG Reels' : isTt ? 'TikTok' : isTw ? 'Twitter / X' : isPin ? 'Pinterest' : isRd ? 'Reddit' : isTh ? 'Threads' : isDm ? 'DM HD' : 'Pro HD'}
              </span>
            </div>
            <p className="text-xs text-white/90">
              {isUniversal
                ? t.tools?.universalSubtitle || 'Paste any social video link for auto-detection'
                : isFb 
                ? t.tools?.facebookSubtitle || 'Reels, Watch, Video Posts & Stories' 
                : isIg 
                ? t.tools?.instagramSubtitle || 'Reels, Video Posts, IGTV & Audio' 
                : isTt
                ? t.tools?.tiktokSubtitle || 'Videos, Shorts & Sounds (Without Watermark)'
                : isTw
                ? t.tools?.twitterSubtitle || 'Tweets, Video Clips, Spaces & Audio'
                : isPin
                ? t.tools?.pinterestSubtitle || 'Video Pins, Idea Pins, Shorts & Tutorials'
                : isRd
                ? t.tools?.redditSubtitle || 'Reddit Video Posts, Audio, v.redd.it Clips & GIFs'
                : isTh
                ? t.tools?.threadsSubtitle || 'Threads Video Posts, Carousels & Audio'
                : isDm
                ? t.tools?.dailymotionSubtitle || 'HD Streams, Videos, Shorts & MP3 Audio'
                : t.ui.fastFree}
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold bg-white/20 px-3 py-1 rounded-full text-white backdrop-blur-xs">
          {isFb ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> {t.ui.hd1080}
            </>
          ) : isIg ? (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> {t.ui.hdReels}
            </>
          ) : isTt ? (
            <>
              <Zap className="w-3.5 h-3.5 text-cyan-300" /> {t.ui.noWatermarkHd}
            </>
          ) : isTw ? (
            <>
              <Zap className="w-3.5 h-3.5 text-sky-300" /> {t.ui.fastMp4Mp3}
            </>
          ) : isPin ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-rose-300" /> {t.ui.fullHdPin}
            </>
          ) : isRd ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-orange-300" /> {t.ui.audioHd}
            </>
          ) : isTh ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-200" /> {t.ui.threadsHd}
            </>
          ) : isDm ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-200" /> {t.ui.dmHd}
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-pink-200" /> {t.input?.autoDetectOn || 'Auto-detect: ON'}
            </>
          )}
        </span>
      </div>

      {/* Tool Body */}
      <div className="p-5 sm:p-6 space-y-5">
        {/* Input Form */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            processUrl(url);
          }}
          className="space-y-3"
        >
          <div className="relative group">
            <input
              id={`input-${platform}-url`}
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError(null);
                if (crossUrl) setCrossUrl(null);
              }}
              placeholder={
                isUniversal
                  ? heroField(heroText, 'inputPlaceholder', t.tools?.universalPlaceholder)
                  : isFb 
                  ? t.tools?.facebookPlaceholder || 'Paste Facebook video URL (facebook.com/reel/... or fb.watch/...)' 
                  : isIg
                  ? t.tools?.instagramPlaceholder || 'Paste Instagram Reel or Post link (instagram.com/reel/...)'
                  : isTt
                  ? t.tools?.tiktokPlaceholder || 'Paste TikTok video link (tiktok.com/@user/video/... or vt.tiktok.com/...)'
                  : isTw
                  ? t.tools?.twitterPlaceholder || 'Paste Twitter or X post link (x.com/user/status/... or twitter.com/...)'
                  : isPin
                  ? t.tools?.pinterestPlaceholder || 'Paste Pinterest Pin link (pinterest.com/pin/... or pin.it/...)'
                  : isRd
                  ? t.tools?.redditPlaceholder || 'Paste Reddit post or video link (reddit.com/r/... or v.redd.it/...)'
                  : isTh
                  ? t.tools?.threadsPlaceholder || 'Paste Threads post URL (threads.net/@user/post/... or threads.net/t/...)'
                  : isDm
                  ? t.tools?.dailymotionPlaceholder || 'Paste Dailymotion video URL (dailymotion.com/video/... or dai.ly/...)'
                  : t.input?.placeholder
              }
              className={`w-full pl-4 pr-24 py-3.5 text-sm bg-slate-50 dark:bg-[#1f1730] border border-slate-300 dark:border-[#352554] rounded-xl focus:outline-hidden focus:ring-2 ${accentFocusRing} focus:bg-white dark:focus:bg-[#181224] dark:focus:bg-[#181224] dark:focus:bg-[#181224] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all shadow-inner`}
              disabled={status === 'fetching' || status === 'validating'}
            />

            {/* Actions inside input */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {url && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={handleReset}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
                  title={t.ui.clearInput}
                >
                  <X className="w-4 h-4" />
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={handlePaste}
                className={`px-2.5 py-1.5 text-xs font-semibold bg-white dark:bg-[#2a1e42] ${pasteTextColor} border border-slate-200 dark:border-[#422e66] rounded-lg transition-colors shadow-2xs flex items-center gap-1 cursor-pointer`}
                title={t.ui.paste}
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.input?.paste || 'Paste'}</span>
              </motion.button>
            </div>
          </div>

          {/* Cross-Platform Alert */}
          {crossUrl && (
            <motion.div 
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl border flex items-center justify-between gap-3 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                <span>
                  Detected <strong>{crossUrl.target.toUpperCase()} link</strong>. Switch to {crossUrl.target} tab?
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onSwitchToPlatform(crossUrl.url, crossUrl.target);
                  setCrossUrl(null);
                }}
                className="px-3 py-1.5 font-bold rounded-lg text-white shadow-xs flex items-center gap-1 shrink-0 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:bg-[#181224] dark:text-slate-900 cursor-pointer"
              >
                <span>{t.ui.switchTab}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}

          {/* Process Submit Button */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            id={`btn-extract-${platform}`}
            disabled={!url.trim() || status === 'fetching' || status === 'validating'}
            className={`w-full py-3.5 px-5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all cursor-pointer ${submitButtonGradient} disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none focus:outline-hidden focus:ring-2 focus:ring-offset-2`}
          >
            {status === 'fetching' || status === 'validating' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{t.input?.processing || 'Extracting Video Streams...'}</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>
                  {heroText?.ctaText
                    ? heroText.ctaText
                    : t.tools?.getButton
                    ? t.tools.getButton.replace('{platform}', isFb ? 'Facebook' : isIg ? 'Instagram' : isTt ? 'TikTok' : isTw ? 'Twitter' : isPin ? 'Pinterest' : isRd ? 'Reddit' : isTh ? 'Threads' : isDm ? 'Dailymotion' : 'Social')
                    : `Get ${isFb ? 'Facebook' : isIg ? 'Instagram' : isTt ? 'TikTok' : isTw ? 'Twitter / X' : isPin ? 'Pinterest' : isRd ? 'Reddit' : isTh ? 'Threads' : isDm ? 'Dailymotion' : 'Social'} Video`}
                </span>
              </>
            )}
          </motion.button>
        </form>


        <AnimatePresence mode="wait">
          {/* Loading State */}
          {(status === 'validating' || status === 'fetching') && (
            <motion.div 
              key="loading" 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="pt-2"
            >
              <LoadingAnimation platform={platform} />
            </motion.div>
          )}

          {/* Error State */}
          {status === 'error' && error && (
            <motion.div 
              key="error" 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="pt-2"
            >
              <ErrorAlert 
                error={error} 
                platform={platform}
                onRetry={() => {
                  setError(null);
                  setStatus('idle');
                  if (url.trim()) processUrl(url);
                }} 
              />
            </motion.div>
          )}

          {/* Ready Video Result Card */}
          {status === 'ready' && result && (
            <motion.div 
              key="ready" 
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="pt-2"
            >
              <VideoResultCard
                video={result}
                onDownloadQuality={(quality) => onDownloadQuality(quality, result)}
                onReset={handleReset}
                downloadingId={downloadingId}
                hasSavedToHistory={hasSaved}
                downloadProgress={downloadProgress}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Badges */}
      <div className="bg-slate-50 dark:bg-[#130c20] border-t border-slate-100 dark:border-[#281b3f] px-5 py-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className={`w-3.5 h-3.5 ${isFb ? 'text-blue-600 dark:text-blue-400' : isIg ? 'text-rose-600 dark:text-rose-400' : isTt ? 'text-teal-700 dark:text-teal-400' : isTw ? 'text-sky-700 dark:text-sky-400' : isPin ? 'text-red-600 dark:text-red-400' : 'text-orange-700 dark:text-orange-400'}`} />
          <span>{heroField(heroText, 'noticeText', t.tools?.noticeText)}</span>
        </span>
        <span className={`font-mono text-[11px] ${isFb ? 'text-blue-600 dark:text-blue-400' : isIg ? 'text-rose-600 dark:text-rose-400' : isTt ? 'text-teal-700 dark:text-teal-400' : isTw ? 'text-sky-700 dark:text-sky-400' : isPin ? 'text-red-600 dark:text-red-400' : 'text-orange-700 dark:text-orange-400'} font-semibold`}>
          MP4 / MP3
        </span>
      </div>
    </motion.div>
  );
};


