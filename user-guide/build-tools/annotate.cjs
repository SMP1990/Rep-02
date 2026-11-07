// Draws numbered red boxes on a screenshot. rects are in image pixels: [{n, x, y, width, height}]
const sharp = require('F:/ask-downloader/ask-downloader/node_modules/sharp');
const fs = require('fs');

module.exports = async function annotate(inFile, outFile, rects, dsf = 1.5) {
  const meta = await sharp(inFile).metadata();
  const pad = 4 * dsf, r = 11 * dsf;
  const parts = rects.map(({ n, x, y, width, height, pos }) => {
    const bx = Math.max(2, x - pad), by = Math.max(2, y - pad), bw = width + pad * 2, bh = height + pad * 2;
    // number badge: on the top-left corner of the box; for wide boxes (full-width text lines) on the top-right corner so it never hides the first letters
    const wide = pos === 'r' || bw > meta.width * 0.35;
    const cx = Math.min(meta.width - r - 2, Math.max(r + 2, wide ? bx + bw - 4 : bx + 2)), cy = Math.min(meta.height - r - 2, Math.max(r + 2, by));
    return `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${6 * dsf}" fill="none" stroke="#e11d48" stroke-width="${2.2 * dsf}"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#e11d48" stroke="#ffffff" stroke-width="${1.5 * dsf}"/>
      <text x="${cx}" y="${cy + 5 * dsf}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${14 * dsf}" fill="#ffffff" text-anchor="middle">${n}</text>`;
  }).join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${meta.width}" height="${meta.height}">${parts}</svg>`;
  await sharp(inFile).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toFile(outFile);
};
