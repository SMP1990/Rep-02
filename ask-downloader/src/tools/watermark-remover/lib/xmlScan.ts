// Finds whole XML elements by tag name (with nesting) in a string, without
// a full parser: Office XML is machine-written, so tags are well formed.

export type Span = { start: number; end: number; xml: string };

/** Every outermost <tag ...>...</tag> (or <tag/>) in `xml`. */
export function elements(xml: string, tag: string): Span[] {
  const out: Span[] = [];
  const open = new RegExp(`<${tag}(?=[\\s>/])`, 'g');
  let m: RegExpExecArray | null;
  while ((m = open.exec(xml))) {
    const end = closeOf(xml, tag, m.index);
    if (end < 0) break; // broken XML: leave it alone
    out.push({ start: m.index, end, xml: xml.slice(m.index, end) });
    open.lastIndex = end;
  }
  return out;
}

/** Index just after the element that starts at `from`, or -1. */
function closeOf(xml: string, tag: string, from: number): number {
  const re = new RegExp(`<(/?)${tag}(?=[\\s>/])[^>]*?(/?)>`, 'g');
  re.lastIndex = from;
  let depth = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    if (m[1]) depth--; // </tag>
    else if (!m[2]) depth++; // <tag ...>
    else if (depth === 0) return re.lastIndex; // <tag .../> at top level
    if (depth === 0) return re.lastIndex;
  }
  return -1;
}

/** Removes the given spans (they must not overlap). */
export function cut(xml: string, spans: Span[]): string {
  let out = '';
  let at = 0;
  for (const s of [...spans].sort((a, b) => a.start - b.start)) {
    out += xml.slice(at, s.start);
    at = s.end;
  }
  return out + xml.slice(at);
}
