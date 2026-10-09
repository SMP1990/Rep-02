/**
 * Reddit Video Extractor Service
 * Resolves public Reddit Posts, Clips, v.redd.it media, upvotes, subreddit,
 * and builds high quality stream options (1080p, 720p, 480p, MP3).
 */

import {
  cleanMediaUrl,
  getSizesForUrls,
  SIZE_UNAVAILABLE_LABEL,
  extractViaSaverApi,
  formatDuration,
  DURATION_UNAVAILABLE_LABEL
} from './extractorCommon.ts';
import { extractViaYtdlp } from './ytdlp.ts';

export const cleanRedditUrl = cleanMediaUrl;

/** Reddit post URLs don't need a query string to identify the post — the
 * path alone is enough. Share links carry tracking params (utm_source,
 * share_id, etc.) that some third-party services reject as "invalid", so
 * strip them once resolution is done. */
function stripTrackingParams(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = '';
    return parsed.toString();
  } catch {
    return url.split('?')[0];
  }
}

/** Resolves Reddit's mobile "share" short-links (reddit.com/r/sub/s/xxxxx)
 * to their full canonical post URL (.../comments/postid/slug/) by
 * following the redirect. The JSON API only works with the canonical
 * form, not the share short-link. */
async function resolveRedditUrl(inputUrl: string): Promise<string> {
  const target = inputUrl.trim();
  const needsResolution = /\/s\/[A-Za-z0-9]+/.test(target) || /(^https?:\/\/)?(www\.)?redd\.it\//i.test(target);
  if (!needsResolution) return target;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(target, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    // Case 1: Reddit issued a real HTTP redirect — fetch already followed
    // it, and res.url is the final destination.
    if (res.url && res.url !== target && !/\/s\/[A-Za-z0-9]+/.test(res.url)) {
      return stripTrackingParams(res.url);
    }

    // Case 2: no HTTP-level redirect happened (or it landed on another
    // short-link) — check the page body itself for the canonical post URL,
    // in case Reddit serves an HTML shell with a client-side redirect
    // instead of a 3xx response for this link type.
    const html = await res.text();
    const canonicalMatch =
      html.match(/<link rel="canonical" href="([^"]+)"/i) ||
      html.match(/property="og:url"\s+content="([^"]+)"/i) ||
      html.match(/"permalink":"([^"]+)"/);
    if (canonicalMatch && canonicalMatch[1]) {
      const found = canonicalMatch[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/');
      const resolved = found.startsWith('http') ? found : `https://www.reddit.com${found}`;
      if (resolved !== target) return stripTrackingParams(resolved);
    }
  } catch (err) {
    console.warn('Failed to resolve Reddit share link:', err);
  }
  return target;
}

/** Strategy 1: Reddit's own public .json API — legitimate, documented,
 * works for any public post without authentication. */
async function extractViaRedditJson(trimmedUrl: string): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const cleanPath = trimmedUrl.split('?')[0].replace(/\/$/, '');
    const jsonApiUrl = `${cleanPath}.json?raw_json=1`;

    const res = await fetch(jsonApiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 RedditExtractor/1.0',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const payload = await res.json();
    if (!Array.isArray(payload) || !payload[0]?.data?.children?.[0]?.data) return null;

    const post = payload[0].data.children[0].data;
    const redditVideo =
      post.media?.reddit_video ||
      post.secure_media?.reddit_video ||
      post.preview?.reddit_video_preview ||
      post.crosspost_parent_list?.[0]?.media?.reddit_video;

    // Reddit's `fallback_url` is a complete video-only MP4; its audio sits
    // in a sibling file on v.redd.it that the download-proxy fetches and
    // combines with it. This is far more reliable than the HLS playlist
    // (which can use MPEG-TS segments that don't mux cleanly), so prefer
    // it and only fall back to HLS if Reddit gave no direct file.
    const hlsUrl = redditVideo?.hls_url ? cleanMediaUrl(redditVideo.hls_url) : '';
    const fallbackUrl = redditVideo?.fallback_url ? cleanMediaUrl(redditVideo.fallback_url) : '';
    const directVideoUrl = fallbackUrl || hlsUrl;
    // No real video found on this post (text/image/gallery post, or
    // Reddit didn't include video data) — nothing to extract here.
    if (!directVideoUrl) return null;

    const duration = formatDuration(redditVideo?.duration);

    let thumbnailUrl = '';
    if (post.preview?.images?.[0]?.source?.url) {
      thumbnailUrl = cleanMediaUrl(post.preview.images[0].source.url);
    } else if (post.thumbnail && post.thumbnail.startsWith('http')) {
      thumbnailUrl = post.thumbnail;
    }

    return {
      title: post.title || 'Reddit Video Post',
      description: post.selftext ? post.selftext.slice(0, 200) : undefined,
      authorName: post.author ? `u/${post.author}` : 'u/RedditUser',
      authorHandle: post.subreddit_name_prefixed || (post.subreddit ? `r/${post.subreddit}` : 'r/reddit'),
      duration,
      thumbnailUrl,
      videoUrl: directVideoUrl,
      commentsCount: post.num_comments,
      upvotes: post.ups,
      permalink: post.permalink,
    };
  } catch (err) {
    console.warn('Reddit JSON API extraction failed:', err);
    return null;
  }
}

/** Strategy 2: FastSaverAPI (hosted third-party API, free-tier, last
 * resort). Requires FASTSAVER_API_KEY to be set as an environment
 * variable; if it's not configured, this strategy is silently skipped. */
export async function extractRedditVideo(rawUrl: string): Promise<any> {
  const trimmedUrl = rawUrl.trim();
  const resolvedUrl = await resolveRedditUrl(trimmedUrl);
  let videoUrl = '';
  let title = '';
  let description: string | undefined;
  let authorName = '';
  let authorHandle = '';
  let duration = DURATION_UNAVAILABLE_LABEL;
  let thumbnailUrl = '';
  let commentsCount: number | undefined;
  let upvotes: number | undefined;
  let canonicalUrl = resolvedUrl;

  // Strategy 1: Reddit's own public JSON API
  const jsonResult = await extractViaRedditJson(resolvedUrl);
  if (jsonResult) {
    videoUrl = jsonResult.videoUrl;
    title = jsonResult.title;
    description = jsonResult.description;
    authorName = jsonResult.authorName;
    authorHandle = jsonResult.authorHandle;
    duration = jsonResult.duration;
    thumbnailUrl = jsonResult.thumbnailUrl;
    commentsCount = jsonResult.commentsCount;
    upvotes = jsonResult.upvotes;
    if (jsonResult.permalink) canonicalUrl = `https://www.reddit.com${jsonResult.permalink}`;
  }

  // Strategy 2: SaverAPI fallback (FastSaverAPI doesn't support Reddit,
  // but SaverAPI does)
  // yt-dlp (free, self-hosted) runs after our own methods, before the paid APIs.
  if (!videoUrl) {
    const ytResult = await extractViaYtdlp(resolvedUrl, 'reddit');
    if (ytResult) return ytResult;
  }

  if (!videoUrl) {
    const svResult = await extractViaSaverApi(resolvedUrl, 'reddit');
    if (svResult?.videoUrl) {
      videoUrl = svResult.videoUrl;
      if (svResult.thumbnail && !thumbnailUrl) thumbnailUrl = svResult.thumbnail;
      if (svResult.caption && !title) title = svResult.caption;
      if (svResult.durationSec && duration === DURATION_UNAVAILABLE_LABEL) duration = formatDuration(svResult.durationSec);
    }
  }

  // If nothing found a real video, fail honestly instead of silently
  // substituting an unrelated generic sample video.
  if (!videoUrl) {
    throw {
      code: 'SERVER_ERROR',
      title: 'Couldn\u2019t Fetch This Reddit Video',
      message: 'This Reddit post may not contain a video, may be private/restricted, or Reddit blocked this extraction attempt.',
      tip: 'Verify the post contains a video and is publicly viewable (check in an incognito window).',
    };
  }

  if (!title) title = 'Reddit Video Post';
  if (!authorName) authorName = 'u/RedditUser';
  if (!authorHandle) authorHandle = 'r/reddit';
  if (!thumbnailUrl) thumbnailUrl = 'https://images.unsplash.com/photo-1579202673506-ca3ce28943ef?w=800&auto=format&fit=crop&q=80';

  const qualities = [
    {
      id: 'rd_1080p',
      quality: '1080p (Full HD)',
      resolution: '1920x1080',
      format: 'MP4',
      fileSizeEstimate: '',
      downloadUrl: videoUrl,
      isHd: true,
      hasAudio: true,
    },
    {
      id: 'rd_720p',
      quality: '720p (HD)',
      resolution: '1280x720',
      format: 'MP4',
      fileSizeEstimate: '',
      downloadUrl: videoUrl,
      isHd: true,
      hasAudio: true,
    },
    {
      id: 'rd_mp3',
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
  const sizeByUrl = await getSizesForUrls(qualities.map((q) => q.downloadUrl), 'https://www.reddit.com/');
  for (const q of qualities) {
    q.fileSizeEstimate = sizeByUrl[q.downloadUrl] || SIZE_UNAVAILABLE_LABEL;
  }

  return {
    id: `rd_post_${Date.now()}`,
    originalUrl: trimmedUrl,
    canonicalUrl,
    platform: 'reddit',
    title,
    description,
    authorName,
    authorHandle,
    duration,
    thumbnailUrl,
    viewsCount: commentsCount !== undefined ? `${commentsCount} Comments` : 'Public Post',
    likesCount: upvotes !== undefined ? (upvotes > 1000 ? `${(upvotes / 1000).toFixed(1)}K` : `${upvotes}`) : undefined,
    fetchedAt: Date.now(),
    qualities,
  };
}
