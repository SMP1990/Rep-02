const fs = require('fs'), path = require('path');
const { start } = require('./cdp.cjs');
const DIR = 'F:/ask-downloader/user-guide';
const parts = ['part1', 'part2a', 'part2b', 'part3'].map((p) => fs.readFileSync(`${DIR}/src/${p}.html`, 'utf8')).join('\n');
const css = fs.readFileSync(`${DIR}/src/style.css`, 'utf8');
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Trending Sounds - User Guide</title>
<style>${css}</style></head><body>
${parts}
</body></html>`;
fs.writeFileSync(`${DIR}/Sounds-User-Guide.html`, html);
console.log('html written', Math.round(html.length / 1024) + ' KB');

(async () => {
  const b = await start(9335);
  try {
    await b.view(794, 1123, 1, false);
    await b.go('file:///' + DIR + '/Sounds-User-Guide.html', 2500);
    const footer = `<div style="font-size:8px;width:100%;text-align:center;color:#7a7390;font-family:Arial,sans-serif;"><span class="pageNumber"></span> / <span class="totalPages"></span> &nbsp;&middot;&nbsp; Trending Sounds &ndash; User Guide</div>`;
    const r = await b.send('Page.printToPDF', {
      paperWidth: 8.2677, paperHeight: 11.6929, printBackground: true, preferCSSPageSize: true,
      displayHeaderFooter: true, headerTemplate: '<div></div>', footerTemplate: footer,
    });
    fs.writeFileSync(`${DIR}/Sounds-User-Guide.pdf`, Buffer.from(r.data, 'base64'));
    const size = fs.statSync(`${DIR}/Sounds-User-Guide.pdf`).size;
    console.log('pdf written', Math.round(size / 1024) + ' KB');
    // count pages from the PDF
    const txt = fs.readFileSync(`${DIR}/Sounds-User-Guide.pdf`, 'latin1');
    console.log('pages:', (txt.match(/\/Type\s*\/Page[^s]/g) || []).length);
  } finally { b.close(); }
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
