import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
   
} from 'lucide-react';
import { 
  ExtractedVideoInfo, 
  VideoQualityOption, 
  DownloadProgressState, 
  SocialPlatform 
} from '../types.ts';
import { detectPlatform } from '../utils/validation.ts';
import { ToolPlatformCard } from './ToolPlatformCard.tsx';
import { useAdmin } from '../context/AdminContext.tsx';

interface DualToolSectionProps {
  onDownloadQuality: (quality: VideoQualityOption, video: ExtractedVideoInfo) => void;
  downloadingId: string | null;
  downloadProgress?: DownloadProgressState | null;
  onSaveToHistory: (video: ExtractedVideoInfo, qualityLabel: string) => void;
  deepLinkedUrl?: string | null;
  resetSignal?: number;
}

export const DualToolSection: React.FC<DualToolSectionProps> = ({
  onDownloadQuality,
  downloadingId,
  downloadProgress,
  onSaveToHistory,
  deepLinkedUrl,
  resetSignal = 0,
}) => {
  const { activeSocialPlatform, setActiveSocialPlatform } = useAdmin();
  // Active tool platform tab
  const [activeTab, setActiveTab] = useState<SocialPlatform>(activeSocialPlatform || 'universal');

  // Synchronize when activeSocialPlatform is changed from Header or elsewhere
  useEffect(() => {
    if (activeSocialPlatform) {
      setActiveTab(activeSocialPlatform);
    }
  }, [activeSocialPlatform]);

  const [externalUniversalUrl, setExternalUniversalUrl] = useState<string | null>(null);
  const [externalFbUrl, setExternalFbUrl] = useState<string | null>(null);
  const [externalIgUrl, setExternalIgUrl] = useState<string | null>(null);
  const [externalTtUrl, setExternalTtUrl] = useState<string | null>(null);
  const [externalTwUrl, setExternalTwUrl] = useState<string | null>(null);
  const [externalPinUrl, setExternalPinUrl] = useState<string | null>(null);
  const [externalRdUrl, setExternalRdUrl] = useState<string | null>(null);
  const [externalThUrl, setExternalThUrl] = useState<string | null>(null);
  const [externalDmUrl, setExternalDmUrl] = useState<string | null>(null);

  // Handle deep-linked URL from browser query, clipboard, or history drawer
  useEffect(() => {
    if (!deepLinkedUrl) return;
    const detected = detectPlatform(deepLinkedUrl);
    if (detected !== 'unknown') {
      setActiveTab(detected as SocialPlatform);
      setActiveSocialPlatform(detected as SocialPlatform);
      if (detected === 'instagram') setExternalIgUrl(deepLinkedUrl);
      else if (detected === 'tiktok') setExternalTtUrl(deepLinkedUrl);
      else if (detected === 'twitter') setExternalTwUrl(deepLinkedUrl);
      else if (detected === 'pinterest') setExternalPinUrl(deepLinkedUrl);
      else if (detected === 'reddit') setExternalRdUrl(deepLinkedUrl);
      else if (detected === 'threads') setExternalThUrl(deepLinkedUrl);
      else if (detected === 'dailymotion') setExternalDmUrl(deepLinkedUrl);
      else if (detected === 'facebook') setExternalFbUrl(deepLinkedUrl);
    } else {
      setActiveTab('universal');
      setActiveSocialPlatform('universal');
      setExternalUniversalUrl(deepLinkedUrl);
    }
  }, [deepLinkedUrl]);

  const handleSwitchToPlatform = (url: string, targetPlatform: SocialPlatform) => {
    setActiveTab(targetPlatform);
    setActiveSocialPlatform(targetPlatform);
    if (targetPlatform === 'universal') setExternalUniversalUrl(url);
    else if (targetPlatform === 'facebook') setExternalFbUrl(url);
    else if (targetPlatform === 'instagram') setExternalIgUrl(url);
    else if (targetPlatform === 'tiktok') setExternalTtUrl(url);
    else if (targetPlatform === 'twitter') setExternalTwUrl(url);
    else if (targetPlatform === 'pinterest') setExternalPinUrl(url);
    else if (targetPlatform === 'reddit') setExternalRdUrl(url);
    else if (targetPlatform === 'threads') setExternalThUrl(url);
    else if (targetPlatform === 'dailymotion') setExternalDmUrl(url);
  };

  return (
    <section id="section-social-tools" className="space-y-6 w-full max-w-6xl mx-auto">
      {/* Active Tool View Container with smooth crossfade animation */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          id={`panel-tool-${activeTab}`}
          role="tabpanel"
          className="w-full"
        >
          {activeTab === 'universal' && (
            <ToolPlatformCard
              key={`universal-tool-${resetSignal}`}
              platform="universal"
              onDownloadQuality={onDownloadQuality}
              downloadingId={downloadingId}
              downloadProgress={downloadProgress}
              onSaveToHistory={onSaveToHistory}
              onSwitchToPlatform={handleSwitchToPlatform}
              externalUrl={externalUniversalUrl}
            />
          )}

          {activeTab === 'facebook' && (
            <ToolPlatformCard
              key={`fb-tool-${resetSignal}`}
              platform="facebook"
              onDownloadQuality={onDownloadQuality}
              downloadingId={downloadingId}
              downloadProgress={downloadProgress}
              onSaveToHistory={onSaveToHistory}
              onSwitchToPlatform={handleSwitchToPlatform}
              externalUrl={externalFbUrl}
            />
          )}

          {activeTab === 'instagram' && (
            <ToolPlatformCard
              key={`ig-tool-${resetSignal}`}
              platform="instagram"
              onDownloadQuality={onDownloadQuality}
              downloadingId={downloadingId}
              downloadProgress={downloadProgress}
              onSaveToHistory={onSaveToHistory}
              onSwitchToPlatform={handleSwitchToPlatform}
              externalUrl={externalIgUrl}
            />
          )}

          {activeTab === 'tiktok' && (
            <ToolPlatformCard
              key={`tiktok-tool-${resetSignal}`}
              platform="tiktok"
              onDownloadQuality={onDownloadQuality}
              downloadingId={downloadingId}
              downloadProgress={downloadProgress}
              onSaveToHistory={onSaveToHistory}
              onSwitchToPlatform={handleSwitchToPlatform}
              externalUrl={externalTtUrl}
            />
          )}

          {activeTab === 'twitter' && (
            <ToolPlatformCard
              key={`twitter-tool-${resetSignal}`}
              platform="twitter"
              onDownloadQuality={onDownloadQuality}
              downloadingId={downloadingId}
              downloadProgress={downloadProgress}
              onSaveToHistory={onSaveToHistory}
              onSwitchToPlatform={handleSwitchToPlatform}
              externalUrl={externalTwUrl}
            />
          )}

          {activeTab === 'pinterest' && (
            <ToolPlatformCard
              key={`pinterest-tool-${resetSignal}`}
              platform="pinterest"
              onDownloadQuality={onDownloadQuality}
              downloadingId={downloadingId}
              downloadProgress={downloadProgress}
              onSaveToHistory={onSaveToHistory}
              onSwitchToPlatform={handleSwitchToPlatform}
              externalUrl={externalPinUrl}
            />
          )}

          {activeTab === 'reddit' && (
            <ToolPlatformCard
              key={`reddit-tool-${resetSignal}`}
              platform="reddit"
              onDownloadQuality={onDownloadQuality}
              downloadingId={downloadingId}
              downloadProgress={downloadProgress}
              onSaveToHistory={onSaveToHistory}
              onSwitchToPlatform={handleSwitchToPlatform}
              externalUrl={externalRdUrl}
            />
          )}

          {activeTab === 'threads' && (
            <ToolPlatformCard
              key={`threads-tool-${resetSignal}`}
              platform="threads"
              onDownloadQuality={onDownloadQuality}
              downloadingId={downloadingId}
              downloadProgress={downloadProgress}
              onSaveToHistory={onSaveToHistory}
              onSwitchToPlatform={handleSwitchToPlatform}
              externalUrl={externalThUrl}
            />
          )}

          {activeTab === 'dailymotion' && (
            <ToolPlatformCard
              key={`dailymotion-tool-${resetSignal}`}
              platform="dailymotion"
              onDownloadQuality={onDownloadQuality}
              downloadingId={downloadingId}
              downloadProgress={downloadProgress}
              onSaveToHistory={onSaveToHistory}
              onSwitchToPlatform={handleSwitchToPlatform}
              externalUrl={externalDmUrl}
            />
          )}

        </motion.div>
      </AnimatePresence>
    </section>
  );
};
