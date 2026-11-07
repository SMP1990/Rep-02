const { start, capture } = require('./shots-lib.cjs');
const BASE = 'http://localhost:3990';
const OUTDIR = 'F:/ask-downloader/user-guide/shots';
(async () => {
  const b = await start(9334);
  try {
    // ---------- desktop ----------
    await b.view(1440, 900, 1.5);

    // 1. header with the Sounds link, and 2. the home page section above Free Online Tools
    await b.go(BASE + '/', 4000);
    await capture(b, 'fe-header', {
      rect: { x: 0, y: 0, width: 1440, height: 84 }, pad: 0,
      marks: [{ n: 1, expr: `document.getElementById('nav-link-sounds')` }],
    });
    await b.evalJs(`window.scrollTo(0, document.getElementById('section-sounds').getBoundingClientRect().top + scrollY - 115)`);
    await b.sleep(1800);
    const s = await b.rect(`document.getElementById('section-sounds')`);
    const t = await b.rect(`document.getElementById('section-tools')`);
    await capture(b, 'fe-home-section', {
      rect: { x: 0, y: s.y, width: 1440, height: t.y + 150 - s.y }, pad: 0,
      marks: [
        { n: 1, expr: `[...document.querySelectorAll('#section-sounds span')].find(e=>e.textContent.trim().length>3)` },
        { n: 2, expr: `document.querySelector('#section-sounds ul li a')` },
        { n: 3, expr: `[...document.querySelectorAll('#section-sounds a')].pop()` },
      ],
    });

    // 3. the Sounds list page
    await b.go(BASE + '/sounds', 3500);
    await capture(b, 'fe-list', {
      clip: `document.querySelector('main')`, pad: 0,
      marks: [
        { n: 1, expr: `document.querySelector('input[type=search]')` },
        { n: 2, pos: 'r', expr: `document.querySelector('input[type=search]').nextElementSibling` },
        { n: 3, expr: `document.querySelector('li button[aria-pressed]')` },
        { n: 4, expr: `document.querySelector('li h2 a')` },
        { n: 5, expr: `document.querySelector('li a[download]')` },
      ],
    });

    // 4. one sound page, playing
    await b.go(BASE + '/sounds/memeute-mp3', 3500);
    await b.evalJs(`document.querySelector('button[aria-label="Play"]')?.click()`);
    await b.sleep(2600);
    const card = await b.rect(`document.querySelector('main h1').closest('div.rounded-\\\\[28px\\\\]')`);
    const dl = await b.rect(`document.querySelector('main a[download]')`);
    await capture(b, 'fe-player', {
      rect: { x: card.x - 60, y: card.y, width: card.width + 120, height: dl.y + dl.height - card.y }, pad: 8,
      marks: [
        { n: 1, expr: `document.querySelector('button[aria-label="Previous sound"]')` },
        { n: 2, expr: `document.querySelector('main button[aria-pressed]')` },
        { n: 3, expr: `document.querySelector('button[aria-label="Next sound"]')` },
        { n: 4, expr: `document.querySelector('input[type=range]')` },
        { n: 5, expr: `document.querySelector('.tabular-nums')` },
        { n: 6, expr: `document.querySelector('main a[download]')` },
      ],
    });
    // the rest of the sound page
    await b.evalJs(`document.querySelector('audio')?.pause()`);
    const about = await b.rect(`[...document.querySelectorAll('h2')].find(h=>h.textContent.trim()==='About this sound')`);
    const rep = await b.rect(`[...document.querySelectorAll('h2')].find(h=>h.textContent.trim()==='More trending sounds').parentElement`);
    await capture(b, 'fe-sound-info', {
      rect: { x: about.x - 20, y: about.y - 10, width: 780, height: rep.y + rep.height - about.y + 20 }, pad: 6,
      marks: [
        { n: 1, expr: `[...document.querySelectorAll('h2')].find(h=>h.textContent.trim()==='About this sound')` },
        { n: 2, expr: `[...document.querySelectorAll('main a')].find(a=>a.textContent.trim()==='Open the video downloader')` },
        { n: 3, expr: `[...document.querySelectorAll('h2')].find(h=>h.textContent.trim()==='Frequently asked questions')` },
        { n: 5, expr: `[...document.querySelectorAll('h2')].find(h=>h.textContent.trim()==='More trending sounds')` },
        { n: 4, expr: `[...document.querySelectorAll('a')].find(a=>a.textContent.trim()==='Report this sound')` },
      ],
    });

    // 5. report page
    await b.go(BASE + '/report-content?sound=memeute-mp3', 3000);
    await capture(b, 'fe-report', {
      clip: `document.querySelector('main')`, pad: 0,
      marks: [
        { n: 1, expr: `document.querySelector('form label:nth-of-type(1) input')` },
        { n: 2, expr: `document.querySelector('form select')` },
        { n: 3, expr: `document.querySelector('form textarea')` },
        { n: 4, expr: `document.querySelector('form .grid')` },
        { n: 5, expr: `document.querySelector('form button[type=submit]')` },
      ],
    });

    // 6. footer link
    await b.go(BASE + '/', 3500);
    await b.evalJs(`window.scrollTo(0, document.body.scrollHeight)`); await b.sleep(1500);
    const fl = await b.rect(`[...document.querySelectorAll('a')].find(a=>a.getAttribute('href')==='/report-content')`);
    const fx = Math.max(0, fl.x - 560);
    await capture(b, 'fe-footer', {
      rect: { x: fx, y: fl.y - 60, width: Math.min(1440 - fx, 760), height: 130 }, pad: 0,
      marks: [{ n: 1, expr: `[...document.querySelectorAll('a')].find(a=>a.getAttribute('href')==='/report-content')` }],
    });

    // ---------- phone ----------
    await b.view(390, 844, 2, true);
    await b.go(BASE + '/sounds/eyyad-4-short-mp3', 3500);
    await b.viewShot(require('path').join(OUTDIR, 'fe-mobile-sound.png')); console.log('ok fe-mobile-sound');
    await b.go(BASE + '/', 3500);
    await b.evalJs(`window.scrollTo(0, document.getElementById('section-sounds').getBoundingClientRect().top + scrollY - 95)`); await b.sleep(1500);
    await b.viewShot(require('path').join(OUTDIR, 'fe-mobile-home.png')); console.log('ok fe-mobile-home');
  } finally { b.close(); }
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
