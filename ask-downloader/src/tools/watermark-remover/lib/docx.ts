// Word (DOCX) watermark remover. Runs in the browser; the file is never sent.
// Word, LibreOffice and most converters put the watermark in the page
// header as a shape named "PowerPlusWaterMarkObject" (text) or
// "WordPictureWatermark" (picture), as VML (<w:pict>) or DrawingML
// (<w:drawing>), sometimes both inside <mc:AlternateContent>. Only those
// shapes are removed; the rest of the document stays byte-for-byte.
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import { cut, elements, type Span } from './xmlScan';

export type Removed = { part: string; kind: 'text' | 'picture'; text?: string };
export type DocxResult = { data: Uint8Array; removed: Removed[] };

export class NotDocx extends Error {}

const MARK = /(PowerPlusWaterMark|WordPictureWatermark|WaterMarkObject)/i;
const PARTS = /^word\/(header|footer|document|glossary\/document)\d*\.xml$/;
// Outermost wrapper first, so an AlternateContent goes as one piece.
const WRAPPERS = ['mc:AlternateContent', 'w:pict', 'w:drawing', 'w:object'];

function describe(xml: string): Removed['kind'] {
  return /WordPictureWatermark|v:imagedata|a:blip/i.test(xml) ? 'picture' : 'text';
}

function textOf(xml: string): string | undefined {
  const m = xml.match(/string="([^"]*)"/) || xml.match(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/);
  return m ? m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : undefined;
}

/** Removes watermark shapes from one XML part; returns the new XML and what went. */
export function stripPart(xml: string, part: string): { xml: string; removed: Removed[] } {
  const spans: Span[] = [];
  const removed: Removed[] = [];
  const inside = (s: Span) => spans.some((o) => s.start >= o.start && s.end <= o.end);
  for (const tag of WRAPPERS) {
    for (const s of elements(xml, tag)) {
      if (inside(s) || !MARK.test(s.xml)) continue;
      spans.push(s);
      removed.push({ part, kind: describe(s.xml), text: textOf(s.xml) });
    }
  }
  return spans.length ? { xml: cut(xml, spans), removed } : { xml, removed };
}

export function removeDocxWatermark(file: Uint8Array): DocxResult {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(file);
  } catch {
    throw new NotDocx('not a zip');
  }
  if (!files['word/document.xml']) throw new NotDocx('no word/document.xml');

  const removed: Removed[] = [];
  const out: Zippable = {};
  for (const [name, data] of Object.entries(files)) {
    if (PARTS.test(name)) {
      const r = stripPart(strFromU8(data), name);
      if (r.removed.length) {
        removed.push(...r.removed);
        out[name] = strToU8(r.xml);
        continue;
      }
    }
    // Media (already compressed) are stored as is; XML is deflated.
    out[name] = [data, { level: /\.(png|jpe?g|gif|emf|wmf|mp4)$/i.test(name) ? 0 : 6 }];
  }
  return { data: removed.length ? zipSync(out) : file, removed };
}
