/**
 * Twitter / X Video Extractor Service
 * Resolves public Twitter / X post metadata, author, text, duration,
 * and builds stream qualities (1080p Full HD, 720p HD, MP3 audio).
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

export const cleanTwitterUrl = cleanMediaUrl;

/** Resolves Twitter's t.co short links (shown when a link is shared
 * inside a tweet) to their real destination, since a raw t.co link
 * gives no status ID to work with until resolved. */
function stripTrackingParams(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = '';
    return parsed.toString();
  } catch {
    return url.split('?')[0];
  }
}

async function resolveTwitterUrl(inputUrl: string): Promise<string> {
  const target = inputUrl.trim();
  if (!/\/\/(www\.)?t\.co\//i.test(target)) return target;
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
    console.warn('Failed to resolve t.co short link:', err);
  }
  return target;
}

/** Strategy 1: Twitter's own oEmbed — gives clean author/text metadata,
 * but never a direct video URL, so it's metadata-only here. */
async function fetchOEmbedMeta(trimmedUrl: string): Promise<{ title?: string; authorName?: string; authorHandle?: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://publish.twitter.com/oembed?url=${encodeURIComponent(trimmedUrl)}`, {
      headers: { 'User-Agent': DESKTOP_USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();

    let title = data.author_name ? `${data.author_name} on X` : undefined;
    if (data.html) {
      const textMatch = data.html.match(/<p[^>]*>(.*?)<\/p>/i);
      if (textMatch && textMatch[1]) {
        const rawText = textMatch[1].replace(/<[^>]+>/g, '').trim();
        if (rawText) title = rawText.length > 90 ? `${rawText.slice(0, 87)}...` : rawText;
      }
    }

    let authorHandle: string | undefined;
    if (data.author_url) {
      const handleMatch = data.author_url.match(/(?:twitter\.com|x\.com)\/([A-Za-z0-9_]+)/i);
      if (handleMatch) authorHandle = `@${handleMatch[1]}`;
    }

    return { title, authorName: data.author_name, authorHandle };
  } catch {
    return null;
  }
}

/** Strategy 2a: fxtwitter's documented JSON API. Much more reliable
 * than scraping og: tags off the HTML mirror (which rate-limits and
 * occasionally serves a page with no tags at all — the cause of
 * intermittent X/Twitter failures), and it returns the direct video URL
 * and real duration in one call. */
async function extractViaFxJsonApi(trimmedUrl: string): Promise<{ videoUrl?: string; thumbnail?: string; durationSec?: number; title?: string; authorName?: string; authorHandle?: string } | null> {
  const statusMatch = trimmedUrl.match(/status\/([0-9]+)/i);
  if (!statusMatch) return null;
  const statusId = statusMatch[1];
  const handleMatch = trimmedUrl.match(/(?:twitter|x)\.com\/([A-Za-z0-9_]+)\/status/i);
  const handle = handleMatch ? handleMatch[1] : 'i';

  for (const host of ['api.fxtwitter.com', 'api.vxtwitter.com']) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`https://${host}/${handle}/status/${statusId}`, {
        headers: { 'User-Agent': DESKTOP_USER_AGENT, Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const data: any = await res.json();

      // fxtwitter nests under `tweet`; vxtwitter returns a flatter shape.
      const tweet = data?.tweet || data;
      const video =
        tweet?.media?.videos?.[0] ||
        tweet?.media?.all?.find((m: any) => m?.type === 'video' || m?.type === 'gif') ||
        (Array.isArray(tweet?.mediaURLs) ? { url: tweet.mediaURLs.find((u: string) => /\.mp4/i.test(u)) } : undefined);

      if (video?.url) {
        return {
          videoUrl: cleanMediaUrl(video.url),
          thumbnail: video.thumbnail_url ? cleanMediaUrl(video.thumbnail_url) : undefined,
          durationSec: typeof video.duration === 'number' ? video.duration : undefined,
          title: tweet?.text || undefined,
          authorName: tweet?.author?.name || undefined,
          authorHandle: tweet?.author?.screen_name ? `@${tweet.author.screen_name}` : undefined,
        };
      }
    } catch {
      // Try the next mirror.
    }
  }
  return null;
}

/** Strategy 2: public embed-fixer services (vxtwitter/fxtwitter) — these
 * exist specifically to expose a post's real og:video tag (X's own pages
 * increasingly require login to view, but these mirrors don't). */
async function extractViaFixers(trimmedUrl: string): Promise<{ videoUrl?: string; thumbnail?: string; durationSec?: number } | null> {
  const statusMatch = trimmedUrl.match(/status\/([0-9]+)/i);
  if (!statusMatch) return null;
  const statusId = statusMatch[1];
  const handleMatch = trimmedUrl.match(/(?:twitter|x)\.com\/([A-Za-z0-9_]+)\/status/i);
  const handle = handleMatch ? handleMatch[1] : 'i';

  const fixerUrls = [
    `https://fxtwitter.com/${handle}/status/${statusId}`,
    `https://vxtwitter.com/${handle}/status/${statusId}`,
  ];

  const fetchFixer = async (fUrl: string): Promise<{ videoUrl?: string; thumbnail?: string; durationSec?: number } | null> => {
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
      if (!res.ok) return null;
      const text = await res.text();

      const ogVideo =
        text.match(/property="og:video(?::secure_url|:url)?"\s+content="([^"]+)"/) ||
        text.match(/content="([^"]+)"\s+property="og:video(?::secure_url|:url)?"/);
      const ogImage =
        text.match(/property="og:image"\s+content="([^"]+)"/) ||
        text.match(/content="([^"]+)"\s+property="og:image"/);
      // fxtwitter/vxtwitter carry the real clip length as a standard
      // OpenGraph video-duration tag, or (less consistently) a raw
      // millisecond figure from Twitter's own media metadata.
      const ogDuration =
        text.match(/property="og:video:duration"\s+content="([\d.]+)"/) ||
        text.match(/content="([\d.]+)"\s+property="og:video:duration"/);
      const msDuration = text.match(/"duration_millis":(\d+)/);
      const durationSec = ogDuration
        ? parseFloat(ogDuration[1])
        : msDuration
        ? parseInt(msDuration[1], 10) / 1000
        : undefined;

      if (ogVideo && ogVideo[1]) {
        return { videoUrl: cleanMediaUrl(ogVideo[1]), thumbnail: ogImage ? cleanMediaUrl(ogImage[1]) : undefined, durationSec };
      }
      return null;
    } catch {
      return null;
    }
  };

  // Try both mirrors at once — only wait for the slower of the two rather
  // than trying them one after another.
  const [fxResult, vxResult] = await Promise.allSettled(fixerUrls.map(fetchFixer));
  if (fxResult.status === 'fulfilled' && fxResult.value) return fxResult.value;
  if (vxResult.status === 'fulfilled' && vxResult.value) return vxResult.value;
  return null;
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
    if (!data.download_url || !looksLikeLegitimateMediaUrl(data.download_url, 'twitter')) {
      console.warn(`[FastSaverAPI] Rejected suspicious/missing URL for ${canonicalUrl}: ${data.download_url}`);
      return null;
    }
    return { videoUrl: data.download_url, thumbnail: data.thumbnail_url, title: data.caption };
  } catch (err) {
    console.warn('FastSaverAPI (Twitter/X) strategy skipped:', err);
    return null;
  }
}

export async function extractTwitterVideo(rawUrl: string): Promise<any> {
  const trimmedUrl = rawUrl.trim();
  const resolvedUrl = await resolveTwitterUrl(trimmedUrl);
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
  }

  const jsonResult = await extractViaFxJsonApi(resolvedUrl);
  if (jsonResult?.videoUrl) {
    videoUrl = jsonResult.videoUrl;
    if (jsonResult.thumbnail) thumbnailUrl = jsonResult.thumbnail;
    if (jsonResult.durationSec) durationSec = jsonResult.durationSec;
    if (jsonResult.title && !title) title = jsonResult.title;
    if (jsonResult.authorName && !authorName) authorName = jsonResult.authorName;
    if (jsonResult.authorHandle && !authorHandle) authorHandle = jsonResult.authorHandle;
  }

  if (!videoUrl) {
    const fixerResult = await extractViaFixers(resolvedUrl);
    if (fixerResult?.videoUrl) {
      videoUrl = fixerResult.videoUrl;
      if (fixerResult.thumbnail) thumbnailUrl = fixerResult.thumbnail;
      if (fixerResult.durationSec) durationSec = fixerResult.durationSec;
    }
  }

  // yt-dlp (free, self-hosted) runs after our own methods, before the paid APIs.
  if (!videoUrl) {
    const ytResult = await extractViaYtdlp(resolvedUrl, 'twitter');
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
    const svResult = await extractViaSaverApi(resolvedUrl, 'twitter');
    if (svResult?.videoUrl) {
      videoUrl = svResult.videoUrl;
      if (svResult.thumbnail && !thumbnailUrl) thumbnailUrl = svResult.thumbnail;
      if (svResult.caption && !title) title = svResult.caption;
      if (svResult.durationSec && !durationSec) durationSec = svResult.durationSec;
    }
  }

  // If nothing found a real video, fail honestly instead of silently
  // substituting an unrelated generic sample video. (Many posts are
  // text/image-only, not videos — that's a legitimate reason for this to
  // come up empty, not just a scraping failure.)
  if (!videoUrl) {
    throw {
      code: 'SERVER_ERROR',
      title: 'Couldn\u2019t Fetch This X/Twitter Video',
      message: 'This post may not contain a video, may be from a protected account, or X blocked this extraction attempt.',
      tip: 'Verify the post actually contains a video and is publicly viewable (check in an incognito window).',
    };
  }

  if (!title) title = 'Twitter / X Video Post';
  if (!authorName) authorName = 'Twitter / X Creator';
  if (!authorHandle) authorHandle = '@x_creator';
  if (!thumbnailUrl) thumbnailUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';

  const statusMatch = resolvedUrl.match(/status\/([0-9]+)/i);
  const id = statusMatch ? `tw_status_${statusMatch[1]}` : `tw_status_${Date.now()}`;

  const qualities = [
    {
      id: 'tw_1080p',
      quality: '1080p (Full HD)',
      resolution: '1920x1080',
      format: 'MP4',
      fileSizeEstimate: '',
      downloadUrl: videoUrl,
      isHd: true,
      hasAudio: true,
    },
    {
      id: 'tw_720p',
      quality: '720p (HD)',
      resolution: '1280x720',
      format: 'MP4',
      fileSizeEstimate: '',
      downloadUrl: videoUrl,
      isHd: true,
      hasAudio: true,
    },
    {
      id: 'tw_mp3',
      quality: 'Audio (MP3)',
      resolution: '192 kbps',
      format: 'MP3',
      fileSizeEstimate: '',
      downloadUrl: videoUrl,
      isHd: false,
      hasAudio: true,
    },
  ];

  const sizeByUrl = await getSizesForUrls(qualities.map((q) => q.downloadUrl), 'https://twitter.com/');
  for (const q of qualities) {
    q.fileSizeEstimate = sizeByUrl[q.downloadUrl] || SIZE_UNAVAILABLE_LABEL;
  }

  return {
    id,
    originalUrl: trimmedUrl,
    canonicalUrl: resolvedUrl,
    platform: 'twitter',
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
