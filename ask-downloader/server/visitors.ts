/**
 * Anonymous visitor recognition.
 *
 * Purpose: understand how often people come back and how much they use
 * the downloader. NOT to identify anybody. No fingerprinting, no
 * personal data — just a random id in a first-party cookie.
 *
 * Because the id lives in a cookie, the SAME person counts as a NEW
 * visitor after clearing cookies, or in another browser, in incognito,
 * or on another device. That is a deliberate limit of a privacy-
 * respecting approach, not a bug.
 */
import * as crypto from 'crypto';
import type { Request, Response } from 'express';
import * as store from './store.ts';

export const VISITOR_COOKIE = 'fdl_visitor';
const VISITORS = 'visitors';
const ONE_YEAR = 365 * 24 * 60 * 60;
/** A gap longer than this counts as a new visit rather than the same one. */
const SESSION_GAP_MS = 30 * 60 * 1000;

export type Visitor = {
  id: string;
  label: string;
  firstSeenAt: string;
  lastSeenAt: string;
  visitCount: number;
  downloadCount: number;
  lastDownloadAt?: string;
  lastDownloadType?: string;
  platforms: Record<string, number>;
};

/** Thresholds for the engagement labels. Override with env vars if the
 * business definition of "frequent" changes. */
const T = {
  frequentVisits: Number(process.env.SEGMENT_FREQUENT_VISITS) || 10,
  frequentDownloads: Number(process.env.SEGMENT_FREQUENT_DOWNLOADS) || 10,
  inactiveDays: Number(process.env.SEGMENT_INACTIVE_DAYS) || 30,
};

export function segmentOf(v: Visitor): string {
  const daysSince = (Date.now() - new Date(v.lastSeenAt).getTime()) / 86400000;
  if (daysSince > T.inactiveDays) return 'Inactive';
  if (v.visitCount >= T.frequentVisits && v.downloadCount >= T.frequentDownloads) return 'Highly Engaged';
  if (v.downloadCount >= T.frequentDownloads) return 'Frequent Downloader';
  if (v.visitCount >= T.frequentVisits) return 'Frequent Visitor';
  if (v.visitCount > 1) return 'Returning Visitor';
  return 'New Visitor';
}

const all = () => store.read<Record<string, Visitor>>(VISITORS, {});

function parseCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

/** A short, readable handle for the dashboard — not derived from anything
 * personal, just the first characters of the random id. */
const labelFor = (id: string) => `Visitor #${id.slice(0, 4).toUpperCase()}`;

/**
 * Makes sure the request has a visitor id, counts the visit, and returns
 * the record. Safe to call on every page request.
 */
export function touchVisitor(req: Request, res: Response): Visitor | null {
  try {
    let id = parseCookie(req, VISITOR_COOKIE);
    const now = new Date();
    const visitors = all();

    if (!id || !/^[a-f0-9]{16,}$/.test(id) || !visitors[id]) {
      id = crypto.randomBytes(12).toString('hex');
      visitors[id] = {
        id,
        label: labelFor(id),
        firstSeenAt: now.toISOString(),
        lastSeenAt: now.toISOString(),
        visitCount: 1,
        downloadCount: 0,
        platforms: {},
      };
    } else {
      const v = visitors[id];
      // Only count a new visit after a real gap, so clicking around the
      // site is one visit rather than twenty.
      if (now.getTime() - new Date(v.lastSeenAt).getTime() > SESSION_GAP_MS) v.visitCount += 1;
      v.lastSeenAt = now.toISOString();
    }

    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    const existing = res.getHeader('Set-Cookie');
    const cookie = `${VISITOR_COOKIE}=${id}; HttpOnly; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax${secure}`;
    res.setHeader('Set-Cookie', existing ? ([] as string[]).concat(existing as any, cookie) : cookie);

    store.write(VISITORS, visitors);
    return visitors[id];
  } catch (err) {
    console.warn('[visitors] could not record visit:', err);
    return null;
  }
}

/** Records a completed download against the visitor, if one is known. */
export function recordVisitorDownload(req: Request, platform: string, quality: string): void {
  try {
    const id = parseCookie(req, VISITOR_COOKIE);
    if (!id) return;
    const visitors = all();
    const v = visitors[id];
    if (!v) return;
    v.downloadCount += 1;
    v.lastDownloadAt = new Date().toISOString();
    v.lastDownloadType = quality;
    if (platform) v.platforms[platform] = (v.platforms[platform] || 0) + 1;
    store.write(VISITORS, visitors);
  } catch {
    // Never let analytics break a download.
  }
}

/** Dashboard view: visitors plus a summary of the segments. */
export function visitorReport() {
  const list = Object.values(all())
    .map((v) => ({ ...v, segment: segmentOf(v) }))
    .sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());

  const segments: Record<string, number> = {};
  for (const v of list) segments[v.segment] = (segments[v.segment] || 0) + 1;

  return {
    total: list.length,
    totalVisits: list.reduce((s, v) => s + v.visitCount, 0),
    totalDownloads: list.reduce((s, v) => s + v.downloadCount, 0),
    returning: list.filter((v) => v.visitCount > 1).length,
    segments,
    thresholds: T,
    visitors: list.slice(0, 500),
  };
}
