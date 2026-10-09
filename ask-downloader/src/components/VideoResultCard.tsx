import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Download, 
  Check, 
  Copy, 
  ExternalLink, 
  Sparkles, 
  Clock, 
  Eye, 
  UserCheck, 
  Music, 
  RefreshCw,
  BookmarkCheck,
  CheckCircle2,
  Share2,
  Play
} from 'lucide-react';
import { ExtractedVideoInfo, VideoQualityOption, DownloadProgressState } from '../types.ts';
import { formatFileSize } from '../utils/downloadManager.ts';
import { SocialShareModal } from './SocialShareModal.tsx';
import { VideoPreviewModal } from './VideoPreviewModal.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';

interface VideoResultCardProps {
  video: ExtractedVideoInfo;
  onDownloadQuality: (quality: VideoQualityOption) => void;
  onReset: () => void;
  downloadingId: string | null;
  hasSavedToHistory?: boolean;
  downloadProgress?: DownloadProgressState | null;
}

export const VideoResultCard: React.FC<VideoResultCardProps> = ({
  video,
  onDownloadQuality,
  onReset,
  downloadingId,
  hasSavedToHistory,
  downloadProgress,
}) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewQualityId, setPreviewQualityId] = useState<string | null>(null);

  const handleOpenPreview = (qualityId?: string) => {
    setPreviewQualityId(qualityId || null);
    setIsPreviewModalOpen(true);
  };

  const handleCopyTitle = () => {
    navigator.clipboard.writeText(video.title);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDownloadPageUrl = () => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const targetUrl = video.originalUrl || video.canonicalUrl;
    return `${origin}${pathname}?url=${encodeURIComponent(targetUrl)}`;
  };

  const handleCopyShareLink = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const shareUrl = getDownloadPageUrl();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2500);
    } catch (err) {
      console.error('Failed to copy share link:', err);
    }
  };

  const handleOpenShare = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Copy link immediately to clipboard for quick convenience
    handleCopyShareLink();
    // Also display the social share modal with platforms & direct URL field
    setIsShareModalOpen(true);
  };

  return (
    <motion.div
      id="video-result-card-root"
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration: 0.45,
        ease: [0.16, 1, 0.3, 1], // Smooth cubic-bezier spring-like easing
      }}
      className="w-full max-w-4xl mx-auto px-0 sm:px-1 my-3 sm:my-4"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/60 dark:shadow-black/40 border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors w-full min-w-0">
        
        {/* Top Notification Bar */}
        <div className="bg-emerald-50 dark:bg-emerald-950/50 border-b border-emerald-100 dark:border-emerald-900/80 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2 font-medium">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">{t.ui.extracted}</span>
          </div>
          {hasSavedToHistory && (
            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-100/70 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md shrink-0">
              <BookmarkCheck className="w-3.5 h-3.5" /> {t.ui.savedHistory}
            </span>
          )}
        </div>

        <div className="p-3.5 sm:p-5 lg:p-7">
          <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 items-start">
            
            {/* Left: Thumbnail with Duration Badge & Interactive Preview */}
            <div className="w-full md:w-80 shrink-0">
              <div 
                id="btn-thumbnail-preview"
                role="button"
                tabIndex={0}
                onClick={() => handleOpenPreview()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenPreview();
                  }
                }}
                className="relative group rounded-xl overflow-hidden shadow-md bg-slate-900 aspect-video flex items-center justify-center cursor-pointer border border-slate-200/80 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                title={t.ui.clickPreview}
              >
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    // Fallback thumbnail if broken
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=80';
                  }}
                />
                
                {/* Center Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/45 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform ring-4 ring-white/20">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </div>

                {/* Duration Overlay */}
                {video.duration && (
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 backdrop-blur-xs text-white text-xs font-semibold rounded flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{video.duration}</span>
                  </div>
                )}

                {/* Preview Badge */}
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/75 backdrop-blur-xs text-white text-[11px] font-semibold rounded flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                  <Eye className="w-3 h-3 text-blue-400" />
                  <span>{t.videoResult.btnPreview}</span>
                </div>

                {/* HD Tag */}
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-blue-600/90 backdrop-blur-xs text-white text-xs font-bold rounded shadow-xs">
                  {t.videoResult.hdBadge}
                </div>
              </div>

              {/* Actions below Thumbnail */}
              <div className="mt-3 space-y-2">
                {/* Main Video Preview Button */}
                <button
                  id="btn-preview-video-main"
                  onClick={() => handleOpenPreview()}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 dark:border-slate-600 shadow-xs active:scale-98"
                  title={t.ui.watchPreview}
                >
                  <Play className="w-3.5 h-3.5 fill-current text-blue-400" />
                  <span>{t.videoResult.previewButton}</span>
                </button>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    id="btn-share-thumbnail"
                    onClick={handleOpenShare}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-colors border shadow-xs ${
                      copiedShareLink
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                        : 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border-blue-200 dark:border-blue-800'
                    }`}
                    title={t.ui.shareDownload}
                  >
                    {copiedShareLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{t.videoResult.linkCopied}</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>{t.videoResult.shareVideo}</span>
                      </>
                    )}
                  </button>

                  <button
                    id="btn-download-another"
                    onClick={onReset}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60"
                    title={t.videoResult.resetTooltip}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{t.videoResult.reset}</span>
                    <kbd className="hidden sm:inline-block px-1 py-0.2 text-[10px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded border border-slate-200 dark:border-slate-600">
                      Esc
                    </kbd>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Info & Qualities */}
            <div className="flex-1 min-w-0">
              {/* Title & Copy */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                  {video.title}
                </h2>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    id="btn-copy-title"
                    onClick={handleCopyTitle}
                    className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                    title={t.ui.copyTitle}
                    aria-label={t.ui.copyTitle}
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Author & Stats Meta + Social Share Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-4">
                  {video.authorName && (
                    <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
                      <UserCheck className={`w-3.5 h-3.5 ${
                        video.platform === 'instagram'
                          ? 'text-rose-500'
                          : video.platform === 'tiktok'
                          ? 'text-teal-500'
                          : video.platform === 'twitter'
                          ? 'text-sky-500'
                          : video.platform === 'pinterest'
                          ? 'text-red-500'
                          : video.platform === 'reddit'
                          ? 'text-orange-500'
                          : 'text-blue-600 dark:text-blue-400'
                      }`} />
                      <span>{video.authorName}</span>
                      {video.authorHandle && (
                        <span className="text-slate-400 dark:text-slate-500 font-normal">({video.authorHandle})</span>
                      )}
                    </div>
                  )}
                  {video.likesCount && (
                    <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                      <span>♥ {video.likesCount} {video.platform === 'reddit' ? 'upvotes' : 'likes'}</span>
                    </div>
                  )}
                  {video.viewsCount && (
                    <div className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{video.viewsCount}</span>
                    </div>
                  )}
                  <a
                    href={video.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-1 hover:underline ${
                      video.platform === 'instagram' 
                        ? 'text-rose-600 dark:text-rose-400' 
                        : video.platform === 'tiktok'
                        ? 'text-teal-600 dark:text-teal-400'
                        : video.platform === 'twitter'
                        ? 'text-sky-600 dark:text-sky-400'
                        : video.platform === 'pinterest'
                        ? 'text-red-600 dark:text-red-400'
                        : video.platform === 'reddit'
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    <span>
                      {video.platform === 'instagram'
                        ? 'Open on Instagram'
                        : video.platform === 'tiktok'
                        ? 'Open on TikTok'
                        : video.platform === 'twitter'
                        ? 'Open on Twitter / X'
                        : video.platform === 'pinterest'
                        ? 'Open on Pinterest'
                        : video.platform === 'reddit'
                        ? 'Open on Reddit'
                        : 'Open on Facebook'}
                    </span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Social Share & Copy Download Page Link */}
                <div className="flex items-center gap-2">
                  <button
                    id="btn-copy-share-link"
                    onClick={handleCopyShareLink}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-xs ${
                      copiedShareLink
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                        : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                    title={t.ui.copyPageLink}
                  >
                    {copiedShareLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{t.ui.linkCopied}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        <span>{t.ui.copyLink}</span>
                      </>
                    )}
                  </button>

                  <button
                    id="btn-open-share-modal"
                    onClick={handleOpenShare}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/70 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-all shadow-xs"
                    title={t.ui.shareSocial}
                  >
                    <Share2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Share</span>
                  </button>
                </div>
              </div>

              {/* Available Qualities List */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-3.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                  {t.videoResult.downloadOptionsTitle}
                </h3>

                <div className="space-y-3">
                  {video.qualities.map((q) => {
                    const isDownloadingThis = 
                      (downloadProgress?.isActive && downloadProgress.quality?.id === q.id) ||
                      downloadingId === q.id;
                    const isCompletedThis = 
                      downloadProgress?.status === 'completed' && downloadProgress.quality?.id === q.id;
                    // A single missing field used to throw here and replace the
                    // whole page with an error screen, even though the download
                    // itself had worked. Read these defensively instead.
                    const resolutionParts = String(q.resolution || '').split('x');
                    const resolutionLabel = resolutionParts[1]
                      ? `${resolutionParts[1]}p`
                      : String(q.quality || 'Video').split(' ')[0];

                    return (
                      <motion.div
                        key={q.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 rounded-2xl border overflow-hidden transition-all duration-300 ${
                          isDownloadingThis
                            ? 'bg-gradient-to-br from-blue-50 to-blue-50/60 dark:from-blue-950/80 dark:to-blue-950/40 border-blue-400 dark:border-blue-600 ring-2 ring-blue-500/20 shadow-lg shadow-blue-500/10'
                            : isCompletedThis
                            ? 'bg-gradient-to-br from-emerald-50 to-emerald-50/50 dark:from-emerald-950/70 dark:to-emerald-950/30 border-emerald-300 dark:border-emerald-700 shadow-sm'
                            : q.isHd
                            ? 'bg-gradient-to-br from-blue-50/70 to-white dark:from-blue-950/40 dark:to-slate-900/60 border-blue-200/80 dark:border-blue-800/70 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md hover:shadow-blue-500/5'
                            : 'bg-gradient-to-br from-slate-50/80 to-white dark:from-slate-800/60 dark:to-slate-900/40 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md'
                        }`}
                      >
                        {/* Quality Label & Spec */}
                        <div className="flex items-start gap-3.5 flex-1 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-xl shrink-0 flex items-center justify-center font-extrabold text-xs shadow-sm transition-transform duration-300 group-hover:scale-105 ${
                              isCompletedThis
                                ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                                : q.format === 'MP3'
                                ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white'
                                : q.isHd
                                ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            {isCompletedThis ? (
                              <CheckCircle2 className="w-5 h-5 text-white" />
                            ) : q.format === 'MP3' ? (
                              <Music className="w-4.5 h-4.5" />
                            ) : (
                              resolutionLabel
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">
                                {q.quality}
                              </span>
                              {q.isHd && (
                                <span className="px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[10px] tracking-wide">
                                  HD
                                </span>
                              )}
                              {isCompletedThis && (
                                <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] flex items-center gap-1 tracking-wide">
                                  <Check className="w-3 h-3" /> SAVED
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold tracking-wide">
                                {q.format}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                              <span>{q.fileSizeEstimate}</span>
                            </div>

                            {/* Inline visual progress bar when this row is active */}
                            {isDownloadingThis && downloadProgress && (
                              <div className="mt-2.5 w-full max-w-sm pr-2">
                                <div className="flex items-center justify-between text-[11px] font-semibold text-blue-800 dark:text-blue-300 mb-1">
                                  <span>
                                    {downloadProgress.status === 'assembling'
                                      ? 'Finalizing MP4 file...'
                                      : downloadProgress.status === 'connecting'
                                      ? 'Contacting server...'
                                      : `${downloadProgress.progressPercent}% downloaded`}
                                  </span>
                                  <span>
                                    {formatFileSize(downloadProgress.bytesLoaded)} / {formatFileSize(downloadProgress.totalBytes)}
                                  </span>
                                </div>
                                <div className="w-full h-2 bg-blue-100 dark:bg-blue-950 rounded-full overflow-hidden p-0.5 border border-blue-200 dark:border-blue-800">
                                  <div
                                    className="h-full bg-blue-600 rounded-full transition-all duration-150 relative overflow-hidden"
                                    style={{ width: `${Math.max(4, downloadProgress.progressPercent)}%` }}
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Download Action */}
                        <div className="mt-1 sm:mt-0 shrink-0 self-stretch sm:self-center flex items-center justify-end">
                          <motion.button
                            id={`btn-download-${q.id}`}
                            onClick={() => onDownloadQuality(q)}
                            disabled={isDownloadingThis && downloadProgress?.status !== 'completed'}
                            whileHover={!isDownloadingThis ? { scale: 1.04 } : undefined}
                            whileTap={!isDownloadingThis ? { scale: 0.96 } : undefined}
                            className={`group/btn w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all duration-200 ${
                              !isDownloadingThis ? 'hover:shadow-lg cursor-pointer' : 'cursor-wait'
                            } ${
                              isCompletedThis
                                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-emerald-500/25'
                                : isDownloadingThis
                                ? 'bg-blue-700 text-white'
                                : q.isHd
                                ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-blue-500/25'
                                : q.format === 'MP3'
                                ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white shadow-amber-500/25'
                                : 'bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-900 hover:to-slate-800 text-white'
                            }`}
                          >
                            {isDownloadingThis && downloadProgress?.status !== 'completed' ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>
                                  {downloadProgress
                                    ? `${downloadProgress.progressPercent}%`
                                    : t.videoResult.btnDownloading}
                                </span>
                              </>
                            ) : isCompletedThis ? (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Saved</span>
                              </>
                            ) : (
                              <>
                                <span className="relative w-4 h-4 overflow-hidden shrink-0">
                                  <Download className="w-4 h-4 absolute inset-0 transition-transform duration-300 ease-out group-hover/btn:translate-y-5 group-hover/btn:opacity-0" />
                                  <Download className="w-4 h-4 absolute inset-0 -translate-y-5 opacity-0 transition-transform duration-300 ease-out group-hover/btn:translate-y-0 group-hover/btn:opacity-100" />
                                </span>
                                <span>{t.videoResult.btnDownload}</span>
                              </>
                            )}
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Safe notice footer */}
        <div className="bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 px-6 py-3 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>{t.ui.directStream}</span>
          <span className="text-slate-400 dark:text-slate-500">MP4 (H.264 / AAC)</span>
        </div>

      </div>

      {/* Lightweight Video Player Preview Modal */}
      <VideoPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        video={video}
        onDownloadQuality={onDownloadQuality}
        initialQualityId={previewQualityId}
      />

      {/* Social Share & Copy Link Dialog */}
      <SocialShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        video={video}
        downloadPageUrl={getDownloadPageUrl()}
      />
    </motion.div>
  );
};
