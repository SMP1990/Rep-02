import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAdmin } from '../context/AdminContext';
import { AdminRealtimeToast } from '../types/admin';
import { 
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  DownloadCloud,
  ArrowRight,
  Check,
  Globe,
  Clock 
} from 'lucide-react';

interface ToastItemProps {
  toast: AdminRealtimeToast;
  onDismiss: (id: string) => void;
  onNavigateToDownloads: () => void;
  onNavigateToBlogManager: () => void;
  onApproveComment: (commentId: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({
  toast,
  onDismiss,
  onNavigateToDownloads,
  onNavigateToBlogManager,
  onApproveComment,
}) => {
  const duration = toast.durationMs || (toast.type === 'comment' ? 8500 : 7000);
  const [isHovered, setIsHovered] = useState(false);
  const [isApprovedInline, setIsApprovedInline] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(duration);
  const [progressPercent, setProgressPercent] = useState(100);

  useEffect(() => {
    let timerId: any = null;
    let animationFrameId: number;

    if (!isHovered) {
      startTimeRef.current = Date.now();

      const updateProgress = () => {
        const elapsed = Date.now() - startTimeRef.current;
        const currentRemaining = Math.max(0, remainingTimeRef.current - elapsed);
        const percent = (currentRemaining / duration) * 100;
        setProgressPercent(percent);

        if (currentRemaining > 0) {
          animationFrameId = requestAnimationFrame(updateProgress);
        }
      };

      animationFrameId = requestAnimationFrame(updateProgress);

      timerId = setTimeout(() => {
        onDismiss(toast.id);
      }, remainingTimeRef.current);
    } else {
      // Paused on hover
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    }

    return () => {
      if (timerId) clearTimeout(timerId);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isHovered, toast.id, duration, onDismiss]);

  const handleInlineApprove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (toast.commentData?.commentId) {
      onApproveComment(toast.commentData.commentId);
      setIsApprovedInline(true);
      setTimeout(() => {
        onDismiss(toast.id);
      }, 1200);
    }
  };

  const handleActionClick = () => {
    if (toast.onAction) {
      toast.onAction();
    } else if (toast.type === 'download') {
      onNavigateToDownloads();
    } else if (toast.type === 'comment') {
      onNavigateToBlogManager();
    }
    onDismiss(toast.id);
  };

  // Video Download Theme & Visuals
  if (toast.type === 'download') {
    const download = toast.downloadData;
    const is1080p = download?.quality === '1080p';
    const is720p = download?.quality === '720p';
    const isMP3 = download?.quality === 'MP3';

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: -20, scale: 0.96, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, x: 80, scale: 0.9, filter: 'blur(4px)' }}
        transition={{ type: 'spring', stiffness: 450, damping: 30 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative overflow-hidden bg-white/95 dark:bg-[#1b1429]/95 backdrop-blur-md rounded-2xl shadow-xl shadow-[#4b2e83]/12 border border-[#6d46b8]/25 dark:border-white/10 text-[#2e2440] dark:text-[#f1e9fb] p-4 transition-all w-full pointer-events-auto group"
      >
        {/* Glowing Ambient Top Highlight */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4b2e83] via-[#6d46b8] to-[#e6799f]" />

        <div className="flex items-start gap-3">
          {/* Pulsing Icon */}
          <div className="relative shrink-0 mt-0.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4b2e83] to-[#6d46b8] text-white flex items-center justify-center shadow-md shadow-[#6d46b8]/30">
              <DownloadCloud className="w-5 h-5 text-white animate-bounce-short" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white dark:border-[#1b1429]"></span>
            </span>
          </div>

          {/* Details Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f1e9fb] dark:bg-[#2e1d4d] text-[#6d46b8] dark:text-[#c4a9f3] border border-[#a78bda]/30">
                  {download?.platform || 'Facebook'} Download
                </span>

                {is1080p && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs">
                    1080p Full HD
                  </span>
                )}
                {is720p && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                    720p HD
                  </span>
                )}
                {isMP3 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-600 text-white shadow-xs">
                    MP3 Audio
                  </span>
                )}
              </div>

              <button
                onClick={() => onDismiss(toast.id)}
                className="text-[#a29cb2] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white dark:hover:text-white p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="Dismiss alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h4 className="font-heading font-bold text-sm text-[#2e2440] dark:text-white mt-1.5 line-clamp-1 leading-snug">
              {download?.videoTitle || toast.title}
            </h4>

            {/* Subtitle metrics */}
            <div className="flex items-center gap-2 mt-1 text-xs text-[#726c85] dark:text-[#a29cb2]">
              {download?.fileSize && (
                <span className="font-semibold text-[#2e2440] dark:text-[#e1d5f3]">
                  {download.fileSize}
                </span>
              )}
              {download?.duration && (
                <>
                  <span>&bull;</span>
                  <span>{download.duration}</span>
                </>
              )}
              {download?.ipCountry && (
                <>
                  <span>&bull;</span>
                  <span className="inline-flex items-center gap-1">
                    <Globe className="w-3 h-3 text-[#6d46b8]" />
                    <span>{download.ipCountry}</span>
                  </span>
                </>
              )}
            </div>

            {/* Action Bar */}
            <div className="mt-3 pt-2.5 border-t border-[#eae3ee] dark:border-white/10 flex items-center justify-between gap-2">
              <span className="text-[11px] text-[#a29cb2] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{toast.timestamp}</span>
              </span>

              <button
                onClick={handleActionClick}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] hover:from-[#3f266e] hover:to-[#5c3a9c] shadow-xs transition-all cursor-pointer transform hover:scale-[1.02]"
              >
                <span>{toast.actionLabel || 'View Download Logs'}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Progress Timer Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-[#6d46b8] to-[#e6799f] transition-[width] ease-linear duration-75"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </motion.div>
    );
  }

  // New Comment Notification Theme & Visuals
  if (toast.type === 'comment') {
    const comment = toast.commentData;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: -20, scale: 0.96, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, x: 80, scale: 0.9, filter: 'blur(4px)' }}
        transition={{ type: 'spring', stiffness: 450, damping: 30 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative overflow-hidden bg-white/95 dark:bg-[#1b1429]/95 backdrop-blur-md rounded-2xl shadow-xl shadow-[#4b2e83]/12 border border-[#e6799f]/40 dark:border-white/10 text-[#2e2440] dark:text-[#f1e9fb] p-4 transition-all w-full pointer-events-auto group"
      >
        {/* Glowing Ambient Top Highlight */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#e6799f] via-[#6d46b8] to-[#4b2e83]" />

        <div className="flex items-start gap-3">
          {/* Author Initial Avatar / Icon */}
          <div className="relative shrink-0 mt-0.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e6799f] to-[#6d46b8] text-white font-bold font-heading flex items-center justify-center text-sm shadow-md shadow-[#e6799f]/30">
              {comment?.authorName ? comment.authorName.slice(0, 2).toUpperCase() : 'CM'}
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border-2 border-white dark:border-[#1b1429]"></span>
            </span>
          </div>

          {/* Details Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40">
                  New Blog Comment
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40">
                  Pending Review
                </span>
              </div>

              <button
                onClick={() => onDismiss(toast.id)}
                className="text-[#a29cb2] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white dark:hover:text-white p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="Dismiss alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Author & Post context */}
            <div className="mt-1">
              <p className="text-xs text-[#726c85] dark:text-[#a29cb2]">
                <strong className="text-[#2e2440] dark:text-white font-semibold">
                  {comment?.authorName || 'Visitor'}
                </strong>{' '}
                commented on{' '}
                <span className="italic text-[#6d46b8] dark:text-[#c4a9f3] font-medium">
                  &ldquo;{comment?.postTitle || 'Article'}&rdquo;
                </span>
              </p>
            </div>

            {/* Comment snippet */}
            {comment?.content && (
              <div className="mt-1.5 p-2 rounded-lg bg-[#f6f0f4] dark:bg-white/5 border border-[#eae3ee] dark:border-white/10 text-xs text-[#2e2440] dark:text-[#e1d5f3] line-clamp-2 italic">
                &ldquo;{comment.content}&rdquo;
              </div>
            )}

            {/* Action Bar */}
            <div className="mt-3 pt-2.5 border-t border-[#eae3ee] dark:border-white/10 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] text-[#a29cb2] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{toast.timestamp}</span>
              </span>

              <div className="flex items-center gap-2">
                {/* Inline Quick Approve Button */}
                {toast.commentData?.commentId && !isApprovedInline && (
                  <button
                    onClick={handleInlineApprove}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 transition-all cursor-pointer"
                    title="Quick Approve Comment immediately"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                )}

                {isApprovedInline && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approved!</span>
                  </span>
                )}

                <button
                  onClick={handleActionClick}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-[#6d46b8] to-[#e6799f] hover:opacity-95 shadow-xs transition-all cursor-pointer"
                >
                  <span>{toast.actionLabel || 'Review in Manager'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Progress Timer Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-[#e6799f] to-[#6d46b8] transition-[width] ease-linear duration-75"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </motion.div>
    );
  }

  // Standard Success / Info / Error Toasts
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative overflow-hidden flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md transition-all w-full pointer-events-auto ${
        toast.type === 'success'
          ? 'bg-emerald-950/95 text-emerald-100 border-emerald-800/80 shadow-emerald-950/20'
          : toast.type === 'error'
          ? 'bg-rose-950/95 text-rose-100 border-rose-800/80 shadow-rose-950/20'
          : 'bg-[#2e2440]/95 text-purple-100 border-[#6d46b8]/40 shadow-purple-950/20'
      }`}
    >
      <div className="shrink-0">
        {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
        {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}
        {toast.type === 'info' && <Info className="w-5 h-5 text-purple-300" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{toast.message}</p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 shrink-0 cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Timer Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
        <div
          className="h-full bg-white/40 transition-[width] ease-linear duration-75"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </motion.div>
  );
};

export const RealtimeToastContainer: React.FC = () => {
  const { 
    activeToasts, 
    dismissToast, 
    setCurrentRoute, 
    approveBlogComment 
  } = useAdmin();

  if (activeToasts.length === 0) return null;

  return (
    <aside 
      aria-label="Real-time Admin Notifications"
      className="fixed top-4 right-4 sm:top-5 sm:right-6 z-[9999] flex flex-col gap-3 max-w-[440px] w-[calc(100vw-2rem)] sm:w-full pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {activeToasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={dismissToast}
            onNavigateToDownloads={() => setCurrentRoute('downloads')}
            onNavigateToBlogManager={() => setCurrentRoute('blog-manager')}
            onApproveComment={approveBlogComment}
          />
        ))}
      </AnimatePresence>
    </aside>
  );
};
