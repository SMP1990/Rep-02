/**
 * Facebook Video Downloader - Backend Express Server
 * Ready for deployment on Hostinger (Node.js application / VPS with PM2 or Passenger)
 */

import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { extractFacebookVideo } from './server/fbExtractor.ts';
import { extractInstagramVideo } from './server/igExtractor.ts';
import { extractTikTokVideo } from './server/tiktokExtractor.ts';
import { extractTwitterVideo } from './server/twitterExtractor.ts';
import { extractPinterestVideo } from './server/pinterestExtractor.ts';
import { extractViaSaverApi, resolveHlsTracks, getSizesForUrls, looksLikeLegitimateMediaUrl, formatBytes } from './server/extractorCommon.ts';
import { canMux, muxAudioVideo, findFfmpeg, extractAudioAsMp3, redditAudioCandidates } from './server/mux.ts';
import { extractViaYtdlp, getYtdlp, ytdlpStatus, handleYtdlpStream } from './server/ytdlp.ts';
import { testConnection } from './server/db.ts';
import * as store from './server/store.ts';
import * as users from './server/adminUsers.ts';
import { sendMail, mailStatus, isDisposableEmail } from './server/mailer.ts';
import { touchVisitor, recordVisitorDownload, visitorReport } from './server/visitors.ts';
import { saveImage, deleteImage, uploadsDir, imageProcessingAvailable } from './server/uploads.ts';
import { handleMediaUpload, forgetMediaFile, uploadHeaders, readMediaFiles } from './server/mediaUpload.ts';
import { INITIAL_BLOG_CATEGORIES, INITIAL_SITE_SETTINGS, INITIAL_LANDING_CONTENT, INITIAL_SITE_PAGES } from './src/data/mockAdminData.ts';
import { INITIAL_BLOG_POSTS } from './src/data/blogSeed.ts';
import { normalizeBlogLanguage, isBlogLanguage } from './src/config/blogLanguages.ts';
import { extractRedditVideo } from './server/redditExtractor.ts';
import { extractThreadsVideo } from './server/threadsExtractor.ts';
import { extractDailymotionVideo } from './server/dailymotionExtractor.ts';
import { trackRoute, ensureTrackingTable } from './server/tracking.ts';
import { Readable } from 'stream';
import { cleanSlug } from './src/utils/slug.ts';
import { buildMediaList, applyAltChanges } from './server/media.ts';
import { LEGAL_TEXT_DATE } from './src/config/legal.ts';
import { syncPageTranslations, readTranslations, translationsForEditor, saveTranslationEdits } from './server/pageTranslations.ts';
import { gaId, GA_CSP, gaHeadTags, gaInitScript } from './server/analytics.ts';
import { addRedirect, findRedirect, clearRedirectFrom, listRedirects, deleteRedirect, normalizePath, normalizeTarget, isProtectedPath, setOwnHost } from './server/redirects.ts';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware for parsing JSON and urlencoded requests
// 8 MB: an uploaded image arrives base64-encoded, which is ~35% larger
// than the 5 MB file limit enforced in the upload handler. (Media Library
// uploads stream as raw bodies and never pass through this parser.)
// A restore carries the whole site, uploaded files included (up to 60 MB,
// which is ~80 MB as base64), so only that one route gets a larger limit —
// and only for a signed-in admin, so nobody else can make the server read
// a huge body.
const restoreJson = express.json({ limit: '120mb' });
const normalJson = express.json({ limit: '8mb' });
app.use((req: Request, res: Response, next: Function) =>
  (req.path === '/api/admin/restore' && hasValidAdminSession(req) ? restoreJson : normalJson)(req, res, next as any));
app.use(express.urlencoded({ extended: true }));

/**
 * Security HTTP Headers Middleware
 */
app.use((req: Request, res: Response, next: Function) => {
  const ga = !!gaId(); // Google's domains are allowed only while GA is switched on
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // img-src/media-src allow any https: source because video thumbnails and
  // preview media are streamed directly from whichever platform's own CDN
  // the user's link points to (Facebook, Instagram, TikTok, etc.) — these
  // domains are not fixed and can't be allow-listed individually.
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      `script-src 'self'${ga ? ' ' + GA_CSP.script : ''}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "media-src 'self' https:",
      `connect-src 'self'${ga ? ' ' + GA_CSP.connect : ''}`,
      "frame-src https://www.youtube-nocookie.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join('; ')
  );
  if (req.headers['x-forwarded-proto'] === 'https' || req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

/**
 * ============================================================
 * ADMIN AUTHENTICATION SYSTEM
 * ------------------------------------------------------------
 * All credential checking happens here on the server only.
 * Nothing about the real password ever reaches the browser or
 * the client-side JavaScript bundle. Sessions are httpOnly
 * cookies (unreadable by JavaScript, so an XSS bug elsewhere
 * cannot steal the session), scoped with SameSite=Strict (so
 * they are never sent on cross-site requests), and expire
 * automatically. Failed logins are rate-limited per IP with an
 * escalating lockout to block brute-force attempts.
 *
 * NOTE: Until a real database is connected, credentials live in
 * the ADMIN_EMAIL / ADMIN_PASSWORD environment variables (set
 * these in Hostinger's Environment Variables panel). There is
 * no backdoor password and no hardcoded fallback of any kind —
 * if those variables are not set, login is refused outright.
 * ============================================================
 */
const SESSION_COOKIE_NAME = 'fdownloader_admin_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface AdminSession {
  createdAt: number;
  expiresAt: number;
  /** Which admin this session belongs to, so permissions can be checked. */
  userId?: string;
}
const adminSessions = new Map<string, AdminSession>();

function cleanExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of adminSessions.entries()) {
    if (session.expiresAt < now) adminSessions.delete(token);
  }
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

function isRequestSecure(req: Request): boolean {
  return req.secure || req.headers['x-forwarded-proto'] === 'https';
}

function setSessionCookie(req: Request, res: Response, token: string) {
  const secureFlag = isRequestSecure(req) ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${Math.floor(SESSION_DURATION_MS / 1000)}; SameSite=Strict${secureFlag}`
  );
}

function clearSessionCookie(req: Request, res: Response) {
  const secureFlag = isRequestSecure(req) ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict${secureFlag}`);
}

// Timing-safe string comparison — prevents an attacker from guessing
// the password one character at a time by measuring response time.
function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// Per-IP login rate limiting
const MAX_LOGIN_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes
interface LoginAttemptRecord { count: number; firstAttempt: number; lockedUntil?: number; }
const loginAttempts = new Map<string, LoginAttemptRecord>();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function checkLoginRateLimit(ip: string): { allowed: boolean; message?: string } {
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true };
  const now = Date.now();
  if (record.lockedUntil && now < record.lockedUntil) {
    const minsLeft = Math.ceil((record.lockedUntil - now) / 60000);
    return { allowed: false, message: `Too many failed login attempts. Please try again in ${minsLeft} minute(s).` };
  }
  return { allowed: true };
}

function recordFailedLoginAttempt(ip: string) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now - record.firstAttempt > ATTEMPT_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return;
  }
  record.count += 1;
  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
  }
}

function clearLoginAttempts(ip: string) {
  loginAttempts.delete(ip);
}

/* ------------------------------------------------------------------
 * Admin account.
 *
 * The password is stored on the SERVER as a salted scrypt hash, so it
 * is never kept in plain text and travels with a backup when the site
 * moves to another account. ADMIN_EMAIL / ADMIN_PASSWORD environment
 * variables still work, so nothing breaks for existing setups.
 * ---------------------------------------------------------------- */
type AdminAccount = { email: string; salt: string; hash: string; updatedAt: string };

function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password: string, account: AdminAccount): boolean {
  try {
    const candidate = crypto.scryptSync(password, account.salt, 64);
    const stored = Buffer.from(account.hash, 'hex');
    return candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored);
  } catch {
    return false;
  }
}

/** The stored account, or one derived from the environment variables. */
function getAdminAccount(): AdminAccount | null {
  const stored = store.read<AdminAccount | null>('adminAccount', null);
  if (stored?.email && stored?.hash) return stored;
  const envEmail = process.env.ADMIN_EMAIL;
  const envPass = process.env.ADMIN_PASSWORD;
  if (envEmail && envPass) {
    const { salt, hash } = hashPassword(envPass);
    return { email: envEmail.trim().toLowerCase(), salt, hash, updatedAt: 'environment variable' };
  }
  return null;
}

/** Tells the login page whether an account exists yet. */
app.get('/api/admin/status', (_req: Request, res: Response): any => {
  const list = users.allUsers();
  return res.json({ configured: list.length > 0 });
});

/** The signed-in admin and what they are allowed to do. */
app.get('/api/admin/me', (req: Request, res: Response): any => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'UNAUTHORIZED' });
  return res.json({ user: users.publicUser(user), allPermissions: users.PERMISSIONS, rolePresets: users.ROLE_PRESETS });
});

/** First-run setup — only possible while no account exists. */
app.post('/api/admin/setup', (req: Request, res: Response): any => {
  if (users.allUsers().length) {
    return res.status(409).json({ success: false, message: 'An admin account already exists. Please log in instead.' });
  }
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
  }
  const { salt, hash } = users.hashPassword(password);
  const now = new Date().toISOString();
  users.saveUsers([{
    id: 'user_master', email, name: 'Master Admin', salt, hash,
    role: 'master', permissions: [...users.PERMISSIONS], active: true, createdAt: now, updatedAt: now,
  }]);
  console.log(`[admin] Master Admin account created for ${email}`);
  return res.json({ success: true });
});

app.post('/api/admin/login', (req: Request, res: Response): any => {
  const ip = getClientIp(req);
  const rateCheck = checkLoginRateLimit(ip);
  if (!rateCheck.allowed) {
    return res.status(429).json({ success: false, message: rateCheck.message });
  }

  const { email, password } = req.body;
  const submittedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const submittedPassword = typeof password === 'string' ? password : '';

  // No accounts at all -> first-run setup. An unknown email on a site
  // that does have accounts must look exactly like a wrong password, so
  // nobody can discover which addresses are registered.
  if (!users.allUsers().length) {
    return res.status(409).json({
      success: false,
      needsSetup: true,
      message: 'No admin account exists yet. Create one on this page.',
    });
  }
  const account = users.findByEmail(submittedEmail);
  if (!account) {
    recordFailedLoginAttempt(ip);
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  const emailOk = timingSafeStringEqual(submittedEmail, account.email.toLowerCase());
  const passwordOk = users.verifyPassword(submittedPassword, account) && account.active;
  const expectedEmail = account.email;

  if (!emailOk || !passwordOk) {
    recordFailedLoginAttempt(ip);
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  clearLoginAttempts(ip);
  cleanExpiredSessions();

  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  adminSessions.set(token, { createdAt: now, expiresAt: now + SESSION_DURATION_MS, userId: account.id });
  setSessionCookie(req, res, token);

  return res.json({ success: true, email: expectedEmail, user: users.publicUser(account) });
});

app.post('/api/admin/verify-session', (req: Request, res: Response): any => {
  cleanExpiredSessions();
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE_NAME];
  const session = token ? adminSessions.get(token) : undefined;
  const valid = !!session && session.expiresAt > Date.now();
  return res.json({ valid, email: valid ? process.env.ADMIN_EMAIL : undefined });
});

app.post('/api/admin/logout', (req: Request, res: Response): any => {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE_NAME];
  if (token) adminSessions.delete(token);
  clearSessionCookie(req, res);
  return res.json({ success: true });
});

/** True only for a request carrying a valid, logged-in admin session —
 * used to keep the API-key diagnostic endpoints from being callable by
 * anyone who finds the URL (each call spends a real, metered credit on
 * a third-party service). */
/** The admin behind this request, or null. */
function currentUser(req: Request): users.AdminUser | null {
  cleanExpiredSessions();
  const token = parseCookies(req)[SESSION_COOKIE_NAME];
  const session = token ? adminSessions.get(token) : undefined;
  if (!session || session.expiresAt <= Date.now()) return null;
  const user = session.userId ? users.findById(session.userId) : users.allUsers()[0];
  return user && user.active ? user : null;
}

/**
 * Guard for a route. Checks on the SERVER, so hiding a button in the
 * dashboard is never the only thing standing between a staff account and
 * an action it is not allowed to perform.
 */
function requirePermission(permission: users.Permission) {
  return (req: Request, res: Response, next: Function): any => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'UNAUTHORIZED' });
    if (!users.hasPermission(user, permission)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: `Your account does not have the "${permission}" permission.`,
      });
    }
    return next();
  };
}

const requireMaster = (req: Request, res: Response, next: Function): any => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'UNAUTHORIZED' });
  if (!users.isMaster(user)) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Only the Master Admin can manage admin users.' });
  }
  return next();
};

function hasValidAdminSession(req: Request): boolean {
  cleanExpiredSessions();
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE_NAME];
  const session = token ? adminSessions.get(token) : undefined;
  return !!session && session.expiresAt > Date.now();
}

// Change-password is intentionally NOT supported yet: there is no
// database to persist a new password to, and silently "succeeding"
// without saving anywhere real would be dishonest. This stays disabled
// until the real database is connected, at which point it will hash
// and store the new password properly (bcrypt) instead of this stub.
app.post('/api/admin/change-password', (req: Request, res: Response): any => {
  if (!hasValidAdminSession(req)) return res.status(401).json({ success: false, message: 'Please log in again.' });

  const account = getAdminAccount();
  if (!account) return res.status(409).json({ success: false, message: 'No admin account exists yet.' });

  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');

  if (!verifyPassword(currentPassword, account)) {
    return res.status(401).json({ success: false, message: 'Your current password is incorrect.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'The new password must be at least 8 characters long.' });
  }

  const { salt, hash } = hashPassword(newPassword);
  store.write<AdminAccount>('adminAccount', { email: account.email, salt, hash, updatedAt: new Date().toISOString() });

  // Changing the password must end every other session. Otherwise someone
  // who had stolen a session would keep their access precisely when the
  // admin is trying to lock them out.
  adminSessions.clear();
  const token = crypto.randomBytes(32).toString('hex');
  adminSessions.set(token, { createdAt: Date.now(), expiresAt: Date.now() + SESSION_DURATION_MS });
  setSessionCookie(req, res, token);

  console.log('[admin] password changed — all other sessions signed out');
  return res.json({
    success: true,
    message: 'Password updated. You stay signed in here; any other device has been signed out.',
  });
});


/**
 * SSRF & Malicious URL Protection helper
 */
function isSafeUrl(inputUrl: string): boolean {
  try {
    const parsed = new URL(inputUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('172.') ||
      hostname === '169.254.169.254'
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Simple In-Memory Rate Limiter Middleware
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
// Many visitors share one public IP (mobile networks in particular), and a
// single download already costs several requests (info + file + stats), so
// a tight per-IP limit would lock out real users once the site gets busy.
const MAX_REQUESTS_PER_WINDOW = 180;
// Endpoints that carry their own protection and must not be starved by the
// shared counter: the file transfer itself and the tiny stats ping
// (capped separately at 60 per IP per hour).
const RATE_LIMIT_EXEMPT = ['/api/video/download-proxy', '/api/video/ytdlp-stream', '/api/stats/download'];

function rateLimiter(req: Request, res: Response, next: Function): any {
  if (RATE_LIMIT_EXEMPT.some((p) => req.path.startsWith(p))) return next();

  const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
  const key = Array.isArray(ip) ? ip[0] : ip;
  const now = Date.now();

  let record = requestCounts.get(key);
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
    requestCounts.set(key, record);
    return next();
  }

  record.count++;
  if (record.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP. Please wait a moment before trying again.',
      retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000),
    });
  }

  next();
}

// Apply rate limiter to all API routes
/* ------------------------------------------------------------------
 * Maintenance mode.
 *
 * The setting was saved but never enforced anywhere, so turning it on
 * changed nothing. It is now checked on the server for every public
 * request: visitors get a maintenance page, while a logged-in admin
 * keeps full access so the site can still be managed and tested.
 * ---------------------------------------------------------------- */
function maintenanceOn(): boolean {
  try {
    return !!store.read<any>('siteSettings', INITIAL_SITE_SETTINGS)?.maintenanceMode;
  } catch {
    return false;
  }
}

/** Routes an admin still needs while the site is paused. */
const MAINTENANCE_ALLOWED = ['/api/admin/', '/api/health', '/uploads/', '/assets/', '/admin'];

app.use((req: Request, res: Response, next: Function): any => {
  if (!maintenanceOn()) return next();
  if (MAINTENANCE_ALLOWED.some((p) => req.path.startsWith(p))) return next();
  if (hasValidAdminSession(req)) return next(); // admins bypass it entirely

  if (req.path.startsWith('/api/')) {
    return res.status(503).json({
      error: 'MAINTENANCE_MODE',
      title: 'We are down for maintenance',
      message: 'The downloader is paused for scheduled maintenance. Please check back shortly.',
    });
  }

  const settings = store.read<any>('siteSettings', INITIAL_SITE_SETTINGS);
  const name = String(settings?.siteName || 'This site').replace(/[<>&"]/g, '');
  res.status(503).setHeader('Retry-After', '3600');
  return res.send(`<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${name} — Under Maintenance</title>
<style>
  :root { color-scheme: light dark; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
         background:#f6f0f4; color:#2e2440; padding:24px; }
  @media (prefers-color-scheme: dark) { body { background:#0e0a17; color:#f4eefb; } .card { background:#181224 !important; border-color:#2e1d4d !important; } }
  .card { max-width:520px; width:100%; background:#fff; border:1px solid #eae3ee; border-radius:24px;
          padding:40px 32px; text-align:center; box-shadow:0 10px 40px rgba(46,36,64,.08); }
  h1 { margin:0 0 12px; font-size:24px; }
  p { margin:0 0 8px; font-size:14px; line-height:1.6; opacity:.85; }
  .dot { display:inline-block; width:10px; height:10px; border-radius:50%;
         background:linear-gradient(135deg,#6d46b8,#e6799f); margin-bottom:16px; }
</style></head>
<body><div class="card">
  <span class="dot"></span>
  <h1>${name} is under maintenance</h1>
  <p>We are making some improvements and will be back shortly.</p>
  <p>Thank you for your patience.</p>
</div></body></html>`);
});

app.use('/api/', rateLimiter);

/**
 * Health check endpoint
 */
app.get('/api/health', async (_req: Request, res: Response) => {
  const ffmpegPath = await findFfmpeg();
  await getYtdlp();
  const db = await testConnection();
  const webp = await imageProcessingAvailable();
  const mail = await mailStatus();
  res.json({
    email: mail,
    imageOptimisation: webp
      ? { available: true, note: 'Uploaded images are converted to WebP and compressed.' }
      : { available: false, note: 'sharp is not installed — images are stored as uploaded. Run "npm install sharp" on the server to enable WebP conversion.' },
    database: db.ok
      ? { connected: true, note: 'MySQL reachable — dashboard data can be stored on the server.' }
      : { connected: false, error: db.error, note: 'Set DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME (and DB_SSL=true for cloud databases).' },
    ytdlp: ytdlpStatus(),
    status: 'online',
    service: 'Social Video Downloader API (Facebook, Instagram, TikTok, Twitter/X, Pinterest, Reddit & Threads)',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    audioMuxing: ffmpegPath
      ? { available: true, ffmpeg: ffmpegPath, note: 'Videos with a separate audio track (e.g. Reddit) will download WITH sound.' }
      : { available: false, note: 'ffmpeg not found — videos with a separate audio track (e.g. Reddit) will download without sound. Run "npm install ffmpeg-static" on the server to enable it.' },
  });
});

/**
 * Diagnostic endpoint: tests the FastSaverAPI connection directly and
 * shows the full, real result right in the browser — no digging through
 * server logs needed. Visit /api/debug/fastsaver-test in a browser
 * (optionally add ?url=<a public video link> to test a specific post;
 * otherwise a public Reddit test post is used). Uses one real API credit.
 */
app.get('/api/debug/fastsaver-test', async (req: Request, res: Response): Promise<any> => {
  if (!hasValidAdminSession(req)) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Log in to /admin first, then reload this page.' });
  }
  const apiKey = process.env.FASTSAVER_API_KEY;
  if (!apiKey) {
    return res.json({
      configured: false,
      message: 'FASTSAVER_API_KEY is not set in this server\u2019s environment variables. Add it in Hostinger \u2192 your Node.js app \u2192 Environment Variables, then redeploy.',
    });
  }

  const rawTestUrl = typeof req.query.url === 'string' && req.query.url
    ? req.query.url
    : 'https://www.pinterest.com/pin/99360735500167749/';

  // FastSaverAPI's documented platform list (per their own docs) is:
  // Instagram, TikTok, Pinterest, Facebook, X/Twitter, RuTube, Likee, and
  // YouTube. Reddit, Threads, and Dailymotion are NOT supported —
  // testing one of those will always show "Invalid URL" here, which has
  // nothing to do with the API key or this server's setup.
  const unsupportedPlatformMatch =
    /reddit\.com|redd\.it/i.test(rawTestUrl) ? 'Reddit' :
    /threads\.(net|com)/i.test(rawTestUrl) ? 'Threads' :
    /dailymotion\.com|dai\.ly/i.test(rawTestUrl) ? 'Dailymotion' :
    null;
  if (unsupportedPlatformMatch) {
    return res.json({
      configured: true,
      testedUrl: rawTestUrl,
      httpOk: false,
      diagnosis: `${unsupportedPlatformMatch} is not one of the platforms FastSaverAPI supports (their documented list is Instagram, TikTok, Pinterest, Facebook, X/Twitter, RuTube, Likee, and YouTube). Testing this URL will always show "Invalid URL", regardless of whether the API key or setup is correct. To verify the key itself, test with a Pinterest, Instagram, TikTok, Facebook, or X/Twitter link instead.`,
    });
  }

  // Resolve known short-link / share-link formats first, exactly like the
  // real extractors do (Reddit's /s/, Pinterest's pin.it, TikTok's vm/vt,
  // Twitter's t.co) \u2014 otherwise this test sends FastSaverAPI a link it
  // can't follow itself and gives a misleading "Invalid URL" result that
  // has nothing to do with whether the API key or integration works.
  let testUrl = rawTestUrl;
  const needsResolution = /\/s\/[A-Za-z0-9]+/.test(rawTestUrl) || /pin\.it\//i.test(rawTestUrl) || /(vm|vt)\.tiktok\.com/i.test(rawTestUrl) || /\/\/(www\.)?t\.co\//i.test(rawTestUrl);
  let resolutionNote = 'No short-link resolution needed for this URL.';
  if (needsResolution) {
    try {
      const resolveController = new AbortController();
      const resolveTimeout = setTimeout(() => resolveController.abort(), 5000);
      const resolveRes = await fetch(rawTestUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
        redirect: 'follow',
        signal: resolveController.signal,
      });
      clearTimeout(resolveTimeout);
      const stripTrackingParams = (u: string): string => {
        try {
          const parsed = new URL(u);
          parsed.search = '';
          return parsed.toString();
        } catch {
          return u.split('?')[0];
        }
      };
      if (resolveRes.url && resolveRes.url !== rawTestUrl) {
        testUrl = stripTrackingParams(resolveRes.url);
        resolutionNote = `Resolved short-link via HTTP redirect to: ${testUrl}`;
      } else {
        // No HTTP-level redirect happened — check the page body itself for
        // a canonical URL, in case this short-link type serves an HTML
        // shell with a client-side redirect instead of a 3xx response.
        const html = await resolveRes.text();
        const canonicalMatch =
          html.match(/<link rel="canonical" href="([^"]+)"/i) ||
          html.match(/property="og:url"\s+content="([^"]+)"/i) ||
          html.match(/"permalink":"([^"]+)"/);
        if (canonicalMatch && canonicalMatch[1]) {
          const found = canonicalMatch[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/');
          const resolved = found.startsWith('http') ? found : `https://www.reddit.com${found}`;
          if (resolved !== rawTestUrl) {
            testUrl = stripTrackingParams(resolved);
            resolutionNote = `Resolved short-link via page canonical tag to: ${testUrl}`;
          } else {
            resolutionNote = 'Detected a short-link format, but no redirect or canonical URL was found (it may not actually be a redirect-based short-link).';
          }
        } else {
          resolutionNote = 'Detected a short-link format, but no redirect or canonical URL was found (it may not actually be a redirect-based short-link).';
        }
      }
    } catch (resolveErr: any) {
      resolutionNote = `Detected a short-link format, but resolving it failed: ${resolveErr?.message || String(resolveErr)}. Testing with the original URL instead.`;
    }
  }

  // Unconditionally strip tracking params right before calling
  // FastSaverAPI — even a URL that needed no short-link resolution can
  // still carry utm_source/share_id params if the user copied a "shared"
  // link directly, and FastSaverAPI rejects some of these as invalid.
  try {
    const cleaned = new URL(testUrl);
    cleaned.search = '';
    testUrl = cleaned.toString();
  } catch {
    testUrl = testUrl.split('?')[0];
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const fsRes = await fetch(`https://api.fastsaver.io/v1/fetch?url=${encodeURIComponent(testUrl)}`, {
      headers: { 'X-Api-Key': apiKey },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const rawText = await fsRes.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Response wasn't JSON — rawText below shows exactly what came back.
    }

    return res.json({
      configured: true,
      originalUrl: rawTestUrl,
      resolutionNote,
      testedUrl: testUrl,
      requestSentTo: `https://api.fastsaver.io/v1/fetch?url=${encodeURIComponent(testUrl)}`,
      httpStatus: fsRes.status,
      httpOk: fsRes.ok,
      parsedJson: parsed,
      rawResponseBody: rawText.slice(0, 1000),
      diagnosis: !fsRes.ok
        ? `Server responded with HTTP ${fsRes.status} \u2014 this usually means the API key is invalid, expired, out of credits, or (if you still see "Invalid URL") that this specific post doesn't actually contain a video. Check parsedJson/rawResponseBody above for the exact reason FastSaverAPI gave.`
        : parsed?.ok && parsed?.download_url
        ? 'SUCCESS \u2014 the key works and a real download URL was returned.'
        : 'Connected successfully, but the response shape was not what the code expects (no ok:true + download_url). See parsedJson above \u2014 share this with support so the response parsing can be corrected.',
    });
  } catch (err: any) {
    return res.json({
      configured: true,
      testedUrl: testUrl,
      error: 'Request failed before getting any response from FastSaverAPI.',
      errorDetail: err?.message || String(err),
      diagnosis: 'This usually means a network/connectivity issue reaching api.fastsaver.io from this server, or the request timed out.',
    });
  }
});

/**
 * Diagnostic endpoint: tests the SaverAPI connection directly, mirroring
 * /api/debug/fastsaver-test above. Visit /api/debug/saverapi-test in a
 * browser (optionally add ?url=<a public video link>; otherwise a public
 * Instagram test post is used). Uses one real API credit.
 */
app.get('/api/debug/saverapi-test', async (req: Request, res: Response): Promise<any> => {
  if (!hasValidAdminSession(req)) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Log in to /admin first, then reload this page.' });
  }
  const apiKey = process.env.SAVERAPI_KEY;
  if (!apiKey) {
    return res.json({
      configured: false,
      message: 'SAVERAPI_KEY is not set in this server\u2019s environment variables. Add it in Hostinger \u2192 your Node.js app \u2192 Environment Variables, then redeploy.',
    });
  }

  const testUrl = typeof req.query.url === 'string' && req.query.url
    ? req.query.url
    : 'https://www.instagram.com/reel/DPOi9V-CAqH/';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const svRes = await fetch(`https://saverapi.net/api/all-in-one-downloader-api?url=${encodeURIComponent(testUrl)}`, {
      headers: { 'x-api-key': apiKey },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const rawText = await svRes.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Response wasn't JSON — rawText below shows exactly what came back.
    }

    return res.json({
      configured: true,
      testedUrl: testUrl,
      requestSentTo: `https://saverapi.net/api/all-in-one-downloader-api?url=${encodeURIComponent(testUrl)}`,
      httpStatus: svRes.status,
      httpOk: svRes.ok,
      parsedJson: parsed,
      rawResponseBody: rawText.slice(0, 1000),
      diagnosis: !svRes.ok
        ? `Server responded with HTTP ${svRes.status} \u2014 this usually means the API key is invalid, expired, or out of credits. Check parsedJson/rawResponseBody above for the exact reason SaverAPI gave.`
        : parsed && !parsed.error && (parsed.download_url || (Array.isArray(parsed.medias) && parsed.medias.length > 0))
        ? 'SUCCESS \u2014 the key works and a real video was returned (as download_url or a medias[] list of qualities).'
        : 'Connected successfully, but the response shape was not what the code expects (error:true, or no download_url/medias). See parsedJson above.',
    });
  } catch (err: any) {
    return res.json({
      configured: true,
      testedUrl: testUrl,
      error: 'Request failed before getting any response from SaverAPI.',
      errorDetail: err?.message || String(err),
      diagnosis: 'This usually means a network/connectivity issue reaching saverapi.net from this server, or the request timed out.',
    });
  }
});

/**
 * Most sources hand back a single video stream, but the extractors have
 * historically listed it several times under different quality labels
 * (1080p / 720p / 360p) — all pointing at the exact same file, so every
 * row showed an identical size. That's misleading: the user sees three
 * choices that are really one file.
 *
 * This collapses video rows that share a download URL down to a single
 * row (keeping the highest-quality label, since that's what the file
 * actually is). An MP3 row is kept even when it shares the video's URL,
 * because the download-proxy genuinely converts it to audio-only —
 * it really is a different, smaller file.
 */
/** Parses a "MM:SS" or "HH:MM:SS" label back into seconds; 0 when the
 * duration is unknown (the "--:--" fallback). */
function parseDurationToSeconds(label?: string): number {
  if (!label || typeof label !== 'string') return 0;
  const parts = label.split(':').map((p) => parseInt(p, 10));
  if (parts.some((n) => isNaN(n))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function normalizeQualities<T extends { qualities?: any[] }>(data: T): T {
  if (!data?.qualities || !Array.isArray(data.qualities)) return data;

  const seenVideoUrls = new Set<string>();
  const out: any[] = [];

  for (const q of data.qualities) {
    if (q?.format === 'MP3') {
      // The MP3 is produced by converting the video's audio at 192 kbps,
      // so its size follows from the real duration — showing the video's
      // size here (which is what happened before) was simply wrong.
      const secs = parseDurationToSeconds((data as any)?.duration);
      const mp3Size = secs > 0 ? formatBytes(Math.round(secs * 24000)) : q.fileSizeEstimate;
      out.push({ ...q, isAudioConversion: true, fileSizeEstimate: mp3Size });
      continue;
    }
    if (!q?.downloadUrl) continue;
    if (seenVideoUrls.has(q.downloadUrl)) continue;
    seenVideoUrls.add(q.downloadUrl);
    out.push(q);
  }

  return { ...data, qualities: out };
}


app.post('/api/video/validate', (req: Request, res: Response): any => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      valid: false,
      error: 'Missing video URL in request body.',
    });
  }

  const trimmed = url.trim();
  const fbRegex = /^(https?:\/\/)?(www\.|m\.|web\.)?(facebook\.com|fb\.watch|fb\.com)\/.+$/i;
  const igRegex = /^(https?:\/\/)?(www\.)?(instagram\.com|instagr\.am)\/(p|reel|reels|tv|stories)\/.+$/i;
  const ttRegex = /^(https?:\/\/)?(www\.|vt\.|vm\.|m\.)?tiktok\.com\/.+$/i;
  const twRegex = /^(https?:\/\/)?(www\.|mobile\.)?(twitter\.com|x\.com|vxtwitter\.com|fxtwitter\.com|fixupx\.com|t\.co)\/.+$/i;
  const pinRegex = /^(https?:\/\/)?(www\.|in\.|uk\.)?(pinterest\.com|pin\.it|pinterest\.[a-z.]+)\/.+$/i;
  const rdRegex = /^(https?:\/\/)?(www\.|old\.|new\.|sh\.|m\.)?(reddit\.com|redd\.it|v\.redd\.it)\/.+$/i;
  const thRegex = /^(https?:\/\/)?(www\.)?(threads\.net|threads\.com)\/.+$/i;
  const dmRegex = /^(https?:\/\/)?(www\.)?(dailymotion\.com|dai\.ly)\/.+$/i;

  const isFb = fbRegex.test(trimmed);
  const isIg = igRegex.test(trimmed) || /instagram\.com/i.test(trimmed);
  const isTt = ttRegex.test(trimmed) || /tiktok\.com/i.test(trimmed);
  const isTw = twRegex.test(trimmed) || /twitter\.com|x\.com/i.test(trimmed);
  const isPin = pinRegex.test(trimmed) || /pinterest\.|pin\.it/i.test(trimmed);
  const isRd = rdRegex.test(trimmed) || /reddit\.com|redd\.it|v\.redd\.it/i.test(trimmed);
  const isTh = thRegex.test(trimmed) || /threads\.(?:net|com)/i.test(trimmed);
  const isDm = dmRegex.test(trimmed) || /dailymotion\.com|dai\.ly/i.test(trimmed);

  if (!isFb && !isIg && !isTt && !isTw && !isPin && !isRd && !isTh && !isDm) {
    return res.status(422).json({
      valid: false,
      error: 'Invalid URL. Please enter a valid Facebook, Instagram, TikTok, Twitter/X, Pinterest, Reddit, Threads, Dailymotion video link.',
    });
  }

  const detectedPlatform = isTt ? 'tiktok' : isTw ? 'twitter' : isPin ? 'pinterest' : isRd ? 'reddit' : isTh ? 'threads' : isDm ? 'dailymotion' : isFb ? 'facebook' : 'instagram';

  // Check if link looks like a private group or private test
  const isLikelyPrivate =
    (isFb && trimmed.includes('/groups/') && !trimmed.includes('/public')) ||
    (isIg && trimmed.includes('private_test')) ||
    (isTt && trimmed.includes('private_video')) ||
    (isTw && trimmed.includes('private_author')) ||
    (isPin && trimmed.includes('secret_board')) ||
    (isRd && (trimmed.includes('quarantined_private_sub') || trimmed.includes('secret_post'))) ||
    (isTh && trimmed.includes('private_thread'));

  return res.json({
    valid: true,
    platform: detectedPlatform,
    normalizedUrl: trimmed,
    isLikelyPrivate,
  });
});

/**
 * Video Information Extraction Endpoint
 * Extracts direct stream URLs for Facebook, Instagram, TikTok, Twitter/X, Pinterest, Reddit, or Threads
 */
app.post('/api/video/info', trackRoute('info'), async (req: Request, res: Response): Promise<any> => {
  try {
    const { url, platform } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        error: 'INVALID_URL',
        title: 'Missing URL',
        message: 'A valid Facebook, Instagram, TikTok, Twitter/X, Pinterest, Reddit, or Threads video URL is required.',
      });
    }

    const trimmedUrl = url.trim();

    if (!isSafeUrl(trimmedUrl)) {
      return res.status(400).json({
        error: 'INVALID_URL',
        title: 'Unsafe or Invalid URL',
        message: 'The provided URL is not supported or references a restricted network address.',
      });
    }

    const isTikTok =
      platform === 'tiktok' ||
      trimmedUrl.includes('tiktok.com');

    const isTwitter =
      !isTikTok && (
        platform === 'twitter' ||
        trimmedUrl.includes('twitter.com') ||
        trimmedUrl.includes('x.com') ||
        /\/\/(www\.)?t\.co\//i.test(trimmedUrl) ||
        trimmedUrl.includes('vxtwitter.com') ||
        trimmedUrl.includes('fxtwitter.com') ||
        trimmedUrl.includes('fixupx.com')
      );

    const isPinterest =
      !isTikTok && !isTwitter && (
        platform === 'pinterest' ||
        trimmedUrl.includes('pinterest.') ||
        trimmedUrl.includes('pin.it')
      );

    const isReddit =
      !isTikTok && !isTwitter && !isPinterest && (
        platform === 'reddit' ||
        trimmedUrl.includes('reddit.com') ||
        trimmedUrl.includes('redd.it') ||
        trimmedUrl.includes('v.redd.it')
      );

    const isThreads =
      !isTikTok && !isTwitter && !isPinterest && !isReddit && (
        platform === 'threads' ||
        trimmedUrl.includes('threads.net') ||
        trimmedUrl.includes('threads.com')
      );

    const isDailymotion =
      !isTikTok && !isTwitter && !isPinterest && !isReddit && !isThreads && (
        platform === 'dailymotion' ||
        trimmedUrl.includes('dailymotion.com') ||
        trimmedUrl.includes('dai.ly')
      );

    const isInstagram =
      !isTikTok && !isTwitter && !isPinterest && !isReddit && !isThreads && !isDailymotion && (
        platform === 'instagram' ||
        trimmedUrl.includes('instagram.com') ||
        trimmedUrl.includes('instagr.am')
      );

    // Check for simulated private link error handling (test samples)
    if (
      trimmedUrl.includes('/groups/secretmembersgroup/') ||
      trimmedUrl.includes('private_test') ||
      trimmedUrl.includes('secret_private_reel') ||
      trimmedUrl.includes('private_video') ||
      trimmedUrl.includes('private_author') ||
      trimmedUrl.includes('secret_board') ||
      trimmedUrl.includes('quarantined_private_sub') ||
      trimmedUrl.includes('secret_post') ||
      trimmedUrl.includes('private_thread')
    ) {
      return res.status(403).json({
        error: 'PRIVATE_VIDEO',
        title: isTikTok 
          ? 'Private TikTok Video' 
          : isTwitter
          ? 'Private Twitter / X Post'
          : isPinterest
          ? 'Private Pinterest Pin Detected'
          : isReddit
          ? 'Private Reddit Subreddit / Quarantined Post'
          : isThreads
          ? 'Private Threads Post Detected'
          : isInstagram 
          ? 'Private Instagram Post Detected' 
          : 'Private Facebook Video Detected',
        message: isTikTok
          ? 'This TikTok video is set to private by the creator. Only public videos can be downloaded.'
          : isTwitter
          ? 'This post is from a protected Twitter / X account. Only public videos can be extracted.'
          : isPinterest
          ? 'This Pin is stored on a secret board. Only publicly accessible pins can be downloaded.'
          : isReddit
          ? 'This post is inside a private or quarantined subreddit. Only publicly accessible Reddit posts can be downloaded.'
          : isThreads
          ? 'This post is from a private Threads account. Only public Threads videos can be extracted.'
          : isInstagram
          ? 'This reel or post is from a private Instagram account. Only public videos can be extracted.'
          : 'This video is hosted inside a private group or has privacy restricted to friends only.',
        tip: isTikTok
          ? 'Check that the TikTok video is publicly viewable without logging in.'
          : isTwitter
          ? 'Check that the Twitter/X user profile is not protected (publicly visible).'
          : isPinterest
          ? 'Check that the Pinterest board is public (viewable in an incognito window).'
          : isReddit
          ? 'Check that the subreddit and post are public (viewable in an incognito browser).'
          : isThreads
          ? 'Verify that the Threads profile is public (accessible in an incognito browser).'
          : isInstagram
          ? 'Check that the Instagram profile is public (viewable in an incognito window).'
          : 'Ensure the Facebook video privacy is set to Public (Globe icon), or open the post link directly.',
      });
    }

    if (isTikTok) {
      try {
        const extracted = await extractTikTokVideo(trimmedUrl);
        return res.json({ success: true, data: normalizeQualities(extracted) });
      } catch (ttErr: any) {
        console.warn('TikTok extraction failed:', ttErr);
        return res.status(502).json({
          error: 'SERVER_ERROR',
          title: ttErr?.title || 'Couldn\u2019t Fetch This TikTok Video',
          message: ttErr?.message || 'TikTok is currently blocking this extraction attempt, or the video may not be available.',
          tip: ttErr?.tip || 'Please try again in a moment, or verify the link opens correctly in an incognito window.',
        });
      }
    }

    if (isTwitter) {
      try {
        const extracted = await extractTwitterVideo(trimmedUrl);
        return res.json({ success: true, data: normalizeQualities(extracted) });
      } catch (twErr: any) {
        console.warn('Twitter extraction failed:', twErr);
        return res.status(502).json({
          error: 'SERVER_ERROR',
          title: twErr?.title || 'Couldn\u2019t Fetch This X/Twitter Video',
          message: twErr?.message || 'X is currently blocking this extraction attempt, or the post may not contain a video.',
          tip: twErr?.tip || 'Please try again in a moment, or verify the link opens correctly in an incognito window.',
        });
      }
    }

    if (isPinterest) {
      try {
        const extracted = await extractPinterestVideo(trimmedUrl);
        return res.json({ success: true, data: normalizeQualities(extracted) });
      } catch (pinErr: any) {
        console.warn('Pinterest extraction failed:', pinErr);
        // Honest failure — see the Instagram handler above for why we no
        // longer substitute an unrelated generic sample video here.
        return res.status(502).json({
          error: 'SERVER_ERROR',
          title: pinErr?.title || 'Couldn\u2019t Fetch This Pinterest Video',
          message: pinErr?.message || 'Pinterest is currently blocking this extraction attempt, or the Pin may not contain a video.',
          tip: pinErr?.tip || 'Please try again in a moment, or verify the link opens correctly in an incognito window.',
        });
      }
    }

    if (isReddit) {
      try {
        const extracted = await extractRedditVideo(trimmedUrl);
        return res.json({ success: true, data: normalizeQualities(extracted) });
      } catch (rdErr: any) {
        console.warn('Reddit extraction failed:', rdErr);
        // Honest failure — see the Instagram handler above for why we no
        // longer substitute an unrelated generic sample video here.
        return res.status(502).json({
          error: 'SERVER_ERROR',
          title: rdErr?.title || 'Couldn\u2019t Fetch This Reddit Video',
          message: rdErr?.message || 'Reddit is currently blocking this extraction attempt, or the post may not contain a video.',
          tip: rdErr?.tip || 'Please try again in a moment, or verify the link opens correctly in an incognito window.',
        });
      }
    }

    if (isThreads) {
      try {
        const extracted = await extractThreadsVideo(trimmedUrl);
        return res.json({ success: true, data: normalizeQualities(extracted) });
      } catch (thErr: any) {
        console.warn('Threads extraction failed:', thErr);
        return res.status(502).json({
          error: 'SERVER_ERROR',
          title: thErr?.title || 'Couldn\u2019t Fetch This Threads Video',
          message: thErr?.message || 'Threads is currently blocking this extraction attempt, or the post may not contain a video.',
          tip: thErr?.tip || 'Please try again in a moment, or verify the link opens correctly in an incognito window.',
        });
      }
    }

    if (isDailymotion) {
      try {
        const extracted = await extractDailymotionVideo(trimmedUrl);
        return res.json({ success: true, data: normalizeQualities(extracted) });
      } catch (dmErr: any) {
        console.warn('Dailymotion extraction failed:', dmErr);
        return res.status(502).json({
          error: 'SERVER_ERROR',
          title: dmErr?.title || 'Couldn\u2019t Fetch This Dailymotion Video',
          message: dmErr?.message || 'Dailymotion is currently blocking this extraction attempt, or the video may not be available.',
          tip: dmErr?.tip || 'Please try again in a moment, or verify the link opens correctly in an incognito window.',
        });
      }
    }

    if (isInstagram) {
      try {
        const extracted = await extractInstagramVideo(trimmedUrl);
        return res.json({ success: true, data: normalizeQualities(extracted) });
      } catch (igErr: any) {
        if (igErr && igErr.code === 'PRIVATE_VIDEO') {
          return res.status(403).json({
            error: 'PRIVATE_VIDEO',
            title: igErr.title || 'Private Instagram Post Detected',
            message: igErr.message || 'This reel or post is from a private Instagram account. Only public videos can be extracted.',
            tip: igErr.tip || 'Verify that the Instagram profile is public (accessible in an incognito window).',
          });
        }
        console.warn('Instagram extraction failed:', igErr);
        // Honest failure — Instagram actively blocks non-official scraping,
        // so extraction can genuinely fail even for valid public links. We
        // used to substitute an unrelated generic sample video here and
        // report "success" — that meant people downloaded the wrong video
        // and had no idea why. A clear error is far better than that.
        return res.status(502).json({
          error: 'SERVER_ERROR',
          title: igErr?.title || 'Couldn\u2019t Fetch This Instagram Video',
          message: igErr?.message || 'Instagram is currently blocking this extraction attempt, or the post may have been removed. This is a known limitation with Instagram specifically.',
          tip: igErr?.tip || 'Please try again in a moment, or verify the link opens correctly in an incognito window.',
        });
      }
    } else {
      // Facebook extraction
      try {
        const extracted = await extractFacebookVideo(trimmedUrl);
        return res.json({ success: true, data: normalizeQualities(extracted) });
      } catch (extractErr: any) {
        if (extractErr && extractErr.code === 'PRIVATE_VIDEO') {
          return res.status(403).json({
            error: 'PRIVATE_VIDEO',
            title: extractErr.title || 'Private Facebook Video Detected',
            message: extractErr.message || 'This video is hosted inside a private group or has privacy restricted to friends only.',
            tip: extractErr.tip || 'Verify that the video is public and accessible in an incognito window.',
          });
        }

        console.warn('Facebook extraction failed:', extractErr);
        // Next: yt-dlp (free, self-hosted) before the paid APIs.
        const ytResult = await extractViaYtdlp(trimmedUrl, 'facebook');
        if (ytResult) return res.json({ success: true, data: normalizeQualities(ytResult) });
        // Try FastSaverAPI as a last resort before giving up honestly.
        const apiKey = process.env.FASTSAVER_API_KEY;
        if (!apiKey) {
          console.warn('[FastSaverAPI] Skipped: FASTSAVER_API_KEY is not set in environment variables.');
        }
        if (apiKey) {
          try {
            // Strip tracking query params — FastSaverAPI's URL validation
            // rejects some of these as "Invalid URL" even though the
            // underlying link is completely valid.
            let cleanFbUrl = trimmedUrl;
            try {
              const cleaned = new URL(trimmedUrl);
              cleaned.search = '';
              cleanFbUrl = cleaned.toString();
            } catch {
              cleanFbUrl = trimmedUrl.split('?')[0];
            }
            const fsController = new AbortController();
            const fsTimeout = setTimeout(() => fsController.abort(), 6000);
            const fsRes = await fetch(`https://api.fastsaver.io/v1/fetch?url=${encodeURIComponent(cleanFbUrl)}`, {
              headers: { 'X-Api-Key': apiKey },
              signal: fsController.signal,
            });
            clearTimeout(fsTimeout);
            if (!fsRes.ok) {
              const bodyText = await fsRes.text().catch(() => '');
              console.warn(`[FastSaverAPI] HTTP ${fsRes.status} for ${trimmedUrl}: ${bodyText.slice(0, 300)}`);
            }
            if (fsRes.ok) {
              const fsData: any = await fsRes.json();
              if (!fsData?.ok || !fsData.download_url) {
                console.warn(`[FastSaverAPI] No usable download_url in response for ${trimmedUrl}: ${JSON.stringify(fsData).slice(0, 300)}`);
              } else if (!looksLikeLegitimateMediaUrl(fsData.download_url, 'facebook')) {
                console.warn(`[FastSaverAPI] Rejected suspicious URL for ${trimmedUrl}: ${fsData.download_url}`);
              }
              if (fsData?.ok && fsData.download_url && looksLikeLegitimateMediaUrl(fsData.download_url, 'facebook')) {
                const isReel = trimmedUrl.includes('reel');
                const fsSizeByUrl = await getSizesForUrls([fsData.download_url]);
                const fsSize = fsSizeByUrl[fsData.download_url] || 'Size unavailable';
                return res.json({
                  success: true,
                  data: {
                    id: `fb_vid_${Date.now()}`,
                    originalUrl: trimmedUrl,
                    canonicalUrl: trimmedUrl,
                    platform: 'facebook',
                    title: fsData.caption || (isReel ? 'Facebook Reel Video' : 'Facebook Video'),
                    authorName: 'Facebook Creator',
                    duration: isReel ? '00:55' : '02:15',
                    thumbnailUrl: fsData.thumbnail_url || 'https://images.unsplash.com/photo-1516251193007-45ef944ab0c6?w=800&auto=format&fit=crop&q=80',
                    viewsCount: 'Public Stream',
                    fetchedAt: Date.now(),
                    qualities: [
                      {
                        id: 'q_1080p',
                        quality: '1080p (Full HD)',
                        resolution: isReel ? '1080x1920' : '1920x1080',
                        format: 'MP4',
                        fileSizeEstimate: fsSize,
                        downloadUrl: fsData.download_url,
                        isHd: true,
                        hasAudio: true,
                      },
                      {
                        id: 'q_mp3',
                        quality: 'Audio (MP3)',
                        resolution: '192 kbps',
                        format: 'MP3',
                        fileSizeEstimate: fsSize,
                        downloadUrl: fsData.download_url,
                        isHd: false,
                        hasAudio: true,
                      },
                    ],
                  },
                });
              }
            }
          } catch (fsErr) {
            console.warn('FastSaverAPI (Facebook) strategy skipped:', fsErr);
          }
        }

        // Third attempt: SaverAPI (a second, independent hosted API).
        const svResult = await extractViaSaverApi(trimmedUrl, 'facebook');
        if (svResult?.videoUrl) {
          const isReel = trimmedUrl.includes('reel');
          const svSizeByUrl = await getSizesForUrls([svResult.videoUrl]);
          const svSize = svSizeByUrl[svResult.videoUrl] || 'Size unavailable';
          return res.json({
            success: true,
            data: {
              id: `fb_vid_${Date.now()}`,
              originalUrl: trimmedUrl,
              canonicalUrl: trimmedUrl,
              platform: 'facebook',
              title: svResult.caption || (isReel ? 'Facebook Reel Video' : 'Facebook Video'),
              authorName: 'Facebook Creator',
              duration: isReel ? '00:55' : '02:15',
              thumbnailUrl: svResult.thumbnail || 'https://images.unsplash.com/photo-1516251193007-45ef944ab0c6?w=800&auto=format&fit=crop&q=80',
              viewsCount: 'Public Stream',
              fetchedAt: Date.now(),
              qualities: [
                {
                  id: 'q_1080p',
                  quality: '1080p (Full HD)',
                  resolution: isReel ? '1080x1920' : '1920x1080',
                  format: 'MP4',
                  fileSizeEstimate: svSize,
                  downloadUrl: svResult.videoUrl,
                  isHd: true,
                  hasAudio: true,
                },
                {
                  id: 'q_mp3',
                  quality: 'Audio (MP3)',
                  resolution: '192 kbps',
                  format: 'MP3',
                  fileSizeEstimate: svSize,
                  downloadUrl: svResult.videoUrl,
                  isHd: false,
                  hasAudio: true,
                },
              ],
            },
          });
        }

        // Honest failure — no real video was found by either method, so
        // we no longer substitute an unrelated generic sample video here.
        return res.status(502).json({
          error: 'SERVER_ERROR',
          title: 'Couldn\u2019t Fetch This Facebook Video',
          message: 'Facebook is currently blocking this extraction attempt, or the video may have been removed or set to private.',
          tip: 'Please try again in a moment, or verify the link opens correctly in an incognito window.',
        });
      }
    }
  } catch (error: any) {
    console.error('Server error processing video:', error);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      title: 'Server Error',
      message: 'An unexpected error occurred while communicating with the video stream server.',
    });
  }
});

/**
 * Direct Download Streaming Proxy
 * Pipes the video bytes directly to bypass cross-origin / referer restrictions,
 * and sets attachment headers so browsers trigger automatic file save dialogs.
 */
/** Downloads every segment of a segment list and concatenates them.
 * fMP4/CMAF segments (init segment + .m4s fragments) are designed to be
 * played back this way when joined in order — no re-encoding needed. */
async function fetchSegments(segmentUrls: string[], headers: Record<string, string>): Promise<Buffer> {
  const buffers: Buffer[] = [];
  const concurrency = 6;
  for (let i = 0; i < segmentUrls.length; i += concurrency) {
    const batch = segmentUrls.slice(i, i + concurrency);
    const batchBuffers = await Promise.all(
      batch.map(async (url) => {
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(`Failed to fetch HLS segment (HTTP ${res.status}): ${url}`);
        return Buffer.from(await res.arrayBuffer());
      })
    );
    buffers.push(...batchBuffers);
  }
  return Buffer.concat(buffers);
}

/** Builds a single playable file from an HLS stream. When the stream
 * carries audio as a separate rendition (Reddit does this), both tracks
 * are downloaded and muxed together — joining only the video track is
 * what produced silent downloads before. */
async function fetchAndConcatenateHls(manifestUrl: string, headers: Record<string, string>): Promise<Buffer> {
  const { video, audio } = await resolveHlsTracks(manifestUrl, headers);
  const videoBuf = await fetchSegments(video, headers);

  if (audio.length === 0) return videoBuf;

  if (!(await canMux())) {
    console.warn('[download-proxy] Stream has a separate audio track but ffmpeg is unavailable — returning video only (no sound).');
    return videoBuf;
  }

  try {
    const audioBuf = await fetchSegments(audio, headers);
    return await muxAudioVideo(videoBuf, audioBuf);
  } catch (err) {
    console.warn('[download-proxy] Audio/video mux failed, returning video-only:', err);
    return videoBuf;
  }
}

/* ------------------------------------------------------------------
 * Admin users (Master Admin only).
 *
 * The Master Admin can add staff accounts and give each one exactly the
 * permissions it needs. The Master account itself can never be demoted,
 * deactivated or deleted — otherwise the site could be locked out of
 * its own dashboard.
 * ---------------------------------------------------------------- */
app.get('/api/admin/users', requireMaster, (_req: Request, res: Response): any => {
  return res.json({
    users: users.allUsers().map(users.publicUser),
    allPermissions: users.PERMISSIONS,
    rolePresets: users.ROLE_PRESETS,
  });
});

app.post('/api/admin/users', requireMaster, (req: Request, res: Response): any => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const name = String(req.body?.name || '').trim().slice(0, 80);
  const password = String(req.body?.password || '');
  const role = String(req.body?.role || 'custom');
  const requested: string[] = Array.isArray(req.body?.permissions) ? req.body.permissions : [];

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  if (!name) return res.status(400).json({ success: false, message: 'Please enter a name for this admin.' });
  if (password.length < 8) return res.status(400).json({ success: false, message: 'The password must be at least 8 characters long.' });
  if (users.findByEmail(email)) return res.status(409).json({ success: false, message: 'An admin with that email already exists.' });
  if (role === 'master') return res.status(400).json({ success: false, message: 'There can only be one Master Admin.' });

  const permissions = requested.filter((p) => (users.PERMISSIONS as readonly string[]).includes(p)) as users.Permission[];
  const { salt, hash } = users.hashPassword(password);
  const now = new Date().toISOString();
  const list = users.allUsers();
  list.push({
    id: `user_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    email, name, salt, hash, role, permissions, active: true, createdAt: now, updatedAt: now,
  });
  users.saveUsers(list);
  console.log(`[users] added admin ${email} (${role}) with ${permissions.length} permission(s)`);
  return res.json({ success: true });
});

app.patch('/api/admin/users/:id', requireMaster, (req: Request, res: Response): any => {
  const list = users.allUsers();
  const user = list.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'Admin not found.' });
  if (users.isMaster(user)) {
    // Permissions and status of the Master Admin are fixed by design.
    if (req.body?.name) user.name = String(req.body.name).slice(0, 80);
    if (req.body?.password) {
      if (String(req.body.password).length < 8) return res.status(400).json({ success: false, message: 'The password must be at least 8 characters long.' });
      Object.assign(user, users.hashPassword(String(req.body.password)));
    }
    user.updatedAt = new Date().toISOString();
    users.saveUsers(list);
    return res.json({ success: true, user: users.publicUser(user) });
  }

  if (req.body?.name !== undefined) user.name = String(req.body.name).slice(0, 80);
  if (req.body?.role !== undefined && req.body.role !== 'master') user.role = String(req.body.role);
  if (Array.isArray(req.body?.permissions)) {
    user.permissions = req.body.permissions.filter((p: string) => (users.PERMISSIONS as readonly string[]).includes(p));
  }
  if (req.body?.active !== undefined) user.active = !!req.body.active;
  if (req.body?.password) {
    if (String(req.body.password).length < 8) return res.status(400).json({ success: false, message: 'The password must be at least 8 characters long.' });
    Object.assign(user, users.hashPassword(String(req.body.password)));
  }
  user.updatedAt = new Date().toISOString();
  users.saveUsers(list);
  return res.json({ success: true, user: users.publicUser(user) });
});

app.delete('/api/admin/users/:id', requireMaster, (req: Request, res: Response): any => {
  const list = users.allUsers();
  const user = list.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'Admin not found.' });
  if (users.isMaster(user)) return res.status(400).json({ success: false, message: 'The Master Admin account cannot be deleted.' });
  users.saveUsers(list.filter((u) => u.id !== user.id));
  console.log(`[users] removed admin ${user.email}`);
  return res.json({ success: true });
});

/* ------------------------------------------------------------------
 * Contact messages — stored on the SERVER so a visitor's message
 * actually reaches the admin (it used to be saved in the visitor's own
 * browser, where the admin could never see it).
 * ---------------------------------------------------------------- */

type StoredMessage = {
  id: string; name: string; email: string; topic: string; topicLabel: string;
  message: string; status: 'unread' | 'read' | 'replied' | 'archived';
  createdAt: string; readAt?: string; replyNotes?: string; repliedAt?: string; userAgent?: string;
};

const MESSAGES = 'messages';
const recentSenders = new Map<string, number>();

app.post('/api/contact', (req: Request, res: Response): any => {
  const { name, email, topic, topicLabel, message } = req.body || {};
  const clean = (v: any, max: number) => String(v ?? '').trim().slice(0, max);
  const n = clean(name, 120), e = clean(email, 160), m = clean(message, 5000);

  if (!n || !e || !m) return res.status(400).json({ success: false, error: 'Name, email and message are required.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });

  // Light flood protection: one message per sender per 30 seconds.
  const key = `${req.ip}|${e.toLowerCase()}`;
  const now = Date.now();
  for (const [k, t] of recentSenders) if (now - t > 60000) recentSenders.delete(k);
  if (now - (recentSenders.get(key) || 0) < 30000) {
    return res.status(429).json({ success: false, error: 'Please wait a moment before sending another message.' });
  }
  recentSenders.set(key, now);

  const entry: StoredMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: n, email: e,
    topic: clean(topic, 40) || 'general',
    topicLabel: clean(topicLabel, 80) || 'General Inquiry',
    message: m,
    status: 'unread',
    createdAt: new Date().toISOString(),
    userAgent: clean(req.headers['user-agent'], 200),
  };

  const all = store.read<StoredMessage[]>(MESSAGES, []);
  store.write(MESSAGES, [entry, ...all].slice(0, 5000));
  console.log(`[contact] new message from ${e}`);
  return res.json({ success: true, messageId: entry.id });
});

/** Admin-only message list and actions. */
app.get('/api/admin/messages', requirePermission('messages.view'), (req: Request, res: Response): any => {
  if (!hasValidAdminSession(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });
  return res.json({ messages: store.read<StoredMessage[]>(MESSAGES, []) });
});

app.patch('/api/admin/messages/:id', requirePermission('messages.manage'), (req: Request, res: Response): any => {
  if (!hasValidAdminSession(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const { status, replyNotes } = req.body || {};
  const all = store.read<StoredMessage[]>(MESSAGES, []);
  const msg = all.find((x) => x.id === req.params.id);
  if (!msg) return res.status(404).json({ error: 'NOT_FOUND' });
  if (status) {
    msg.status = status;
    if (status === 'read' && !msg.readAt) msg.readAt = new Date().toISOString();
    if (status === 'replied') msg.repliedAt = new Date().toISOString();
  }
  if (replyNotes !== undefined) msg.replyNotes = String(replyNotes).slice(0, 2000);
  store.write(MESSAGES, all);
  return res.json({ success: true, message: msg });
});

app.delete('/api/admin/messages/:id', requirePermission('messages.manage'), (req: Request, res: Response): any => {
  if (!hasValidAdminSession(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const all = store.read<StoredMessage[]>(MESSAGES, []);
  store.write(MESSAGES, all.filter((x) => x.id !== req.params.id));
  return res.json({ success: true });
});

/* ------------------------------------------------------------------
 * Admin profile (display name and avatar). Stored on the server so the
 * avatar survives a redeploy and a different browser.
 * ---------------------------------------------------------------- */
app.get('/api/admin/profile', (req: Request, res: Response): any => {
  if (!hasValidAdminSession(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });
  return res.json({ profile: store.read<any>('adminProfile', null) });
});

app.put('/api/admin/profile', (req: Request, res: Response): any => {
  if (!hasValidAdminSession(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const p = req.body?.profile || {};
  store.write('adminProfile', {
    name: String(p.name || '').slice(0, 80),
    email: String(p.email || '').slice(0, 160),
    avatar: String(p.avatar || '').slice(0, 500),
  });
  return res.json({ success: true });
});

/* ------------------------------------------------------------------
 * Blog comments.
 *
 * Comments used to be kept in the commenter's own browser, so the admin
 * never received them and an approved comment was visible to nobody but
 * the admin. They now live on the server with a real moderation flow:
 * pending -> approved / rejected, and only approved ones are public.
 * ---------------------------------------------------------------- */
const COMMENTS = 'blogComments';
type Comment = {
  id: string; postId: string; postTitle?: string; postSlug?: string;
  authorName: string; authorEmail: string; website?: string; content: string;
  createdAt: string; status: 'pending' | 'approved' | 'rejected';
};

const commentLimiter = new Map<string, number>();

/** Public: approved comments for one post. */
app.get('/api/blog/:postId/comments', (req: Request, res: Response): any => {
  const list = store.read<Comment[]>(COMMENTS, [])
    .filter((c) => c.postId === req.params.postId && c.status === 'approved')
    .map(({ authorEmail, ...safe }) => safe); // never expose commenters' emails
  return res.json({ comments: list });
});

/** Public: submit a comment. It is held for moderation. */
app.post('/api/blog/:postId/comments', (req: Request, res: Response): any => {
  const clean = (v: any, max: number) => String(v ?? '').trim().slice(0, max);
  const authorName = clean(req.body?.authorName, 80);
  const authorEmail = clean(req.body?.authorEmail, 160).toLowerCase();
  const content = clean(req.body?.content, 4000);
  const website = clean(req.body?.website, 200);

  if (!authorName || !content) return res.status(400).json({ success: false, error: 'Please enter your name and a comment.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authorEmail)) return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });

  const ip = String(req.ip || 'unknown');
  const now = Date.now();
  for (const [k, t] of commentLimiter) if (now - t > 300000) commentLimiter.delete(k);
  if (now - (commentLimiter.get(ip) || 0) < 30000) {
    return res.status(429).json({ success: false, error: 'Please wait a moment before posting another comment.' });
  }

  const all = store.read<Comment[]>(COMMENTS, []);
  // Ignore an identical comment resent on the same post (double-click, refresh).
  if (all.some((c) => c.postId === req.params.postId && c.authorEmail === authorEmail && c.content === content)) {
    return res.json({ success: true, duplicate: true });
  }
  commentLimiter.set(ip, now);

  const post = allPosts().find((p) => p.id === req.params.postId);
  const comment: Comment = {
    id: `cmt_${now}_${Math.random().toString(36).slice(2, 6)}`,
    postId: req.params.postId,
    postTitle: post?.title,
    postSlug: post?.slug,
    authorName, authorEmail, website, content,
    createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    status: 'pending',
  };
  store.write(COMMENTS, [comment, ...all].slice(0, 20000));
  console.log(`[comment] pending from ${authorEmail} on "${post?.title || req.params.postId}"`);
  return res.json({ success: true });
});

/** Admin: every comment, including emails, for moderation. */
app.get('/api/admin/comments', requirePermission('comments.view'), (req: Request, res: Response): any => {
  if (!hasValidAdminSession(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });
  return res.json({ comments: store.read<Comment[]>(COMMENTS, []) });
});

app.patch('/api/admin/comments/:id', requirePermission('comments.approve'), (req: Request, res: Response): any => {
  if (!hasValidAdminSession(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const status = String(req.body?.status || '');
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Unknown status.' });
  }
  const all = store.read<Comment[]>(COMMENTS, []);
  const comment = all.find((c) => c.id === req.params.id);
  if (!comment) return res.status(404).json({ success: false, error: 'Comment not found.' });
  comment.status = status as Comment['status'];
  store.write(COMMENTS, all);
  return res.json({ success: true, comment });
});

app.delete('/api/admin/comments/:id', requirePermission('comments.delete'), (req: Request, res: Response): any => {
  if (!hasValidAdminSession(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });
  store.write(COMMENTS, store.read<Comment[]>(COMMENTS, []).filter((c) => c.id !== req.params.id));
  return res.json({ success: true });
});

/* ------------------------------------------------------------------
 * Image uploads — used by the cover image, inline post images and
 * avatars. Admin only, since these write files to the server.
 * ---------------------------------------------------------------- */
// A file bigger than the body limit makes Express reply with an HTML
// error page, which looks broken in the dashboard. Answer in JSON.
app.use((err: any, _req: Request, res: Response, next: Function): any => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ ok: false, error: 'That image is too large. Please choose one under 5 MB.' });
  }
  return next(err);
});

// Uploaded images, served read-only with long-lived caching.
// nosniff (and "download" for Office files / ZIPs) keeps any uploaded file
// from being treated as a web page.
app.use('/uploads', express.static(uploadsDir(), { maxAge: '30d', index: false, setHeaders: uploadHeaders }));

/**
 * Media Library upload: any supported file type, sent as the raw request
 * body with its name in X-File-Name, so large files stream to disk and the
 * browser can show progress. Saved to /uploads/<year>/<month>/.
 */
app.post('/api/admin/media/upload', requirePermission('media.manage'), async (req: Request, res: Response): Promise<any> => {
  if (!hasValidAdminSession(req)) return res.status(401).json({ ok: false, error: 'Please log in again.' });
  const result = await handleMediaUpload(req, currentUser(req)?.email);
  if (!result.ok) return res.status(result.status).json({ ok: false, error: result.error });
  console.log(`[media] saved ${result.file.url} (${result.file.category}, ${Math.round(result.file.bytes / 1024)} KB)`);
  return res.json({ ok: true, file: result.file });
});

app.post('/api/admin/upload', requirePermission('media.manage'), async (req: Request, res: Response): Promise<any> => {
  if (!hasValidAdminSession(req)) return res.status(401).json({ ok: false, error: 'Please log in again.' });
  const result = await saveImage(req.body?.dataUrl, req.body?.hint || 'image');
  if (!result.ok) return res.status(400).json(result);
  const saved = result.originalBytes ? Math.max(0, Math.round((1 - result.bytes / result.originalBytes) * 100)) : 0;
  console.log(`[upload] saved ${result.name} — ${Math.round(result.originalBytes / 1024)} KB to ${Math.round(result.bytes / 1024)} KB (${saved}% smaller)`);
  return res.json(result);
});

app.delete('/api/admin/upload', requirePermission('media.manage'), async (req: Request, res: Response): Promise<any> => {
  if (!hasValidAdminSession(req)) return res.status(401).json({ ok: false });
  const url = String(req.query.url || '');
  const ok = await deleteImage(url);
  if (ok) forgetMediaFile(url);
  return res.json({ ok });
});

/* ------------------------------------------------------------------
 * Site settings and landing content — on the SERVER, because these
 * decide what every visitor sees. Kept in the admin's browser they only
 * ever changed that one browser.
 * ---------------------------------------------------------------- */
const SETTINGS = 'siteSettings';
const CONTENT = 'landingContent';

/** Public: what the site should display. */
app.get('/api/site-config', (_req: Request, res: Response): any => {
  return res.json({
    siteSettings: store.read<any>(SETTINGS, INITIAL_SITE_SETTINGS),
    landingContent: store.read<any>(CONTENT, INITIAL_LANDING_CONTENT),
    sitePages: store.read<any>('sitePages', INITIAL_SITE_PAGES),
    // Machine translations of the admin's page text, by language.
    pageTranslations: readTranslations(),
  });
});

app.put('/api/admin/site-settings', requirePermission('settings.edit'), (req: Request, res: Response): any => {
  if (!hasValidAdminSession(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });
  if (!req.body?.siteSettings) return res.status(400).json({ success: false });
  store.write(SETTINGS, req.body.siteSettings);
  return res.json({ success: true });
});

/** About Us and Contact page content, edited from the dashboard. */
app.put('/api/admin/site-pages', requirePermission('settings.edit'), (req: Request, res: Response): any => {
  if (!req.body?.sitePages) return res.status(400).json({ success: false });
  store.write('sitePages', req.body.sitePages);
  // Translate any new text into every site language, in the background.
  void syncPageTranslations();
  return res.json({ success: true });
});

/** Content Editor -> Translations: the page text and its translations. */
app.get('/api/admin/page-translations', requirePermission('settings.edit'), (_req: Request, res: Response): any => {
  return res.json(translationsForEditor());
});

/** Saves the admin's own corrections for one language ({ lang, changes: { text: value | null } }). */
app.put('/api/admin/page-translations', requirePermission('settings.edit'), (req: Request, res: Response): any => {
  const { lang, changes } = req.body || {};
  if (typeof lang !== 'string' || !changes || typeof changes !== 'object') return res.status(400).json({ success: false });
  try {
    const saved = saveTranslationEdits(lang, changes);
    // A correction that was removed needs its machine version back.
    void syncPageTranslations();
    return res.json({ success: true, saved });
  } catch {
    return res.status(400).json({ success: false });
  }
});

app.put('/api/admin/landing-content', requirePermission('settings.edit'), (req: Request, res: Response): any => {
  if (!hasValidAdminSession(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });
  if (!req.body?.landingContent) return res.status(400).json({ success: false });
  store.write(CONTENT, req.body.landingContent);
  // New hero / FAQ text gets translated into every language, in the background.
  void syncPageTranslations();
  return res.json({ success: true });
});

/* ------------------------------------------------------------------
 * Newsletter subscribers — kept on the SERVER, so every visitor who
 * subscribes ends up on one list the admin can actually see and export.
 * ---------------------------------------------------------------- */
const SUBS = 'subscribers';
/** pending_verification -> verified (by clicking the emailed link) -> unsubscribed */
type Subscriber = {
  id: string; email: string; subscribedAt: string;
  status: 'pending_verification' | 'verified' | 'unsubscribed' | 'active';
  source: string;
  token?: string; tokenExpiresAt?: number; verifiedAt?: string; unsubscribedAt?: string;
};

const subLimiter = new Map<string, number>();
const VERIFY_WINDOW_MS = 48 * 60 * 60 * 1000;

const newToken = () => crypto.randomBytes(24).toString('hex');

function verificationEmail(origin: string, siteName: string, token: string) {
  const link = `${origin}/api/newsletter/verify?token=${token}`;
  return {
    subject: `Confirm your subscription to ${siteName}`,
    text: `Please confirm your subscription to ${siteName} by opening this link:\n\n${link}\n\nThe link works for 48 hours. If you did not request this, simply ignore this email.`,
    html: `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#2e2440">
      <h2 style="margin:0 0 12px">Confirm your subscription</h2>
      <p style="font-size:14px;line-height:1.6">Tap the button to confirm you want updates from <b>${siteName}</b>.</p>
      <p style="margin:24px 0"><a href="${link}" style="background:linear-gradient(135deg,#6d46b8,#e6799f);color:#fff;text-decoration:none;padding:12px 22px;border-radius:12px;font-weight:700;display:inline-block">Confirm subscription</a></p>
      <p style="font-size:12px;color:#726c85">The link works for 48 hours. If you did not request this, simply ignore this email.</p>
    </div>`,
    link,
  };
}

/**
 * Newsletter signup with double opt-in: an address only becomes an active
 * subscriber after the person opens the link sent to that inbox. Format
 * checks alone prove nothing about whether a mailbox exists.
 */
app.post('/api/subscribe', async (req: Request, res: Response): Promise<any> => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const source = String(req.body?.source || 'Website').slice(0, 60);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
  }
  if (isDisposableEmail(email)) {
    return res.status(400).json({ success: false, error: 'Temporary or disposable email addresses are not accepted.' });
  }

  const ip = String(req.ip || 'unknown');
  const now = Date.now();
  for (const [k, t] of subLimiter) if (now - t > 60000) subLimiter.delete(k);
  if (now - (subLimiter.get(ip) || 0) < 10000) {
    return res.status(429).json({ success: false, error: 'Please wait a moment before subscribing again.' });
  }
  subLimiter.set(ip, now);

  const all = store.read<Subscriber[]>(SUBS, []);
  const existing = all.find((s) => s.email.toLowerCase() === email);
  if (existing && (existing.status === 'verified' || existing.status === 'active')) {
    return res.json({ success: false, error: 'This email is already subscribed.' });
  }

  const token = newToken();
  const entry: Subscriber = existing || {
    id: `sub_${now}_${Math.random().toString(36).slice(2, 6)}`,
    email,
    subscribedAt: new Date(now).toISOString().slice(0, 16).replace('T', ' '),
    status: 'pending_verification',
    source,
  };
  entry.status = 'pending_verification';
  entry.token = token;
  entry.tokenExpiresAt = now + VERIFY_WINDOW_MS;
  entry.source = source;
  store.write(SUBS, existing ? all : [entry, ...all].slice(0, 100000));

  const settings = store.read<any>('siteSettings', INITIAL_SITE_SETTINGS);
  const origin = `${req.protocol}://${req.get('host')}`;
  const mail = verificationEmail(origin, settings?.siteName || 'our newsletter', token);
  const result = await sendMail(email, mail.subject, mail.html, mail.text);

  if (!result.sent) {
    console.warn(`[subscribe] ${email} is pending, but no verification email could be sent: ${result.error}`);
    return res.json({
      success: true,
      pending: true,
      emailSent: false,
      message: 'Thanks! Your subscription is saved but still needs confirmation — the site cannot send email yet.',
    });
  }

  console.log(`[subscribe] verification sent to ${email}`);
  return res.json({
    success: true,
    pending: true,
    emailSent: true,
    message: 'Almost done — please open the confirmation link we just emailed you.',
  });
});

/** The link from the email. Single use, and it expires. */
app.get('/api/newsletter/verify', (req: Request, res: Response): any => {
  const token = String(req.query.token || '');
  const all = store.read<Subscriber[]>(SUBS, []);
  const sub = token ? all.find((s) => s.token === token) : undefined;

  const page = (title: string, message: string, ok: boolean) =>
    res.status(ok ? 200 : 400).send(`<!doctype html><html lang="en"><head><meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
      <title>${title}</title><style>
      body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f6f0f4;
      font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#2e2440;padding:24px}
      .c{max-width:460px;background:#fff;border:1px solid #eae3ee;border-radius:24px;padding:36px;text-align:center}
      h1{margin:0 0 10px;font-size:20px}p{margin:0 0 18px;font-size:14px;line-height:1.6;opacity:.85}
      a{color:#6d46b8;font-weight:700;text-decoration:none}</style></head>
      <body><div class="c"><h1>${title}</h1><p>${message}</p><a href="/">Back to the site</a></div></body></html>`);

  if (!sub) return page('Link not recognised', 'This confirmation link is invalid or has already been used.', false);
  if (sub.tokenExpiresAt && sub.tokenExpiresAt < Date.now()) {
    return page('Link expired', 'This confirmation link is older than 48 hours. Please subscribe again to get a new one.', false);
  }

  sub.status = 'verified';
  sub.verifiedAt = new Date().toISOString();
  sub.token = newToken(); // becomes the unsubscribe token; the old one stops working
  delete sub.tokenExpiresAt;
  store.write(SUBS, all);
  console.log(`[subscribe] ${sub.email} confirmed`);
  return page('Subscription confirmed', 'Thank you — your email is confirmed and you are on the list.', true);
});

app.get('/api/newsletter/unsubscribe', (req: Request, res: Response): any => {
  const token = String(req.query.token || '');
  const all = store.read<Subscriber[]>(SUBS, []);
  const sub = token ? all.find((s) => s.token === token) : undefined;
  if (sub) {
    sub.status = 'unsubscribed';
    sub.unsubscribedAt = new Date().toISOString();
    delete sub.token;
    store.write(SUBS, all);
    console.log(`[subscribe] ${sub.email} unsubscribed`);
  }
  return res.send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex">
    <title>Unsubscribed</title></head><body style="font-family:system-ui;text-align:center;padding:60px">
    <h1 style="font-size:20px">You have been unsubscribed</h1>
    <p style="font-size:14px;opacity:.8">You will not receive any further emails. <a href="/">Back to the site</a></p>
    </body></html>`);
});

app.get('/api/admin/subscribers', requirePermission('subscribers.view'), (req: Request, res: Response): any => {
  if (!hasValidAdminSession(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });
  return res.json({ subscribers: store.read<Subscriber[]>(SUBS, []) });
});

app.delete('/api/admin/subscribers/:id', requirePermission('subscribers.manage'), (req: Request, res: Response): any => {
  if (!hasValidAdminSession(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });
  store.write(SUBS, store.read<Subscriber[]>(SUBS, []).filter((s) => s.id !== req.params.id));
  return res.json({ success: true });
});

/* ------------------------------------------------------------------
 * Admin notifications.
 *
 * These used to be generated in the admin's own browser, so the bell
 * only ever saw events that happened in that browser — a visitor's
 * message, comment or download (which happen on the server) never
 * appeared. They are now derived from the real stored data, and the
 * read state lives on the server so it survives a refresh, a new
 * browser and another device.
 * ---------------------------------------------------------------- */
const NOTIF_READ = 'notificationsRead';

function buildNotifications() {
  const readIds: string[] = store.read<string[]>(NOTIF_READ, []);
  const items: any[] = [];

  for (const m of store.read<StoredMessage[]>(MESSAGES, []).slice(0, 40)) {
    items.push({
      id: `msg:${m.id}`,
      type: 'info',
      title: 'New contact message',
      message: `${m.name} — ${m.topicLabel || 'Inquiry'}`,
      createdAtMs: new Date(m.createdAt.replace(' ', 'T')).getTime() || Date.now(),
      route: 'messages',
    });
  }

  for (const cm of store.read<any[]>(COMMENTS, []).filter((x) => x.status === 'pending').slice(0, 40)) {
    items.push({
      id: `cmt:${cm.id}`,
      type: 'comment',
      title: 'Comment awaiting moderation',
      message: `${cm.authorName} on "${cm.postTitle || 'a post'}"`,
      createdAtMs: new Date(cm.createdAt.replace(' ', 'T')).getTime() || Date.now(),
      route: 'blog-manager',
    });
  }

  for (const s of store.read<any[]>(SUBS, []).slice(0, 20)) {
    items.push({
      id: `sub:${s.id}`,
      type: 'success',
      title: 'New newsletter subscriber',
      message: `${s.email} (${s.source})`,
      createdAtMs: new Date(String(s.subscribedAt).replace(' ', 'T')).getTime() || Date.now(),
      route: 'subscribers',
    });
  }

  items.sort((a, b) => b.createdAtMs - a.createdAtMs);
  const list = items.slice(0, 50).map((n) => ({
    ...n,
    read: readIds.includes(n.id),
    timestamp: new Date(n.createdAtMs).toISOString(),
  }));
  return { notifications: list, unread: list.filter((n) => !n.read).length };
}

app.get('/api/admin/notifications', (req: Request, res: Response): any => {
  if (!hasValidAdminSession(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });
  return res.json(buildNotifications());
});

app.post('/api/admin/notifications/read', (req: Request, res: Response): any => {
  if (!hasValidAdminSession(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const current = store.read<string[]>(NOTIF_READ, []);
  const ids: string[] = req.body?.all
    ? buildNotifications().notifications.map((n) => n.id)
    : Array.isArray(req.body?.ids) ? req.body.ids.map(String) : [];
  // Keep the list bounded; ids of items that scrolled out simply expire.
  store.write(NOTIF_READ, [...new Set([...current, ...ids])].slice(-500));
  return res.json(buildNotifications());
});

/** Anonymous visitor analytics (admin only). */
app.get('/api/admin/visitors', requirePermission('analytics.view'), (req: Request, res: Response): any => {
  if (!hasValidAdminSession(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });
  return res.json(visitorReport());
});

/* ------------------------------------------------------------------
 * Download statistics.
 *
 * Two shapes on purpose: a capped list of recent downloads for the
 * table, and running totals that stay tiny no matter how much traffic
 * the site gets (one small line per day, not one row per download).
 * ---------------------------------------------------------------- */
const STATS = 'downloadStats';
const TOTALS = 'downloadTotals';
const RECENT_LIMIT = 500;

// byDateQuality powers the "Downloads Over Time" chart: one small entry
// per day, so it stays tiny however much traffic the site gets.
type Totals = {
  total: number;
  byQuality: Record<string, number>;
  byPlatform: Record<string, number>;
  byDate: Record<string, number>;
  byDateQuality?: Record<string, Record<string, number>>;
};
const emptyTotals = (): Totals => ({ total: 0, byQuality: {}, byPlatform: {}, byDate: {}, byDateQuality: {} });

/** Turns a display label into the bucket the dashboard counts:
 * "Audio (MP3)" -> MP3, "1080p (Full HD)" -> 1080p, "576p (SD)" -> 576p. */
export function qualityBucket(label: string): string {
  const v = String(label || '').trim();
  if (/mp3|audio/i.test(v)) return 'MP3';
  if (/\bm4a\b/i.test(v)) return 'M4A';
  if (/\bwav\b/i.test(v)) return 'WAV';
  const res = v.match(/(\d{3,4})\s*p/i);
  if (res) return `${res[1]}p`;
  const first = v.split(/[\s(]/)[0];
  return first || 'Other';
}

const statLimiter = new Map<string, { count: number; since: number }>();

app.post('/api/stats/download', (req: Request, res: Response): any => {
  // Light abuse guard: at most 60 recorded downloads per IP per hour.
  const ip = String(req.ip || 'unknown');
  const now = Date.now();
  const seen = statLimiter.get(ip);
  if (!seen || now - seen.since > 3600000) statLimiter.set(ip, { count: 1, since: now });
  else if (seen.count >= 60) return res.json({ success: false, ignored: true });
  else seen.count++;

  const s = (v: any, max: number) => String(v ?? '').trim().slice(0, max);
  const entry = {
    id: `dl_${now}_${Math.random().toString(36).slice(2, 6)}`,
    videoTitle: s(req.body?.videoTitle, 200) || 'Untitled video',
    videoUrl: s(req.body?.videoUrl, 500),
    quality: s(req.body?.quality, 30) || 'Unknown',
    fileSize: s(req.body?.fileSize, 30),
    duration: s(req.body?.duration, 20),
    platform: s(req.body?.platform, 30) || 'Unknown',
    downloadedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
  };

  store.write(STATS, [entry, ...store.read<any[]>(STATS, [])].slice(0, RECENT_LIMIT));
  recordVisitorDownload(req, entry.platform, entry.quality);

  const totals = store.read<Totals>(TOTALS, emptyTotals());
  const day = entry.downloadedAt.slice(0, 10);
  totals.total += 1;
  const bucket = qualityBucket(entry.quality);
  totals.byQuality[bucket] = (totals.byQuality[bucket] || 0) + 1;
  totals.byPlatform[entry.platform] = (totals.byPlatform[entry.platform] || 0) + 1;
  totals.byDate[day] = (totals.byDate[day] || 0) + 1;
  if (!totals.byDateQuality) totals.byDateQuality = {};
  if (!totals.byDateQuality[day]) totals.byDateQuality[day] = {};
  totals.byDateQuality[day][bucket] = (totals.byDateQuality[day][bucket] || 0) + 1;
  // Keep roughly two years of daily numbers; older days are dropped.
  const days = Object.keys(totals.byDate).sort();
  if (days.length > 730) {
    for (const d of days.slice(0, days.length - 730)) {
      delete totals.byDate[d];
      delete totals.byDateQuality?.[d];
    }
  }
  store.write(TOTALS, totals);

  return res.json({ success: true });
});

app.get('/api/admin/stats', requirePermission('analytics.view'), (req: Request, res: Response): any => {
  if (!hasValidAdminSession(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const totals = store.read<Totals>(TOTALS, emptyTotals());

  // Counts recorded before the labels were normalised sat under keys like
  // "Audio (MP3)", which the dashboard never matched. Merge them into the
  // proper buckets once, so existing numbers are not lost.
  const needsFix = Object.keys(totals.byQuality).some((k) => k !== qualityBucket(k));
  if (needsFix) {
    const merged: Record<string, number> = {};
    for (const [k, n] of Object.entries(totals.byQuality)) {
      const b = qualityBucket(k);
      merged[b] = (merged[b] || 0) + n;
    }
    totals.byQuality = merged;
    store.write(TOTALS, totals);
    console.log('[stats] merged old quality labels into normalised buckets');
  }

  return res.json({ recent: store.read<any[]>(STATS, []), totals });
});

app.delete('/api/admin/stats/:id', requirePermission('analytics.view'), (req: Request, res: Response): any => {
  if (!hasValidAdminSession(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });
  store.write(STATS, store.read<any[]>(STATS, []).filter((x) => x.id !== req.params.id));
  return res.json({ success: true });
});

/* ------------------------------------------------------------------
 * Blog — stored on the SERVER so a post the admin writes is actually
 * visible to visitors and to search engines. It used to live only in
 * the admin's own browser, so nobody else ever saw it.
 * ---------------------------------------------------------------- */
const POSTS = 'blogPosts';
const CATEGORIES = 'blogCategories';

/**
 * Reads every post, guaranteeing a `language`.
 *
 * Two things happen here, both non-destructive:
 *  1. Posts saved before languages existed are reported as English. Nothing is
 *     rewritten on disk until the post is next saved.
 *  2. Seed posts the store has never seen (the translated siblings shipped with
 *     a release) are appended. Matching is by id, so a post the admin edited or
 *     deleted is never resurrected or overwritten — only genuinely new ids are
 *     added, which mirrors what the frontend already does.
 */
const SEED_REMOVED = 'blogSeedRemoved';
const seedRemoved = () => store.read<string[]>(SEED_REMOVED, []);

const allPosts = () => {
  const saved = store.read<any[]>(POSTS, null as any);
  if (!Array.isArray(saved)) return INITIAL_BLOG_POSTS.map(withLanguage);
  const seen = new Set(saved.map((p) => p?.id));
  const deleted = new Set(seedRemoved());
  const missing = INITIAL_BLOG_POSTS.filter((p) => !seen.has(p.id) && !deleted.has(p.id));
  return [...saved, ...missing].map(withLanguage);
};

const withLanguage = (p: any) => ({ ...p, language: normalizeBlogLanguage(p?.language) });

const allCategories = () => store.read<any[]>(CATEGORIES, INITIAL_BLOG_CATEGORIES);

/** Public: published posts only — drafts stay private.
 *  `?language=xx` filters on the stored field; no param keeps the old
 *  behaviour of returning everything, so existing callers are unaffected. */
app.get('/api/blog', (req: Request, res: Response): any => {
  const published = allPosts().filter((p) => p.status === 'published');
  const requested = req.query.language;
  const posts =
    typeof requested === 'string' && isBlogLanguage(requested)
      ? published.filter((p) => p.language === requested)
      : published;

  // Lets the frontend build language cards without shipping every post.
  const counts: Record<string, number> = {};
  for (const p of published) counts[p.language] = (counts[p.language] || 0) + 1;

  return res.json({ posts, categories: allCategories(), languageCounts: counts });
});

/** Counts a read. Kept separate so it can't be used to edit anything. */
app.post('/api/blog/:slug/view', (req: Request, res: Response): any => {
  const posts = allPosts();
  const post = posts.find((p) => p.slug === req.params.slug);
  if (!post) return res.status(404).json({ success: false });
  post.views = (Number(post.views) || 0) + 1;
  store.write(POSTS, posts);
  return res.json({ success: true, views: post.views });
});

/** Admin: everything, including drafts. */
app.get('/api/admin/blog', requirePermission('blog.view'), (req: Request, res: Response): any => {
  if (!hasValidAdminSession(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });
  return res.json({ posts: allPosts(), categories: allCategories() });
});

app.post('/api/admin/blog', requirePermission('blog.create'), (req: Request, res: Response): any => {
  if (!hasValidAdminSession(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const post = req.body?.post;
  if (!post?.id) return res.status(400).json({ success: false, error: 'Post data is missing.' });
  if (post.language !== undefined && !isBlogLanguage(post.language)) {
    return res.status(400).json({ success: false, error: 'Unsupported blog language.' });
  }
  const saved = { ...post, language: normalizeBlogLanguage(post.language), slug: cleanSlug(post.slug || '') };
  if (!saved.slug) return res.status(400).json({ success: false, error: 'A valid English URL slug is required.' });
  if (saved.slug) clearRedirectFrom(`/blog/${saved.slug}`);
  store.write(POSTS, [saved, ...allPosts().filter((p) => p.id !== saved.id)]);
  return res.json({ success: true });
});

app.patch('/api/admin/blog/:id', requirePermission('blog.edit'), (req: Request, res: Response): any => {
  if (!hasValidAdminSession(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const posts = allPosts();
  const idx = posts.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Post not found.' });
  const updates = req.body?.updates || {};
  if (updates.language !== undefined && !isBlogLanguage(updates.language)) {
    return res.status(400).json({ success: false, error: 'Unsupported blog language.' });
  }
  if (updates.slug !== undefined) {
    updates.slug = cleanSlug(updates.slug);
    if (!updates.slug) return res.status(400).json({ success: false, error: 'A valid English URL slug is required.' });
  }
  // A published post whose slug changes keeps its old address alive via 301.
  const prev = posts[idx];
  if (prev.status === 'published' && updates.slug && updates.slug !== prev.slug) {
    addRedirect(`/blog/${prev.slug}`, `/blog/${updates.slug}`);
  }
  posts[idx] = { ...posts[idx], ...updates };
  posts[idx].language = normalizeBlogLanguage(posts[idx].language);
  store.write(POSTS, posts);
  return res.json({ success: true, post: posts[idx] });
});

app.delete('/api/admin/blog/:id', requirePermission('blog.delete'), (req: Request, res: Response): any => {
  if (!hasValidAdminSession(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const id = req.params.id;
  store.write(POSTS, allPosts().filter((p) => p.id !== id));
  // A deleted post that also ships as a seed post would otherwise reappear on
  // the next read, so remember that this one was removed on purpose.
  if (INITIAL_BLOG_POSTS.some((p) => p.id === id) && !seedRemoved().includes(id)) {
    store.write(SEED_REMOVED, [...seedRemoved(), id]);
  }
  return res.json({ success: true });
});

/** Categories are saved as one list — the dashboard already validates them. */
app.put('/api/admin/blog-categories', requirePermission('blog.edit'), (req: Request, res: Response): any => {
  if (!hasValidAdminSession(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });
  if (!Array.isArray(req.body?.categories)) return res.status(400).json({ success: false });
  store.write(CATEGORIES, req.body.categories);
  return res.json({ success: true });
});

/** Backup: download everything as one file, and restore it elsewhere. */
/** Media Library: every image, grouped by month on the page, with its ALT text. */
app.get('/api/admin/media', requirePermission('media.manage'), (_req: Request, res: Response): any => {
  const siteJson = JSON.stringify(
    ['siteSettings', 'landingContent', 'sitePages', 'adminProfile', 'adminUsers'].map((k) => store.read<any>(k, null))
  );
  return res.json({ items: buildMediaList(uploadsDir(), allPosts(), siteJson, readMediaFiles()) });
});

/** Bulk ALT save: [{ url, postId, kind: 'cover'|'inline', alt }]. Not a content
 *  change, so "Last updated" is left alone. */
app.put('/api/admin/media/alt', requirePermission('blog.edit'), (req: Request, res: Response): any => {
  const changes = Array.isArray(req.body?.changes) ? req.body.changes.slice(0, 500) : [];
  if (!changes.length) return res.status(400).json({ success: false, error: 'Nothing to save.' });
  const posts = allPosts();
  const updated = applyAltChanges(posts, changes);
  if (updated) store.write(POSTS, posts);
  return res.json({ success: true, updated });
});

/** 301 Redirect Manager (admin). */
app.get('/api/admin/redirects', requirePermission('settings.view'), (_req: Request, res: Response): any => {
  return res.json({ redirects: listRedirects() });
});

app.post('/api/admin/redirects', requirePermission('settings.edit'), (req: Request, res: Response): any => {
  setOwnHost(String(req.headers['host'] || ''));
  const from = normalizePath(req.body?.from || '');
  const to = normalizeTarget(req.body?.to || '');
  if (!req.body?.from || !req.body?.to) return res.status(400).json({ success: false, error: 'Both "Old URL" and "New URL" are required.' });
  if (isProtectedPath(from)) return res.status(400).json({ success: false, error: `"${from}" is a system page and cannot be redirected.` });
  if (from === to) return res.status(400).json({ success: false, error: 'Old and new URL are the same.' });
  addRedirect(from, to);
  return res.json({ success: true, redirects: listRedirects() });
});

app.delete('/api/admin/redirects', requirePermission('settings.edit'), (req: Request, res: Response): any => {
  const ok = deleteRedirect(String(req.query.from || ''));
  if (!ok) return res.status(404).json({ success: false, error: 'Redirect not found.' });
  return res.json({ success: true, redirects: listRedirects() });
});

app.get('/api/admin/backup', requirePermission('backup.create'), async (req: Request, res: Response): Promise<any> => {
  if (!hasValidAdminSession(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const dump = await store.exportAll();
  res.setHeader('Content-Disposition', `attachment; filename="fdownloader-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.setHeader('Content-Type', 'application/json');
  return res.send(JSON.stringify(dump, null, 2));
});

app.post('/api/admin/restore', requirePermission('backup.restore'), async (req: Request, res: Response): Promise<any> => {
  if (!hasValidAdminSession(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });
  try {
    const result = await store.importAll(req.body);
    console.log(`[store] restored: ${result.restored.join(', ')} (+${result.images} uploaded files)`);
    return res.json({
      success: true,
      restored: result.restored,
      images: result.images,
      rejected: result.rejected,
      safetyCopy: result.safetyCopy,
      message:
        `Restored ${result.restored.length} section(s)` +
        (result.images ? ` and ${result.images} uploaded file(s)` : '') +
        (result.rejected.length ? `. Skipped damaged data: ${result.rejected.join('; ')}` : '.'),
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err?.message || 'Restore failed.' });
  }
});

/** Serves files found by yt-dlp through short-lived tokens (keeps platform
 * headers/cookies server-side, muxes separate audio+video). */
app.get('/api/video/ytdlp-stream/:token', handleYtdlpStream);

app.get('/api/video/download-proxy', trackRoute('download'), async (req: Request, res: Response): Promise<any> => {
  const fileUrl = req.query.url as string;
  const fileName = (req.query.name as string) || 'social-video.mp4';

  if (!fileUrl) {
    return res.status(400).send('Missing url query parameter.');
  }

  try {
    const targetUrl = fileUrl.startsWith('/')
      ? `http://127.0.0.1:${PORT}${fileUrl}`
      : fileUrl;

    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    };
    if (targetUrl.includes('fbcdn.net') || targetUrl.includes('facebook.com')) {
      headers['Referer'] = 'https://www.facebook.com/';
    } else if (targetUrl.includes('cdninstagram.com') || targetUrl.includes('instagram.com')) {
      headers['Referer'] = 'https://www.instagram.com/';
    }

    // The MP3 option must produce a genuinely audio-only file, not the
    // same video bytes under a different name — otherwise it downloads
    // at full video size and isn't really an MP3 at all.
    const wantsMp3 = req.query.format === 'mp3' || fileName.toLowerCase().endsWith('.mp3');

    // Reddit: the video file on v.redd.it never contains audio — the
    // audio is a separate file beside it. Fetch both and combine them.
    const redditAudioUrls = redditAudioCandidates(targetUrl);
    if (redditAudioUrls.length > 0) {
      try {
        const vRes = await fetch(targetUrl, { headers });
        if (!vRes.ok) throw new Error(`Reddit video track HTTP ${vRes.status}`);
        let out = Buffer.from(await vRes.arrayBuffer());

        let audioBuf: Buffer | null = null;
        for (const aUrl of redditAudioUrls) {
          try {
            const aRes = await fetch(aUrl, { headers });
            if (aRes.ok) {
              audioBuf = Buffer.from(await aRes.arrayBuffer());
              console.log(`[download-proxy] Reddit audio track found: ${aUrl}`);
              break;
            }
          } catch {
            // try next candidate
          }
        }

        if (audioBuf && (await canMux())) {
          out = await muxAudioVideo(out, audioBuf);
        } else if (!audioBuf) {
          console.warn(`[download-proxy] No Reddit audio track exists for ${targetUrl} (post is genuinely silent).`);
        } else {
          console.warn('[download-proxy] Reddit audio found but ffmpeg unavailable — sending video only.');
        }

        if (wantsMp3) out = await extractAudioAsMp3(out);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        res.setHeader('Content-Type', wantsMp3 ? 'audio/mpeg' : 'video/mp4');
        res.setHeader('Content-Length', out.length.toString());
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.send(out);
      } catch (rdErr) {
        console.warn('[download-proxy] Reddit audio/video combine failed:', rdErr);
        // fall through to the generic path below
      }
    }

    // An .m3u8 URL is a streaming playlist, not a single file — proxying
    // its raw (tiny, text) bytes as if it were the video is exactly what
    // used to produce an unplayable "video" download. Fetch every
    // segment it references and join them into one real file instead.
    const isHlsManifest = /\.m3u8(\?|$)/i.test(targetUrl);
    if (isHlsManifest) {
      try {
        let combined = await fetchAndConcatenateHls(targetUrl, headers);
        if (wantsMp3) combined = await extractAudioAsMp3(combined);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        res.setHeader('Content-Type', wantsMp3 ? 'audio/mpeg' : 'video/mp4');
        res.setHeader('Content-Length', combined.length.toString());
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.send(combined);
      } catch (hlsErr) {
        console.warn('HLS segment fetch/concatenation failed:', hlsErr);
        return res.status(502).send('Could not assemble this video from its streaming segments. Please try again.');
      }
    }

    if (wantsMp3 && (await canMux())) {
      try {
        const srcRes = await fetch(targetUrl, { headers });
        if (srcRes.ok) {
          const mp3 = await extractAudioAsMp3(Buffer.from(await srcRes.arrayBuffer()));
          res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Content-Length', mp3.length.toString());
          res.setHeader('Access-Control-Allow-Origin', '*');
          return res.send(mp3);
        }
      } catch (mp3Err) {
        console.warn('[download-proxy] MP3 conversion failed, serving original file:', mp3Err);
      }
    }

    const upstreamRes = await fetch(targetUrl, { headers });

    if (!upstreamRes.ok) {
      // Redirecting the browser to the raw CDN URL here used to hide the
      // real problem: the browser can't read it (CORS) and the user just
      // saw a vague "started in browser" message. Report the truth instead.
      console.warn(`[download-proxy] upstream ${upstreamRes.status} for ${targetUrl}`);
      return res.status(502).send(
        `The source refused this download (HTTP ${upstreamRes.status}). The link may have expired — please fetch the video again.`
      );
    }

    const contentType =
      upstreamRes.headers.get('content-type') ||
      (fileName.endsWith('.mp3') ? 'audio/mpeg' : 'video/mp4');
    const contentLength = upstreamRes.headers.get('content-length');

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    if (upstreamRes.body) {
      // @ts-ignore
      const nodeStream = Readable.fromWeb(upstreamRes.body);
      nodeStream.pipe(res);
    } else {
      return res.status(502).send('The source returned an empty response. Please fetch the video again.');
    }
  } catch (pipeErr) {
    console.warn('[download-proxy] failed:', pipeErr);
    if (!res.headersSent) {
      return res.status(502).send('Could not download this file from the source. Please fetch the video again.');
    }
  }
});

/**
 * Dynamic XML Sitemap Generator endpoint for SEO indexing
 */
/**
 * Server-side route metadata for social-media crawlers and search
 * engines that don't execute JavaScript (Facebook, WhatsApp, X, most
 * SEO bots). The client-side <Seo> component refines these further
 * once the app loads in a real browser (using live, admin-configured
 * settings) — this is the fallback that's correct even without JS.
 *
 * These read the admin's live site settings, so renaming the site in the
 * dashboard also renames it for crawlers that never run the JavaScript.
 * The built-in defaults are only used before anything has been saved.
 */
const seoSiteName = () =>
  store.read<any>('siteSettings', INITIAL_SITE_SETTINGS)?.siteName || INITIAL_SITE_SETTINGS.siteName;
const seoDescription = () =>
  store.read<any>('siteSettings', INITIAL_SITE_SETTINGS)?.metaDescription ||
  INITIAL_SITE_SETTINGS.metaDescription;
const seoTagline = () =>
  String(store.read<any>('siteSettings', INITIAL_SITE_SETTINGS)?.siteTagline || '').trim() ||
  INITIAL_SITE_SETTINGS.siteTagline;

/** `image`: the page's own share image (a post's cover); Settings' share image is the fallback. */
type RouteMeta = { title: string; description: string; noindex: boolean; status: number; image?: string };

function getRouteMeta(pathname: string, isAdmin = false): RouteMeta {
  const SEO_SITE_NAME = seoSiteName();
  const SEO_DEFAULT_DESCRIPTION = seoDescription();
  const routes: Record<string, { title: string; description: string; noindex?: boolean }> = {
    '/': {
      // Same string the home page sets in the browser, from Settings.
      title: `${SEO_SITE_NAME} - ${seoTagline()}`,
      description: SEO_DEFAULT_DESCRIPTION,
    },
    '/blog': {
      title: `Blog & Video Guides - ${SEO_SITE_NAME}`,
      description: 'Read the latest guides, tutorials, and updates about downloading social media videos.',
    },
    '/contact': {
      title: `Contact Support & Help - ${SEO_SITE_NAME}`,
      description: `Get in touch with the ${SEO_SITE_NAME} support team for download assistance, bug reports, feature requests, or business inquiries.`,
    },
    '/about-us': {
      title: `About Us - ${SEO_SITE_NAME}`,
      description: `Learn about ${SEO_SITE_NAME} — a free, fast, watermark-free video and audio downloader for all major social platforms.`,
    },
    '/privacy-policy': {
      title: `Privacy Policy - ${SEO_SITE_NAME}`,
      description: `Privacy Policy for ${SEO_SITE_NAME} — what data we collect, what we don't store, and how your information is handled.`,
    },
    '/terms-of-use': {
      title: `Terms of Use - ${SEO_SITE_NAME}`,
      description: `Terms of Use for ${SEO_SITE_NAME} — acceptable use, restrictions, and service availability.`,
    },
    '/legal': {
      title: `Legal & DMCA - ${SEO_SITE_NAME}`,
      description: `Legal information and DMCA policy for ${SEO_SITE_NAME}.`,
    },
    '/admin': {
      title: `Admin Sign In - ${SEO_SITE_NAME}`,
      description: 'Admin dashboard sign-in.',
      noindex: true,
    },
  };

  if (routes[pathname]) return { noindex: false, status: 200, ...routes[pathname] };

  // /blog/<code> is a language archive.
  if (pathname.startsWith('/blog/')) {
    const segment = pathname.slice('/blog/'.length);
    if (isBlogLanguage(segment)) {
      return {
        title: `Blog - ${SEO_SITE_NAME}`,
        description: 'Read the latest guides, tutorials, and updates about downloading social media videos.',
        noindex: false,
        status: 200,
      };
    }

    // /blog/<slug> is a post — but only one that exists. Every unknown slug
    // used to get a 200 and the first post's content, which search engines
    // see as endless duplicates of one article. Drafts are private: they
    // exist only for a signed-in admin previewing them.
    const post = allPosts().find((p) => p.slug === segment);
    const visible = post && (post.status === 'published' || isAdmin);
    if (visible) {
      const brand = (v: unknown) => String(v || '').split('{brand}').join(SEO_SITE_NAME);
      // The real title and description go in the raw HTML, so crawlers
      // that never run the JavaScript still see the article, not a
      // generic "Blog" placeholder.
      return {
        title: brand(post.metaTitle) || `${brand(post.title)} - ${SEO_SITE_NAME}`,
        description: brand(post.metaDescription) || brand(post.excerpt) || SEO_DEFAULT_DESCRIPTION,
        image: post.coverImage || undefined,
        noindex: post.status !== 'published',
        status: 200,
      };
    }
    return notFoundMeta(SEO_SITE_NAME);
  }

  // Admin dashboard sub-pages (only reachable after login) — never index.
  if (pathname.startsWith('/admin') || pathname.startsWith('/wp-admin') || pathname === '/login') {
    return { title: `Admin - ${SEO_SITE_NAME}`, description: 'Admin dashboard.', noindex: true, status: 200 };
  }

  // Anything else is not a page on this site. It used to fall through to the
  // home page with a 200, so every mistyped or made-up URL looked like a
  // duplicate of the home page to a search engine.
  return notFoundMeta(SEO_SITE_NAME);
}

function notFoundMeta(siteName: string): RouteMeta {
  return {
    title: `Page Not Found - ${siteName}`,
    description: 'The page you are looking for does not exist or has been moved.',
    noindex: true,
    status: 404,
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * robots.txt — generated dynamically so the Sitemap: line always points at
 * whatever domain the site is actually running on (never hard-coded).
 */
/** Google Analytics setup, served as a file because the CSP blocks inline scripts. */
app.get('/ga-init.js', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(gaInitScript());
});

app.get('/robots.txt', (req: Request, res: Response) => {
  const protocol = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = req.headers['host'] || 'localhost:3000';
  const baseUrl = `${protocol}://${host}`;

  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /wp-admin',
    'Disallow: /api/',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    `# Feed: ${baseUrl}/rss.xml`,
    '',
  ].join('\n');

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(body);
});

/**
 * The XML sitemap. Served at /sitemap.xml itself — the address robots.txt
 * announces — and still at /api/sitemap.xml for anyone who submitted that one.
 * /sitemap.xml used to redirect to /api/sitemap.xml, a path robots.txt
 * disallows, so a crawler following the redirect was told not to read it.
 */
function renderSitemap(req: Request, res: Response) {
  const protocol = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = req.headers['host'] || 'localhost:3000';
  const baseUrl = `${protocol}://${host}`;

  const staticPages = [
    { url: `${baseUrl}/`, changefreq: 'daily', priority: '1.0' },
    { url: `${baseUrl}/blog`, changefreq: 'daily', priority: '0.9' },
    { url: `${baseUrl}/contact`, changefreq: 'monthly', priority: '0.5' },
    { url: `${baseUrl}/about-us`, changefreq: 'monthly', priority: '0.5' },
    { url: `${baseUrl}/privacy-policy`, changefreq: 'yearly', priority: '0.3' },
    { url: `${baseUrl}/terms-of-use`, changefreq: 'yearly', priority: '0.3' },
    { url: `${baseUrl}/legal`, changefreq: 'yearly', priority: '0.3' },
  ];

  // Published posts, grouped so translated siblings can point at each other.
  const published = allPosts().filter((p: any) => p.status === 'published');
  const counts: Record<string, number> = {};
  for (const p of published) counts[p.language] = (counts[p.language] || 0) + 1;

  const esc = (v: string) =>
    String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

  /** post_1 and post_1__ur are the same article in two languages. */
  const familyOf = (id: string) => {
    const base = String(id).split('__')[0];
    return published.filter((p: any) => p.id === base || String(p.id).startsWith(`${base}__`));
  };

  // Real dates only: a lastmod that is always "today" teaches Google to ignore
  // every lastmod in this file, including the posts' genuine ones.
  const postDate = (p: any) => String(p.updatedAt || p.publishedAt || '').slice(0, 10);
  const latest = (list: any[]) => list.map(postDate).filter(Boolean).sort().pop() || '';
  const newestPost = latest(published);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;

  for (const page of staticPages) {
    xml += `  <url>\n`;
    xml += `    <loc>${page.url}</loc>\n`;
    // Home and /blog list the newest posts; other pages have no tracked date.
    if (newestPost && (page.url === baseUrl || page.url === `${baseUrl}/` || page.url === `${baseUrl}/blog`)) {
      xml += `    <lastmod>${newestPost}</lastmod>\n`;
    } else if (/\/(privacy-policy|terms-of-use|legal)$/.test(page.url)) {
      const s = store.read<any>('siteSettings', INITIAL_SITE_SETTINGS) || {};
      const d = /^\d{4}-\d{2}-\d{2}$/.test(s.legalUpdatedAt || '') ? s.legalUpdatedAt : LEGAL_TEXT_DATE;
      xml += `    <lastmod>${d}</lastmod>\n`;
    }
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  // One archive per language that actually has articles.
  for (const code of Object.keys(counts)) {
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/blog/${code}</loc>\n`;
    const langDate = latest(published.filter((p: any) => p.language === code));
    if (langDate) xml += `    <lastmod>${langDate}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  }

  // Every published article, with hreflang links to its other languages so
  // search engines read them as versions of one piece, not duplicates.
  for (const post of published) {
    const family = familyOf(post.id);
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/blog/${esc(post.slug)}</loc>\n`;
    xml += `    <lastmod>${esc(post.updatedAt || post.publishedAt || new Date().toISOString().split('T')[0])}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.7</priority>\n`;
    if (family.length > 1) {
      for (const sib of family) {
        xml += `    <xhtml:link rel="alternate" hreflang="${esc(sib.language)}" href="${baseUrl}/blog/${esc(sib.slug)}"/>\n`;
      }
    }
    xml += `  </url>\n`;
  }

  xml += `</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.send(xml);
}

/**
 * RSS 2.0 feed for the blog.
 *
 * Off-page SEO leans on this: aggregators, newsreaders and syndication sites
 * pull from a feed, and each pickup is a real inbound link. It also gets new
 * posts discovered faster than waiting for a crawl.
 *
 * /rss.xml            -> every published post
 * /rss.xml?language=ur -> just that language
 */
function renderRss(req: Request, res: Response) {
  const protocol = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = req.headers['host'] || 'localhost:3000';
  const baseUrl = `${protocol}://${host}`;
  const settings = store.read<any>('siteSettings', INITIAL_SITE_SETTINGS) || {};
  const siteName = settings.siteName || INITIAL_SITE_SETTINGS.siteName;

  const requested = req.query.language;
  const lang = typeof requested === 'string' && isBlogLanguage(requested) ? requested : null;

  const posts = allPosts()
    .filter((p: any) => p.status === 'published')
    .filter((p: any) => !lang || p.language === lang)
    .sort((a: any, b: any) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')))
    .slice(0, 50);

  const esc = (v: any) =>
    String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const rfc822 = (d: any) => {
    const t = new Date(d || Date.now());
    return (isNaN(t.getTime()) ? new Date() : t).toUTCString();
  };

  const feedPath = lang ? `/rss.xml?language=${lang}` : '/rss.xml';
  const title = lang ? `${siteName} Blog (${lang.toUpperCase()})` : `${siteName} Blog`;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">\n`;
  xml += `<channel>\n`;
  xml += `  <title>${esc(title)}</title>\n`;
  xml += `  <link>${baseUrl}${lang ? `/blog/${lang}` : '/blog'}</link>\n`;
  xml += `  <description>${esc(settings.metaDescription || INITIAL_SITE_SETTINGS.metaDescription)}</description>\n`;
  xml += `  <language>${esc(lang || 'en')}</language>\n`;
  xml += `  <lastBuildDate>${rfc822(posts[0]?.updatedAt || posts[0]?.publishedAt)}</lastBuildDate>\n`;
  xml += `  <atom:link href="${baseUrl}${feedPath}" rel="self" type="application/rss+xml"/>\n`;
  if (settings.logoUrl) {
    xml += `  <image><url>${esc(settings.logoUrl)}</url><title>${esc(title)}</title><link>${baseUrl}/blog</link></image>\n`;
  }

  for (const post of posts) {
    const link = `${baseUrl}/blog/${esc(post.slug)}`;
    xml += `  <item>\n`;
    xml += `    <title>${esc(post.title)}</title>\n`;
    xml += `    <link>${link}</link>\n`;
    xml += `    <guid isPermaLink="true">${link}</guid>\n`;
    xml += `    <pubDate>${rfc822(post.publishedAt)}</pubDate>\n`;
    if (post.authorName) xml += `    <dc:creator>${esc(post.authorName)}</dc:creator>\n`;
    if (post.category) xml += `    <category>${esc(post.category)}</category>\n`;
    xml += `    <description>${esc(post.excerpt || '')}</description>\n`;
    xml += `    <content:encoded><![CDATA[${String(post.content || '').replace(/\]\]>/g, ']]&gt;')}]]></content:encoded>\n`;
    xml += `  </item>\n`;
  }

  xml += `</channel>\n</rss>`;
  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
  res.send(xml);
}

app.get('/rss.xml', renderRss);
app.get('/feed.xml', renderRss);
app.get('/api/rss.xml', renderRss);

app.get('/sitemap.xml', renderSitemap);
app.get('/api/sitemap.xml', renderSitemap);

/**
 * Setup Vite dev server or serve production static files
 */
async function startServer() {
  // Best-effort: create the tracking table if MySQL is configured. If it
  // isn't (or the DB is unreachable), this just logs a warning — the rest
  // of the app, including the downloader, starts normally either way.
  ensureTrackingTable().catch(() => {});

  // Saved 301s run before any page is served (dev and production alike).
  app.use((req: Request, res: Response, next: Function) => {
    if (req.method !== 'GET' || /^\/(api|uploads|assets)\//.test(req.path)) return next();
    const to = findRedirect(req.path);
    if (!to) return next();
    const qs = req.originalUrl.slice(req.path.length);
    return res.redirect(301, to + qs);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // index: false so our own handler below controls how index.html is
    // served (with per-route meta tags injected) instead of the static
    // middleware sending the raw file untouched.
    app.use(express.static(distPath, { index: false }));

    const indexHtmlPath = path.join(distPath, 'index.html');
    const indexHtmlTemplate = fs.readFileSync(indexHtmlPath, 'utf-8');

    app.get('*', (req: Request, res: Response): any => {
      // One address per page. /Contact, /contact/ and /contact are the same
      // page to a visitor but three pages to a search engine, which splits
      // their ranking and reports duplicates. Anything that isn't a file is
      // sent, permanently, to its lower-case form without a trailing slash.
      // Query strings (e.g. utm_*) are kept.
      const isAssetPath = /\.[a-z0-9]{2,5}$/i.test(req.path) || /^\/(api|uploads|assets)\//.test(req.path);
      if (!isAssetPath && req.path !== '/') {
        const normal = req.path.toLowerCase().replace(/\/+$/, '') || '/';
        if (normal !== req.path) {
          const qs = req.originalUrl.slice(req.path.length);
          return res.redirect(301, normal + qs);
        }
      }

      // Count the visit here: every page load passes through this, and it
      // needs no client-side script.
      if (!req.path.startsWith('/api/') && !req.path.startsWith('/uploads/')) touchVisitor(req, res);
      const protocol = (req.headers['x-forwarded-proto'] as string) || 'https';
      const host = req.headers['host'] || 'localhost:3000';
      const origin = `${protocol}://${host}`;
      const url = `${origin}${req.path}`;
      const meta = getRouteMeta(req.path, hasValidAdminSession(req));

      let html = indexHtmlTemplate;
      html = html.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(meta.title)}</title>`);
      html = html.replace(
        /<meta name="description" content=".*?" \/>/,
        `<meta name="description" content="${escapeHtml(meta.description)}" />`
      );
      html = html.replace(
        /<meta property="og:title" content=".*?" \/>/,
        `<meta property="og:title" content="${escapeHtml(meta.title)}" />`
      );
      html = html.replace(
        /<meta property="og:description" content=".*?" \/>/,
        `<meta property="og:description" content="${escapeHtml(meta.description)}" />`
      );
      // Insert og:url, og:site_name, canonical, and robots right after og:type
      const settings = store.read<any>('siteSettings', INITIAL_SITE_SETTINGS) || {};
      // Ownership-verification tokens. These have to be in the raw HTML —
      // Search Console and friends read the response, they do not run React.
      const verifyTags = [
        ['google-site-verification', settings.verifyGoogle],
        ['msvalidate.01', settings.verifyBing],
        ['yandex-verification', settings.verifyYandex],
        ['p:domain_verify', settings.verifyPinterest],
        ['facebook-domain-verification', settings.verifyFacebookDomain],
      ]
        .filter(([, v]) => String(v || '').trim())
        .map(([name, v]) => `    <meta name="${name}" content="${escapeHtml(String(v).trim())}" />`)
        .join('\n');

      // A missing page has no canonical address to point at.
      const canonicalTags =
        meta.status === 404
          ? ''
          : `<meta property="og:url" content="${escapeHtml(url)}" />\n` +
            `    <link rel="canonical" href="${escapeHtml(url)}" />\n`;
      // Share image: Facebook, WhatsApp and X read it from the raw HTML (they
      // run no JavaScript) and need a full address, while Media Library files
      // are stored as /uploads/... paths.
      const shareSrc = String(meta.image || settings.ogImage || '').trim();
      const shareImage = /^https?:\/\//i.test(shareSrc) ? shareSrc : shareSrc.startsWith('/') ? `${origin}${shareSrc}` : '';
      const imageTags = shareImage && meta.status !== 404
        ? `    <meta property="og:image" content="${escapeHtml(shareImage)}" />\n` +
          `    <meta name="twitter:image" content="${escapeHtml(shareImage)}" />\n`
        : '';
      const extraTags =
        canonicalTags +
        imageTags +
        `    <link rel="alternate" type="application/rss+xml" title="${escapeHtml(
          (settings.siteName || INITIAL_SITE_SETTINGS.siteName) + ' Blog'
        )}" href="${escapeHtml(origin)}/rss.xml" />\n` +
        `    <meta name="robots" content="${meta.noindex ? 'noindex, nofollow' : 'index, follow'}" />` +
        (verifyTags ? `\n${verifyTags}` : '');
      html = html.replace('<meta property="og:type" content="website" />', `<meta property="og:type" content="website" />\n    ${extraTags}`);
      const gaTags = gaHeadTags(req.path);
      if (gaTags) html = html.replace('</head>', `${gaTags}  </head>`);

      res.status(meta.status);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ASK Downloader Server listening on http://0.0.0.0:${PORT}`);
    findFfmpeg().then((p) => console.log(`[startup] ffmpeg: ${p || 'NOT runnable'}`));
    getYtdlp().then(() => console.log(`[startup] yt-dlp: ${ytdlpStatus().note}`));
    // Retry any page translations a past save couldn't finish (daily limit, outage).
    void syncPageTranslations();
  });
}

startServer();
