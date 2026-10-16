// Finds watermark drawing steps in one page's content stream. Pure logic:
// the PDF objects it needs come in through `Lookup`, so it can be tested
// without a PDF library.
//
// What counts as a watermark (in this order of certainty):
//  1. marked content /Artifact <</Subtype /Watermark>> (Acrobat, many tools)
//  2. content or forms on an optional-content layer named "Watermark"
//  3. forms tagged by Acrobat as watermark (PieceInfo ADBE_CompoundType)
//  4. shapes/text drawn semi-transparent inside a page header/footer
//     artifact: how Word exports its watermark to PDF
//  5. (strong mode only) semi-transparent rotated text anywhere
import { parseOps, without, type Op } from './pdfOps';

export type Kind = 'artifact' | 'layer' | 'stamp' | 'header' | 'text';
export type Lookup = {
  /** fill (ca) and stroke (CA) alpha of an ExtGState name, if set */
  gs(name: string): { ca?: number; CA?: number };
  /** is this /Properties name (a layer) a watermark layer? */
  layer(name: string): boolean;
  /** is this XObject name a watermark form (layer or Acrobat tag)? */
  xobject(name: string): boolean;
};

const PATH_BUILD = new Set(['m', 'l', 'c', 'v', 'y', 'h', 're']);
const PAINT = new Set(['f', 'F', 'f*', 'B', 'B*', 'b', 'b*', 'S', 's']);
const WM_PROPS = /\/Subtype\s*\/Watermark\b/;
const HEADER_PROPS = /\/(Header|Footer)\b/;

type State = { ca: number; CA: number };
type Block = { kind: 'wm' | 'header' | 'other'; start: number; why?: Kind };

export function scanContent(content: string, look: Lookup, strong: boolean) {
  const ops = parseOps(content);
  const cuts: [number, number][] = [];
  const found: Kind[] = [];
  const marks: Block[] = [];
  const gstack: State[] = [];
  let g: State = { ca: 1, CA: 1 };
  let pathStart = -1;
  let text: { start: number; rotated: boolean; ca: number } | null = null;

  const inHeader = () => marks.some((b) => b.kind === 'header');
  const inWm = () => marks.some((b) => b.kind === 'wm');
  const add = (a: number, b: number, why: Kind) => { cuts.push([a, b]); found.push(why); };

  for (const o of ops) {
    switch (o.op) {
      case 'q': gstack.push({ ...g }); break;
      case 'Q': g = gstack.pop() ?? { ca: 1, CA: 1 }; break;
      case 'gs': {
        const v = look.gs(o.args[0]?.slice(1) ?? '');
        if (v.ca !== undefined) g.ca = v.ca;
        if (v.CA !== undefined) g.CA = v.CA;
        break;
      }
      case 'BDC': case 'BMC': {
        const [tag, props = ''] = o.args;
        let b: Block = { kind: 'other', start: o.start };
        if (tag === '/Artifact' && WM_PROPS.test(props)) b = { kind: 'wm', start: o.start, why: 'artifact' };
        else if (tag === '/OC' && props.startsWith('/') && look.layer(props.slice(1))) b = { kind: 'wm', start: o.start, why: 'layer' };
        else if (tag === '/Artifact' && HEADER_PROPS.test(props)) b = { kind: 'header', start: o.start };
        marks.push(b);
        break;
      }
      case 'EMC': {
        const b = marks.pop();
        if (b?.kind === 'wm' && !inWm()) add(b.start, o.end, b.why!);
        break;
      }
      case 'BT': text = { start: o.start, rotated: false, ca: g.ca }; break;
      case 'Tm': {
        const [, b, c] = o.args.map(Number);
        if (text && (Math.abs(b) > 0.01 || Math.abs(c) > 0.01)) text.rotated = true;
        break;
      }
      case 'ET': {
        if (text && !inWm()) {
          const faint = Math.min(text.ca, g.ca) < 1;
          if ((faint || strong) && inHeader() && text.rotated) add(text.start, o.end, 'header');
          else if (faint && strong && text.rotated) add(text.start, o.end, 'text');
        }
        text = null;
        break;
      }
      case 'Do': {
        const name = o.args[0]?.slice(1) ?? '';
        if (!inWm() && look.xobject(name)) add(o.start, o.end, 'stamp');
        else if (!inWm() && inHeader() && g.ca < 1) add(o.start, o.end, 'header');
        break;
      }
      default:
        if (PATH_BUILD.has(o.op)) { if (pathStart < 0) pathStart = o.start; }
        else if (PAINT.has(o.op) || o.op === 'n') {
          const faint = /[SsBb]/.test(o.op) && !/[fF]/.test(o.op) ? g.CA < 1 : g.ca < 1;
          if (o.op !== 'n' && pathStart >= 0 && !text && !inWm() && inHeader() && (faint || strong)) add(pathStart, o.end, 'header');
          pathStart = -1;
        }
    }
  }
  return { content: without(content, cuts), found, ops: ops.length };
}

export type { Op };
