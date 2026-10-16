/**
 * One DNS check = propagation (all public resolvers) + the true answer from
 * the domain's own servers, run together, then compared.
 */
import { domainToASCII } from 'url';
import { isIP } from 'net';
import type { DnsRecord, RecordType } from './packet.ts';
import { resolveIterative, type IterResult } from './iterative.ts';
import { checkPropagation, type ResolverResult } from './propagation.ts';
import { ask } from './transport.ts';

/**
 * same = the domain's own answer; geo = other addresses (A/AAAA: big sites
 * and CDNs answer by location, normal); old = other records (not updated yet);
 * missing = says the name/records do not exist; null = nothing to compare.
 */
export type Match = 'same' | 'geo' | 'old' | 'missing' | null;

export type CheckResult = {
  name: string; type: RecordType; mode: 'udp' | 'doh';
  authoritative: IterResult | null;
  resolvers: (ResolverResult & { match: Match })[];
  checkedAt: string;
};

/** "https://www.Example.com/x" -> "www.example.com"; null when not a public name. */
export function cleanDomain(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 300) return null;
  let s = input.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').split(/[/?#]/)[0].replace(/:\d+$/, '');
  s = domainToASCII(s.replace(/\.$/, '')).toLowerCase();
  if (!s || s.length > 253 || isIP(s) || !s.includes('.')) return null;
  if (!s.split('.').every((l) => /^[a-z0-9_]([a-z0-9_-]{0,61}[a-z0-9_])?$/.test(l))) return null;
  if (/(^|\.)(localhost|local|internal|home\.arpa)$/.test(s)) return null;
  return s;
}

// Port 53 open on this host? Checked on first use, again every 10 minutes.
let udpOk: boolean | null = null;
let udpCheckedAt = 0;
async function canUseUdp(): Promise<boolean> {
  if (process.env.DNS_FORCE_DOH === '1') return false; // for testing the fallback
  if (udpOk !== null && Date.now() - udpCheckedAt < 10 * 60_000) return udpOk;
  const probe = (ip: string) => ask(ip, 'example.com', 'A', { recursive: true, timeoutMs: 2000 }).then(() => true, () => false);
  const results = await Promise.all([probe('1.1.1.1'), probe('8.8.8.8'), probe('9.9.9.9')]);
  udpOk = results.some(Boolean);
  udpCheckedAt = Date.now();
  if (!udpOk) console.warn('[dns-checker] port 53 unreachable, using DNS-over-HTTPS');
  return udpOk;
}

function key(records: DnsRecord[], type: RecordType): string {
  const own = records.filter((r) => r.type === type);
  return (own.length ? own : records).map((r) => r.data.toLowerCase()).sort().join('|');
}

function matches(r: ResolverResult, auth: IterResult | null, type: RecordType): Match {
  if (!auth || !['NOERROR', 'NXDOMAIN'].includes(auth.status)) return null;
  if (r.status !== 'NOERROR' && r.status !== 'NXDOMAIN') return null;
  const mine = key(r.answers, type), truth = key(auth.answers, type);
  if (r.status !== auth.status || (!mine) !== (!truth)) return mine ? 'old' : 'missing';
  if (type === 'SOA' || mine === truth) return 'same'; // each SOA provider names itself
  return type === 'A' || type === 'AAAA' ? 'geo' : 'old';
}
export async function runCheck(name: string, type: RecordType): Promise<CheckResult> {
  const udp = await canUseUdp();
  const [resolvers, authoritative] = await Promise.all([
    checkPropagation(name, type, !udp),
    udp ? resolveIterative(name, type) : Promise.resolve(null),
  ]);
  return {
    name, type, mode: udp ? 'udp' : 'doh', authoritative,
    resolvers: resolvers.map((r) => ({ ...r, match: matches(r, authoritative, type) })),
    checkedAt: new Date().toISOString(),
  };
}
