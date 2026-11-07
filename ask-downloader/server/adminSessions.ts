/**
 * Admin login sessions that SURVIVE a server restart.
 *
 * Before, sessions lived only in memory, so every restart (a deploy, a host that recycles an idle
 * app, or several worker processes taking turns) logged the admin out. Now they are also kept in
 * <data folder>/adminSessions.json.
 *
 * Safety:
 *  - The file holds only a SHA-256 HASH of each session token, never the token itself, so a copy of
 *    the file cannot be used to log in (the real token exists only in the admin's cookie).
 *  - The file is NOT in the backup/export list (store.ts COLLECTIONS), so backups never carry sessions.
 *  - Same rules as before: 7-day expiry (set by the caller), changing the password clears everything.
 *  - If the file cannot be read or written, it falls back to memory only (the old behaviour).
 *
 * The memory map is only a cache: a token that is not in it is looked up in the file once, so a login
 * made by another worker process of the same app is still found.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { dataFolder } from './store.ts';

export interface AdminSession {
  createdAt: number;
  expiresAt: number;
  /** Which admin this session belongs to, so permissions can be checked. */
  userId?: string;
}

const hashOf = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const file = () => path.join(dataFolder(), 'adminSessions.json');

const cache = new Map<string, AdminSession>();

function readFile(): Record<string, AdminSession> {
  try {
    const raw = JSON.parse(fs.readFileSync(file(), 'utf8'));
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}

function writeFile() {
  try {
    const out: Record<string, AdminSession> = {};
    for (const [h, s] of cache) out[h] = s;
    const tmp = `${file()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(out), { mode: 0o600 });
    fs.renameSync(tmp, file());
  } catch (err) {
    console.warn('[sessions] could not save sessions, keeping them in memory only:', err);
  }
}

// Load what is already saved (a login made before the last restart).
for (const [h, s] of Object.entries(readFile())) cache.set(h, s);

export const adminSessions = {
  get(token: string): AdminSession | undefined {
    const h = hashOf(token);
    let s = cache.get(h);
    if (!s) { // maybe another process of the app created it: look in the file once
      const saved = readFile()[h];
      if (saved) { cache.set(h, saved); s = saved; }
    }
    if (s && s.expiresAt <= Date.now()) { cache.delete(h); writeFile(); return undefined; }
    return s;
  },
  set(token: string, session: AdminSession) {
    cache.set(hashOf(token), session);
    writeFile();
  },
  delete(token: string) {
    if (cache.delete(hashOf(token))) writeFile();
  },
  clear() {
    cache.clear();
    writeFile();
  },
  cleanExpired() {
    const now = Date.now();
    let changed = false;
    for (const [h, s] of cache) if (s.expiresAt < now) { cache.delete(h); changed = true; }
    if (changed) writeFile();
  },
};
