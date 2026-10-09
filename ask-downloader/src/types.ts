/**
 * TypeScript types for Facebook Video Downloader
 */

export interface VideoQualityOption {
  id: string;
  quality: '1080p (Full HD)' | '720p (HD)' | '480p (SD)' | '360p (SD)' | 'Audio (MP3)';
  resolution: string;
  format: 'MP4' | 'MP3';
  fileSizeEstimate: string;
  downloadUrl: string;
  isHd: boolean;
  hasAudio: boolean;
}

export type SocialPlatform = 'universal' | 'facebook' | 'instagram' | 'tiktok' | 'twitter' | 'pinterest' | 'reddit' | 'threads' | 'dailymotion';

export interface ExtractedVideoInfo {
  id: string;
  originalUrl: string;
  canonicalUrl: string;
  platform?: SocialPlatform;
  title: string;
  description?: string;
  authorName?: string;
  authorHandle?: string;
  authorAvatar?: string;
  duration: string; // e.g. "02:45"
  thumbnailUrl: string;
  qualities: VideoQualityOption[];
  fetchedAt: number;
  viewsCount?: string;
  likesCount?: string;
  isPrivateOrRestricted?: boolean;
}

export interface UserHistoryItem {
  id: string;
  video: ExtractedVideoInfo;
  selectedQuality: string;
  timestamp: number;
  downloadCount: number;
  platform?: SocialPlatform;
}

export type ExtractionStatus = 'idle' | 'validating' | 'fetching' | 'ready' | 'error';

export interface ExtractionError {
  title: string;
  message: string;
  tip?: string;
  code?: 'INVALID_URL' | 'PRIVATE_VIDEO' | 'GEO_RESTRICTED' | 'RATE_LIMITED' | 'SERVER_ERROR';
}

export interface DownloadProgressState {
  isActive: boolean;
  status: 'idle' | 'connecting' | 'downloading' | 'assembling' | 'completed' | 'error';
  quality: VideoQualityOption | null;
  video?: ExtractedVideoInfo | null;
  videoTitle: string;
  progressPercent: number;
  downloadedBytes: number;
  totalBytes: number;
  speedText: string;
  etaText: string;
}
