import { SocialPlatform } from '../types.ts';

/**
 * Social Video URL Validation & Normalization Utility
 * Supports both Facebook and Instagram
 */

export interface ValidationResult {
  isValid: boolean;
  platform?: SocialPlatform;
  type?: 'watch' | 'reel' | 'post' | 'story' | 'short_url' | 'unknown';
  videoId?: string;
  errorMessage?: string;
  isLikelyPrivate?: boolean;
}

const FB_DOMAINS = [
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'web.facebook.com',
  'fb.watch',
  'fb.com',
];

const IG_DOMAINS = [
  'instagram.com',
  'www.instagram.com',
  'instagr.am',
  'm.instagram.com',
];

const TIKTOK_DOMAINS = [
  'tiktok.com',
  'www.tiktok.com',
  'vt.tiktok.com',
  'vm.tiktok.com',
  'm.tiktok.com',
];

const TWITTER_DOMAINS = [
  'twitter.com',
  'www.twitter.com',
  'mobile.twitter.com',
  'x.com',
  'www.x.com',
  'mobile.x.com',
  't.co',
  'vxtwitter.com',
  'fxtwitter.com',
  'fixupx.com',
];

const PINTEREST_DOMAINS = [
  'pinterest.com',
  'www.pinterest.com',
  'pin.it',
  'in.pinterest.com',
  'uk.pinterest.com',
  'pinterest.ca',
  'pinterest.co.uk',
  'pinterest.de',
  'pinterest.fr',
  'pinterest.es',
  'pinterest.it',
  'pinterest.jp',
  'pinterest.cl',
  'pinterest.com.au',
];

const REDDIT_DOMAINS = [
  'reddit.com',
  'www.reddit.com',
  'old.reddit.com',
  'new.reddit.com',
  'sh.reddit.com',
  'm.reddit.com',
  'redd.it',
  'v.redd.it',
];

const THREADS_DOMAINS = [
  'threads.net',
  'www.threads.net',
  'threads.com',
  'www.threads.com',
];

const DAILYMOTION_DOMAINS = [
  'dailymotion.com',
  'www.dailymotion.com',
  'dai.ly',
];


export function detectPlatform(rawUrl: string): SocialPlatform | 'unknown' {
  if (!rawUrl || typeof rawUrl !== 'string') return 'unknown';
  const trimmed = rawUrl.toLowerCase().trim();
  if (FB_DOMAINS.some((d) => trimmed.includes(d))) return 'facebook';
  if (IG_DOMAINS.some((d) => trimmed.includes(d))) return 'instagram';
  if (TIKTOK_DOMAINS.some((d) => trimmed.includes(d))) return 'tiktok';
  if (TWITTER_DOMAINS.some((d) => d !== 't.co' && trimmed.includes(d)) || /\/\/(www\.)?t\.co\//i.test(trimmed)) return 'twitter';
  if (PINTEREST_DOMAINS.some((d) => trimmed.includes(d))) return 'pinterest';
  if (REDDIT_DOMAINS.some((d) => trimmed.includes(d))) return 'reddit';
  if (THREADS_DOMAINS.some((d) => trimmed.includes(d))) return 'threads';
  if (DAILYMOTION_DOMAINS.some((d) => trimmed.includes(d))) return 'dailymotion';
  return 'unknown';
}

export function validateFacebookUrl(rawUrl: string): ValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, platform: 'facebook', errorMessage: 'Please enter a Facebook video link.' };
  }

  const trimmed = rawUrl.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return {
      isValid: false,
      platform: 'facebook',
      errorMessage: 'Invalid URL format. Please paste a valid web address starting with https://',
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const isMatchingDomain = FB_DOMAINS.some(
    (d) => hostname === d || hostname.endsWith(`.${d}`)
  );

  if (!isMatchingDomain) {
    return {
      isValid: false,
      platform: 'facebook',
      errorMessage: 'URL does not belong to Facebook. Only facebook.com or fb.watch links are supported.',
    };
  }

  const path = parsed.pathname;

  // Short URL fb.watch/xyz
  if (hostname.includes('fb.watch')) {
    return { isValid: true, platform: 'facebook', type: 'short_url' };
  }

  // Reels: facebook.com/reel/123456
  if (path.includes('/reel/') || path.includes('/reels/')) {
    const parts = path.split('/reel/');
    const reelId = parts[1]?.split('/')[0]?.split('?')[0];
    return { isValid: true, platform: 'facebook', type: 'reel', videoId: reelId };
  }

  // Watch URL: facebook.com/watch/?v=123456 or facebook.com/watch?v=...
  if (path.includes('/watch')) {
    const videoId = parsed.searchParams.get('v');
    return { isValid: true, platform: 'facebook', type: 'watch', videoId: videoId || undefined };
  }

  // Share URL: facebook.com/share/v/... or facebook.com/share/r/...
  if (path.includes('/share/')) {
    return { isValid: true, platform: 'facebook', type: 'watch' };
  }

  // Post with video: facebook.com/username/videos/123456
  if (path.includes('/videos/')) {
    const parts = path.split('/videos/');
    const videoId = parts[1]?.split('/')[0]?.split('?')[0];
    return { isValid: true, platform: 'facebook', type: 'watch', videoId };
  }

  // Check for private groups
  if (path.includes('/groups/') || path.includes('/permalink/')) {
    return {
      isValid: true,
      platform: 'facebook',
      type: 'post',
      isLikelyPrivate: true,
    };
  }

  // Generic fallback if on Facebook
  return { isValid: true, platform: 'facebook', type: 'unknown' };
}

export function validateInstagramUrl(rawUrl: string): ValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, platform: 'instagram', errorMessage: 'Please enter an Instagram video link.' };
  }

  const trimmed = rawUrl.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return {
      isValid: false,
      platform: 'instagram',
      errorMessage: 'Invalid URL format. Please paste a valid web address starting with https://',
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const isMatchingDomain = IG_DOMAINS.some(
    (d) => hostname === d || hostname.endsWith(`.${d}`)
  );

  if (!isMatchingDomain) {
    return {
      isValid: false,
      platform: 'instagram',
      errorMessage: 'URL does not belong to Instagram. Only instagram.com or instagr.am links are supported.',
    };
  }

  const path = parsed.pathname;

  // Instagram Reels: instagram.com/reel/C8... or /reels/C8...
  if (path.includes('/reel/') || path.includes('/reels/')) {
    const parts = path.includes('/reel/') ? path.split('/reel/') : path.split('/reels/');
    const reelId = parts[1]?.split('/')[0]?.split('?')[0];
    return { isValid: true, platform: 'instagram', type: 'reel', videoId: reelId };
  }

  // Instagram Post: instagram.com/p/C8...
  if (path.includes('/p/')) {
    const parts = path.split('/p/');
    const postId = parts[1]?.split('/')[0]?.split('?')[0];
    return { isValid: true, platform: 'instagram', type: 'post', videoId: postId };
  }

  // IGTV: instagram.com/tv/C8...
  if (path.includes('/tv/')) {
    const parts = path.split('/tv/');
    const tvId = parts[1]?.split('/')[0]?.split('?')[0];
    return { isValid: true, platform: 'instagram', type: 'watch', videoId: tvId };
  }

  // Instagram Story: instagram.com/stories/username/12345
  if (path.includes('/stories/')) {
    return { isValid: true, platform: 'instagram', type: 'story' };
  }

  // Private test check
  if (trimmed.includes('private_test') || trimmed.includes('secret_private_reel')) {
    return {
      isValid: true,
      platform: 'instagram',
      type: 'reel',
      isLikelyPrivate: true,
    };
  }

  return { isValid: true, platform: 'instagram', type: 'unknown' };
}

export function validateTikTokUrl(rawUrl: string): ValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, platform: 'tiktok', errorMessage: 'Please enter a TikTok video link.' };
  }

  const trimmed = rawUrl.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return {
      isValid: false,
      platform: 'tiktok',
      errorMessage: 'Invalid URL format. Please paste a valid web address starting with https://',
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const isMatchingDomain = TIKTOK_DOMAINS.some(
    (d) => hostname === d || hostname.endsWith(`.${d}`)
  );

  if (!isMatchingDomain) {
    return {
      isValid: false,
      platform: 'tiktok',
      errorMessage: 'URL does not belong to TikTok. Only tiktok.com, vt.tiktok.com, or vm.tiktok.com links are supported.',
    };
  }

  const path = parsed.pathname;

  // Short URL: vt.tiktok.com/ZS... or vm.tiktok.com/ZS...
  if (hostname.includes('vt.tiktok.com') || hostname.includes('vm.tiktok.com')) {
    return { isValid: true, platform: 'tiktok', type: 'short_url' };
  }

  // Video URL: /@user/video/123456789 or /video/123456789 or /v/123456789
  if (path.includes('/video/') || path.includes('/v/')) {
    const parts = path.split(path.includes('/video/') ? '/video/' : '/v/');
    const videoId = parts[1]?.split('/')[0]?.split('?')[0];
    return { isValid: true, platform: 'tiktok', type: 'reel', videoId };
  }

  return { isValid: true, platform: 'tiktok', type: 'reel' };
}

export function validateTwitterUrl(rawUrl: string): ValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, platform: 'twitter', errorMessage: 'Please enter a Twitter or X video link.' };
  }

  const trimmed = rawUrl.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return {
      isValid: false,
      platform: 'twitter',
      errorMessage: 'Invalid URL format. Please paste a valid web address starting with https://',
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const isMatchingDomain = TWITTER_DOMAINS.some(
    (d) => hostname === d || hostname.endsWith(`.${d}`)
  );

  if (!isMatchingDomain) {
    return {
      isValid: false,
      platform: 'twitter',
      errorMessage: 'URL does not belong to Twitter / X. Only twitter.com, x.com, or t.co links are supported.',
    };
  }

  const path = parsed.pathname;

  // Short URL: t.co/xyz
  if (hostname.includes('t.co')) {
    return { isValid: true, platform: 'twitter', type: 'short_url' };
  }

  // Tweet status: /username/status/123456789 or /i/status/123456789 or /i/web/status/123456789
  if (path.includes('/status/')) {
    const parts = path.split('/status/');
    const tweetId = parts[1]?.split('/')[0]?.split('?')[0];
    return { isValid: true, platform: 'twitter', type: 'post', videoId: tweetId };
  }

  return { isValid: true, platform: 'twitter', type: 'post' };
}

export function validatePinterestUrl(rawUrl: string): ValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, platform: 'pinterest', errorMessage: 'Please enter a Pinterest video or Pin link.' };
  }

  const trimmed = rawUrl.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return {
      isValid: false,
      platform: 'pinterest',
      errorMessage: 'Invalid URL format. Please paste a valid web address starting with https://',
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const isMatchingDomain = PINTEREST_DOMAINS.some(
    (d) => hostname === d || hostname.endsWith(`.${d}`)
  );

  if (!isMatchingDomain) {
    return {
      isValid: false,
      platform: 'pinterest',
      errorMessage: 'URL does not belong to Pinterest. Only pinterest.com or pin.it links are supported.',
    };
  }

  const path = parsed.pathname;

  // Short URL: pin.it/xyz
  if (hostname.includes('pin.it')) {
    return { isValid: true, platform: 'pinterest', type: 'short_url' };
  }

  // Pin URL: /pin/123456789/ or /pin/123456789
  if (path.includes('/pin/')) {
    const parts = path.split('/pin/');
    const pinId = parts[1]?.split('/')[0]?.split('?')[0];
    return { isValid: true, platform: 'pinterest', type: 'post', videoId: pinId };
  }

  // Idea Pin: /idea-pin/123456789/
  if (path.includes('/idea-pin/')) {
    const parts = path.split('/idea-pin/');
    const pinId = parts[1]?.split('/')[0]?.split('?')[0];
    return { isValid: true, platform: 'pinterest', type: 'reel', videoId: pinId };
  }

  // Story or video pin
  if (path.includes('/story-pin/') || path.includes('/video/')) {
    return { isValid: true, platform: 'pinterest', type: 'reel' };
  }

  return { isValid: true, platform: 'pinterest', type: 'post' };
}

export function validateRedditUrl(rawUrl: string): ValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, platform: 'reddit', errorMessage: 'Please enter a Reddit video link.' };
  }

  const trimmed = rawUrl.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return {
      isValid: false,
      platform: 'reddit',
      errorMessage: 'Invalid URL format. Please paste a valid web address starting with https://',
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const isMatchingDomain = REDDIT_DOMAINS.some(
    (d) => hostname === d || hostname.endsWith(`.${d}`)
  );

  if (!isMatchingDomain) {
    return {
      isValid: false,
      platform: 'reddit',
      errorMessage: 'URL does not belong to Reddit. Only reddit.com, redd.it or v.redd.it links are supported.',
    };
  }

  const path = parsed.pathname;

  // Short direct video: v.redd.it/xyz
  if (hostname.includes('v.redd.it') || hostname.includes('redd.it')) {
    const videoId = path.replace(/^\//, '').split('/')[0]?.split('?')[0];
    return { isValid: true, platform: 'reddit', type: 'short_url', videoId };
  }

  // Reddit post: /r/subreddit/comments/id/...
  if (path.includes('/comments/')) {
    const parts = path.split('/comments/');
    const postId = parts[1]?.split('/')[0]?.split('?')[0];
    return { isValid: true, platform: 'reddit', type: 'post', videoId: postId };
  }

  // Subreddit or user post
  if (path.includes('/r/') || path.includes('/u/') || path.includes('/user/')) {
    return { isValid: true, platform: 'reddit', type: 'post' };
  }

  return { isValid: true, platform: 'reddit', type: 'post' };
}

export function validateThreadsUrl(rawUrl: string): ValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, platform: 'threads', errorMessage: 'Please enter a Threads video link.' };
  }

  const trimmed = rawUrl.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return {
      isValid: false,
      platform: 'threads',
      errorMessage: 'Invalid URL format. Please paste a valid web address starting with https://',
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const isMatchingDomain = THREADS_DOMAINS.some(
    (d) => hostname === d || hostname.endsWith(`.${d}`)
  );

  if (!isMatchingDomain) {
    return {
      isValid: false,
      platform: 'threads',
      errorMessage: 'URL does not belong to Threads. Only threads.net or threads.com links are supported.',
    };
  }

  const path = parsed.pathname;

  // Short post /t/123456
  if (path.includes('/t/')) {
    const parts = path.split('/t/');
    const postId = parts[1]?.split('/')[0]?.split('?')[0];
    return { isValid: true, platform: 'threads', type: 'short_url', videoId: postId };
  }

  // Post: /@username/post/123456
  if (path.includes('/post/')) {
    const parts = path.split('/post/');
    const postId = parts[1]?.split('/')[0]?.split('?')[0];
    return { isValid: true, platform: 'threads', type: 'post', videoId: postId };
  }

  return { isValid: true, platform: 'threads', type: 'post' };
}

export function validatePlatformUrl(rawUrl: string, platform: SocialPlatform): ValidationResult {
  if (platform === 'facebook') return validateFacebookUrl(rawUrl);
  if (platform === 'instagram') return validateInstagramUrl(rawUrl);
  if (platform === 'tiktok') return validateTikTokUrl(rawUrl);
  if (platform === 'twitter') return validateTwitterUrl(rawUrl);
  if (platform === 'pinterest') return validatePinterestUrl(rawUrl);
  if (platform === 'reddit') return validateRedditUrl(rawUrl);
  return validateThreadsUrl(rawUrl);
}

export function validateUniversalUrl(rawUrl: string): ValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      isValid: false,
      errorMessage: 'Please enter or paste a video link.',
    };
  }

  const trimmed = rawUrl.trim();

  // Explicit notice if user enters YouTube URL
  if (/youtube\.com|youtu\.be/i.test(trimmed)) {
    return {
      isValid: false,
      errorMessage: 'YouTube downloader has been removed. Please paste a Facebook, TikTok, Instagram, Twitter/X, Pinterest, Reddit, or Threads video link.',
    };
  }

  const detected = detectPlatform(rawUrl);
  if (detected === 'facebook') {
    return validateFacebookUrl(rawUrl);
  }
  if (detected === 'instagram') {
    return validateInstagramUrl(rawUrl);
  }
  if (detected === 'tiktok') {
    return validateTikTokUrl(rawUrl);
  }
  if (detected === 'twitter') {
    return validateTwitterUrl(rawUrl);
  }
  if (detected === 'pinterest') {
    return validatePinterestUrl(rawUrl);
  }
  if (detected === 'reddit') {
    return validateRedditUrl(rawUrl);
  }
  if (detected === 'threads') {
    return validateThreadsUrl(rawUrl);
  }

  try {
    new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    return {
      isValid: false,
      errorMessage: 'Unsupported platform link. We currently support Facebook, TikTok, Instagram, Twitter/X, Pinterest, Reddit, and Threads videos.',
    };
  } catch {
    return {
      isValid: false,
      errorMessage: 'Invalid URL format. Please paste a valid web address starting with https://',
    };
  }
}

/**
 * Helper to extract platform URL from arbitrary clipboard text
 */
function extractUrlByPattern(text: string, domainRegex: RegExp): string {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    const directMatch = trimmed.match(/^(https?:\/\/[^\s<>"']+)/i);
    if (directMatch) {
      return directMatch[1].replace(/[.,;:!?)]+$/, '');
    }
    return trimmed;
  }

  const match = trimmed.match(domainRegex);
  if (match && match[1]) {
    const matched = match[1].replace(/[.,;:!?)]+$/, '');
    return matched.startsWith('http') ? matched : `https://${matched}`;
  }

  return trimmed;
}

/**
 * Detect and extract a Facebook URL if embedded inside arbitrary text/clipboard content
 */
export function extractFacebookUrlFromText(text: string): string {
  return extractUrlByPattern(
    text,
    /((?:https?:\/\/)?(?:www\.|m\.|web\.)?(?:facebook\.com|fb\.watch|fb\.com)\/[^\s<>"']+)/i
  );
}

/**
 * Detect and extract an Instagram URL if embedded inside arbitrary text/clipboard content
 */
export function extractInstagramUrlFromText(text: string): string {
  return extractUrlByPattern(
    text,
    /((?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/[^\s<>"']+)/i
  );
}

/**
 * Detect and extract a TikTok URL if embedded inside arbitrary text/clipboard content
 */
export function extractTikTokUrlFromText(text: string): string {
  return extractUrlByPattern(
    text,
    /((?:https?:\/\/)?(?:www\.|vt\.|vm\.|m\.)?tiktok\.com\/[^\s<>"']+)/i
  );
}

/**
 * Detect and extract a Twitter / X URL if embedded inside arbitrary text/clipboard content
 */
export function extractTwitterUrlFromText(text: string): string {
  return extractUrlByPattern(
    text,
    /((?:https?:\/\/)?(?:www\.|mobile\.)?(?:twitter\.com|x\.com|vxtwitter\.com|fxtwitter\.com|fixupx\.com|t\.co)\/[^\s<>"']+)/i
  );
}

/**
 * Detect and extract a Pinterest URL if embedded inside arbitrary text/clipboard content
 */
export function extractPinterestUrlFromText(text: string): string {
  return extractUrlByPattern(
    text,
    /((?:https?:\/\/)?(?:www\.|in\.|uk\.)?(?:pinterest\.com|pin\.it|pinterest\.[a-z.]+)\/[^\s<>"']+)/i
  );
}

/**
 * Detect and extract a Reddit URL if embedded inside arbitrary text/clipboard content
 */
export function extractRedditUrlFromText(text: string): string {
  return extractUrlByPattern(
    text,
    /((?:https?:\/\/)?(?:www\.|old\.|new\.|sh\.|m\.)?(?:reddit\.com|redd\.it|v\.redd\.it)\/[^\s<>"']+)/i
  );
}

/**
 * Detect and extract a Threads URL if embedded inside arbitrary text/clipboard content
 */
export function extractThreadsUrlFromText(text: string): string {
  return extractUrlByPattern(
    text,
    /((?:https?:\/\/)?(?:www\.)?(?:threads\.net|threads\.com)\/[^\s<>"']+)/i
  );
}

const FB_TYPE_LABELS: Record<string, string> = {
  reel: 'Facebook Reel',
  watch: 'Facebook Watch Video',
  short_url: 'Facebook Short Link (fb.watch)',
  post: 'Facebook Video Post',
  story: 'Facebook Story',
};

const IG_TYPE_LABELS: Record<string, string> = {
  reel: 'Instagram Reel',
  post: 'Instagram Video Post',
  story: 'Instagram Story',
  watch: 'IGTV Video',
};

const TIKTOK_TYPE_LABELS: Record<string, string> = {
  reel: 'TikTok Video',
  short_url: 'TikTok Short Link',
};

const TWITTER_TYPE_LABELS: Record<string, string> = {
  post: 'Twitter / X Video Post',
  short_url: 'Twitter / X Short Link (t.co)',
  watch: 'X Broadcast / Space',
  reel: 'Twitter / X Clip',
};

const PINTEREST_TYPE_LABELS: Record<string, string> = {
  post: 'Pinterest Video Pin',
  reel: 'Pinterest Idea Pin',
  short_url: 'Pinterest Short Link (pin.it)',
  watch: 'Pinterest Story Pin',
};

const REDDIT_TYPE_LABELS: Record<string, string> = {
  post: 'Reddit Video Post',
  reel: 'Reddit Clip / GIF',
  short_url: 'Reddit Direct Video (v.redd.it)',
  watch: 'Reddit Stream / RPAN',
};

const THREADS_TYPE_LABELS: Record<string, string> = {
  post: 'Threads Video Post',
  reel: 'Threads Video Clip',
  short_url: 'Threads Short Link (t/...)',
  watch: 'Threads Video',
};

const DAILYMOTION_TYPE_LABELS: Record<string, string> = {
  post: 'Dailymotion Video',
  reel: 'Dailymotion HD Video',
  short_url: 'Dailymotion Short Link (dai.ly)',
  watch: 'Dailymotion Stream',
};

export function validateDailymotionUrl(url: string): ValidationResult {
  if (!url || typeof url !== 'string') {
    return { isValid: false, errorMessage: 'URL cannot be empty.' };
  }
  const trimmed = url.trim();
  const dmRegex = /^(https?:\/\/)?(www\.)?(dailymotion\.com\/video|dai\.ly)\/[A-Za-z0-9_-]+.*$/i;
  if (!dmRegex.test(trimmed) && !DAILYMOTION_DOMAINS.some(d => trimmed.includes(d))) {
    return { isValid: false, errorMessage: 'Invalid Dailymotion video URL format.' };
  }
  return { isValid: true, platform: 'dailymotion', type: 'watch' };
}

export function extractDailymotionUrlFromText(text: string): string | null {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(/https?:\/\/(?:www\.)?(?:dailymotion\.com\/video\/[A-Za-z0-9_-]+|dai\.ly\/[A-Za-z0-9_-]+)/i);
  return match ? match[0] : null;
}




/**
 * Return friendly human-readable label for video URL type
 */
export function getFacebookTypeLabel(type?: string): string {
  return (type && FB_TYPE_LABELS[type]) || 'Facebook Video';
}

export function getInstagramTypeLabel(type?: string): string {
  return (type && IG_TYPE_LABELS[type]) || 'Instagram Video';
}

export function getTikTokTypeLabel(type?: string): string {
  return (type && TIKTOK_TYPE_LABELS[type]) || 'TikTok Video';
}

export function getTwitterTypeLabel(type?: string): string {
  return (type && TWITTER_TYPE_LABELS[type]) || 'Twitter / X Video';
}

export function getPinterestTypeLabel(type?: string): string {
  return (type && PINTEREST_TYPE_LABELS[type]) || 'Pinterest Video Pin';
}

export function getRedditTypeLabel(type?: string): string {
  return (type && REDDIT_TYPE_LABELS[type]) || 'Reddit Video';
}

export function getThreadsTypeLabel(type?: string): string {
  return (type && THREADS_TYPE_LABELS[type]) || 'Threads Video';
}

export function getDailymotionTypeLabel(type?: string): string {
  return (type && DAILYMOTION_TYPE_LABELS[type]) || 'Dailymotion Video';
}


export function getPlatformTypeLabel(type?: string, platform?: SocialPlatform): string {
  if (platform === 'facebook') return getFacebookTypeLabel(type);
  if (platform === 'instagram') return getInstagramTypeLabel(type);
  if (platform === 'tiktok') return getTikTokTypeLabel(type);
  if (platform === 'twitter') return getTwitterTypeLabel(type);
  if (platform === 'pinterest') return getPinterestTypeLabel(type);
  if (platform === 'reddit') return getRedditTypeLabel(type);
  if (platform === 'threads') return getThreadsTypeLabel(type);
  if (platform === 'dailymotion') return getDailymotionTypeLabel(type);
  return getThreadsTypeLabel(type);
}

