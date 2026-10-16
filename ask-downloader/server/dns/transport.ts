/**
 * Sends one DNS query: UDP port 53, TCP when the reply is cut (TC flag),
 * or DNS-over-HTTPS (RFC 8484, port 443) when the host blocks port 53.
 */
import dgram from 'dgram';
import net from 'net';
import { randomInt } from 'crypto';
import { decodeReply, encodeQuery, normName, type DnsReply, type RecordType } from './packet.ts';

export type Via = 'udp' | 'tcp' | 'doh';
export type Answer = { reply: DnsReply; ms: number; via: Via };

const MAX_REPLY = 65535;
const RESEND_MS = 900;

/** Accept only the reply to our own question (guards against spoofed packets). */
function check(buf: Buffer, id: number, name: string): DnsReply {
  const reply = decodeReply(buf);
  if (reply.id !== id || reply.qname !== normName(name)) throw new Error('mismatched reply');
  return reply;
}

function overUdp(ip: string, query: Buffer, id: number, name: string, timeoutMs: number): Promise<DnsReply> {
  return new Promise((resolve, reject) => {
    const sock = dgram.createSocket(net.isIPv6(ip) ? 'udp6' : 'udp4');
    let finished = false;
    const done = (err: Error | null, reply?: DnsReply) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      clearTimeout(again);
      sock.close();
      err ? reject(err) : resolve(reply!);
    };
    const send = () => sock.send(query, 53, ip, (e) => e && done(e));
    const timer = setTimeout(() => done(new Error('timeout')), timeoutMs);
    // UDP packets get lost now and then: send the same question once more.
    const again = setTimeout(() => !finished && send(), Math.min(RESEND_MS, timeoutMs / 2));
    sock.on('error', (e) => done(e));
    sock.on('message', (msg, from) => {
      if (from.address !== ip) return; // not from the server we asked
      try { done(null, check(msg, id, name)); } catch { /* wrong packet: keep waiting */ }
    });
    send();
  });
}

function overTcp(ip: string, query: Buffer, id: number, name: string, timeoutMs: number): Promise<DnsReply> {
  return new Promise((resolve, reject) => {
    const sock = net.connect({ host: ip, port: 53 });
    let data = Buffer.alloc(0);
    const done = (err: Error | null, reply?: DnsReply) => {
      clearTimeout(timer);
      sock.destroy();
      err ? reject(err) : resolve(reply!);
    };
    const timer = setTimeout(() => done(new Error('timeout')), timeoutMs);
    sock.on('error', (e) => done(e));
    sock.on('connect', () => {
      const len = Buffer.alloc(2);
      len.writeUInt16BE(query.length);
      sock.write(Buffer.concat([len, query]));
    });
    sock.on('data', (chunk) => {
      data = Buffer.concat([data, chunk]);
      if (data.length > MAX_REPLY + 2) return done(new Error('reply too big'));
      if (data.length >= 2 && data.length >= 2 + data.readUInt16BE(0)) {
        try { done(null, check(data.subarray(2, 2 + data.readUInt16BE(0)), id, name)); } catch (e: any) { done(e); }
      }
    });
  });
}

async function overDoh(url: string, query: Buffer, id: number, name: string, timeoutMs: number): Promise<DnsReply> {
  const ctrl = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  // Hard limit: the abort alone was once seen to fire late (connect stage).
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { ctrl.abort(); reject(new Error('timeout')); }, timeoutMs);
  });
  const run = async () => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/dns-message', accept: 'application/dns-message' },
      body: new Uint8Array(query),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`doh ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_REPLY) throw new Error('reply too big');
    return check(buf, id, name);
  };
  try {
    return await Promise.race([run(), limit]);
  } finally {
    clearTimeout(timer);
  }
}

/** `server` is an IP address (port 53) or an https:// DoH endpoint. */
export async function ask(
  server: string, name: string, type: RecordType, opts: { recursive: boolean; timeoutMs: number; tcp?: boolean },
): Promise<Answer> {
  const id = randomInt(0, 0x10000);
  const query = encodeQuery(name, type, id, opts.recursive);
  const start = Date.now();
  if (server.startsWith('https://')) {
    const reply = await overDoh(server, query, id, name, opts.timeoutMs);
    return { reply, ms: Date.now() - start, via: 'doh' };
  }
  if (opts.tcp) {
    const reply = await overTcp(server, query, id, name, opts.timeoutMs);
    return { reply, ms: Date.now() - start, via: 'tcp' };
  }
  const reply = await overUdp(server, query, id, name, opts.timeoutMs);
  if (!reply.tc) return { reply, ms: Date.now() - start, via: 'udp' };
  const left = Math.max(500, opts.timeoutMs - (Date.now() - start));
  return { reply: await overTcp(server, query, id, name, left), ms: Date.now() - start, via: 'tcp' };
}
