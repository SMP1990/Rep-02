const sharp = require('F:/ask-downloader/ask-downloader/node_modules/sharp');
const fs = require('fs');
(async () => {
  const dir = process.argv[2], per = 6, w = 430, h = 573;
  const files = fs.readdirSync(dir).filter((f) => /^p\d+\.png$/.test(f)).sort();
  for (let s = 0; s * per < files.length; s++) {
    const group = files.slice(s * per, s * per + per);
    const comps = [];
    for (let i = 0; i < group.length; i++) {
      const buf = await sharp(`${dir}/${group[i]}`).extract({ left: 52, top: 0, width: 796, height: 1120 }).resize(w, h, { fit: 'fill' }).toBuffer();
      comps.push({ input: buf, left: (i % 3) * (w + 8) + 4, top: Math.floor(i / 3) * (h + 8) + 4 });
    }
    await sharp({ create: { width: 3 * (w + 8) + 4, height: 2 * (h + 8) + 4, channels: 3, background: '#888' } }).composite(comps).png().toFile(`${dir}/sheet${s + 1}.png`);
    console.log('sheet', s + 1, group.join(' '));
  }
})();
