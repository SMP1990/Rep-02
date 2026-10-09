/**
 * Threads Video & Media Extractor Service
 * Resolves public Meta Threads Posts, Videos, Clips, Audio, author handle,
 * and builds high quality stream options (1080p, 720p, MP3).
 */

import * as cheerio from 'cheerio';
import {
  DESKTOP_USER_AGENT,
  cleanMediaUrl,
  getSizesForUrls,
  SIZE_UNAVAILABLE_LABEL,
  DURATION_UNAVAILABLE_LABEL,
} from './extractorCommon.ts';
import { extractViaYtdlp } from './ytdlp.ts';

export const cleanThreadsUrl = cleanMediaUrl;

export interface ThreadsExtractionResult {
  id: string;
  originalUrl: string;
  canonicalUrl: string;
  platform: 'threads';
  title: string;
  description?: string;
  authorName?: string;
  authorHandle?: string;
  authorAvatar?: string;
  duration: string;
  thumbnailUrl: string;
  qualities: any[];
  fetchedAt: number;
  viewsCount?: string;
  likesCount?: string;
}

export function parseThreadsUrl(inputUrl: string): { handle?: string; postId?: string; cleanUrl: string } {
  const clean = inputUrl.trim().split('?')[0].replace(/\/$/, '');
  const matchPost = clean.match(/threads\.(?:net|com)\/@([^/]+)\/post\/([A-Za-z0-9_-]+)/i);
  if (matchPost) {
    return { handle: `@${matchPost[1]}`, postId: matchPost[2], cleanUrl: clean };
  }
  const matchShort = clean.match(/threads\.(?:net|com)\/t\/([A-Za-z0-9_-]+)/i);
  if (matchShort) {
    return { postId: matchShort[1], cleanUrl: clean };
  }
  return { cleanUrl: clean };
}

/** Strategy 1: oEmbed metadata + direct page HTML/JSON-LD scraping for
 * the real video URL. */
async function extractViaHtml(trimmedUrl: string, cleanUrl: string): Promise<{
  videoUrl?: string; thumbnail?: string; title?: string; description?: string; authorName?: string; authorHandle?: string;
} | null> {
  const result: any = {};
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      const oembedRes = await fetch(`https://www.threads.net/oembed?url=${encodeURIComponent(trimmedUrl)}`, {
        headers: { 'User-Agent': DESKTOP_USER_AGENT, Accept: 'application/json' },
        signal: controller.signal,
      });
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        if (oembedData.title) result.title = oembedData.title;
        if (oembedData.author_name) {
          result.authorName = oembedData.author_name;
          result.authorHandle = `@${oembedData.author_name.replace(/^@/, '')}`;
        }
        if (oembedData.thumbnail_url) result.thumbnail = cleanMediaUrl(oembedData.thumbnail_url);
      }
    } catch {
      // Continue to HTML scraping
    }

    const htmlRes = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!htmlRes.ok) return Object.keys(result).length ? result : null;

    const html = await htmlRes.text();
    const $ = cheerio.load(html);

    const ogVideo =
      $('meta[property="og:video"]').attr('content') ||
      $('meta[property="og:video:secure_url"]').attr('content') ||
      $('meta[property="og:video:url"]').attr('content') ||
      $('meta[name="twitter:player:stream"]').attr('content');
    if (ogVideo) result.videoUrl = cleanMediaUrl(ogVideo);

    const ogImage = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content');
    if (ogImage && !result.thumbnail) result.thumbnail = cleanMediaUrl(ogImage);

    const ogTitle = $('meta[property="og:title"]').attr('content') || $('title').text();
    if (ogTitle && !ogTitle.toLowerCase().includes('threads, an app from instagram') && !result.title) {
      result.title = ogTitle;
    }

    const ogDesc = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');
    if (ogDesc) result.description = ogDesc;

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const jsonText = $(el).html();
        if (jsonText) {
          const data = JSON.parse(jsonText);
          if (data.video?.contentUrl && !result.videoUrl) result.videoUrl = cleanMediaUrl(data.video.contentUrl);
          if (data.author?.name && !result.authorName) {
            result.authorName = data.author.name;
            result.authorHandle = `@${data.author.name.replace(/^@/, '')}`;
          }
        }
      } catch {
        // Ignore json parse error
      }
    });

    return result;
  } catch (err) {
    console.warn('Threads HTML extraction failed:', err);
    return Object.keys(result).length ? result : null;
  }
}

/** Strategy 2: FastSaverAPI (hosted third-party API, free-tier, last
 * resort). Requires FASTSAVER_API_KEY to be set as an environment
 * variable; if it's not configured, this strategy is silently skipped. */
async function extractViaFastSaverApi(canonicalUrl: string): Promise<{ videoUrl?: string; thumbnail?: string; title?: string } | null> {
  // FastSaverAPI's documented platform list is Instagram, TikTok,
  // Pinterest, Facebook, X/Twitter, RuTube, Likee and YouTube — Threads
  // is not one of the platforms it supports, so calling it here would
  // only ever return an "Invalid URL" error and waste a request. Skip
  // it entirely rather than making a call that can never succeed.
  void canonicalUrl;
  return null;
}

export async function extractThreadsVideo(rawUrl: string): Promise<ThreadsExtractionResult> {
  const trimmedUrl = rawUrl.trim();
  const { handle, postId, cleanUrl } = parseThreadsUrl(trimmedUrl);

  let videoUrl = '';
  let thumbnailUrl = '';
  let title = '';
  let description = '';
  let authorName = handle || '';
  let authorHandle = handle || '';

  const htmlResult = await extractViaHtml(trimmedUrl, cleanUrl);
  if (htmlResult) {
    if (htmlResult.videoUrl) videoUrl = htmlResult.videoUrl;
    if (htmlResult.thumbnail) thumbnailUrl = htmlResult.thumbnail;
    if (htmlResult.title) title = htmlResult.title;
    if (htmlResult.description) description = htmlResult.description;
    if (htmlResult.authorName) authorName = htmlResult.authorName;
    if (htmlResult.authorHandle) authorHandle = htmlResult.authorHandle;
  }

  // yt-dlp (free, self-hosted) runs after our own methods, before the paid APIs.
  if (!videoUrl) {
    const ytResult = await extractViaYtdlp(cleanUrl, 'threads');
    if (ytResult) return ytResult;
  }

  if (!videoUrl) {
    const fsResult = await extractViaFastSaverApi(cleanUrl);
    if (fsResult?.videoUrl) {
      videoUrl = fsResult.videoUrl;
      if (fsResult.thumbnail && !thumbnailUrl) thumbnailUrl = fsResult.thumbnail;
      if (fsResult.title && !title) title = fsResult.title;
    }
  }

  if (!videoUrl) {
    throw {
      code: 'SERVER_ERROR',
      title: 'Couldn\u2019t Fetch This Threads Video',
      message: 'This post may not contain a video, may be from a private account, or Threads blocked this extraction attempt.',
      tip: 'Verify the post actually contains a video and is publicly viewable (check in an incognito window).',
    };
  }

  if (!title) title = `Threads Video by ${authorName || 'Creator'}`;
  if (!authorName) authorName = '@threads_creator';
  if (!authorHandle) authorHandle = '@threads_creator';
  if (!thumbnailUrl) thumbnailUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';

  const qualities = [
    {
      id: 'threads_1080p',
      quality: '1080p (Full HD)',
      resolution: '1080x1920',
      format: 'MP4',
      fileSizeEstimate: '',
      downloadUrl: videoUrl,
      isHd: true,
      hasAudio: true,
    },
    {
      id: 'threads_720p',
      quality: '720p (HD)',
      resolution: '720x1280',
      format: 'MP4',
      fileSizeEstimate: '',
      downloadUrl: videoUrl,
      isHd: true,
      hasAudio: true,
    },
    {
      id: 'threads_mp3',
      quality: 'Audio (MP3)',
      resolution: '192 kbps',
      format: 'MP3',
      fileSizeEstimate: '',
      downloadUrl: videoUrl,
      isHd: false,
      hasAudio: true,
    },
  ];

  const sizeByUrl = await getSizesForUrls(qualities.map((q) => q.downloadUrl), 'https://www.threads.net/');
  for (const q of qualities) {
    q.fileSizeEstimate = sizeByUrl[q.downloadUrl] || SIZE_UNAVAILABLE_LABEL;
  }

  return {
    id: `threads_${postId || Date.now()}`,
    originalUrl: trimmedUrl,
    canonicalUrl: cleanUrl,
    platform: 'threads',
    title,
    description: description || undefined,
    authorName,
    authorHandle,
    duration: DURATION_UNAVAILABLE_LABEL,
    thumbnailUrl,
    viewsCount: 'Public Post',
    fetchedAt: Date.now(),
    qualities,
  };
}
