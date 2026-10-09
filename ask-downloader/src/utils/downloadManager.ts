/**
 * Client-Side Media Stream Downloader with Real-time Progress Tracking
 */

export function formatFileSize(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeI = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, safeI)).toFixed(dm))} ${sizes[safeI]}`;
}

export function calculateSpeedMBps(bytesPerSec: number): number {
  if (!bytesPerSec || bytesPerSec <= 0) return 0;
  return bytesPerSec / (1024 * 1024);
}

export function formatTransferSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return '0.00 MB/s';
  const mbps = calculateSpeedMBps(bytesPerSec);
  if (mbps >= 1) {
    return `${mbps.toFixed(2)} MB/s`;
  }
  const kbps = bytesPerSec / 1024;
  return `${mbps.toFixed(2)} MB/s (${Math.round(kbps)} KB/s)`;
}

export function formatEta(seconds: number | null): string {
  if (seconds === null || !isFinite(seconds) || seconds < 0) return '--';
  if (seconds < 60) return `~${Math.ceil(seconds)}s left`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);
  return `~${mins}m ${secs}s left`;
}

export function parseBytesFromEstimate(sizeStr?: string): number {
  if (!sizeStr) return 25 * 1024 * 1024; // Default 25 MB estimate
  const clean = sizeStr.trim().toUpperCase();
  const numMatch = clean.match(/([\d.]+)/);
  if (!numMatch) return 25 * 1024 * 1024;
  const val = parseFloat(numMatch[1]);
  if (clean.includes('GB')) return Math.round(val * 1024 * 1024 * 1024);
  if (clean.includes('MB')) return Math.round(val * 1024 * 1024);
  if (clean.includes('KB')) return Math.round(val * 1024);
  return Math.round(val);
}

export interface ProgressCallbackData {
  loaded: number;
  total: number;
  percent: number;
  speed: number;
  eta: number | null;
}

export interface DownloadStreamOptions {
  url: string;
  filename: string;
  estimatedBytes?: number;
  signal?: AbortSignal;
  onStatusChange?: (status: 'connecting' | 'downloading' | 'assembling' | 'completed' | 'error') => void;
  onProgress?: (data: ProgressCallbackData) => void;
}

/**
 * Downloads a video/audio stream via ReadableStream, tracking chunk progression,
 * and triggers an automatic browser save dialog once finished.
 */
export async function downloadWithProgress(options: DownloadStreamOptions): Promise<{ finalBytes: number }> {
  const {
    url,
    filename,
    estimatedBytes = 25 * 1024 * 1024,
    signal,
    onStatusChange,
    onProgress,
  } = options;

  onStatusChange?.('connecting');

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      signal,
    });
  } catch (fetchErr) {
    // The fetch itself failed (network error, CORS, unreachable host, etc).
    // Report this honestly rather than downloading a fake placeholder file —
    // a "successful" download that isn't actually the requested video is
    // worse than a clear error the user can retry from.
    onStatusChange?.('error');
    throw new Error(
      fetchErr instanceof Error && fetchErr.message
        ? `Could not reach the video file: ${fetchErr.message}`
        : 'Could not reach the video file. Please try again.'
    );
  }

  if (!response.ok) {
    // The server explains WHY in the response body — surface that instead
    // of a bare status code, so the user knows what actually went wrong.
    const reason = await response.text().catch(() => '');
    throw new Error(reason.trim().slice(0, 200) || `Server returned HTTP ${response.status}: ${response.statusText}`);
  }

  // Extract total length if provided by server
  const headerLength = response.headers.get('content-length');
  let totalBytes = headerLength ? parseInt(headerLength, 10) : 0;
  if (!totalBytes || isNaN(totalBytes) || totalBytes <= 0) {
    totalBytes = estimatedBytes;
  }

  const contentType =
    response.headers.get('content-type') ||
    (filename.endsWith('.mp3') ? 'audio/mpeg' : 'video/mp4');

  if (!response.body) {
    // If response body streaming is unavailable, fallback to blob directly
    onStatusChange?.('downloading');
    const blob = await response.blob();
    saveBlobAsFile(blob, filename);
    onStatusChange?.('completed');
    return { finalBytes: blob.size || totalBytes };
  }

  onStatusChange?.('downloading');

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loadedBytes = 0;
  const startTime = performance.now();
  let lastSpeedCheckTime = startTime;
  let lastSpeedLoadedBytes = 0;
  let currentSpeed = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      if (value) {
        chunks.push(value);
        loadedBytes += value.length;

        // Recalculate dynamic speed every 180ms with light exponential smoothing
        const now = performance.now();
        const intervalElapsed = (now - lastSpeedCheckTime) / 1000;
        if (intervalElapsed >= 0.18) {
          const intervalBytes = loadedBytes - lastSpeedLoadedBytes;
          const instantSpeed = intervalBytes / intervalElapsed;
          // Apply exponential smoothing: 70% instant, 30% previous
          currentSpeed = currentSpeed > 0 ? currentSpeed * 0.3 + instantSpeed * 0.7 : instantSpeed;
          lastSpeedCheckTime = now;
          lastSpeedLoadedBytes = loadedBytes;
        } else if (currentSpeed === 0 && loadedBytes > 0) {
          const totalElapsed = (now - startTime) / 1000;
          if (totalElapsed > 0.05) {
            currentSpeed = loadedBytes / totalElapsed;
          }
        }

        // If actual bytes exceeded initial estimate, dynamically adjust total
        if (loadedBytes > totalBytes) {
          totalBytes = Math.round(loadedBytes * 1.15);
        }

        const percent = Math.min(99, Math.round((loadedBytes / totalBytes) * 100));
        const remainingBytes = Math.max(0, totalBytes - loadedBytes);
        const eta = currentSpeed > 0 ? remainingBytes / currentSpeed : null;

        onProgress?.({
          loaded: loadedBytes,
          total: totalBytes,
          percent,
          speed: currentSpeed,
          eta,
        });
      }
    }

    // Done reading stream, now assembling the binary blob
    onStatusChange?.('assembling');
    onProgress?.({
      loaded: loadedBytes,
      total: loadedBytes,
      percent: 100,
      speed: currentSpeed,
      eta: 0,
    });

    // Create the final binary file
    const completeBlob = new Blob(chunks, { type: contentType });
    saveBlobAsFile(completeBlob, filename);

    onStatusChange?.('completed');

    // Broadcast realtime event to Admin notification system across tabs
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('fdownloader_realtime_events');
        bc.postMessage({
          type: 'VIDEO_DOWNLOAD',
          payload: {
            id: `dl_${Date.now()}`,
            videoTitle: filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' ') || 'Social Media Video',
            videoUrl: url,
            quality: filename.includes('1080') ? '1080p' : filename.includes('720') ? '720p' : filename.includes('.mp3') ? 'MP3' : '360p',
            downloadedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
            fileSize: formatFileSize(loadedBytes),
            duration: '03:20',
            platform: filename.toLowerCase().includes('reel') ? 'Facebook' : filename.toLowerCase().includes('tiktok') ? 'TikTok' : 'Facebook',
            ipCountry: 'United States',
          }
        });
        bc.close();
      }
      localStorage.setItem('fdownloader_cross_tab_event', JSON.stringify({
        type: 'VIDEO_DOWNLOAD',
        payload: {
          id: `dl_${Date.now()}`,
          videoTitle: filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' ') || 'Social Media Video',
          videoUrl: url,
          quality: filename.includes('1080') ? '1080p' : filename.includes('720') ? '720p' : filename.includes('.mp3') ? 'MP3' : '360p',
          downloadedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          fileSize: formatFileSize(loadedBytes),
          duration: '03:20',
          platform: 'Facebook',
          ipCountry: 'United States',
        },
        _t: Date.now()
      }));
    } catch {}

    return { finalBytes: loadedBytes };
  } catch (err: any) {
    if (signal?.aborted) {
      throw new DOMException('Download cancelled by user', 'AbortError');
    }
    throw err;
  }
}

/**
 * Triggers browser save dialog for binary Blob
 */
export function saveBlobAsFile(blob: Blob, filename: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();

  // Cleanup blob memory
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(blobUrl);
  }, 10000);
}
