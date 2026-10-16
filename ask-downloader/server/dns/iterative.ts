/**
 * Iterative resolution (ZDNS's "--iterative" idea): root -> TLD -> the
 * domain's own (authoritative) servers, without trusting any resolver's
 * cache. Every step goes into a trace the page can show.
 */
import { normName, type DnsRecord, type DnsReply, type RecordType } from './packet.ts';
import { ask } from './transport.ts';
import { closest, inZone, remember, shuffled, type NameServer } from './zones.ts';

export type TraceStep = {
  zone: string; server: string; ip: string; ms: number; cached?: boolean;
  result: 'referral' | 'answer' | 'cname' | 'nxdomain' | 'nodata' | 'error';
  detail: string;
  depth: number; // 1+ = looking up a name server's address
};
export type IterResult = {
  status: string; answers: DnsRecord[]; authority?: NameServer; trace: TraceStep[]; ms: number;
};

type Ctx = { deadline: number; queries: number; trace: TraceStep[]; depth: number };

const MAX_QUERIES = 40;
const MAX_STEPS = 12;
const MAX_CNAMES = 8;
const TRIES_PER_ZONE = 3;
const UDP_TIMEOUT = 2000;
const TCP_TIMEOUT = 3000; // two round trips: connect, then ask
const HEDGE_MS = 700; // start the next server if the last one is this slow

class Stop extends Error {}

type Got = { reply: DnsReply; ms: number; ns: NameServer };

/**
 * Asks a zone's servers with staggered starts (hedged queries): server 1 at
 * 0 ms, server 2 if nothing came after HEDGE_MS, the last one over TCP (big
 * replies such as long TXT often lose UDP fragments). First reply wins.
 */
function askZone(zone: string, servers: NameServer[], name: string, type: RecordType, ctx: Ctx): Promise<Got | null> {
  if (ctx.deadline - Date.now() < 200 || ctx.queries >= MAX_QUERIES) throw new Stop('time or query limit');
  const order = shuffled(servers);
  return new Promise((resolve) => {
    let settled = false;
    let failed = 0;
    const timers: NodeJS.Timeout[] = [];
    const started = new Set<number>();
    const finish = (got: Got | null) => {
      if (settled) return;
      settled = true;
      timers.forEach(clearTimeout);
      resolve(got);
    };
    const attempt = async (i: number) => {
      if (started.has(i)) return;
      started.add(i);
      clearTimeout(timers[i]);
      const left = ctx.deadline - Date.now();
      if (settled || left < 200 || ctx.queries >= MAX_QUERIES) return void (++failed === TRIES_PER_ZONE && finish(null));
      const ns = order[i % order.length]; // a zone with 1-2 known servers still gets 3 tries
      const tcp = i === TRIES_PER_ZONE - 1;
      ctx.queries++;
      const t0 = Date.now();
      try {
        const a = await ask(ns.ip, name, type, { recursive: false, timeoutMs: Math.min(tcp ? TCP_TIMEOUT : UDP_TIMEOUT, left), tcp });
        finish({ reply: a.reply, ms: a.ms, ns });
      } catch (e: any) {
        const msg = String(e?.message || e);
        if (!settled) ctx.trace.push({ zone, server: ns.name, ip: ns.ip, depth: ctx.depth, ms: Date.now() - t0, result: 'error', detail: tcp ? `tcp ${msg}` : msg });
        if (++failed === TRIES_PER_ZONE) finish(null);
        else if (!settled) { // failed: start the next waiting one now
          for (let j = 0; j < TRIES_PER_ZONE; j++) if (!started.has(j)) { attempt(j); break; }
        }
      }
    };
    attempt(0);
    for (let i = 1; i < TRIES_PER_ZONE; i++) timers[i] = setTimeout(() => attempt(i), i * HEDGE_MS);
  });
}

/**
 * IPv4 addresses of the NS names in a referral: glue first (only for names
 * inside the asked server's own zone, so it cannot be forged), else look them up.
 */
async function nextServers(reply: DnsReply, zone: string, ctx: Ctx, depth: number): Promise<NameServer[]> {
  const names = [...new Set(reply.authority.filter((r) => r.type === 'NS').map((r) => r.data))];
  const glue = names.filter((n) => inZone(n, zone)).flatMap((n) =>
    reply.additional.filter((r) => r.type === 'A' && r.name === n).map((r) => ({ name: n, ip: r.data })));
  if (glue.length || depth >= 2) return glue;
  for (const n of shuffled(names).slice(0, 2)) {
    ctx.depth = depth + 1;
    const r = await resolveName(n, 'A', ctx, depth + 1);
    ctx.depth = depth;
    const ips = r.answers.filter((a) => a.type === 'A').map((a) => ({ name: n, ip: a.data }));
    if (ips.length) return ips;
  }
  return [];
}

async function resolveName(start: string, type: RecordType, ctx: Ctx, depth: number) {
  let name = normName(start);
  const chain: DnsRecord[] = [];
  let authority: NameServer | undefined;
  for (let hop = 0; hop <= MAX_CNAMES; hop++) {
    let { zone, servers, cached } = closest(name);
    if (cached) ctx.trace.push({ zone, server: servers[0].name, ip: servers[0].ip, depth: ctx.depth, ms: 0, cached, result: 'referral', detail: `cached: ${zone}` });
    let followed = false;
    for (let step = 0; step < MAX_STEPS && !followed; step++) {
      const got = await askZone(zone, servers, name, type, ctx);
      if (!got) return { status: 'SERVFAIL', answers: chain, authority };
      const { reply: r, ms, ns } = got;
      const base = { zone, server: ns.name, ip: ns.ip, ms, depth: ctx.depth };
      if (r.rcode === 'NXDOMAIN') {
        ctx.trace.push({ ...base, result: 'nxdomain', detail: 'NXDOMAIN' });
        return { status: 'NXDOMAIN', answers: chain, authority: ns };
      }
      if (r.rcode !== 'NOERROR') {
        ctx.trace.push({ ...base, result: 'error', detail: r.rcode });
        return { status: r.rcode, answers: chain, authority };
      }
      // Answers for our name, following CNAMEs inside the same reply, but only
      // inside this server's own zone (out-of-zone records could be forged).
      let found = false;
      for (let guard = 0; guard <= MAX_CNAMES && inZone(name, zone); guard++) {
        const direct = r.answers.filter((a) => a.name === name && a.type === type);
        if (direct.length) { chain.push(...direct); found = true; break; }
        const cname = r.answers.find((a) => a.name === name && a.type === 'CNAME');
        if (!cname) break;
        chain.push(cname);
        name = cname.data;
        followed = true;
      }
      if (found) {
        ctx.trace.push({ ...base, result: 'answer', detail: `${chain.length} record(s)` });
        return { status: 'NOERROR', answers: chain, authority: ns };
      }
      if (followed) {
        ctx.trace.push({ ...base, result: 'cname', detail: `-> ${name}` });
        authority = ns;
        break;
      }
      // Referral: must go one level deeper toward the name.
      const ns1 = r.authority.find((a) => a.type === 'NS');
      const child = ns1?.name;
      if (child === undefined || !inZone(name, child) || child.length <= zone.length || (zone !== '' && !inZone(child, zone))) {
        const nodata = r.aa || r.authority.some((a) => a.type === 'SOA');
        ctx.trace.push({ ...base, result: nodata ? 'nodata' : 'error', detail: nodata ? 'no records of this type' : 'bad referral' });
        return { status: nodata ? 'NOERROR' : 'SERVFAIL', answers: chain, authority: nodata ? ns : authority };
      }
      const next = await nextServers(r, zone, ctx, depth);
      ctx.trace.push({ ...base, result: 'referral', detail: `${child} (${next.length} server)` });
      if (!next.length) return { status: 'SERVFAIL', answers: chain, authority };
      remember(child, next, ns1!.ttl);
      zone = child;
      servers = next;
    }
    if (!followed) return { status: 'SERVFAIL', answers: chain, authority };
  }
  return { status: 'SERVFAIL', answers: chain, authority };
}

export async function resolveIterative(name: string, type: RecordType, timeoutMs = 8000): Promise<IterResult> {
  const start = Date.now();
  const ctx: Ctx = { deadline: start + timeoutMs, queries: 0, trace: [], depth: 0 };
  try {
    const r = await resolveName(name, type, ctx, 0);
    return { ...r, trace: ctx.trace, ms: Date.now() - start };
  } catch (e) {
    if (!(e instanceof Stop)) throw e;
    return { status: 'TIMEOUT', answers: [], trace: ctx.trace, ms: Date.now() - start };
  }
}
