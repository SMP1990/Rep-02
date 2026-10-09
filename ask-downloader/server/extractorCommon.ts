/**
 * Shared extraction utilities, headers, types, and quality builders
 * for Facebook, Instagram, TikTok, and Twitter/X video processing.
 */

export interface ExtractedStreamQuality {
  id: string;
  quality: '1080p (Full HD)' | '720p (HD)' | '480p (SD)' | '360p (SD)' | 'Audio (MP3)';
  resolution: string;
  format: 'MP4' | 'MP3';
  fileSizeEstimate: string;
  downloadUrl: string;
  isHd: boolean;
  hasAudio: boolean;
}

export const DESKTOP_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export const MOBILE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';

/**
 * Clean slashes, unicode entities, and HTML entities in media stream URLs
 */
export function cleanMediaUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  return rawUrl
    .replace(/\\\//g, '/')
    .replace(/\\u0026/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/\\"/g, '"')
    .replace(/\\/g, '');
}

/**
 * Format bytes into human-readable string (KB, MB, GB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return 'Variable';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/** Human-facing fallback shown only when a real duration genuinely
 * could not be determined from the source's metadata — never a
 * fabricated number. */
export const DURATION_UNAVAILABLE_LABEL = '--:--';

/** Formats a duration in seconds as MM:SS, or HH:MM:SS once it's an
 * hour or longer (e.g. 45 -> "00:45", 202 -> "03:22", 4368 ->
 * "01:12:48"). Returns DURATION_UNAVAILABLE_LABEL for anything that
 * isn't a real, positive, finite number of seconds. */
export function formatDuration(totalSeconds: number | undefined | null): string {
  if (typeof totalSeconds !== 'number' || !isFinite(totalSeconds) || totalSeconds <= 0) {
    return DURATION_UNAVAILABLE_LABEL;
  }
  const whole = Math.round(totalSeconds);
  const hrs = Math.floor(whole / 3600);
  const mins = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}

/**
 * Fast HEAD request to determine Content-Length of a remote stream URL
 */
export async function getStreamSize(url: string, referer = 'https://www.google.com/'): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': DESKTOP_USER_AGENT,
        Referer: referer,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const contentLength = res.headers.get('content-length');
    if (contentLength) {
      const bytes = parseInt(contentLength, 10);
      if (!isNaN(bytes) && bytes > 0) {
        return formatBytes(bytes);
      }
    }
  } catch {
    // Timeout or network limitation, fallback to auto-size
  }
  return 'Auto-sized';
}

/** Human-facing fallback shown only when a real size genuinely could not
 * be determined (the CDN didn't return a Content-Length header, or the
 * request timed out) — an honest "unknown" label, never a fake number. */
export const SIZE_UNAVAILABLE_LABEL = 'Size unavailable';

/** Parses an HLS (.m3u8) manifest and returns the ordered list of
 * absolute segment URLs — the init segment (if present) first, then
 * each media segment in playlist order. If the manifest is a "master"
 * playlist (lists variant streams rather than segments), follows into
 * the first variant automatically. Shared by the download-proxy (which
 * fetches and concatenates these into a real file) and the file-size
 * checker below (which sums their real sizes) so both agree on the
 * same segment list. */
/** Resolves an HLS manifest into its video segments AND, when the
 * manifest is a master playlist that carries audio as a separate
 * rendition (#EXT-X-MEDIA:TYPE=AUDIO — what Reddit does), the audio
 * segments too. Grabbing only the video variant is exactly why such
 * downloads come out silent. */
export async function resolveHlsTracks(
  manifestUrl: string,
  headers: Record<string, string> = { 'User-Agent': DESKTOP_USER_AGENT }
): Promise<{ video: string[]; audio: string[] }> {
  const res = await fetch(manifestUrl, { headers });
  if (!res.ok) throw new Error(`Failed to fetch HLS manifest: HTTP ${res.status}`);
  const text = await res.text();
  const base = new URL(manifestUrl);
  // Reddit (and some other CDNs) put a required auth/expiry token in the
  // master playlist's query string. Relative child URLs resolved against
  // it would otherwise lose that token and be rejected, so carry it over
  // to any child that doesn't bring its own query string.
  const resolve = (uri: string) => {
    const resolved = new URL(uri, base);
    if (!resolved.search && base.search && resolved.origin === base.origin) {
      resolved.search = base.search;
    }
    return resolved.toString();
  };

  if (text.includes('#EXT-X-STREAM-INF')) {
    const lines = text.split('\n').map((l) => l.trim());

    // Pick the highest-bandwidth video variant.
    let bestUri: string | undefined;
    let bestBw = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('#EXT-X-STREAM-INF') && lines[i + 1] && !lines[i + 1].startsWith('#')) {
        const bwMatch = lines[i].match(/BANDWIDTH=(\d+)/);
        const bw = bwMatch ? parseInt(bwMatch[1], 10) : 0;
        if (bw > bestBw) {
          bestBw = bw;
          bestUri = lines[i + 1];
        }
      }
    }
    if (!bestUri) throw new Error('Master HLS playlist had no readable variant stream.');

    // Audio rendition, declared separately from the video variants.
    let audioUri: string | undefined;
    for (const line of lines) {
      if (line.startsWith('#EXT-X-MEDIA') && /TYPE=AUDIO/i.test(line)) {
        const m = line.match(/URI="([^"]+)"/);
        if (m) {
          audioUri = m[1];
          break;
        }
      }
    }

    const video = (await resolveHlsTracks(resolve(bestUri), headers)).video;
    const audio = audioUri ? (await resolveHlsTracks(resolve(audioUri), headers)).video : [];
    return { video, audio };
  }

  const segmentUrls: string[] = [];
  const initMatch = text.match(/#EXT-X-MAP:URI="([^"]+)"/);
  if (initMatch) segmentUrls.push(resolve(initMatch[1]));
  for (const line of text.split('\n').map((l) => l.trim())) {
    if (line && !line.startsWith('#')) segmentUrls.push(resolve(line));
  }
  if (segmentUrls.length === 0) throw new Error('HLS manifest had no segments.');
  return { video: segmentUrls.slice(0, 600), audio: [] };
}

export async function resolveHlsSegments(manifestUrl: string, headers: Record<string, string> = { 'User-Agent': DESKTOP_USER_AGENT }): Promise<string[]> {
  return (await resolveHlsTracks(manifestUrl, headers)).video;
}


/** Sums the real Content-Length of every segment an HLS manifest
 * references, giving an accurate total size for a streaming URL instead
 * of the tiny playlist file's own byte count. */
async function getHlsTotalSize(manifestUrl: string, referer?: string): Promise<string> {
  try {
    const headers: Record<string, string> = { 'User-Agent': DESKTOP_USER_AGENT };
    if (referer) headers['Referer'] = referer;
    const segmentUrls = await resolveHlsSegments(manifestUrl, headers);
    if (segmentUrls.length === 0) return SIZE_UNAVAILABLE_LABEL;

    // Checking every segment can mean dozens of HEAD requests for a
    // longer clip, which is slow. Segments in one stream are almost
    // always a similar size (same encoding settings throughout), so
    // sample a bounded subset, average it, and extrapolate to the full
    // segment count — accurate enough for a size estimate, and much
    // faster than checking every one.
    const sampleSize = Math.min(segmentUrls.length, 10);
    const step = Math.max(1, Math.floor(segmentUrls.length / sampleSize));
    const sampledUrls: string[] = [];
    for (let i = 0; i < segmentUrls.length && sampledUrls.length < sampleSize; i += step) {
      sampledUrls.push(segmentUrls[i]);
    }

    const sampleSizes = await Promise.all(
      sampledUrls.map(async (url) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000);
          const res = await fetch(url, { method: 'HEAD', headers, signal: controller.signal });
          clearTimeout(timeout);
          const len = res.headers.get('content-length');
          return len ? parseInt(len, 10) : 0;
        } catch {
          return 0;
        }
      })
    );

    const knownSizes = sampleSizes.filter((b) => b > 0);
    if (knownSizes.length === 0) return SIZE_UNAVAILABLE_LABEL;

    const averageSegmentBytes = knownSizes.reduce((sum, b) => sum + b, 0) / knownSizes.length;
    const estimatedTotal = Math.round(averageSegmentBytes * segmentUrls.length);
    return estimatedTotal > 0 ? formatBytes(estimatedTotal) : SIZE_UNAVAILABLE_LABEL;
  } catch {
    return SIZE_UNAVAILABLE_LABEL;
  }
}

/**
 * Fetches the real size for every URL in the list via getStreamSize,
 * deduplicating so the same URL is only ever checked once (several
 * "qualities" often point at the exact same underlying file), and
 * running the checks concurrently rather than one after another.
 * For .m3u8 URLs, a plain HEAD request would only report the tiny
 * playlist file's own size, not the video — instead, every segment the
 * playlist references is checked and their sizes summed for a
 * genuinely accurate total.
 * Returns a { url: sizeLabel } map — every value is either a real,
 * formatted size (e.g. "24.8 MB") or SIZE_UNAVAILABLE_LABEL.
 */
export async function getSizesForUrls(urls: string[], referer?: string): Promise<Record<string, string>> {
  const uniqueUrls = Array.from(new Set(urls.filter((u) => typeof u === 'string' && u.length > 0)));
  const result: Record<string, string> = {};
  await Promise.all(
    uniqueUrls.map(async (url) => {
      if (/\.m3u8(\?|$)/i.test(url)) {
        result[url] = await getHlsTotalSize(url, referer);
      } else {
        const size = await getStreamSize(url, referer);
        result[url] = size === 'Auto-sized' ? SIZE_UNAVAILABLE_LABEL : size;
      }
    })
  );
  return result;
}


/**
 * SaverAPI (saverapi.net) — hosted third-party downloader API, used as a
 * fallback when a platform's own free extraction methods fail (and,
 * for Reddit/Dailymotion specifically, since FastSaverAPI doesn't cover
 * those two, this is their ONLY paid fallback).
 *
 * Endpoint: GET /api/all-in-one-downloader-api?url=<url>
 * Auth: x-api-key header
 * Docs confirmed supported platforms: YouTube, TikTok, Instagram,
 * Facebook, Twitter/X, Vimeo, Dailymotion, Reddit. NOT Threads or
 * LinkedIn — don't call this for those two, it will never succeed.
 *
 * Requires SAVERAPI_KEY to be set as an environment variable; if it's
 * not configured, this is silently skipped (returns null).
 */
/** Known legitimate CDN/domain patterns per platform. If a hosted
 * downloader API (FastSaverAPI/SaverAPI) ever returns a URL that
 * doesn't match the platform it claims to be for, treat it as
 * suspicious rather than trusting it — this is exactly the pattern
 * seen when a source video is genuinely inaccessible (private,
 * deleted, region-locked) and the API substitutes unrelated
 * filler/promotional content instead of returning a clean error. */
const PLATFORM_CDN_PATTERNS: Record<string, RegExp> = {
  facebook: /(^|\.)fbcdn\.net$|(^|\.)facebook\.com$|(^|\.)fbsbx\.com$/i,
  instagram: /(^|\.)fbcdn\.net$|(^|\.)cdninstagram\.com$|(^|\.)instagram\.com$/i,
  tiktok: /tiktokcdn|(^|\.)tiktokv\.com$|byteoversea|muscdn\.com|(^|\.)tiktok\.com$/i,
  twitter: /(^|\.)twimg\.com$/i,
  pinterest: /(^|\.)pinimg\.com$/i,
  reddit: /(^|\.)redd\.it$|(^|\.)reddit\.com$|(^|\.)redditmedia\.com$/i,
  dailymotion: /(^|\.)dailymotion\.com$|(^|\.)dmcdn\.net$/i,
};

export function looksLikeLegitimateMediaUrl(url: string, platform: string): boolean {
  const pattern = PLATFORM_CDN_PATTERNS[platform.toLowerCase()];
  if (!pattern) return true; // No known pattern for this platform — nothing to check against.
  try {
    return pattern.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

export async function extractViaSaverApi(rawUrl: string, expectedPlatform?: string): Promise<{
  videoUrl?: string;
  thumbnail?: string;
  caption?: string;
  durationSec?: number;
} | null> {
  const apiKey = process.env.SAVERAPI_KEY;
  if (!apiKey) {
    console.warn('[SaverAPI] Skipped: SAVERAPI_KEY is not set in environment variables.');
    return null;
  }

  // Strip tracking query params — some third-party APIs reject URLs that
  // carry utm_source/share_id/etc. as "invalid" even though the
  // underlying link is completely valid.
  let cleanUrl = rawUrl;
  try {
    const cleaned = new URL(rawUrl);
    cleaned.search = '';
    cleanUrl = cleaned.toString();
  } catch {
    cleanUrl = rawUrl.split('?')[0];
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      `https://saverapi.net/api/all-in-one-downloader-api?url=${encodeURIComponent(cleanUrl)}`,
      {
        headers: { 'x-api-key': apiKey },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      console.warn(`[SaverAPI] HTTP ${res.status} for ${cleanUrl}: ${bodyText.slice(0, 300)}`);
      return null;
    }

    const data: any = await res.json();
    if (data?.error) {
      console.warn(`[SaverAPI] Error response for ${cleanUrl}: ${JSON.stringify(data).slice(0, 300)}`);
      return null;
    }

    // Response shape varies by platform/content type: a single video
    // (e.g. Instagram) has a top-level download_url, while a
    // multi-quality result (e.g. Dailymotion, Reddit) instead has a
    // medias[] array — one entry per quality — with no top-level
    // download_url at all. Handle both, and fail gracefully (return
    // null) for anything else — an image-only post, a gallery with no
    // video, empty/malformed arrays — rather than assuming one of these
    // shapes is always present.
    let videoUrl: string | undefined = data.download_url;
    if (!videoUrl && Array.isArray(data.medias) && data.medias.length > 0) {
      // Only ever consider entries that are genuinely video (explicitly
      // typed "video", or untyped — never fall back to picking an
      // image/audio-only entry just because no video exists; that would
      // silently hand back the wrong kind of media.
      const videoMedias = data.medias.filter(
        (m: any) => m && typeof m === 'object' && typeof m.url === 'string' && (!m.type || m.type === 'video')
      );

      if (videoMedias.length > 0) {
        // Some sources (notably Reddit) deliver video and audio as
        // separate tracks (acodec: "none" on every plain .mp4 entry) —
        // picking one of those alone gives a silent video. Check for a
        // genuinely combined audio+video track first, across every
        // video entry (including .m3u8 ones, in case a source ever
        // marks one that way).
        const combinedAv = videoMedias.filter(
          (m: any) => m?.acodec && m.acodec !== 'none' && m?.vcodec && m.vcodec !== 'none'
        );

        let selectionPool: any[];
        if (combinedAv.length > 0) {
          selectionPool = combinedAv;
        } else {
          // No plain file confirms it has audio. An HLS (.m3u8) adaptive
          // stream, when offered alongside separate silent video-only
          // .mp4 tracks, is typically the one variant that actually
          // includes the muxed audio track — the download-proxy already
          // knows how to fetch and join its segments into a real,
          // playable file, so prefer it here over a confirmed-silent
          // "fallback" .mp4 rather than trading working audio for a
          // simpler file format.
          const hlsCandidates = videoMedias.filter((m: any) => /\.m3u8(\?|$)/i.test(m.url));
          const mp4Candidates = videoMedias.filter((m: any) => !/\.m3u8(\?|$)/i.test(m.url));
          const fallbackLabeled = mp4Candidates.filter(
            (m: any) => m?.format_id === 'fallback' || m?.id === 'fallback'
          );
          // Reddit's video-only MP4s get their audio added back by the
          // download-proxy (it fetches the sibling audio file), which is
          // more reliable than joining HLS segments — so for Reddit, prefer
          // the direct MP4. Elsewhere, HLS is the variant likely to carry
          // muxed audio.
          const isRedditMedia = mp4Candidates.some((m: any) => /redd\.it\//i.test(m.url));
          selectionPool =
            isRedditMedia && fallbackLabeled.length > 0
              ? fallbackLabeled
              : isRedditMedia && mp4Candidates.length > 0
              ? mp4Candidates
              : hlsCandidates.length > 0
              ? hlsCandidates
              : fallbackLabeled.length > 0
              ? fallbackLabeled
              : mp4Candidates.length > 0
              ? mp4Candidates
              : videoMedias;
        }

        const best = selectionPool.reduce(
          (a: any, b: any) => ((b?.bandwidth || 0) > (a?.bandwidth || 0) ? b : a),
          selectionPool[0]
        );
        videoUrl = best?.url;
      }
      // If videoMedias is empty (e.g. an image post or gallery with no
      // video entries at all), videoUrl stays undefined on purpose —
      // there is genuinely no video to hand back here.
    }

    if (!videoUrl) {
      console.warn(`[SaverAPI] No usable video URL in response for ${cleanUrl}: ${JSON.stringify(data).slice(0, 300)}`);
      return null;
    }

    // Sanity-check the URL actually looks like it belongs to the
    // platform we asked about. When a source video is genuinely
    // inaccessible (private, deleted, region-locked), some hosted
    // downloader APIs return unrelated filler/promotional content
    // instead of a clean error — this catches that instead of trusting
    // it as the real video.
    if (expectedPlatform && !looksLikeLegitimateMediaUrl(videoUrl, expectedPlatform)) {
      console.warn(`[SaverAPI] Rejected suspicious URL for ${cleanUrl} (doesn't match expected ${expectedPlatform} CDN): ${videoUrl}`);
      return null;
    }

    return {
      videoUrl,
      thumbnail: data.thumb || data.thumbnail,
      caption: data.caption || data.title || undefined,
      durationSec: typeof data.duration === 'number' ? data.duration : undefined,
    };
  } catch (err) {
    console.warn('SaverAPI strategy skipped:', err);
    return null;
  }
}

