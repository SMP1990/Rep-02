/**
 * Request Tracking
 * ------------------------------------------------------------
 * Records every /api/video/info and /api/video/download-proxy
 * request to a MySQL table (`video_requests_log`), for future
 * analytics / an admin dashboard.
 *
 * Design goals (per project requirements):
 * - Never touches the existing extractor/download logic. Tracking
 *   is applied as a small Express middleware placed BEFORE the
 *   real route handler, which observes the request/response and
 *   writes a log row — it does not change what the route does or
 *   returns.
 * - Never breaks the actual downloader. Every database call here
 *   is wrapped so a DB error only logs to the console; it can
 *   never throw into the request pipeline or delay the response.
 * - Works with zero configuration: if MySQL isn't set up yet
 *   (see server/db.ts), tracking silently no-ops.
 * ------------------------------------------------------------
 */
import { Request, Response, NextFunction } from 'express';
import { getPool } from './db.ts';

const TRACKING_TABLE = 'video_requests_log';

let tableEnsured = false;
let tableEnsurePromise: Promise<void> | null = null;

/**
 * Creates the tracking table if it doesn't exist yet. Safe to call
 * multiple times — only runs the CREATE TABLE once per process.
 * Call this once at server startup; it also runs lazily before the
 * first insert as a safety net.
 */
export async function ensureTrackingTable(): Promise<void> {
  if (tableEnsured) return;
  if (tableEnsurePromise) return tableEnsurePromise;

  tableEnsurePromise = (async () => {
    const pool = getPool();
    if (!pool) return;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${TRACKING_TABLE} (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          platform VARCHAR(50) NOT NULL DEFAULT 'unknown',
          video_url TEXT NOT NULL,
          user_ip VARCHAR(64) DEFAULT NULL,
          user_agent VARCHAR(512) DEFAULT NULL,
          request_type ENUM('info','download') NOT NULL,
          filename VARCHAR(255) DEFAULT NULL,
          status ENUM('success','failed') NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_platform (platform),
          INDEX idx_request_type (request_type),
          INDEX idx_status (status),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      tableEnsured = true;
      console.log(`[tracking] "${TRACKING_TABLE}" table is ready.`);
    } catch (err) {
      console.error('[tracking] Could not create/verify tracking table:', err);
    }
  })();

  return tableEnsurePromise;
}

/** Best-effort platform detection from either the original post URL
 * (facebook.com/..., tiktok.com/...) or a CDN delivery URL
 * (fbcdn.net, cdninstagram.com, ...), so it works for both the
 * /info request (original URL) and the /download-proxy request
 * (actual CDN file URL). */
export function detectPlatformFromUrl(url: string | undefined | null): string {
  if (!url) return 'unknown';
  const u = url.toLowerCase();
  if (u.includes('facebook.com') || u.includes('fb.watch') || u.includes('fbcdn.net')) return 'facebook';
  if (u.includes('instagram.com') || u.includes('instagr.am') || u.includes('cdninstagram.com')) return 'instagram';
  if (u.includes('tiktok.com') || u.includes('tiktokcdn') || u.includes('tiktokv.com')) return 'tiktok';
  if (u.includes('twitter.com') || u.includes('x.com') || u.includes('t.co') || u.includes('twimg.com')) return 'twitter';
  if (u.includes('pinterest.') || u.includes('pin.it') || u.includes('pinimg.com')) return 'pinterest';
  if (u.includes('reddit.com') || u.includes('redd.it') || u.includes('redditmedia.com')) return 'reddit';
  if (u.includes('threads.net') || u.includes('threads.com')) return 'threads';
  if (u.includes('dailymotion.com') || u.includes('dai.ly')) return 'dailymotion';
  if (u.includes('linkedin.com')) return 'linkedin';
  return 'unknown';
}

export function getClientIpFromRequest(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

export interface TrackingEvent {
  platform: string;
  videoUrl: string;
  ip: string;
  userAgent: string;
  requestType: 'info' | 'download';
  filename?: string | null;
  status: 'success' | 'failed';
}

/**
 * Writes one tracking row. Deliberately swallows every error —
 * tracking must never be able to break or slow down a real
 * download/extraction request.
 */
export async function logTrackingEvent(event: TrackingEvent): Promise<void> {
  const pool = getPool();
  if (!pool) return; // MySQL not configured — silently skip

  try {
    await ensureTrackingTable();
    await pool.query(
      `INSERT INTO ${TRACKING_TABLE}
        (platform, video_url, user_ip, user_agent, request_type, filename, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        event.platform || 'unknown',
        event.videoUrl || '',
        event.ip || null,
        (event.userAgent || '').slice(0, 500),
        event.requestType,
        event.filename ? event.filename.slice(0, 255) : null,
        event.status,
      ]
    );
  } catch (err) {
    console.error('[tracking] Failed to write tracking row (downloader is unaffected):', err);
  }
}

/**
 * Express middleware factory. Attach this BEFORE the real route
 * handler — it does not alter the request or response in any way,
 * it only observes what status code / body the real handler ends
 * up sending, then logs one row after the response has gone out.
 *
 *   app.post('/api/video/info', trackRoute('info'), async (req, res) => { ... existing handler, untouched ... });
 */
export function trackRoute(requestType: 'info' | 'download') {
  return (req: Request, res: Response, next: NextFunction) => {
    let responseSuccess: boolean | null = null;

    // Peek at JSON responses (used by /api/video/info) to read the
    // existing `{ success: true/false }` shape the handler already
    // returns — without changing what gets sent to the client.
    const originalJson = res.json.bind(res);
    res.json = ((body: any) => {
      if (body && typeof body === 'object' && 'success' in body) {
        responseSuccess = !!body.success;
      }
      return originalJson(body);
    }) as typeof res.json;

    res.on('finish', () => {
      try {
        // Filename: prefer the Content-Disposition header set by the
        // download-proxy route; fall back to the ?name= query param.
        let filename: string | null = null;
        const disposition = res.getHeader('Content-Disposition');
        if (typeof disposition === 'string') {
          const match = disposition.match(/filename="([^"]+)"/);
          if (match) {
            try {
              filename = decodeURIComponent(match[1]);
            } catch {
              filename = match[1];
            }
          }
        }
        if (!filename && typeof req.query.name === 'string') {
          filename = req.query.name;
        }

        const statusInRange = res.statusCode >= 200 && res.statusCode < 300;
        const success = responseSuccess !== null ? responseSuccess : statusInRange;

        const videoUrl =
          requestType === 'info'
            ? (req.body && typeof req.body.url === 'string' ? req.body.url : '')
            : (typeof req.query.url === 'string' ? req.query.url : '');

        const bodyPlatform =
          requestType === 'info' && req.body && typeof req.body.platform === 'string'
            ? req.body.platform
            : null;

        logTrackingEvent({
          platform: bodyPlatform || detectPlatformFromUrl(videoUrl),
          videoUrl,
          ip: getClientIpFromRequest(req),
          userAgent: req.headers['user-agent'] || '',
          requestType,
          filename,
          status: success ? 'success' : 'failed',
        }).catch(() => {
          /* already logged inside logTrackingEvent */
        });
      } catch (err) {
        // Absolute last line of defence: tracking bookkeeping itself
        // must never throw inside a response-finished handler.
        console.error('[tracking] Unexpected error while recording request (downloader unaffected):', err);
      }
    });

    next();
  };
}
