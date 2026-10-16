// Talks to the server's DNS check (server/dns/routes.ts). Types mirror its reply.
export const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA', 'CAA'] as const;
export type RecordType = (typeof RECORD_TYPES)[number];

export type DnsRecord = { name: string; type: string; ttl: number; data: string };
export type Match = 'same' | 'geo' | 'old' | 'missing' | null;
export type TraceStep = {
  zone: string; server: string; ip: string; ms: number; cached?: boolean; depth: number;
  result: 'referral' | 'answer' | 'cname' | 'nxdomain' | 'nodata' | 'error'; detail: string;
};
export type ResolverRow = {
  id: string; name: string; cc: string; ok: boolean; status: string;
  answers: DnsRecord[]; ms: number; via?: string; match: Match;
};
export type CheckResult = {
  name: string; type: RecordType; mode: 'udp' | 'doh';
  authoritative: { status: string; answers: DnsRecord[]; authority?: { name: string; ip: string }; trace: TraceStep[]; ms: number } | null;
  resolvers: ResolverRow[];
  checkedAt: string;
};
export type ErrorCode = 'bad-domain' | 'bad-type' | 'rate-limit' | 'busy' | 'failed' | 'network';

export async function checkDns(name: string, type: RecordType, signal?: AbortSignal): Promise<CheckResult> {
  let res: Response;
  try {
    res = await fetch(`/api/tools/dns?name=${encodeURIComponent(name)}&type=${type}`, { signal });
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e;
    throw new Error('network');
  }
  if (res.ok) return res.json();
  const body = await res.json().catch(() => ({}));
  const known: ErrorCode[] = ['bad-domain', 'bad-type', 'rate-limit', 'busy'];
  throw new Error(known.includes(body?.error) ? body.error : 'failed');
}

/** The records a row is about: those of the asked type, else the whole chain (CNAME). */
export function shown(records: DnsRecord[], type: string): DnsRecord[] {
  const own = records.filter((r) => r.type === type);
  if (!own.length) return records;
  // One fixed order, so rows can be compared by eye (MX by preference).
  const rank = (r: DnsRecord) => (type === 'MX' ? parseInt(r.data, 10) : 0);
  return own.slice().sort((a, b) => rank(a) - rank(b) || a.data.localeCompare(b.data));
}
