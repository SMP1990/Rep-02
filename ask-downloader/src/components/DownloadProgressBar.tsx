import React, { useState } from 'react';
import { 
  Download,
  CheckCircle2,
  X,
  AlertCircle,
  Minimize2,
  Maximize2,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Music,
  Video,
  Zap,
  Bell,
  BellRing,
  Volume2 
} from 'lucide-react';
import { DownloadProgressState } from '../types.ts';
import { formatFileSize, formatEta } from '../utils/downloadManager.ts';
import { SpeedMeter } from './SpeedMeter.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import {
  getNotificationPermission,
  requestNotificationPermission,
  isLargeVideo,
  playCompletionChime,
} from '../utils/notificationManager.ts';

interface DownloadProgressBarProps {
  progressState: DownloadProgressState;
  onCancel: () => void;
  onDismiss: () => void;
  onRetry: () => void;
}

export const DownloadProgressBar: React.FC<DownloadProgressBarProps> = ({
  progressState,
  onCancel,
  onDismiss,
  onRetry,
}) => {
  const { t, currentLang } = useLanguage();
  const [isMinimized, setIsMinimized] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(getNotificationPermission);

  if (!progressState.isActive) {
    return null;
  }

  const {
    status,
    quality,
    videoTitle,
    thumbnailUrl,
    progressPercent,
    bytesLoaded,
    totalBytes,
    speedBytesPerSec,
    etaSeconds,
    errorMessage,
    filename,
    fallbackUrl,
    wasLargeVideo,
  } = progressState;

  const handleEnablePushNotifications = async () => {
    const res = await requestNotificationPermission();
    setNotifPermission(res);
  };

  const wasLarge = wasLargeVideo || isLargeVideo(totalBytes);
  const currentSpeedMBps = speedBytesPerSec > 0 ? speedBytesPerSec / (1024 * 1024) : 0;
  const isAudio = quality?.format === 'MP3';
  const isComplete = status === 'completed';
  const isError = status === 'error';
  const isConnecting = status === 'connecting';
  const isAssembling = status === 'assembling';

  // If minimized, display compact floating pill
  if (isMinimized) {
    return (
      <aside aria-label={t.ui.progSummary} className="fixed bottom-4 right-4 z-50 animate-bounce-short">
        <div
          id="download-pill-minimized"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-3 bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-full shadow-2xl border border-slate-700/80 cursor-pointer hover:bg-slate-800 transition-all"
        >
          <div className="relative flex items-center justify-center">
            {isComplete ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : isError ? (
              <AlertCircle className="w-5 h-5 text-rose-400" />
            ) : (
              <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
            )}
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-bold leading-tight">
              {isComplete
                ? 'Download Finished'
                : isError
                ? 'Download Failed'
                : `${isAudio ? 'MP3' : quality?.quality || 'Video'} • ${progressPercent}%${
                    currentSpeedMBps > 0 ? ` • ${currentSpeedMBps.toFixed(1)} MB/s` : ''
                  }`}
            </span>
            <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
              {videoTitle}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(false);
            }}
            className="text-slate-400 hover:text-white p-1 rounded-full transition-colors ml-1"
            title={t.ui.expandProgress}
            aria-label={t.ui.expandProgress}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside aria-label={t.ui.mediaProgress} className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[440px] z-50 animate-fadeIn">
      <div 
        id="download-progress-container"
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden ring-1 ring-slate-900/5 transition-all"
      >
        {/* Top Header Bar */}
        <div className={`px-4 py-3 flex items-center justify-between border-b ${
          isComplete 
            ? 'bg-emerald-50/80 dark:bg-emerald-950/70 border-emerald-100 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-300' 
            : isError 
            ? 'bg-rose-50/80 dark:bg-rose-950/70 border-rose-100 dark:border-rose-900/60 text-rose-900 dark:text-rose-300' 
            : 'bg-slate-50 dark:bg-slate-800/80 border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              isComplete
                ? 'bg-emerald-600 text-white'
                : isError
                ? 'bg-rose-600 text-white'
                : isAudio
                ? 'bg-amber-500 text-white'
                : 'bg-blue-600 text-white'
            }`}>
              {isComplete ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : isError ? (
                <AlertCircle className="w-4 h-4" />
              ) : isAudio ? (
                <Music className="w-4 h-4" />
              ) : (
                <Download className="w-4 h-4 animate-pulse" />
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold leading-tight flex items-center gap-1.5">
                <span>
                  {isComplete
                    ? 'Download Complete'
                    : isError
                    ? 'Download Issue'
                    : isAssembling
                    ? 'Finalizing File Container'
                    : isConnecting
                    ? 'Connecting to Stream'
                    : 'Downloading Media'}
                </span>
                {quality && (
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                    isAudio 
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200' 
                      : quality.isHd 
                      ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300' 
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}>
                    {quality.quality}
                  </span>
                )}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[230px]">
                {filename || videoTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
            {!isComplete && !isError && (
              <button
                id="btn-minimize-download"
                onClick={() => setIsMinimized(true)}
                className="p-1 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                title={t.ui.minimize}
                aria-label={t.ui.minimize}
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              id="btn-close-download"
              onClick={isComplete || isError ? onDismiss : onCancel}
              className="p-1 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              title={isComplete || isError ? t.ui.close : t.ui.cancelDownload}
              aria-label={isComplete || isError ? 'Close' : 'Cancel download'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 space-y-3.5">
          {/* Video Mini Preview & Meta */}
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="relative w-16 h-11 shrink-0 rounded-lg overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-700">
              <img
                src={thumbnailUrl}
                alt={videoTitle}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300&auto=format&fit=crop&q=80';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex items-end p-1">
                {isAudio ? (
                  <Music className="w-3 h-3 text-amber-300" />
                ) : (
                  <Video className="w-3 h-3 text-white" />
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">
                {videoTitle}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                <span>{quality?.format || 'MP4'}</span>
                <span>•</span>
                <span>{quality?.resolution || 'HD'}</span>
                <span>•</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {formatFileSize(totalBytes)}
                </span>
                {wasLarge && (
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 px-1.5 py-0.2 rounded border border-blue-100 dark:border-blue-800">
                    {t.ui.largeFile}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Push Notification Callout during Download */}
          {!isComplete && !isError && notifPermission !== 'unsupported' && (
            notifPermission === 'default' ? (
              <div className="flex items-center justify-between bg-blue-50/80 border border-blue-200/80 rounded-xl px-3 py-2 text-xs text-blue-900">
                <div className="flex items-center gap-2 min-w-0">
                  <Bell className="w-4 h-4 text-blue-600 shrink-0 animate-pulse" />
                  <span className="text-[11px] font-medium truncate">
                    {t.ui.alertMe}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleEnablePushNotifications}
                  className="shrink-0 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold shadow-xs transition-colors"
                >
                  {t.notifications.enablePrompt}
                </button>
              </div>
            ) : notifPermission === 'granted' ? (
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <BellRing className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t.ui.pushActive}</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  Ready
                </span>
              </div>
            ) : null
          )}

          {/* Large Video Notification Completion Banner */}
          {isComplete && (
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/90 rounded-xl p-3 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <BellRing className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                    <span>{wasLarge ? 'Large Video Download Complete!' : 'Download Finished!'}</span>
                    <span className="text-[10px] bg-white dark:bg-[#181224] px-1.5 py-0.2 rounded border border-emerald-200 text-emerald-800 font-mono font-bold">
                      {formatFileSize(totalBytes)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 truncate mt-0.5">
                    {notifPermission === 'granted'
                      ? 'Browser push notification dispatched to your desktop'
                      : 'File saved and ready in your device downloads'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => playCompletionChime(0.2)}
                  className="p-1.5 bg-white/90 hover:bg-white dark:hover:bg-[#181224] dark:hover:bg-[#181224] text-emerald-700 rounded-md border border-emerald-200 transition-colors shadow-2xs"
                  title={t.ui.replaySound}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold text-emerald-700 bg-white/90 px-2 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Saved</span>
                </span>
              </div>
            </div>
          )}

          {/* Visual Speed Meter with Real-Time MB/s Calculation */}
          {!isError && (
            <SpeedMeter
              speedBytesPerSec={speedBytesPerSec}
              bytesLoaded={bytesLoaded}
              totalBytes={totalBytes}
              etaSeconds={etaSeconds}
              status={status}
              isAudio={isAudio}
            />
          )}

          {/* Progress Bar & Percentage display */}
          {!isError && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  {isConnecting ? (
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                  ) : isAssembling ? (
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  )}
                  <span>
                    {isConnecting
                      ? 'Contacting CDN node...'
                      : isAssembling
                      ? 'Packaging container...'
                      : isComplete
                      ? 'Saved to browser storage'
                      : `${progressPercent}% downloaded`}
                  </span>
                </span>

                <span className={`font-bold ${isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                  {progressPercent}%
                </span>
              </div>

              {/* Graphical Progress Bar Track */}
              <div 
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t.ui.progress}
                className="relative w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700"
              >
                <div
                  className={`h-full rounded-full transition-all duration-200 ease-out relative ${
                    isComplete
                      ? 'bg-emerald-500'
                      : isAudio
                      ? 'bg-amber-500'
                      : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.max(3, progressPercent)}%` }}
                >
                  {/* Subtle Shimmer Animation while actively downloading */}
                  {!isComplete && !isConnecting && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer" />
                  )}
                </div>
              </div>

              {/* Data & Speed Statistics */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                <span>
                  {formatFileSize(bytesLoaded)} of {formatFileSize(totalBytes)}
                </span>
                <div className="flex items-center gap-2">
                  {!isComplete && !isConnecting && currentSpeedMBps > 0 && (
                    <>
                      <span className="font-semibold text-blue-600 dark:text-blue-400 font-mono">
                        {currentSpeedMBps.toFixed(2)} MB/s
                      </span>
                      <span>•</span>
                      <span>{formatEta(etaSeconds)}</span>
                    </>
                  )}
                  {isComplete && (
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> {t.ui.readyDownloads}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error Message Box if something went wrong */}
          {isError && (
            <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs p-3 rounded-xl space-y-1.5">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{t.ui.interrupted}</span>
              </p>
              <p className="text-rose-700 dark:text-rose-300 text-[11px] leading-relaxed">
                {currentLang === 'en' && errorMessage ? errorMessage : t.ui.streamClosed}
              </p>
            </div>
          )}

          {/* Bottom Action Footer */}
          <div className="pt-1 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            {isError ? (
              <>
                {fallbackUrl && (
                  <a
                    id="btn-direct-fallback"
                    href={fallbackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <span>{t.ui.directLink}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <button
                  id="btn-retry-download"
                  onClick={onRetry}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t.ui.retry}</span>
                </button>
              </>
            ) : isComplete ? (
              <>
                <button
                  id="btn-download-again"
                  onClick={onRetry}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t.ui.downloadAgain}</span>
                </button>
                <button
                  id="btn-finish-dismiss"
                  onClick={onDismiss}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Done</span>
                </button>
              </>
            ) : (
              <button
                id="btn-cancel-active-download"
                onClick={onCancel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>{t.ui.cancelDownload}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </aside>
  );
};
