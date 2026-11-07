// Takes a picture of every page of the PDF through Edge's built-in PDF viewer (for checking the layout).
const fs = require('fs');
const { start } = require('./cdp.cjs');
const PDF = 'file:///F:/ask-downloader/user-guide/Sounds-User-Guide.pdf';
const OUT = process.argv[2] || 'C:/Users/COMPUT~1/AppData/Local/Temp/claude/e5f025f1e740ada1/6c18cc5b-843a-4a1f-9d95-ec922d76d468/scratchpad/pages';
const pages = process.argv.slice(3).map(Number);
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await start(9336);
  try {
    await b.view(900, 1200, 1, false);
    for (const p of pages) {
      await b.go(`${PDF}?v=${p}&t=${Date.now()}#page=${p}&zoom=page-fit&toolbar=0&navpanes=0`, 6000);
      await b.viewShot(`${OUT}/p${String(p).padStart(2, '0')}.png`);
      console.log('page', p);
    }
  } finally { b.close(); }
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
