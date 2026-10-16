/**
 * GET /api/tools/dns?name=example.com&type=A
 * Limits protect the shared server and the resolvers: 10 checks a minute per
 * visitor, 4 checks running at once in total, same question cached 30 s.
 */
import type { Express, Request, Response } from 'express';
import { isRecordType } from './packet.ts';
import { cleanDomain, runCheck, type CheckResult } from './check.ts';

const PER_MINUTE = 10;
const MAX_RUNNING = 4;
const CACHE_MS = 30_000;

const visits = new Map<string, number[]>();
const cache = new Map<string, { at: number; result: Promise<CheckResult> }>();
let running = 0;

/** Behind Hostinger's proxy every req.ip can be the proxy, so read the forwarded client first. */
function visitor(req: Request): string {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || req.ip || 'unknown';
}

function allowed(id: string): boolean {
  const now = Date.now();
  const list = (visits.get(id) || []).filter((t) => now - t < 60_000);
  if (list.length >= PER_MINUTE) { visits.set(id, list); return false; }
  list.push(now);
  visits.set(id, list);
  if (visits.size > 5000) for (const [k, v] of visits) if (!v.some((t) => now - t < 60_000)) visits.delete(k);
  return true;
}

export function registerDnsRoutes(app: Express) {
  app.get('/api/tools/dns', async (req: Request, res: Response): Promise<any> => {
    res.set('Cache-Control', 'no-store');
    const name = cleanDomain(req.query.name);
    const type = String(req.query.type || 'A').toUpperCase();
    if (!name) return res.status(400).json({ error: 'bad-domain' });
    if (!isRecordType(type)) return res.status(400).json({ error: 'bad-type' });

    const k = `${name}|${type}`;
    const now = Date.now();
    for (const [ck, v] of cache) if (now - v.at > CACHE_MS) cache.delete(ck);
    let hit = cache.get(k);
    if (!hit) {
      if (!allowed(visitor(req))) return res.status(429).json({ error: 'rate-limit' });
      if (running >= MAX_RUNNING) return res.status(503).json({ error: 'busy' });
      running++;
      const result = runCheck(name, type).finally(() => { running--; });
      hit = { at: now, result };
      cache.set(k, hit);
      result.catch(() => cache.delete(k));
    }
    try {
      res.json(await hit.result);
    } catch (err: any) {
      console.error('[dns-checker] failed:', err?.message);
      res.status(500).json({ error: 'failed' });
    }
  });
}
