import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Download, 
  CheckCircle2, 
  Eye, 
  ShieldCheck, 
  Film, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { ExtractedVideoInfo, VideoQualityOption } from '../types.ts';
import { useLanguage } from '../context/LanguageContext.tsx';

interface VideoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: ExtractedVideoInfo;
  onDownloadQuality: (quality: VideoQualityOption) => void;
  initialQualityId?: string | null;
}

export const VideoPreviewModal: React.FC<VideoPreviewModalProps> = ({
  isOpen,
  onClose,
  video,
  onDownloadQuality,
  initialQualityId,
}) => {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Available video streams (excluding audio-only for the video player)
  const videoQualities = video.qualities.filter((q) => q.format === 'MP4');
  const defaultQuality = 
    videoQualities.find((q) => q.id === initialQualityId) ||
    videoQualities.find((q) => q.isHd) ||
    videoQualities[0] ||
    video.qualities[0];

  const [selectedQuality, setSelectedQuality] = useState<VideoQualityOption>(defaultQuality);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [useProxyFallback, setUseProxyFallback] = useState(false);

  // Update selected quality when modal opens or initialQualityId changes
  useEffect(() => {
    if (isOpen) {
      const match = 
        videoQualities.find((q) => q.id === initialQualityId) ||
        videoQualities.find((q) => q.isHd) ||
        videoQualities[0];
      if (match) setSelectedQuality(match);
      setIsPlaying(false);
      setCurrentTime(0);
      setVideoError(false);
      setUseProxyFallback(false);
    }
  }, [isOpen, initialQualityId]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Pause and reset when closed
  const handleClose = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setIsPlaying(false);
    onClose();
  };

  // Play / Pause toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.warn('Playback play request interrupted:', e);
      });
    }
  };

  // Timeline seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => console.warn('Fullscreen error:', err));
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => console.warn('Exit fullscreen error:', err));
    }
  };

  // Playback rate cycle
  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIndex];
    setPlaybackRate(nextRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate;
    }
  };

  // Restart video
  const handleRestart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Switching qualities
  const handleSelectQuality = (quality: VideoQualityOption) => {
    setSelectedQuality(quality);
    setVideoError(false);
    setIsLoading(true);
    if (videoRef.current) {
      const currentPos = videoRef.current.currentTime;
      videoRef.current.pause();
      setIsPlaying(false);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = currentPos;
          videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      }, 100);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Detect if this is a YouTube video to provide high fidelity native embedded preview
  const ytVideoId = video.platform === 'youtube'
    ? (video.id.startsWith('yt_vid_') ? video.id.replace('yt_vid_', '') : null) ||
      (video.canonicalUrl?.match(/[?&]v=([a-zA-Z0-9_-]{11})/)?.[1]) ||
      (video.originalUrl?.match(/(?:youtu\.be\/|v=|\/shorts\/)([a-zA-Z0-9_-]{11})/)?.[1])
    : null;

  // Compute playable video stream source
  const videoSourceUrl = useProxyFallback
    ? `/api/video/download-proxy?url=${encodeURIComponent(selectedQuality.downloadUrl)}&name=preview.mp4`
    : selectedQuality.downloadUrl;

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      onClick={handleClose}
    >
      <div 
        id="video-preview-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-preview-title"
        className="bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-3xl overflow-hidden animate-fadeIn flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Eye className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 id="video-preview-title" className="text-sm sm:text-base font-bold text-white truncate">
                  {video.title}
                </h3>
                <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {selectedQuality.quality}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                {video.authorName ? `${video.authorName} • ` : ''}{t.preview.verifySubtitle}
              </p>
            </div>
          </div>

          <button
            id="btn-close-video-preview"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            title={t.preview.closeEsc}
            aria-label={t.ui.closePreview}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Stage Area */}
        <div className="relative bg-black flex-1 flex items-center justify-center min-h-[260px] sm:min-h-[380px] max-h-[55vh] overflow-hidden group">
          <div ref={containerRef} className="relative w-full h-full flex items-center justify-center">
            {ytVideoId ? (
              <div className="w-full h-full flex items-center justify-center bg-black min-h-[280px] sm:min-h-[380px]">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${ytVideoId}?autoplay=1&rel=0`}
                  title={video.title}
                  className="w-full h-full aspect-video min-h-[280px] sm:min-h-[380px] max-h-[55vh] border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            ) : videoError ? (
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-amber-400" />
                <h4 className="font-bold text-slate-200 text-sm">{t.preview.directBlocked}</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  {t.preview.directBlockedDesc}
                </p>
                <div className="flex gap-2 pt-1">
                  {!useProxyFallback && (
                    <button
                      onClick={() => {
                        setVideoError(false);
                        setUseProxyFallback(true);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      {t.preview.tryProxy}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onDownloadQuality(selectedQuality);
                      handleClose();
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors"
                  >
                    {t.preview.proceedDownload}
                  </button>
                </div>
              </div>
            ) : (
              <video
                ref={videoRef}
                src={videoSourceUrl}
                poster={video.thumbnailUrl}
                className="w-full h-full object-contain max-h-[55vh] cursor-pointer"
                playsInline
                preload="metadata"
                onClick={togglePlay}
                onTimeUpdate={() => {
                  if (videoRef.current) {
                    setCurrentTime(videoRef.current.currentTime);
                  }
                }}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    setDuration(videoRef.current.duration);
                    setIsLoading(false);
                  }
                }}
                onWaiting={() => setIsLoading(true)}
                onPlaying={() => {
                  setIsLoading(false);
                  setIsPlaying(true);
                }}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onError={() => {
                  console.warn('Video element error loading source, attempting proxy fallback');
                  if (!useProxyFallback) {
                    setUseProxyFallback(true);
                  } else {
                    setVideoError(true);
                    setIsLoading(false);
                  }
                }}
              />
            )}

            {/* Loading Buffering Indicator */}
            {!ytVideoId && isLoading && !videoError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-medium text-slate-300">{t.preview.buffering}</span>
                </div>
              </div>
            )}

            {/* Big Center Play Overlay (when paused) */}
            {!ytVideoId && !isPlaying && !isLoading && !videoError && (
              <button
                id="btn-overlay-play"
                onClick={togglePlay}
                className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-blue-600/90 hover:bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-500/30 transition-transform active:scale-95 group-hover:scale-110"
                title={t.ui.playPreview}
                aria-label={t.ui.playPreview}
              >
                <Play className="w-7 h-7 fill-current ml-1" />
              </button>
            )}

            {/* Bottom Controls Bar (Custom HUD) */}
            {!ytVideoId && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 pt-6 flex flex-col gap-2 transition-opacity duration-200">
                {/* Seeker / Timeline */}
                <div className="flex items-center gap-2">
                  <input
                    id="preview-seek-slider"
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.1"
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:h-2 transition-all"
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300">
                  {/* Left: Play/Pause, Replay, Time */}
                  <div className="flex items-center gap-3">
                    <button
                      id="btn-ctrl-play-pause"
                      onClick={togglePlay}
                      className="p-1 rounded-md hover:text-white hover:bg-white/10 transition-colors"
                      title={isPlaying ? 'Pause' : 'Play'}
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                    </button>

                    <button
                      id="btn-ctrl-restart"
                      onClick={handleRestart}
                      className="p-1 rounded-md hover:text-white hover:bg-white/10 transition-colors"
                      title={t.ui.restart}
                      aria-label={t.ui.restart}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    <span className="font-mono text-[11px] text-slate-300 select-none">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  {/* Right: Volume, Playback speed, Fullscreen */}
                  <div className="flex items-center gap-2.5">
                    {/* Volume Group */}
                    <div className="flex items-center gap-1 group/vol">
                      <button
                        id="btn-ctrl-mute"
                        onClick={toggleMute}
                        className="p-1 rounded-md hover:text-white hover:bg-white/10 transition-colors"
                        title={isMuted ? 'Unmute' : 'Mute'}
                        aria-label={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                      <input
                        id="preview-volume-slider"
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>

                    {/* Speed Pill */}
                    <button
                      id="btn-ctrl-playback-rate"
                      onClick={cyclePlaybackRate}
                      className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] font-bold text-slate-200 transition-colors"
                      title={t.ui.speed}
                    >
                      {playbackRate}x
                    </button>

                    {/* Fullscreen */}
                    <button
                      id="btn-ctrl-fullscreen"
                      onClick={toggleFullscreen}
                      className="p-1 rounded-md hover:text-white hover:bg-white/10 transition-colors"
                      title={t.ui.fullscreen}
                      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                    >
                      {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quality Selector Tabs & Verification Details */}
        <div className="p-4 sm:p-5 bg-slate-900 border-t border-slate-800 space-y-4 shrink-0">
          {/* Quality Switcher Pills */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-blue-400" />
                <span>{t.preview.switchQuality}</span>
              </span>
              <span className="text-[11px] text-slate-400">
                {t.preview.resolutionLabel} <strong className="text-white">{selectedQuality.resolution}</strong> ({selectedQuality.fileSizeEstimate})
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {videoQualities.map((q) => {
                const isSelected = selectedQuality.id === q.id;
                return (
                  <button
                    key={q.id}
                    id={`btn-preview-quality-${q.id}`}
                    onClick={() => handleSelectQuality(q)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/40'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                  >
                    <span>{q.quality}</span>
                    {q.isHd && (
                      <span className="px-1 rounded bg-blue-400/20 text-blue-300 text-[9px] font-black">
                        HD
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Verification Status Cues */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>{t.preview.verifiedBadge}</span>
            </div>
            <div className="flex items-center gap-1.5 text-blue-400 font-medium">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>{t.preview.watermarkBadge}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              <span>{t.preview.readyBadge}</span>
            </div>
          </div>

          {/* Modal Action Footer */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              id="btn-preview-modal-cancel"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {t.preview.closePreview}
            </button>

            <button
              id="btn-preview-download-now"
              onClick={() => {
                onDownloadQuality(selectedQuality);
                handleClose();
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all active:scale-97"
            >
              <Download className="w-4 h-4" />
              <span>{t.preview.downloadNow} {selectedQuality.quality} ({selectedQuality.fileSizeEstimate})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
