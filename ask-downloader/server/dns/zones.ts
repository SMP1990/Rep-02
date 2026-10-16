/**
 * Who answers for which zone: the 13 root servers plus a small cache of
 * delegations learned on the way (idea from ZDNS's iterative cache), so a
 * second ".com" lookup starts at the .com servers instead of the root.
 */
export type NameServer = { name: string; ip: string };

export const ROOTS: NameServer[] = [
  ['a', '198.41.0.4'], ['b', '170.247.170.2'], ['c', '192.33.4.12'], ['d', '199.7.91.13'],
  ['e', '192.203.230.10'], ['f', '192.5.5.241'], ['g', '192.112.36.4'], ['h', '198.97.190.53'],
  ['i', '192.36.148.17'], ['j', '192.58.128.30'], ['k', '193.0.14.129'], ['l', '199.7.83.42'],
  ['m', '202.12.27.33'],
].map(([l, ip]) => ({ name: `${l}.root-servers.net`, ip }));

const MAX_ENTRIES = 1000;
const MIN_TTL = 60;
const MAX_TTL = 3600;
const cache = new Map<string, { servers: NameServer[]; expires: number }>();

/** True when `name` is `zone` or below it ("" is the root). */
export function inZone(name: string, zone: string): boolean {
  return zone === '' || name === zone || name.endsWith('.' + zone);
}

export function remember(zone: string, servers: NameServer[], ttl: number) {
  if (!servers.length) return;
  if (cache.size >= MAX_ENTRIES) {
    const now = Date.now();
    for (const [k, v] of cache) if (v.expires <= now) cache.delete(k);
    if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  }
  const secs = Math.min(MAX_TTL, Math.max(MIN_TTL, ttl));
  cache.set(zone, { servers, expires: Date.now() + secs * 1000 });
}

/** The deepest known zone above `name`: where iteration can start. */
export function closest(name: string): { zone: string; servers: NameServer[]; cached: boolean } {
  const labels = name.split('.');
  const now = Date.now();
  for (let i = 0; i < labels.length; i++) {
    const zone = labels.slice(i).join('.');
    const hit = cache.get(zone);
    if (hit && hit.expires > now) return { zone, servers: hit.servers, cached: true };
  }
  return { zone: '', servers: ROOTS, cached: false };
}

/** Random order, so load spreads over a zone's servers. */
export function shuffled<T>(list: T[]): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
