/**
 * Makes an uploaded SVG safe to show on the site.
 *
 * An SVG is a small program as much as a picture: it can carry <script>,
 * onload="…" handlers, javascript: links and references to other sites.
 * Rather than trying to spot every bad thing, this keeps only known drawing
 * elements and attributes (an allow-list) and drops everything else.
 * The file is also served with a strict Content-Security-Policy (see
 * uploadHeaders), so even a missed trick could not run.
 */
import * as cheerio from 'cheerio';

const ELEMENTS = new Set([
  'svg', 'g', 'defs', 'symbol', 'use', 'title', 'desc', 'metadata',
  'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'text', 'tspan', 'textpath',
  'lineargradient', 'radialgradient', 'stop', 'pattern', 'clippath', 'mask', 'marker',
  'filter', 'feblend', 'fecolormatrix', 'fecomponenttransfer', 'fecomposite', 'feconvolvematrix',
  'fediffuselighting', 'fedisplacementmap', 'fedistantlight', 'fedropshadow', 'feflood',
  'fefunca', 'fefuncb', 'fefuncg', 'fefuncr', 'fegaussianblur', 'femerge', 'femergenode',
  'femorphology', 'feoffset', 'fepointlight', 'fespecularlighting', 'fespotlight', 'fetile', 'feturbulence',
]);

/** Attributes in another namespace are dropped, except these. */
const NAMESPACED_OK = new Set(['xmlns', 'xmlns:xlink', 'xlink:href', 'xml:space', 'xml:lang']);

/** A reference is safe only when it points inside the same file (#id). */
const internalOnly = (v: string) => /^\s*#[\w.-]*\s*$/.test(v);

/** url(...) inside a value must also point inside the file. */
function safeValue(v: string): boolean {
  const s = v.replace(/[\u0000-\u001f\s]+/g, '').toLowerCase();
  if (/javascript:|vbscript:|data:|expression\(|@import|behavior:|-moz-binding/.test(s)) return false;
  for (const m of s.matchAll(/url\(([^)]*)\)/g)) {
    if (!/^['"]?#/.test(m[1])) return false;
  }
  return true;
}

export type SvgResult = { ok: boolean; svg?: string; error?: string };

export function sanitizeSvg(source: string): SvgResult {
  const text = String(source || '').replace(/^﻿/, '');
  // DOCTYPE/ENTITY can define entities that blow up in size or read files.
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) return { ok: false, error: 'SVG files with a DOCTYPE are not allowed.' };
  if (!/<svg[\s>]/i.test(text)) return { ok: false, error: 'This is not an SVG image.' };

  let $: cheerio.CheerioAPI;
  try {
    $ = cheerio.load(text, { xml: true });
  } catch {
    return { ok: false, error: 'This SVG could not be read.' };
  }

  const root = $.root().children().filter((_, el) => (el as any).name?.toLowerCase() === 'svg').first();
  if (!root.length) return { ok: false, error: 'This is not an SVG image.' };

  // Walk the tree, dropping unknown elements (with everything inside them)
  // and any unsafe attribute. Only text and allowed elements are kept; comments, CDATA (only ever
  // needed for <style>/<script>, neither of which is kept) and processing
  // instructions go too.
  const clean = (node: any) => {
    // A link (<a>) is removed but the drawing inside it is kept.
    const flat = (node.children || []).flatMap((child: any) =>
      child.type === 'tag' && String(child.name).toLowerCase() === 'a' ? child.children || [] : [child]
    );
    const kept = flat.filter((child: any) =>
      child.type === 'text' || (child.type === 'tag' && ELEMENTS.has(String(child.name).toLowerCase()))
    );
    kept.forEach((child: any, i: number) => {
      child.parent = node;
      child.prev = kept[i - 1] || null;
      child.next = kept[i + 1] || null;
    });
    node.children = kept;
    for (const child of kept) {
      if (child.type !== 'tag') continue;
      for (const [name, value] of Object.entries(child.attribs || {})) {
        const n = name.toLowerCase();
        const v = String(value);
        const drop =
          n.startsWith('on') ||
          (n.includes(':') && !NAMESPACED_OK.has(n)) ||
          ((n === 'href' || n === 'xlink:href') && !internalOnly(v)) ||
          (n !== 'xmlns' && n !== 'xmlns:xlink' && !safeValue(v));
        if (drop) delete child.attribs[name];
      }
      clean(child);
    }
  };
  const svgEl: any = root.get(0);
  let out = '';
  try {
    // The root's own attributes get the same treatment as its children's.
    clean({ children: [svgEl] });
    out = $.xml(root).trim();
  } catch {
    return { ok: false, error: 'This SVG could not be cleaned safely.' };
  }
  if (!out.startsWith('<svg')) return { ok: false, error: 'This SVG could not be cleaned safely.' };
  return { ok: true, svg: out };
}
