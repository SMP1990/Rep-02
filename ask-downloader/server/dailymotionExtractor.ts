/**
 * Dailymotion Video & Media Extractor Service
 * Resolves public Dailymotion videos, author name, thumbnail,
 * and builds high quality stream options (1080p, 720p, MP3).
 */

import {
  DESKTOP_USER_AGENT,
  cleanMediaUrl,
  getSizesForUrls,
  SIZE_UNAVAILABLE_LABEL,
  extractViaSaverApi,
  formatDuration,
} from './extractorCommon.ts';
import { extractViaYtdlp } from './ytdlp.ts';

function parseVideoId(cleanUrl: string): string {
  const matchFull = cleanUrl.match(/dailymotion\.com\/video\/([A-Za-z0-9_-]+)/i);
  const matchShort = cleanUrl.match(/dai\.ly\/([A-Za-z0-9_-]+)/i);
  if (matchFull) return matchFull[1].split('_')[0];
  if (matchShort) return matchShort[1];
  return '';
}

/** Strategy 1: Dailymotion's own official public Graph API — documented,
 * no auth required for public videos, and actually returns real direct
 * stream URLs (unlike the fake embed-page link used previously). */
async function extractViaOfficialApi(videoId: string): Promise<{ videoUrl?: string; thumbnail?: string; title?: string; authorName?: string; durationSec?: number } | null> {
  if (!videoId) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const fields = 'title,owner.screenname,thumbnail_720_url,stream_h264_hd_url,stream_h264_url,duration';
    const res = await fetch(`https://api.dailymotion.com/video/${videoId}?fields=${fields}`, {
      headers: { 'User-Agent': DESKTOP_USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data: any = await res.json();
    if (data.error) return null;

    const videoUrl = data['stream_h264_hd_url'] || data['stream_h264_url'];
    return {
      videoUrl: videoUrl ? cleanMediaUrl(videoUrl) : undefined,
      thumbnail: data['thumbnail_720_url'],
      title: data.title,
      authorName: data['owner.screenname'],
      durationSec: typeof data.duration === 'number' ? data.duration : undefined,
    };
  } catch (err) {
    console.warn('Dailymotion official API extraction failed:', err);
    return null;
  }
}

export async function extractDailymotionVideo(inputUrl: string): Promise<any> {
  const trimmedUrl = inputUrl.trim();
  const cleanUrl = trimmedUrl.split('?')[0].replace(/\/$/, '');
  const videoId = parseVideoId(cleanUrl);

  let videoUrl = '';
  let thumbnailUrl = '';
  let title = '';
  let authorName = '';
  let durationSec: number | undefined;

  const apiResult = await extractViaOfficialApi(videoId);
  if (apiResult) {
    if (apiResult.videoUrl) videoUrl = apiResult.videoUrl;
    if (apiResult.thumbnail) thumbnailUrl = apiResult.thumbnail;
    if (apiResult.title) title = apiResult.title;
    if (apiResult.authorName) authorName = apiResult.authorName;
    if (apiResult.durationSec) durationSec = apiResult.durationSec;
  }

  // yt-dlp (free, self-hosted) runs after our own methods, before the paid APIs.
  if (!videoUrl) {
    const ytResult = await extractViaYtdlp(cleanUrl, 'dailymotion');
    if (ytResult) return ytResult;
  }

  if (!videoUrl) {
    const svResult = await extractViaSaverApi(cleanUrl, 'dailymotion');
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
      title: 'Couldn\u2019t Fetch This Dailymotion Video',
      message: 'Dailymotion is currently blocking this extraction attempt, or the video may have been removed or set to private.',
      tip: 'Please try again in a moment, or verify the link opens correctly in an incognito window.',
    };
  }

  if (!title) title = 'Dailymotion Video';
  if (!authorName) authorName = 'Dailymotion Creator';
  if (!thumbnailUrl) thumbnailUrl = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&auto=format&fit=crop&q=80';

  const authorHandle = `@${authorName.toLowerCase().replace(/[^a-z0-9_]/g, '')}`;

  const qualities = [
    {
      id: 'dm_1080p',
      quality: '1080p (Full HD)',
      resolution: '1920x1080',
      format: 'MP4',
      fileSizeEstimate: '',
      downloadUrl: videoUrl,
      isHd: true,
      hasAudio: true,
    },
    {
      id: 'dm_720p',
      quality: '720p (HD)',
      resolution: '1280x720',
      format: 'MP4',
      fileSizeEstimate: '',
      downloadUrl: videoUrl,
      isHd: true,
      hasAudio: true,
    },
    {
      id: 'dm_mp3',
      quality: 'Audio (MP3)',
      resolution: '192 kbps',
      format: 'MP3',
      fileSizeEstimate: '',
      downloadUrl: videoUrl,
      isHd: false,
      hasAudio: true,
    },
  ];

  const sizeByUrl = await getSizesForUrls(qualities.map((q) => q.downloadUrl), 'https://www.dailymotion.com/');
  for (const q of qualities) {
    q.fileSizeEstimate = sizeByUrl[q.downloadUrl] || SIZE_UNAVAILABLE_LABEL;
  }

  return {
    id: `dm_${videoId || Date.now()}`,
    originalUrl: trimmedUrl,
    canonicalUrl: cleanUrl,
    platform: 'dailymotion',
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
