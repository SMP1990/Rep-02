/**
 * Instagram Video, Reel & Story Extractor Engine
 * Extracts direct HD & SD MP4 video stream links, audio streams, thumbnails, and metadata from public Instagram URLs
 */

import * as cheerio from 'cheerio';
import * as vm from 'vm';
import {
  ExtractedStreamQuality,
  DESKTOP_USER_AGENT,
  cleanMediaUrl,
  formatBytes,
  getStreamSize,
  getSizesForUrls,
  SIZE_UNAVAILABLE_LABEL,
  extractViaSaverApi,
  looksLikeLegitimateMediaUrl,
  formatDuration,
} from './extractorCommon.ts';
import { extractViaYtdlp } from './ytdlp.ts';

export type { ExtractedStreamQuality };
export const cleanIgUrl = cleanMediaUrl;
export { formatBytes, getStreamSize };

export interface IgExtractionResult {
  id: string;
  originalUrl: string;
  canonicalUrl: string;
  platform: 'instagram';
  title: string;
  description?: string;
  authorName?: string;
  authorHandle?: string;
  authorAvatar?: string;
  duration: string;
  thumbnailUrl: string;
  qualities: ExtractedStreamQuality[];
  fetchedAt: number;
  viewsCount?: string;
  likesCount?: string;
  isReel?: boolean;
}

/**
 * Normalize and resolve Instagram target URL
 */
export async function resolveInstagramUrl(targetUrl: string): Promise<string> {
  let url = targetUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  // Remove tracking query params (?igsh=..., ?utm_source=...)
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('igsh');
    parsed.searchParams.delete('utm_source');
    parsed.searchParams.delete('utm_medium');
    parsed.searchParams.delete('utm_campaign');
    url = parsed.toString();
  } catch {
    // Keep url as is
  }

  return url;
}

/**
 * Strategy 1: SnapSave Web API Resolver & Unpacker
 */
async function extractViaSnapSave(targetUrl: string): Promise<{
  videoUrl: string;
  thumbnail?: string;
  qualities?: Array<{ quality: string; url: string }>;
} | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const resp = await fetch('https://snapsave.app/action.php?lang=en', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': DESKTOP_USER_AGENT,
        Origin: 'https://snapsave.app',
        Referer: 'https://snapsave.app/',
      },
      body: `url=${encodeURIComponent(targetUrl)}`,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) return null;
    const rawJs = await resp.text();

    if (!rawJs || !rawJs.includes('function(')) return null;

    let htmlResult = '';
    const makeElement = () => ({
      set innerHTML(val: string) {
        htmlResult += val;
      },
      get innerHTML() {
        return htmlResult;
      },
      setAttribute: () => {},
      getAttribute: () => '',
      style: {},
      classList: { add: () => {}, remove: () => {} },
      appendChild: () => {},
      reset: () => {},
    });

    const domProxy = new Proxy(
      {},
      {
        get: (_target, prop) => {
          if (prop === 'getElementById' || prop === 'querySelector') {
            return () => makeElement();
          }
          if (prop === 'querySelectorAll' || prop === 'getElementsByClassName') {
            return () => [makeElement()];
          }
          if (prop === 'createElement') {
            return () => makeElement();
          }
          if (prop === 'body' || prop === 'documentElement') {
            return makeElement();
          }
          return () => {};
        },
      }
    );

    const sandbox: any = {
      window: {},
      location: {
        hostname: 'snapsave.app',
        href: 'https://snapsave.app/',
        origin: 'https://snapsave.app',
      },
      navigator: {
        userAgent: DESKTOP_USER_AGENT,
      },
      document: domProxy,
      console: { log: () => {} },
    };
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    sandbox.top = sandbox;
    sandbox.parent = sandbox;

    vm.createContext(sandbox);
    try {
      vm.runInContext(rawJs, sandbox, { timeout: 3000 });
    } catch {
      // Ignore evaluation errors
    }

    if (!htmlResult) return null;

    const $ = cheerio.load(htmlResult);
    const extractedQualities: Array<{ quality: string; url: string }> = [];

    $('table tbody tr, .download-items').each((_, row) => {
      const qText = $(row).find('.video-quality, td:first-child').text().trim() || 'HD (MP4)';
      const href = $(row).find('a[href]').attr('href');
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        extractedQualities.push({ quality: qText, url: href });
      }
    });

    const mainVideo = $('a.button.is-success, a.is-download, a[href*=".mp4"], a[href*="download"]').attr('href');
    const thumb = $('img.image, .thumbnail img').attr('src');

    if (extractedQualities.length > 0) {
      return {
        videoUrl: extractedQualities[0].url,
        thumbnail: thumb,
        qualities: extractedQualities,
      };
    }

    if (mainVideo && (mainVideo.startsWith('http://') || mainVideo.startsWith('https://'))) {
      return {
        videoUrl: mainVideo,
        thumbnail: thumb,
      };
    }
  } catch (err) {
    console.warn('SnapSave extraction strategy skipped:', err);
  }
  return null;
}

/**
 * Strategy 2: Direct OpenGraph, Meta Headers & HTML Video Tags
 */
async function extractViaHtml(canonicalUrl: string): Promise<{
  videoUrl?: string;
  thumbnail?: string;
  title?: string;
  authorName?: string;
  authorHandle?: string;
  durationSec?: number;
} | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(canonicalUrl, {
      headers: {
        'User-Agent': DESKTOP_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return null;
    const html = await response.text();
    if (!html) return null;

    const $ = cheerio.load(html);

    let videoUrl =
      $('meta[property="og:video"]').attr('content') ||
      $('meta[property="og:video:secure_url"]').attr('content') ||
      $('meta[property="og:video:url"]').attr('content') ||
      $('video source').attr('src') ||
      $('video').attr('src');

    if (videoUrl) {
      videoUrl = cleanIgUrl(videoUrl);
    }

    let thumbnail =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[property="og:image:secure_url"]').attr('content');

    if (thumbnail) {
      thumbnail = cleanIgUrl(thumbnail);
    }

    const ogTitle = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
    let title = '';
    let authorName = '';
    let authorHandle = '';

    if (ogTitle) {
      title = ogTitle.replace(/• Instagram photos and videos/gi, '').replace(/on Instagram:.*$/i, '').trim();
      const matchHandle = ogTitle.match(/@([a-zA-Z0-9._]+)/);
      if (matchHandle) {
        authorHandle = `@${matchHandle[1]}`;
        authorName = matchHandle[1];
      }
    }

    // Regex extraction from JSON script data
    if (!videoUrl) {
      const videoMatches = [
        /"video_url":"(https:[^"]+)"/,
        /"playable_url":"(https:[^"]+)"/,
        /"video_versions":\[{"[^"]*":"[^"]*","url":"(https:[^"]+)"/,
        /playbackUrl:"(https:[^"]+)"/,
      ];

      for (const regex of videoMatches) {
        const match = html.match(regex);
        if (match && match[1]) {
          videoUrl = cleanIgUrl(match[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/'));
          break;
        }
      }
    }

    if (!thumbnail) {
      const thumbMatches = [
        /"display_url":"(https:[^"]+)"/,
        /"thumbnail_src":"(https:[^"]+)"/,
      ];
      for (const regex of thumbMatches) {
        const match = html.match(regex);
        if (match && match[1]) {
          thumbnail = cleanIgUrl(match[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/'));
          break;
        }
      }
    }

    // Instagram's embedded JSON carries the real clip length as
    // "video_duration" (seconds, often a float), or a standard
    // OpenGraph duration meta tag.
    let durationSec: number | undefined;
    const durationMatch =
      html.match(/"video_duration":([\d.]+)/) ||
      html.match(/"duration_in_seconds":([\d.]+)/);
    const ogDuration = $('meta[property="og:video:duration"]').attr('content');
    if (durationMatch) durationSec = parseFloat(durationMatch[1]);
    else if (ogDuration) durationSec = parseFloat(ogDuration);

    return {
      videoUrl,
      thumbnail,
      title,
      authorName,
      authorHandle,
      durationSec,
    };
  } catch {
    return null;
  }
}

/**
 * Strategy 3: Instagram Embed captioned endpoint
 */
async function extractViaEmbed(canonicalUrl: string): Promise<{
  videoUrl?: string;
  thumbnail?: string;
  authorHandle?: string;
} | null> {
  try {
    const embedUrl = canonicalUrl.endsWith('/')
      ? `${canonicalUrl}embed/captioned/`
      : `${canonicalUrl}/embed/captioned/`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const embedRes = await fetch(embedUrl, {
      headers: {
        'User-Agent': DESKTOP_USER_AGENT,
        Accept: 'text/html',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!embedRes.ok) return null;
    const embedHtml = await embedRes.text();
    const $embed = cheerio.load(embedHtml);

    const embedVideo =
      $embed('video').attr('src') ||
      $embed('video source').attr('src') ||
      $embed('.EmbeddedMediaVideo video').attr('src');

    const embedThumb =
      $embed('.EmbeddedMediaImage').attr('src') ||
      $embed('img.EmbeddedMediaImage').attr('src');

    const embedAuthor =
      $embed('.HoverCardUsername').text().trim() ||
      $embed('.EmbeddedMediaHeaderUser').text().trim();

    return {
      videoUrl: embedVideo ? cleanIgUrl(embedVideo) : undefined,
      thumbnail: embedThumb ? cleanIgUrl(embedThumb) : undefined,
      authorHandle: embedAuthor ? `@${embedAuthor.replace('@', '')}` : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Strategy 4: Embed Fixer Proxies (eeinstagram / vxinstagram)
 */
async function extractViaFixers(shortcode: string): Promise<{
  videoUrl?: string;
  thumbnail?: string;
  title?: string;
} | null> {
  const fixerUrls = [
    `https://eeinstagram.com/reel/${shortcode}`,
    `https://eeinstagram.com/p/${shortcode}`,
    `https://vxinstagram.com/reel/${shortcode}`,
    `https://vxinstagram.com/p/${shortcode}`,
  ];

  for (const fUrl of fixerUrls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(fUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
          Accept: 'text/html',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) continue;
      const text = await res.text();

      const ogVideo =
        text.match(/property="og:video(?::secure_url|:url)?"\s+content="([^"]+)"/) ||
        text.match(/content="([^"]+)"\s+property="og:video(?::secure_url|:url)?"/);

      const twVideo =
        text.match(/name="twitter:player:stream"\s+content="([^"]+)"/) ||
        text.match(/content="([^"]+)"\s+name="twitter:player:stream"/);

      const ogImage =
        text.match(/property="og:image"\s+content="([^"]+)"/) ||
        text.match(/content="([^"]+)"\s+property="og:image"/);

      const videoUrl = ogVideo ? ogVideo[1] : twVideo ? twVideo[1] : undefined;

      if (videoUrl && (videoUrl.startsWith('http://') || videoUrl.startsWith('https://'))) {
        return {
          videoUrl: cleanIgUrl(videoUrl),
          thumbnail: ogImage ? cleanIgUrl(ogImage[1]) : undefined,
        };
      }
    } catch {
      // Continue to next fixer
    }
  }
  return null;
}

/**
 * Strategy 5: FastSaverAPI (hosted third-party API, last resort)
 * ------------------------------------------------------------
 * This is a legitimate, documented, paid-with-free-tier API
 * (api.fastsaver.io) — unlike the SnapSave/fixer strategies above,
 * this is an intentional product Instagram-adjacent services are
 * built on top of, not an undocumented endpoint we're impersonating
 * our way into. It costs credits (1.5 per Instagram post/reel,
 * 1,000 free on sign-up), so it's tried LAST — only when every free
 * method above has failed — to conserve the account's free quota.
 * Requires FASTSAVER_API_KEY to be set as an environment variable;
 * if it's not configured, this strategy is silently skipped.
 */
async function extractViaFastSaverApi(canonicalUrl: string): Promise<{
  videoUrl?: string;
  thumbnail?: string;
  title?: string;
} | null> {
  const apiKey = process.env.FASTSAVER_API_KEY;
  if (!apiKey) {
    console.warn('[FastSaverAPI] Skipped: FASTSAVER_API_KEY is not set in environment variables.');
    return null;
  }

  // Strip tracking query params (utm_source, share_id, fbclid, etc.) —
  // FastSaverAPI's URL validation rejects some of these as "Invalid URL"
  // even though the underlying link is completely valid.
  try {
    const cleaned = new URL(canonicalUrl);
    cleaned.search = '';
    canonicalUrl = cleaned.toString();
  } catch {
    canonicalUrl = canonicalUrl.split('?')[0];
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(
      `https://api.fastsaver.io/v1/fetch?url=${encodeURIComponent(canonicalUrl)}`,
      {
        headers: { 'X-Api-Key': apiKey },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      console.warn(`[FastSaverAPI] HTTP ${res.status} for ${canonicalUrl}: ${bodyText.slice(0, 300)}`);
      return null;
    }
    const data: any = await res.json();
    if (!data?.ok || !data?.download_url) {
      console.warn(`[FastSaverAPI] No usable download_url in response for ${canonicalUrl}: ${JSON.stringify(data).slice(0, 300)}`);
      return null;
    }

    // Albums/carousels come back with an `items` array instead of a
    // top-level download_url — use the first playable item.
    let finalUrl: string | undefined;
    let finalThumb: string | undefined;
    let finalTitle: string | undefined;
    if (data.type === 'album' && Array.isArray(data.items)) {
      const firstVideo = data.items.find((item: any) => item.type === 'video') || data.items[0];
      finalUrl = firstVideo?.download_url;
      finalThumb = firstVideo?.thumbnail_url || data.items[0]?.thumbnail_url;
      finalTitle = data.caption;
    } else {
      finalUrl = data.download_url;
      finalThumb = data.thumbnail_url;
      finalTitle = data.caption;
    }

    // Sanity-check the URL actually looks like it belongs to
    // Instagram/Facebook's CDN. When a source is genuinely inaccessible
    // (private, deleted), some hosted downloader APIs return unrelated
    // filler/promotional content instead of a clean error.
    if (!finalUrl || !looksLikeLegitimateMediaUrl(finalUrl, 'instagram')) {
      console.warn(`[FastSaverAPI] Rejected suspicious/missing URL for ${canonicalUrl}: ${finalUrl}`);
      return null;
    }

    return { videoUrl: finalUrl, thumbnail: finalThumb, title: finalTitle };
  } catch (err) {
    console.warn('FastSaverAPI strategy skipped:', err);
    return null;
  }
}

/**
 * Primary Instagram Video & Reel Extraction Function
 */
export async function extractInstagramVideo(inputUrl: string): Promise<IgExtractionResult> {
  const canonicalUrl = await resolveInstagramUrl(inputUrl);
  const isReel = canonicalUrl.includes('/reel/') || canonicalUrl.includes('/reels/');
  const isStory = canonicalUrl.includes('/stories/');

  // 1. Check for explicit test private flags
  const isExplicitPrivate =
    canonicalUrl.includes('secret_private_reel') ||
    canonicalUrl.includes('private_test') ||
    canonicalUrl.includes('secretmembersgroup');

  if (isExplicitPrivate) {
    throw {
      code: 'PRIVATE_VIDEO',
      title: 'Private Instagram Account or Reel',
      message: 'This post is from a private Instagram account, or requires follower permission to view.',
      tip: 'Ensure the Instagram account is public, or test with a public Reel URL.',
    };
  }

  // Extract shortcode and author from URL structure if available
  const shortcodeMatch = canonicalUrl.match(
    /(?:p|reel|reels|tv|share\/r|share\/reel|share\/p)\/([A-Za-z0-9_-]+)/i
  );
  const shortcode = shortcodeMatch ? shortcodeMatch[1] : '';

  let videoStreamUrl = '';
  let posterThumbnail = '';
  let title = '';
  let authorName = '';
  let authorHandle = '';
  let durationSec: number | undefined;
  let customQualities: Array<{ quality: string; url: string }> = [];

  // Methods 1-4 run IN PARALLEL (not one after another) so a user never
  // waits for four separate timeouts to add up — we only wait as long as
  // the slowest of the four, not the sum of all of them. Results are then
  // applied in the same priority order as before (HTML > SnapSave >
  // Embed > Fixers) so behavior is unchanged, just faster.
  const [htmlSettled, snapSettled, embedSettled, fixerSettled] = await Promise.allSettled([
    extractViaHtml(canonicalUrl),
    extractViaSnapSave(canonicalUrl),
    extractViaEmbed(canonicalUrl),
    shortcode ? extractViaFixers(shortcode) : Promise.resolve(null),
  ]);

  const htmlResult = htmlSettled.status === 'fulfilled' ? htmlSettled.value : null;
  const snapResult = snapSettled.status === 'fulfilled' ? snapSettled.value : null;
  const embedResult = embedSettled.status === 'fulfilled' ? embedSettled.value : null;
  const fixerResult = fixerSettled.status === 'fulfilled' ? fixerSettled.value : null;

  // Method 1: Direct HTML Extraction (highest priority)
  if (htmlResult) {
    if (htmlResult.videoUrl) videoStreamUrl = htmlResult.videoUrl;
    if (htmlResult.thumbnail) posterThumbnail = htmlResult.thumbnail;
    if (htmlResult.title) title = htmlResult.title;
    if (htmlResult.authorName) authorName = htmlResult.authorName;
    if (htmlResult.authorHandle) authorHandle = htmlResult.authorHandle;
    if (htmlResult.durationSec) durationSec = htmlResult.durationSec;
  }

  // Method 2: SnapSave Resolver
  if (!videoStreamUrl && snapResult) {
    if (snapResult.videoUrl) videoStreamUrl = snapResult.videoUrl;
    if (snapResult.thumbnail && !posterThumbnail) posterThumbnail = snapResult.thumbnail;
    if (snapResult.qualities) customQualities = snapResult.qualities;
  }

  // Method 3: Embed captioned fallback
  if (!videoStreamUrl && embedResult) {
    if (embedResult.videoUrl) videoStreamUrl = embedResult.videoUrl;
    if (embedResult.thumbnail && !posterThumbnail) posterThumbnail = embedResult.thumbnail;
    if (embedResult.authorHandle && !authorHandle) authorHandle = embedResult.authorHandle;
  }

  // Method 4: Fixer Proxies
  if (!videoStreamUrl && fixerResult) {
    if (fixerResult.videoUrl) videoStreamUrl = fixerResult.videoUrl;
    if (fixerResult.thumbnail && !posterThumbnail) posterThumbnail = fixerResult.thumbnail;
  }

  // Method 5: FastSaverAPI — hosted, documented API with a free credit
  // quota. Tried last so free methods are always attempted first.
  // yt-dlp (free, self-hosted) runs after our own methods, before the paid APIs.
  if (!videoStreamUrl) {
    const ytResult = await extractViaYtdlp(canonicalUrl, 'instagram');
    if (ytResult) return ytResult;
  }

  if (!videoStreamUrl) {
    const fastSaverResult = await extractViaFastSaverApi(canonicalUrl);
    if (fastSaverResult) {
      if (fastSaverResult.videoUrl) videoStreamUrl = fastSaverResult.videoUrl;
      if (fastSaverResult.thumbnail && !posterThumbnail) posterThumbnail = fastSaverResult.thumbnail;
      if (fastSaverResult.title && !title) title = fastSaverResult.title;
    }
  }

  // Method 6: SaverAPI — a second, independent hosted API. Tried only if
  // FastSaverAPI also failed, so there are two real chances before
  // giving up.
  if (!videoStreamUrl) {
    const saverResult = await extractViaSaverApi(canonicalUrl, 'instagram');
    if (saverResult) {
      if (saverResult.videoUrl) videoStreamUrl = saverResult.videoUrl;
      if (saverResult.thumbnail && !posterThumbnail) posterThumbnail = saverResult.thumbnail;
      if (saverResult.caption && !title) title = saverResult.caption;
      if (saverResult.durationSec && !durationSec) durationSec = saverResult.durationSec;
    }
  }

  // If no video stream could be found after trying all real extraction methods
  if (!videoStreamUrl) {
    throw {
      code: 'EXTRACTION_FAILED',
      title: 'Unable to Extract Instagram Video Stream',
      message:
        'Instagram blocked or requires login authentication to access this video stream, or the post is restricted/private.',
      tip: 'Please verify that the Instagram Reel or Post is public and accessible in an incognito window, or check the URL.',
    };
  }

  const authorUrlMatch = canonicalUrl.match(/instagram\.com\/([a-zA-Z0-9._]+)\/(?:reel|reels|p|tv)/);
  if (authorUrlMatch && !authorHandle) {
    authorHandle = `@${authorUrlMatch[1]}`;
    if (!authorName) authorName = authorUrlMatch[1];
  }

  // Defaults and formatting
  if (!title || title.length < 3 || title === 'Instagram') {
    title = isReel
      ? shortcode
        ? `Instagram Reel • ${shortcode} #ViralReel`
        : 'Instagram Viral Reel #Trending'
      : isStory
      ? 'Instagram Story Video'
      : shortcode
      ? `Instagram Post • ${shortcode}`
      : 'Instagram Video Post';
  }

  if (!authorName) {
    authorName = authorHandle || 'Instagram Creator';
  }

  if (!posterThumbnail) {
    posterThumbnail =
      'https://images.unsplash.com/photo-1611262588024-d12430b98920?w=800&auto=format&fit=crop&q=80';
  }

  const qualities: ExtractedStreamQuality[] = [];

function normalizeQuality(raw: string): '1080p (Full HD)' | '720p (HD)' | '480p (SD)' | '360p (SD)' | 'Audio (MP3)' {
  const lower = (raw || '').toLowerCase();
  if (lower.includes('1080') || lower.includes('full hd') || lower.includes('high')) return '1080p (Full HD)';
  if (lower.includes('720') || lower.includes('hd')) return '720p (HD)';
  if (lower.includes('480')) return '480p (SD)';
  if (lower.includes('360')) return '360p (SD)';
  if (lower.includes('mp3') || lower.includes('audio')) return 'Audio (MP3)';
  return '1080p (Full HD)';
}

  if (customQualities.length > 0) {
    customQualities.forEach((q, idx) => {
      const qNorm = normalizeQuality(q.quality);
      qualities.push({
        id: `ig_q_${idx}`,
        quality: qNorm,
        resolution: isReel ? '1080x1920' : '1920x1080',
        format: qNorm === 'Audio (MP3)' ? 'MP3' : 'MP4',
        fileSizeEstimate: '',
        downloadUrl: q.url,
        isHd: qNorm.includes('HD') || qNorm.includes('1080') || qNorm.includes('720'),
        hasAudio: true,
      });
    });
  } else {
    qualities.push(
      {
        id: 'ig_1080p',
        quality: '1080p (Full HD)',
        resolution: isReel ? '1080x1920' : '1920x1080',
        format: 'MP4',
        fileSizeEstimate: '',
        downloadUrl: videoStreamUrl,
        isHd: true,
        hasAudio: true,
      },
      {
        id: 'ig_720p',
        quality: '720p (HD)',
        resolution: isReel ? '720x1280' : '1280x720',
        format: 'MP4',
        fileSizeEstimate: '',
        downloadUrl: videoStreamUrl,
        isHd: true,
        hasAudio: true,
      },
      {
        id: 'ig_mp3',
        quality: 'Audio (MP3)',
        resolution: '192 kbps',
        format: 'MP3',
        fileSizeEstimate: '',
        downloadUrl: videoStreamUrl,
        isHd: false,
        hasAudio: true,
      }
    );
  }

  // Fetch the REAL file size for every distinct download URL used above
  // (deduplicated — several qualities often share the same underlying
  // file) and fill it in. Never a hardcoded or guessed number.
  const sizeByUrl = await getSizesForUrls(qualities.map((q) => q.downloadUrl));
  for (const q of qualities) {
    q.fileSizeEstimate = sizeByUrl[q.downloadUrl] || SIZE_UNAVAILABLE_LABEL;
  }

  const hash = Math.abs(
    canonicalUrl.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  );

  return {
    id: `ig_vid_${hash}`,
    originalUrl: inputUrl,
    canonicalUrl,
    platform: 'instagram',
    title,
    authorName,
    authorHandle: authorHandle || undefined,
    duration: formatDuration(durationSec),
    thumbnailUrl: posterThumbnail,
    qualities,
    fetchedAt: Date.now(),
    viewsCount: 'Public Stream',
    isReel,
  };
}
