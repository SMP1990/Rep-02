/**
 * DNS wire format (RFC 1035): builds one query and reads a reply.
 * Own code, no library: Node's built-in `dns` cannot read referrals
 * (authority + glue), which iterative resolution needs.
 */
export const TYPES = { A: 1, NS: 2, CNAME: 5, SOA: 6, MX: 15, TXT: 16, AAAA: 28, CAA: 257 } as const;
export type RecordType = keyof typeof TYPES;
const TYPE_NAME = new Map<number, RecordType>(Object.entries(TYPES).map(([k, v]) => [v, k as RecordType]));
const OPT = 41;

export const RCODES = ['NOERROR', 'FORMERR', 'SERVFAIL', 'NXDOMAIN', 'NOTIMP', 'REFUSED'];

export type DnsRecord = { name: string; type: RecordType; ttl: number; data: string };
export type DnsReply = {
  id: number; aa: boolean; tc: boolean; rcode: string;
  qname: string; qtype: number;
  answers: DnsRecord[]; authority: DnsRecord[]; additional: DnsRecord[];
};

export function isRecordType(v: unknown): v is RecordType {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(TYPES, v);
}

/** Lower case, no trailing dot ("" is the root). */
export function normName(name: string): string {
  return name.toLowerCase().replace(/\.$/, '');
}

/** Query with EDNS0 (1232-byte UDP replies, the DNS Flag Day size). */
export function encodeQuery(name: string, type: RecordType, id: number, recursive: boolean): Buffer {
  const labels = normName(name).split('.').filter(Boolean);
  const qname = Buffer.concat([
    ...labels.map((l) => Buffer.concat([Buffer.from([Buffer.byteLength(l)]), Buffer.from(l)])),
    Buffer.from([0]),
  ]);
  const head = Buffer.alloc(12);
  head.writeUInt16BE(id, 0);
  head.writeUInt16BE(recursive ? 0x0100 : 0, 2);
  head.writeUInt16BE(1, 4); // one question
  head.writeUInt16BE(1, 10); // one additional: OPT
  const q = Buffer.alloc(4);
  q.writeUInt16BE(TYPES[type], 0);
  q.writeUInt16BE(1, 2); // class IN
  const opt = Buffer.from([0, 0, OPT, 0x04, 0xd0, 0, 0, 0, 0, 0, 0]);
  return Buffer.concat([head, qname, q, opt]);
}

/** Reads a (possibly compressed) name; returns it and the offset after it. */
function readName(buf: Buffer, start: number): [string, number] {
  const labels: string[] = [];
  let pos = start;
  let end = -1;
  for (let jumps = 0; ; ) {
    const len = buf[pos];
    if (len === undefined) throw new Error('bad name');
    if (len === 0) { pos += 1; break; }
    if ((len & 0xc0) === 0xc0) {
      if (++jumps > 20) throw new Error('name loop');
      if (end < 0) end = pos + 2;
      pos = buf.readUInt16BE(pos) & 0x3fff;
      continue;
    }
    if (pos + 1 + len > buf.length) throw new Error('bad name');
    labels.push(buf.toString('latin1', pos + 1, pos + 1 + len));
    pos += 1 + len;
  }
  return [normName(labels.join('.')), end < 0 ? pos : end];
}

/** RFC 5952 text: the longest run (2+) of zero groups becomes "::". */
function ipv6(b: Buffer): string {
  const g: number[] = [];
  for (let i = 0; i < 16; i += 2) g.push(b.readUInt16BE(i));
  let best = -1, bestLen = 1;
  for (let i = 0; i < 8; ) {
    if (g[i] !== 0) { i++; continue; }
    let j = i;
    while (j < 8 && g[j] === 0) j++;
    if (j - i > bestLen) { best = i; bestLen = j - i; }
    i = j;
  }
  const hex = (a: number[]) => a.map((n) => n.toString(16)).join(':');
  return best < 0 ? hex(g) : `${hex(g.slice(0, best))}::${hex(g.slice(best + bestLen))}`;
}

function txtStrings(b: Buffer): string[] {
  const out: string[] = [];
  for (let i = 0; i < b.length; i += 1 + b[i]) out.push(b.toString('utf8', i + 1, i + 1 + b[i]));
  return out;
}

/** Record data as dig shows it; null for types this tool does not show. */
function readData(buf: Buffer, type: number, at: number, len: number): string | null {
  const rd = buf.subarray(at, at + len);
  switch (type) {
    case TYPES.A: return len === 4 ? [...rd].join('.') : null;
    case TYPES.AAAA: return len === 16 ? ipv6(rd) : null;
    case TYPES.NS: case TYPES.CNAME: return readName(buf, at)[0];
    case TYPES.MX: return `${rd.readUInt16BE(0)} ${readName(buf, at + 2)[0]}`;
    case TYPES.TXT: return txtStrings(rd).join('');
    case TYPES.SOA: {
      const [mname, p1] = readName(buf, at);
      const [rname, p2] = readName(buf, p1);
      const n = [0, 4, 8, 12, 16].map((o) => buf.readUInt32BE(p2 + o));
      return `${mname} ${rname} ${n.join(' ')}`;
    }
    case TYPES.CAA: {
      const tagLen = rd[1];
      return `${rd[0]} ${rd.toString('latin1', 2, 2 + tagLen)} "${rd.toString('utf8', 2 + tagLen)}"`;
    }
    default: return null;
  }
}

export function decodeReply(buf: Buffer): DnsReply {
  if (buf.length < 12) throw new Error('short reply');
  const flags = buf.readUInt16BE(2);
  if (!(flags & 0x8000)) throw new Error('not a reply');
  const counts = [4, 6, 8, 10].map((o) => buf.readUInt16BE(o));
  let pos = 12;
  let qname = '';
  let qtype = 0;
  for (let i = 0; i < counts[0]; i++) {
    [qname, pos] = readName(buf, pos);
    qtype = buf.readUInt16BE(pos);
    pos += 4;
  }
  const sections: DnsRecord[][] = [[], [], []];
  for (let s = 0; s < 3; s++) {
    for (let i = 0; i < counts[s + 1]; i++) {
      const [name, p] = readName(buf, pos);
      if (p + 10 > buf.length) throw new Error('short record');
      const type = buf.readUInt16BE(p);
      const ttl = buf.readUInt32BE(p + 4);
      const len = buf.readUInt16BE(p + 8);
      pos = p + 10 + len;
      if (pos > buf.length) throw new Error('short record');
      const typeName = TYPE_NAME.get(type);
      if (!typeName || type === OPT) continue;
      const data = readData(buf, type, p + 10, len);
      if (data !== null) sections[s].push({ name, type: typeName, ttl, data });
    }
  }
  return {
    id: buf.readUInt16BE(0),
    aa: !!(flags & 0x0400),
    tc: !!(flags & 0x0200),
    rcode: RCODES[flags & 0xf] ?? `RCODE${flags & 0xf}`,
    qname, qtype,
    answers: sections[0], authority: sections[1], additional: sections[2],
  };
}
