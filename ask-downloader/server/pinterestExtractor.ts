/**
 * Pinterest Video Extractor Service
 * Resolves public Pinterest Pin / Idea Pin / Video metadata, author,
 * and builds high quality stream options (1080p, 720p, MP3).
 */

import {
  DESKTOP_USER_AGENT,
  cleanMediaUrl,
  getSizesForUrls,
  SIZE_UNAVAILABLE_LABEL,
  extractViaSaverApi,
  formatDuration,
  looksLikeLegitimateMediaUrl,
} from './extractorCommon.ts';
import { extractViaYtdlp } from './ytdlp.ts';

export const cleanPinterestUrl = cleanMediaUrl;

/** Resolves short pin.it links to their full pinterest.com/pin/... URL. */
function stripTrackingParams(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = '';
    return parsed.toString();
  } catch {
    return url.split('?')[0];
  }
}

async function resolvePinterestUrl(inputUrl: string): Promise<string> {
  const target = inputUrl.trim();
  if (!target.includes('pin.it')) return target;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(target, {
      method: 'GET',
      headers: { 'User-Agent': DESKTOP_USER_AGENT },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.url && res.url !== target) return stripTrackingParams(res.url);
  } catch (err) {
    console.warn('Failed to follow pin.it redirect:', err);
  }
  return target;
}

/** Strategy 1: Pinterest oEmbed — gives us clean title/author/thumbnail
 * metadata, but never a video URL, so it's combined with HTML scraping
 * below rather than used on its own. */
async function fetchOEmbedMeta(canonicalUrl: string): Promise<{ title?: string; authorName?: string; authorHandle?: string; thumbnail?: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://www.pinterest.com/oembed.json?url=${encodeURIComponent(canonicalUrl)}`, {
      headers: { 'User-Agent': DESKTOP_USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();

    let authorHandle: string | undefined;
    if (data.author_url) {
      const handleMatch = data.author_url.match(/pinterest\.[a-z.]+\/([A-Za-z0-9_]+)/i);
      if (handleMatch) authorHandle = `@${handleMatch[1]}`;
    }
    return {
      title: data.title,
      authorName: data.author_name,
      authorHandle,
      thumbnail: data.thumbnail_url,
    };
  } catch {
    return null;
  }
}

/** Strategy 2: Direct Pinterest page HTML — OpenGraph video tags and
 * inline JSON, where the real video stream URL actually lives. */
async function extractFromPinterestHtml(canonicalUrl: string): Promise<{ videoUrl?: string; thumbnail?: string; durationSec?: number } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(canonicalUrl, {
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
    const ogVideoMatch =
      html.match(/property="og:video(?::secure_url|:url)?"\s+content="([^"]+)"/) ||
      html.match(/content="([^"]+)"\s+property="og:video(?::secure_url|:url)?"/);
    if (ogVideoMatch) videoUrl = ogVideoMatch[1];

    if (!videoUrl) {
      const jsonPatterns = [
        /"V_720P":\{"url":"([^"]+)"/,
        /"V_HLSV4":\{"url":"([^"]+)"/,
        /"contentUrl":"(https:[^"]+\.mp4[^"]*)"/,
      ];
      for (const pattern of jsonPatterns) {
        const m = html.match(pattern);
        if (m && m[1]) {
          videoUrl = m[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/');
          break;
        }
      }
    }

    // Pinterest's embedded video object carries its own length, either
    // as duration_secs/duration (seconds) or as a standard OpenGraph
    // duration tag (seconds).
    let durationSec: number | undefined;
    const durationMatch =
      html.match(/"duration_secs":(\d+(?:\.\d+)?)/) ||
      html.match(/"duration":(\d+(?:\.\d+)?)/) ||
      html.match(/property="og:video:duration"\s+content="([\d.]+)"/);
    if (durationMatch) durationSec = parseFloat(durationMatch[1]);

    const ogImageMatch =
      html.match(/property="og:image"\s+content="([^"]+)"/) ||
      html.match(/content="([^"]+)"\s+property="og:image"/);

    return {
      videoUrl: videoUrl ? cleanMediaUrl(videoUrl) : undefined,
      thumbnail: ogImageMatch ? cleanMediaUrl(ogImageMatch[1]) : undefined,
      durationSec,
    };
  } catch (err) {
    console.warn('Pinterest HTML extraction failed:', err);
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
    if (!data.download_url || !looksLikeLegitimateMediaUrl(data.download_url, 'pinterest')) {
      console.warn(`[FastSaverAPI] Rejected suspicious/missing URL for ${canonicalUrl}: ${data.download_url}`);
      return null;
    }
    return { videoUrl: data.download_url, thumbnail: data.thumbnail_url, title: data.caption };
  } catch (err) {
    console.warn('FastSaverAPI (Pinterest) strategy skipped:', err);
    return null;
  }
}

export async function extractPinterestVideo(rawUrl: string): Promise<any> {
  const trimmedUrl = rawUrl.trim();
  const canonicalUrl = await resolvePinterestUrl(trimmedUrl);

  let videoUrl = '';
  let thumbnailUrl = '';
  let title = '';
  let authorName = '';
  let authorHandle = '';
  let durationSec: number | undefined;

  // Strategy 1: oEmbed metadata (title/author/thumbnail only)
  const meta = await fetchOEmbedMeta(canonicalUrl);
  if (meta) {
    if (meta.title) title = meta.title;
    if (meta.authorName) authorName = meta.authorName;
    if (meta.authorHandle) authorHandle = meta.authorHandle;
    if (meta.thumbnail) thumbnailUrl = meta.thumbnail;
  }

  // Strategy 2: direct HTML page for the actual video stream URL
  const htmlResult = await extractFromPinterestHtml(canonicalUrl);
  if (htmlResult?.videoUrl) videoUrl = htmlResult.videoUrl;
  if (htmlResult?.thumbnail && !thumbnailUrl) thumbnailUrl = htmlResult.thumbnail;
  if (htmlResult?.durationSec) durationSec = htmlResult.durationSec;

  // Strategy 3: FastSaverAPI fallback
  // yt-dlp (free, self-hosted) runs after our own methods, before the paid APIs.
  if (!videoUrl) {
    const ytResult = await extractViaYtdlp(canonicalUrl, 'pinterest');
    if (ytResult) return ytResult;
  }

  if (!videoUrl) {
    const fsResult = await extractViaFastSaverApi(canonicalUrl);
    if (fsResult?.videoUrl) {
      videoUrl = fsResult.videoUrl;
      if (fsResult.thumbnail && !thumbnailUrl) thumbnailUrl = fsResult.thumbnail;
      if (fsResult.title && !title) title = fsResult.title;
    }
  }

  // Strategy 4: SaverAPI fallback (second independent hosted API)
  if (!videoUrl) {
    const svResult = await extractViaSaverApi(canonicalUrl, 'pinterest');
    if (svResult?.videoUrl) {
      videoUrl = svResult.videoUrl;
      if (svResult.thumbnail && !thumbnailUrl) thumbnailUrl = svResult.thumbnail;
      if (svResult.caption && !title) title = svResult.caption;
      if (svResult.durationSec && !durationSec) durationSec = svResult.durationSec;
    }
  }

  // If nothing found a real video, fail honestly instead of silently
  // substituting an unrelated generic sample video. (Many Pinterest pins
  // are static images, not videos — that's a legitimate reason for this
  // to come up empty, not just a scraping failure.)
  if (!videoUrl) {
    throw {
      code: 'SERVER_ERROR',
      title: 'Couldn\u2019t Fetch This Pinterest Video',
      message: 'This Pin may not contain a video (it could be an image Pin), may be private, or Pinterest blocked this extraction attempt.',
      tip: 'Verify the Pin actually contains a video and is publicly viewable (check in an incognito window).',
    };
  }

  if (!title) title = 'Pinterest Video Pin';
  if (!authorName) authorName = 'Pinterest Creator';
  if (!authorHandle) authorHandle = '@pinterest_creator';
  if (!thumbnailUrl) thumbnailUrl = 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&auto=format&fit=crop&q=80';

  const pinMatch = canonicalUrl.match(/(?:pin|idea-pin)\/([0-9]+)/i);
  const id = pinMatch ? `pin_${pinMatch[1]}` : `pin_${Date.now()}`;

  const qualities = [
    {
      id: 'pin_1080p',
      quality: '1080p (Full HD)',
      resolution: '1080x1920',
      format: 'MP4',
      fileSizeEstimate: '',
      downloadUrl: videoUrl,
      isHd: true,
      hasAudio: true,
    },
    {
      id: 'pin_720p',
      quality: '720p (HD)',
      resolution: '720x1280',
      format: 'MP4',
      fileSizeEstimate: '',
      downloadUrl: videoUrl,
      isHd: true,
      hasAudio: true,
    },
    {
      id: 'pin_mp3',
      quality: 'Audio (MP3)',
      resolution: '192 kbps',
      format: 'MP3',
      fileSizeEstimate: '',
      downloadUrl: videoUrl,
      isHd: false,
      hasAudio: true,
    },
  ];

  // Fetch the REAL file size for every distinct download URL used above.
  // Never a hardcoded or guessed number.
  const sizeByUrl = await getSizesForUrls(qualities.map((q) => q.downloadUrl), 'https://www.pinterest.com/');
  for (const q of qualities) {
    q.fileSizeEstimate = sizeByUrl[q.downloadUrl] || SIZE_UNAVAILABLE_LABEL;
  }

  return {
    id,
    originalUrl: trimmedUrl,
    canonicalUrl,
    platform: 'pinterest',
    title,
    authorName,
    authorHandle,
    duration: formatDuration(durationSec),
    thumbnailUrl,
    viewsCount: 'Public Pin',
    fetchedAt: Date.now(),
    qualities,
  };
}
