// PDF watermark remover. Runs in the browser; the file is never sent.
// pdf-lib (@cantoo fork, MIT: also opens owner-password protected PDFs)
// reads and writes the file; pdfScan.ts decides what to cut on each page.
import {
  PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber, PDFRawStream, PDFRef, PDFStream, decodePDFRawStream,
} from '@cantoo/pdf-lib';
import { scanContent, type Kind, type Lookup } from './pdfScan';

export type PdfResult = { data: Uint8Array; pages: number; changedPages: number; found: Partial<Record<Kind, number>> };
export class PdfPasswordNeeded extends Error {}
export class NotPdf extends Error {}

// Watermark layer names in the languages Acrobat and others use.
const WM_NAME = /water\s*mark|wasserzeichen|filigran|marca\s+d[e'’]\s*[aá]gua|marca de agua|透かし|水印|워터마크|водяной/i;

/** Bytes <-> one char per byte (TextDecoder 'latin1' is really windows-1252). */
function bytesToStr(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return s;
}

function str(v: unknown): string {
  const any = v as { decodeText?: () => string; asString?: () => string } | undefined;
  return any?.decodeText?.() ?? any?.asString?.() ?? String(v ?? '');
}

export async function removePdfWatermark(bytes: Uint8Array, opts: { strong?: boolean; password?: string } = {}): Promise<PdfResult> {
  if (!bytesToStr(bytes.subarray(0, 1024)).includes('%PDF-')) throw new NotPdf('no PDF header');
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { password: opts.password ?? '', updateMetadata: false, ignoreEncryption: false });
  } catch (e: any) {
    if (/password|encrypt/i.test(String(e?.message))) throw new PdfPasswordNeeded(String(e.message));
    throw new NotPdf(String(e?.message || e));
  }
  const ctx = doc.context;
  const lookup = <T>(v: unknown, type?: { prototype: T }): T | undefined => {
    const o = v instanceof PDFRef ? ctx.lookup(v) : v;
    return !type || o instanceof (type as unknown as typeof Object) ? (o as T) : undefined;
  };
  const isWmLayer = (ref: unknown): boolean => {
    const ocg = lookup(ref, PDFDict);
    if (!ocg) return false;
    if (WM_NAME.test(str(ocg.lookup(PDFName.of('Name'))))) return true;
    const ocgs = ocg.lookup(PDFName.of('OCGs')); // an OCMD: any of its layers
    return ocgs instanceof PDFArray ? ocgs.asArray().some(isWmLayer) : !!ocgs && isWmLayer(ocgs);
  };

  const found: Partial<Record<Kind, number>> = {};
  let changedPages = 0;
  const pages = doc.getPages();
  for (const page of pages) {
    let changed = false;
    // Watermark annotations
    const annots = page.node.Annots();
    if (annots) {
      const keep = annots.asArray().filter((a) => lookup(a, PDFDict)?.lookup(PDFName.of('Subtype'))?.toString() !== '/Watermark');
      if (keep.length !== annots.size()) {
        found.artifact = (found.artifact ?? 0) + annots.size() - keep.length;
        page.node.set(PDFName.of('Annots'), ctx.obj(keep));
        changed = true;
      }
    }
    const res = page.node.Resources();
    const sub = (key: string) => res?.lookupMaybe(PDFName.of(key), PDFDict);
    const gsDict = sub('ExtGState'), props = sub('Properties'), xobjs = sub('XObject');
    const look: Lookup = {
      gs(name) {
        const d = gsDict && lookup(gsDict.get(PDFName.of(name)), PDFDict);
        const num = (k: string) => { const n = d?.lookup(PDFName.of(k)); return n instanceof PDFNumber ? n.asNumber() : undefined; };
        return { ca: num('ca'), CA: num('CA') };
      },
      layer: (name) => !!props && isWmLayer(props.get(PDFName.of(name))),
      xobject(name) {
        const x = xobjs && lookup(xobjs.get(PDFName.of(name)), PDFStream);
        if (!x) return false;
        if (isWmLayer(x.dict.get(PDFName.of('OC')))) return true;
        const piece = x.dict.lookup(PDFName.of('PieceInfo'));
        return !!piece && /ADBE_CompoundType[\s\S]*\/Watermark/.test(piece.toString());
      },
    };
    // Content stream(s) -> one string
    const c = page.node.Contents();
    const streams = c instanceof PDFArray ? c.asArray().map((r) => lookup(r, PDFStream)) : [c];
    let content = '';
    try {
      for (const s of streams) {
        if (!s) continue;
        const raw = s instanceof PDFRawStream ? decodePDFRawStream(s).decode() : (s as any).getContents();
        content += bytesToStr(raw) + '\n';
      }
    } catch {
      continue; // a filter we cannot read: leave this page as it is
    }
    const r = scanContent(content, look, !!opts.strong);
    if (r.found.length) {
      for (const k of r.found) found[k] = (found[k] ?? 0) + 1;
      const out = Uint8Array.from(r.content, (ch) => ch.charCodeAt(0) & 0xff);
      page.node.set(PDFName.of('Contents'), ctx.register(ctx.flateStream(out)));
      changed = true;
    }
    if (changed) changedPages++;
  }
  const data = changedPages ? await doc.save() : bytes;
  return { data, pages: pages.length, changedPages, found };
}
