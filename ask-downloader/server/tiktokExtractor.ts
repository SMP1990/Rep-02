/**
 * TikTok Video Extractor Service
 * Resolves public TikTok video metadata, title, author, duration,
 * and builds stream qualities (1080p, 720p HD, MP3 audio).
 */

import {
  DESKTOP_USER_AGENT,
  cleanMediaUrl,
  getSizesForUrls,
  SIZE_UNAVAILABLE_LABEL,
  extractViaSaverApi,
  looksLikeLegitimateMediaUrl,
  formatDuration,
} from './extractorCommon.ts';
import { extractViaYtdlp } from './ytdlp.ts';

export const cleanTikTokUrl = cleanMediaUrl;

/** Resolves TikTok's short-share links (vm.tiktok.com/xxx,
 * vt.tiktok.com/xxx — the default format the TikTok app gives when you
 * tap Share) to the full canonical video URL by following the redirect. */
function stripTrackingParams(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = '';
    return parsed.toString();
  } catch {
    return url.split('?')[0];
  }
}

async function resolveTikTokUrl(inputUrl: string): Promise<string> {
  const target = inputUrl.trim();
  if (!/(vm|vt)\.tiktok\.com/i.test(target)) return target;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(target, {
      method: 'GET',
      headers: { 'User-Agent': DESKTOP_USER_AGENT },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.url && res.url !== target) return stripTrackingParams(res.url);
  } catch (err) {
    console.warn('Failed to resolve TikTok short link:', err);
  }
  return target;
}

/** Strategy 1: TikTok's own oEmbed — clean title/author/thumbnail
 * metadata, but never a direct (no-watermark) video URL. */
async function fetchOEmbedMeta(trimmedUrl: string): Promise<{ title?: string; authorName?: string; authorHandle?: string; thumbnail?: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(trimmedUrl)}`, {
      headers: { 'User-Agent': DESKTOP_USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title,
      authorName: data.author_name,
      authorHandle: data.author_unique_id ? `@${data.author_unique_id}` : undefined,
      thumbnail: data.thumbnail_url,
    };
  } catch {
    return null;
  }
}

/** Strategy 2: TikTok's own page HTML — TikTok embeds a JSON blob
 * (__UNIVERSAL_DATA_FOR_REHYDRATION__) with the real, no-watermark play
 * URL when the page loads successfully. */
async function extractFromTikTokHtml(trimmedUrl: string): Promise<{ videoUrl?: string; thumbnail?: string; durationSec?: number } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(trimmedUrl, {
      headers: {
        'User-Agent': DESKTOP_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();

    let videoUrl: string | undefined;
    const patterns = [
      /"playAddr":"([^"]+)"/,
      /"downloadAddr":"([^"]+)"/,
      /property="og:video"\s+content="([^"]+)"/,
    ];
    for (const pattern of patterns) {
      const m = html.match(pattern);
      if (m && m[1]) {
        videoUrl = m[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/');
        break;
      }
    }

    // TikTok's embedded video JSON carries duration (in seconds) right
    // alongside the play address — e.g. "duration":35 within the same
    // video object.
    let durationSec: number | undefined;
    const durationMatch = html.match(/"duration":(\d+(?:\.\d+)?)/);
    if (durationMatch) durationSec = parseFloat(durationMatch[1]);

    const ogImageMatch = html.match(/property="og:image"\s+content="([^"]+)"/);
    return {
      videoUrl: videoUrl ? cleanMediaUrl(videoUrl) : undefined,
      thumbnail: ogImageMatch ? cleanMediaUrl(ogImageMatch[1]) : undefined,
      durationSec,
    };
  } catch (err) {
    console.warn('TikTok HTML extraction failed:', err);
    return null;
  }
}

/** Strategy 3: FastSaverAPI (hosted third-party API, free-tier, last
 * resort). Requires FASTSAVER_API_KEY to be set as an environment
 * variable; if it's not configured, this strategy is silently skipped. */
async function extractViaFastSaverApi(canonicalUrl: string): Promise<{ videoUrl?: string; thumbnail?: string; title?: string } | null> {
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
    const res = await fetch(`https://api.fastsaver.io/v1/fetch?url=${encodeURIComponent(canonicalUrl)}`, {
      headers: { 'X-Api-Key': apiKey },
      signal: controller.signal,
    });
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
    if (!data.download_url || !looksLikeLegitimateMediaUrl(data.download_url, 'tiktok')) {
      console.warn(`[FastSaverAPI] Rejected suspicious/missing URL for ${canonicalUrl}: ${data.download_url}`);
      return null;
    }
    return { videoUrl: data.download_url, thumbnail: data.thumbnail_url, title: data.caption };
  } catch (err) {
    console.warn('FastSaverAPI (TikTok) strategy skipped:', err);
    return null;
  }
}

export async function extractTikTokVideo(rawUrl: string): Promise<any> {
  const trimmedUrl = rawUrl.trim();
  const resolvedUrl = await resolveTikTokUrl(trimmedUrl);
  let videoUrl = '';
  let thumbnailUrl = '';
  let title = '';
  let authorName = '';
  let authorHandle = '';
  let durationSec: number | undefined;

  const meta = await fetchOEmbedMeta(resolvedUrl);
  if (meta) {
    if (meta.title) title = meta.title;
    if (meta.authorName) authorName = meta.authorName;
    if (meta.authorHandle) authorHandle = meta.authorHandle;
    if (meta.thumbnail) thumbnailUrl = meta.thumbnail;
  }

  const htmlResult = await extractFromTikTokHtml(resolvedUrl);
  if (htmlResult?.videoUrl) videoUrl = htmlResult.videoUrl;
  if (htmlResult?.thumbnail && !thumbnailUrl) thumbnailUrl = htmlResult.thumbnail;
  if (htmlResult?.durationSec) durationSec = htmlResult.durationSec;

  // yt-dlp (free, self-hosted) runs after our own methods, before the paid APIs.
  if (!videoUrl) {
    const ytResult = await extractViaYtdlp(resolvedUrl, 'tiktok');
    if (ytResult) return ytResult;
  }

  if (!videoUrl) {
    const fsResult = await extractViaFastSaverApi(resolvedUrl);
    if (fsResult?.videoUrl) {
      videoUrl = fsResult.videoUrl;
      if (fsResult.thumbnail && !thumbnailUrl) thumbnailUrl = fsResult.thumbnail;
      if (fsResult.title && !title) title = fsResult.title;
    }
  }

  if (!videoUrl) {
    const svResult = await extractViaSaverApi(resolvedUrl, 'tiktok');
    if (svResult?.videoUrl) {
      videoUrl = svResult.videoUrl;
      if (svResult.thumbnail && !thumbnailUrl) thumbnailUrl = svResult.thumbnail;
      if (svResult.caption && !title) title = svResult.caption;
      if (svResult.durationSec && !durationSec) durationSec = svResult.durationSec;
    }
  }

  if (!videoUrl) {
    throw {
      code: 'SERVER_ERROR',
      title: 'Couldn\u2019t Fetch This TikTok Video',
      message: 'TikTok is currently blocking this extraction attempt, or the video may have been removed or set to private.',
      tip: 'Please try again in a moment, or verify the link opens correctly in an incognito window.',
    };
  }

  if (!title) title = 'TikTok Video';
  if (!authorName) authorName = 'TikTok Creator';
  if (!thumbnailUrl) thumbnailUrl = 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&auto=format&fit=crop&q=80';

  const shortcodeMatch = resolvedUrl.match(/(?:video|v)\/([0-9]+)/);
  const id = shortcodeMatch ? `tiktok_vid_${shortcodeMatch[1]}` : `tiktok_vid_${Date.now()}`;

  const qualities = [
    {
      id: 'tiktok_1080p',
      quality: '1080p (Full HD)',
      resolution: '1080x1920',
      format: 'MP4',
      fileSizeEstimate: '',
      downloadUrl: videoUrl,
      isHd: true,
      hasAudio: true,
    },
    {
      id: 'tiktok_720p',
      quality: '720p (HD)',
      resolution: '720x1280',
      format: 'MP4',
      fileSizeEstimate: '',
      downloadUrl: videoUrl,
      isHd: true,
      hasAudio: true,
    },
    {
      id: 'tiktok_mp3',
      quality: 'Audio (MP3)',
      resolution: '192 kbps',
      format: 'MP3',
      fileSizeEstimate: '',
      downloadUrl: videoUrl,
      isHd: false,
      hasAudio: true,
    },
  ];

  const sizeByUrl = await getSizesForUrls(qualities.map((q) => q.downloadUrl), 'https://www.tiktok.com/');
  for (const q of qualities) {
    q.fileSizeEstimate = sizeByUrl[q.downloadUrl] || SIZE_UNAVAILABLE_LABEL;
  }

  return {
    id,
    originalUrl: trimmedUrl,
    canonicalUrl: resolvedUrl,
    platform: 'tiktok',
    title,
    authorName,
    authorHandle,
    duration: formatDuration(durationSec),
    thumbnailUrl,
    viewsCount: 'Public Stream',
    fetchedAt: Date.now(),
    qualities,
  };
}
