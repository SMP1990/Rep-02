// Splits a PDF content stream (as a latin1 string) into operations:
// operands + operator, with their positions, so whole drawing steps can be
// cut out without touching anything else. Handles strings, hex strings,
// dictionaries, arrays, comments and inline images (BI ... ID ... EI).

export type Op = { op: string; args: string[]; start: number; end: number };

const WS = /[\0\t\n\f\r ]/;
const DELIM = /[()<>[\]{}/%\0\t\n\f\r ]/;

export function parseOps(s: string): Op[] {
  const ops: Op[] = [];
  let args: string[] = [];
  let opStart = -1;
  let i = 0;
  const n = s.length;
  const begin = (at: number) => { if (opStart < 0) opStart = at; };

  while (i < n) {
    const ch = s[i];
    if (WS.test(ch)) { i++; continue; }
    if (ch === '%') { while (i < n && s[i] !== '\n' && s[i] !== '\r') i++; continue; }
    const at = i;
    if (ch === '(') { // literal string with nesting and escapes
      let depth = 0;
      for (; i < n; i++) {
        if (s[i] === '\\') { i++; continue; }
        if (s[i] === '(') depth++;
        else if (s[i] === ')' && --depth === 0) { i++; break; }
      }
    } else if (ch === '<' && s[i + 1] === '<') { // dictionary
      let depth = 0;
      for (; i < n; i++) {
        if (s[i] === '(') { i = skipString(s, i) - 1; continue; }
        if (s[i] === '<' && s[i + 1] === '<') { depth++; i++; }
        else if (s[i] === '>' && s[i + 1] === '>') { i++; if (--depth === 0) { i++; break; } }
      }
    } else if (ch === '<') { i = s.indexOf('>', i) + 1 || n; }
    else if (ch === '[') { // array
      let depth = 0;
      for (; i < n; i++) {
        if (s[i] === '(') { i = skipString(s, i) - 1; continue; }
        if (s[i] === '[') depth++;
        else if (s[i] === ']' && --depth === 0) { i++; break; }
      }
    } else if (ch === '/') { i++; while (i < n && !DELIM.test(s[i])) i++; }
    else if (/[-+.\d]/.test(ch)) { i++; while (i < n && /[-+.\d]/.test(s[i])) i++; }
    else { // operator
      while (i < n && !DELIM.test(s[i])) i++;
      if (i === at) { i++; continue; } // stray delimiter
      const op = s.slice(at, i);
      begin(at);
      if (op === 'true' || op === 'false' || op === 'null') { args.push(op); continue; }
      if (op === 'BI') { // inline image: skip to the EI that ends it
        const id = s.indexOf('ID', i);
        let ei = id < 0 ? -1 : s.indexOf('EI', id + 3);
        while (ei > 0 && !(WS.test(s[ei - 1]) && (ei + 2 >= n || DELIM.test(s[ei + 2])))) ei = s.indexOf('EI', ei + 2);
        i = ei < 0 ? n : ei + 2;
        ops.push({ op: 'BI', args, start: opStart, end: i });
      } else {
        ops.push({ op, args, start: opStart, end: i });
      }
      args = [];
      opStart = -1;
      continue;
    }
    begin(at);
    args.push(s.slice(at, i));
  }
  return ops;
}

function skipString(s: string, i: number): number {
  let depth = 0;
  for (; i < s.length; i++) {
    if (s[i] === '\\') { i++; continue; }
    if (s[i] === '(') depth++;
    else if (s[i] === ')' && --depth === 0) return i + 1;
  }
  return s.length;
}

/** The content with the given operation ranges removed. */
export function without(s: string, ranges: [number, number][]): string {
  if (!ranges.length) return s;
  ranges.sort((a, b) => a[0] - b[0]);
  let out = '';
  let at = 0;
  for (const [a, b] of ranges) {
    if (a < at) continue;
    out += s.slice(at, a) + ' ';
    at = b;
  }
  return out + s.slice(at);
}
