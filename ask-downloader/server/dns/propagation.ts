/**
 * Propagation check (MassDNS's idea, small scale): the same question to many
 * public resolvers at once, with a cap on how many run together so the
 * shared server and the resolvers are never flooded.
 */
import type { DnsRecord, RecordType } from './packet.ts';
import { RESOLVERS, type PublicResolver } from './resolvers.ts';
import { ask, type Via } from './transport.ts';

export type ResolverResult = {
  id: string; name: string; cc: string;
  ok: boolean; status: string; answers: DnsRecord[]; ms: number; via?: Via;
};

const PARALLEL = 8;
const TIMEOUT = 2500;

async function one(r: PublicResolver, name: string, type: RecordType, useDoh: boolean): Promise<ResolverResult> {
  const base = { id: r.id, name: r.name, cc: r.cc };
  const server = useDoh ? r.doh : r.ip;
  if (!server) return { ...base, ok: false, status: 'SKIPPED', answers: [], ms: 0 };
  const start = Date.now();
  try {
    const a = await ask(server, name, type, { recursive: true, timeoutMs: TIMEOUT });
    return { ...base, ok: a.reply.rcode === 'NOERROR', status: a.reply.rcode, answers: a.reply.answers, ms: a.ms, via: a.via };
  } catch (e: any) {
    const status = /timeout|abort/i.test(String(e?.message || e?.name)) ? 'TIMEOUT' : 'ERROR';
    return { ...base, ok: false, status, answers: [], ms: Date.now() - start };
  }
}

/** Runs `tasks` with at most `limit` in flight; keeps the input order. */
export async function pool<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const out = new Array<T>(tasks.length);
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const i = next++;
      out[i] = await tasks[i]();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return out;
}

export function checkPropagation(name: string, type: RecordType, useDoh: boolean): Promise<ResolverResult[]> {
  const list = useDoh ? RESOLVERS.filter((r) => r.doh) : RESOLVERS;
  return pool(list.map((r) => () => one(r, name, type, useDoh)), PARALLEL);
}
