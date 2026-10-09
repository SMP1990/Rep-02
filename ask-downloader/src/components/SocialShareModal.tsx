import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { 
  X,
  Copy,
  Check,
  Share2,
  Facebook,
  Twitter,
  Send,
  MessageCircle,
  Sparkles,
  Link 
} from 'lucide-react';
import { ExtractedVideoInfo } from '../types.ts';

interface SocialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: ExtractedVideoInfo;
  downloadPageUrl: string;
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
  isOpen,
  onClose,
  video,
  downloadPageUrl,
}) => {
  const [copied, setCopied] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(downloadPageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const shareTitle = `Download "${video.title}" in HD - Facebook Video Downloader`;
  const shareText = `Download this Facebook video in Full HD MP4 / MP3:`;

  // Social share destination links
  const socialNetworks = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-emerald-500 hover:bg-emerald-600 text-white',
      badge: 'Chat',
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareTitle}\n${shareText} ${downloadPageUrl}`)}`,
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-blue-600 hover:bg-blue-700 text-white',
      badge: 'Post',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(downloadPageUrl)}`,
    },
    {
      name: 'X (Twitter)',
      icon: Twitter,
      color: 'bg-slate-900 hover:bg-black text-white',
      badge: 'Tweet',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${shareTitle}`)}&url=${encodeURIComponent(downloadPageUrl)}`,
    },
    {
      name: 'Telegram',
      icon: Send,
      color: 'bg-sky-500 hover:bg-sky-600 text-white',
      badge: 'Message',
      url: `https://t.me/share/url?url=${encodeURIComponent(downloadPageUrl)}&text=${encodeURIComponent(shareTitle)}`,
    },
  ];

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: downloadPageUrl,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Native share error:', err);
        }
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div 
        id="social-share-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="social-share-title"
        className="bg-white dark:bg-[#181224] rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 id="social-share-title" className="text-base font-bold text-slate-900">
                {t.ui.shareTitle}
              </h3>
              <p className="text-xs text-slate-500">
                {t.ui.shareSub}
              </p>
            </div>
          </div>

          <button
            id="btn-close-share-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            title={t.ui.close}
            aria-label={t.ui.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Video Preview Card */}
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <div className="w-16 h-12 shrink-0 rounded-lg overflow-hidden bg-slate-900 shadow-xs relative">
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300&auto=format&fit=crop&q=80';
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                {video.title}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                <span>{video.authorName || 'Facebook Creator'}</span>
                {video.duration && (
                  <>
                    <span>•</span>
                    <span>{video.duration}</span>
                  </>
                )}
                <span>•</span>
                <span className="text-blue-600 font-semibold">Ready in 1080p & MP3</span>
              </p>
            </div>
          </div>

          {/* Copy Link Input Section */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-blue-600" />
                <span>{t.ui.directPageLink}</span>
              </span>
              {copied && (
                <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 animate-fadeIn">
                  <Check className="w-3 h-3" /> {t.ui.copiedClipboard}
                </span>
              )}
            </label>

            <div className="flex items-center gap-2">
              <input
                id="input-share-link"
                type="text"
                readOnly
                value={downloadPageUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500 select-all"
              />

              <button
                id="btn-copy-share-url"
                onClick={handleCopyLink}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-97 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>{t.ui.copyLink}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Social Platform Grid */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700">
              {t.ui.shareSocialHead}
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {socialNetworks.map((net) => {
                const Icon = net.icon;
                return (
                  <a
                    key={net.name}
                    href={net.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all shadow-xs active:scale-97 ${net.color}`}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <span className="text-xs font-bold">{net.name}</span>
                    <span className="text-[10px] opacity-85 font-medium mt-0.5">
                      {net.badge}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Native Web Share Option (if supported on mobile) */}
          {'share' in navigator && (
            <button
              id="btn-native-share"
              onClick={handleNativeShare}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors border border-slate-200"
            >
              <Share2 className="w-4 h-4 text-slate-600" />
              <span>More Sharing Options (Device Sheet)</span>
            </button>
          )}

          {/* User Tip */}
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-[11px] text-blue-900 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p>
              {t.ui.shareNote}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
