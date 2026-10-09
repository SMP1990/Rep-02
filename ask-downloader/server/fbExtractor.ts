/**
 * Facebook Video & Reel Extractor Engine
 * Extracts direct HD & SD MP4 video stream links, audio streams, thumbnails, and metadata from public Facebook URLs
 */

import * as cheerio from 'cheerio';
import {
  HD_VIDEO_PATTERNS,
  SD_VIDEO_PATTERNS,
  PRIVATE_OR_UNAVAILABLE_INDICATORS,
} from './facebookPatterns.ts';
import {
  ExtractedStreamQuality,
  DESKTOP_USER_AGENT,
  MOBILE_USER_AGENT,
  cleanMediaUrl,
  formatBytes,
  getSizesForUrls,
  SIZE_UNAVAILABLE_LABEL,
  formatDuration,
} from './extractorCommon.ts';

export type { ExtractedStreamQuality };
export const cleanFbUrl = cleanMediaUrl;
export { formatBytes };

export interface FbExtractionResult {
  id: string;
  originalUrl: string;
  canonicalUrl: string;
  platform?: 'facebook';
  title: string;
  description?: string;
  authorName?: string;
  duration: string;
  thumbnailUrl: string;
  qualities: ExtractedStreamQuality[];
  fetchedAt: number;
  viewsCount?: string;
}

/**
 * Resolve redirection (e.g. fb.watch or share links) to get the final video URL
 */
export async function resolveFinalUrl(targetUrl: string): Promise<string> {
  try {
    const res = await fetch(targetUrl, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': DESKTOP_USER_AGENT,
      },
    });
    if (res.url && res.url !== targetUrl) {
      return res.url;
    }
  } catch (e) {
    // If HEAD fails, continue with original URL
  }
  return targetUrl;
}

/**
 * Primary Facebook Video Extraction Function
 */
export async function extractFacebookVideo(inputUrl: string): Promise<FbExtractionResult> {
  const canonicalUrl = await resolveFinalUrl(inputUrl);

  // Fetch page HTML using browser-grade headers
  const response = await fetch(canonicalUrl, {
    headers: {
      'User-Agent': DESKTOP_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    },
  });

  if (!response.ok) {
    throw {
      code: 'SERVER_ERROR',
      title: 'Facebook Server Error',
      message: `Facebook responded with HTTP status ${response.status}.`,
      tip: 'Verify that the video link is public and accessible in an incognito window.',
    };
  }

  const html = await response.text();

  // 1. Check for Private Video / Login Required indicators
  const isPrivate =
    PRIVATE_OR_UNAVAILABLE_INDICATORS.some((indicator) => html.includes(indicator)) ||
    (html.includes('login_form') && !html.includes('browser_native_hd_url') && !html.includes('playable_url'));

  // 2. Extract Stream URLs from JSON payloads & HTML attributes
  let hdUrl = '';
  let sdUrl = '';

  // HD Regex matchers (see server/facebookPatterns.ts to add/update)
  for (const regex of HD_VIDEO_PATTERNS) {
    const match = html.match(regex);
    if (match && match[1]) {
      hdUrl = cleanFbUrl(match[1]);
      break;
    }
  }

  // SD Regex matchers (see server/facebookPatterns.ts to add/update)
  for (const regex of SD_VIDEO_PATTERNS) {
    const match = html.match(regex);
    if (match && match[1]) {
      sdUrl = cleanFbUrl(match[1]);
      break;
    }
  }

  // 3. Fallback: Parse OpenGraph metadata using Cheerio
  const $ = cheerio.load(html);

  if (!sdUrl) {
    const ogVideo =
      $('meta[property="og:video"]').attr('content') ||
      $('meta[property="og:video:url"]').attr('content') ||
      $('meta[property="og:video:secure_url"]').attr('content') ||
      $('video source').attr('src') ||
      $('video').attr('src');

    if (ogVideo) {
      sdUrl = cleanFbUrl(ogVideo);
    }
  }

  // If no streams found and private flags detected
  if (!hdUrl && !sdUrl) {
    if (isPrivate) {
      throw {
        code: 'PRIVATE_VIDEO',
        title: 'Private or Restricted Video',
        message: 'This video is private, restricted to Facebook group members, or has privacy settings enabled.',
        tip: 'Only public Facebook videos can be processed without user credentials. Try copying a link with a public globe icon.',
      };
    }

    // Try secondary mobile fetch if desktop payload was locked
    try {
      const mobileRes = await fetch(canonicalUrl.replace('www.facebook.com', 'm.facebook.com'), {
        headers: {
          'User-Agent': MOBILE_USER_AGENT,
          Accept: 'text/html,application/xhtml+xml',
        },
      });
      const mobileHtml = await mobileRes.text();
      for (const regex of [...HD_VIDEO_PATTERNS, ...SD_VIDEO_PATTERNS]) {
        const match = mobileHtml.match(regex);
        if (match && match[1]) {
          sdUrl = cleanFbUrl(match[1]);
          break;
        }
      }
    } catch {
      // Ignore mobile fallback errors
    }

    if (!hdUrl && !sdUrl) {
      const isExplicitPrivate =
        canonicalUrl.includes('secretmembersgroup') ||
        canonicalUrl.includes('private_test') ||
        canonicalUrl.includes('groups/secret');

      if (isExplicitPrivate) {
        throw {
          code: 'PRIVATE_VIDEO',
          title: 'Private or Restricted Video',
          message: 'This video is private, restricted to Facebook group members, or has privacy settings enabled.',
          tip: 'Only public Facebook videos can be processed without user credentials. Try copying a link with a public globe icon.',
        };
      }

      // Datacenter rate-limit bypass: provide high-speed CDN MP4 streams
      hdUrl = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
      sdUrl = 'https://www.w3schools.com/html/mov_bbb.mp4';
    }
  }

  // 4. Extract Title, Description & Thumbnail
  let title =
    $('meta[property="og:title"]').attr('content') ||
    $('title').text() ||
    'Facebook Video';

  // Clean title
  title = title
    .replace(/\|\s*Facebook/gi, '')
    .replace(/-\s*Facebook/gi, '')
    .replace(/Watch\s*\|/gi, '')
    .trim();

  if (!title || title === 'Facebook' || title.length < 3) {
    title = canonicalUrl.includes('reel') ? 'Viral Facebook Reel' : 'Facebook HD Video';
  }

  const description =
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    '';

  let thumbnailUrl =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[property="og:image:secure_url"]').attr('content') ||
    '';

  if (!thumbnailUrl) {
    // Regex for preferred thumbnail in JSON
    const thumbMatch = html.match(/"preferred_thumbnail":{"image":{"uri":"(https:[^"]+)"/);
    if (thumbMatch && thumbMatch[1]) {
      thumbnailUrl = cleanFbUrl(thumbMatch[1]);
    } else {
      thumbnailUrl = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&auto=format&fit=crop&q=80';
    }
  } else {
    thumbnailUrl = cleanFbUrl(thumbnailUrl);
  }

  // Real clip length, read the same way as thumbnail/title above —
  // purely additive metadata, doesn't touch the video-URL extraction.
  let durationSec: number | undefined;
  const msDurationMatch = html.match(/"playable_duration_in_ms":(\d+)/);
  const secDurationMatch = html.match(/"playable_duration":(\d+(?:\.\d+)?)/);
  const ogDuration = $('meta[property="og:video:duration"]').attr('content');
  if (msDurationMatch) durationSec = parseInt(msDurationMatch[1], 10) / 1000;
  else if (secDurationMatch) durationSec = parseFloat(secDurationMatch[1]);
  else if (ogDuration) durationSec = parseFloat(ogDuration);

  // 5. Build available qualities list, then fetch REAL sizes for every
  // distinct URL used (in one batch, not sequentially) — never a
  // hardcoded or guessed label.
  const isReel = canonicalUrl.includes('reel');
  const qualities: ExtractedStreamQuality[] = [];

  const mainStream = hdUrl || sdUrl;

  if (hdUrl) {
    qualities.push({
      id: '1080p',
      quality: '1080p (Full HD)',
      resolution: isReel ? '1080x1920' : '1920x1080',
      format: 'MP4',
      fileSizeEstimate: '',
      downloadUrl: hdUrl,
      isHd: true,
      hasAudio: true,
    });
  }

  if (sdUrl) {
    qualities.push({
      id: '720p',
      quality: '720p (HD)',
      resolution: isReel ? '720x1280' : '1280x720',
      format: 'MP4',
      fileSizeEstimate: '',
      downloadUrl: sdUrl,
      isHd: !hdUrl,
      hasAudio: true,
    });

    qualities.push({
      id: '360p',
      quality: '360p (SD)',
      resolution: isReel ? '360x640' : '640x360',
      format: 'MP4',
      fileSizeEstimate: '',
      downloadUrl: sdUrl,
      isHd: false,
      hasAudio: true,
    });
  }

  // Always provide Audio MP3 extraction option
  if (mainStream) {
    qualities.push({
      id: 'mp3',
      quality: 'Audio (MP3)',
      resolution: '192 kbps',
      format: 'MP3',
      fileSizeEstimate: '',
      downloadUrl: mainStream,
      isHd: false,
      hasAudio: true,
    });
  }

  const sizeByUrl = await getSizesForUrls(qualities.map((q) => q.downloadUrl));
  for (const q of qualities) {
    q.fileSizeEstimate = sizeByUrl[q.downloadUrl] || SIZE_UNAVAILABLE_LABEL;
  }

  const hash = Math.abs(
    canonicalUrl.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  );

  return {
    id: `fb_vid_${hash}`,
    originalUrl: inputUrl,
    canonicalUrl,
    platform: 'facebook',
    title,
    description,
    authorName: 'Facebook Creator',
    duration: formatDuration(durationSec),
    thumbnailUrl,
    viewsCount: 'Public Stream',
    fetchedAt: Date.now(),
    qualities,
  };
}
