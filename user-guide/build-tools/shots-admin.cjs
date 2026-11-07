const { start, capture, adminLogin, setSelect } = require('./shots-lib.cjs');
const HELP = `1`;
(async () => {
  const b = await start();
  try {
    await b.view(1440, 900, 1.5);
    await adminLogin(b);
    await b.go('http://localhost:3990/admin/sounds', 3500);

    await capture(b, 'admin-menu', {
      rect: { x: 0, y: 150, width: 288, height: 660 }, pad: 0,
      marks: [{ n: 1, expr: `TT('button,a','Trending Sounds')` }],
    });
    await capture(b, 'admin-top', {
      clip: `T('button','Turn').closest('div.rounded-2xl')`,
      marks: [
        { n: 1, expr: `T('button','Turn')` },
        { n: 2, expr: `TT('button','Run now')` },
        { n: 3, expr: `[...document.querySelectorAll('span')].find(e=>e.textContent.startsWith('Status:'))` },
        { n: 4, expr: `[...document.querySelectorAll('p')].find(p=>/sounds saved/.test(p.textContent))` },
        { n: 5, expr: `[...document.querySelectorAll('p')].find(p=>p.textContent.startsWith('Last run:'))` },
      ],
    });
    await capture(b, 'admin-filter', {
      clip: `[...document.querySelectorAll('h2')].find(h=>h.textContent.startsWith('Filter')).closest('div.rounded-2xl')`,
      marks: [
        { n: 1, expr: `[...document.querySelectorAll('label')].find(l=>l.textContent.startsWith('Min views'))` },
        { n: 2, expr: `[...document.querySelectorAll('label')].find(l=>l.textContent.startsWith('Min seconds'))` },
        { n: 3, expr: `[...document.querySelectorAll('label')].find(l=>l.textContent.startsWith('Max seconds'))` },
        { n: 4, expr: `[...document.querySelectorAll('label')].find(l=>l.textContent.startsWith('Per creator'))` },
        { n: 5, expr: `[...document.querySelectorAll('label')].find(l=>l.textContent.startsWith('Min days'))` },
        { n: 6, expr: `[...document.querySelectorAll('label')].find(l=>l.textContent.trim()==='No songs')` },
        { n: 7, expr: `[...document.querySelectorAll('label')].find(l=>l.textContent.includes('No brands'))` },
        { n: 8, expr: `TT('button','Save')` },
      ],
    });
    // list of sounds that passed the filter: first rows only
    const list = await b.rect(`document.querySelector('select').closest('div.rounded-2xl')`);
    const rows = await b.rect(`document.querySelectorAll('tbody tr')[6]`);
    await capture(b, 'admin-list', {
      rect: list, height: rows.y + rows.height - list.y + 4,
      marks: [
        { n: 1, expr: `document.querySelector('select')` },
        { n: 2, expr: `document.querySelector('thead')` },
        { n: 3, expr: `document.querySelector('tbody tr a')` },
        { n: 4, expr: `TT('button','Approve')` },
        { n: 5, expr: `TT('button','Reject')` },
      ],
    });
    // approved sounds
    await b.evalJs(setSelect('approved')); await b.sleep(800);
    const list2 = await b.rect(`document.querySelector('select').closest('div.rounded-2xl')`);
    await capture(b, 'admin-approved', {
      rect: list2,
      marks: [
        { n: 1, expr: `[...document.querySelectorAll('td div.text-xs')].find(e=>e.textContent.includes('MP3 saved'))` },
        { n: 2, expr: `[...document.querySelectorAll('td div.text-xs')].find(e=>e.textContent.includes('failed'))` },
        { n: 3, expr: `TT('button','Retry')` },
        { n: 4, expr: `R(1,'Undo')` },
        { n: 5, expr: `R(2,'Reject')` },
      ],
    });
    // rejected sounds
    await b.evalJs(setSelect('rejected')); await b.sleep(800);
    const list3 = await b.rect(`document.querySelector('select').closest('div.rounded-2xl')`);
    await capture(b, 'admin-rejected', {
      rect: list3,
      marks: [{ n: 1, expr: `TT('button','Undo')` }, { n: 2, expr: `TT('button','Approve')` }],
    });
    // messages
    await b.go('http://localhost:3990/admin/messages', 3000);
    await capture(b, 'admin-messages', {
      clip: `[...document.querySelectorAll('*')].find(e=>e.children.length===0&&e.textContent.trim()==='Sara Khan').closest('div.rounded-2xl')`,
      marks: [
        { n: 1, expr: `[...document.querySelectorAll('span')].find(e=>e.textContent.includes('Sound report:'))` },
        { n: 2, expr: `[...document.querySelectorAll('p')].find(e=>e.textContent.startsWith('Sound:'))` },
        { n: 3, expr: `[...document.querySelectorAll('button')].filter(b=>b.closest('div.rounded-2xl')&&b.closest('div.rounded-2xl').textContent.includes('Sara Khan')).pop().parentElement` },
      ],
    });
    await b.evalJs(HELP);
    const mm = await b.rect(`[...document.querySelectorAll('button,a')].find(e=>e.textContent.includes('Messages & Inquiries'))`);
    await capture(b, 'admin-messages-menu', {
      rect: { x: 0, y: mm.y - 16, width: 288, height: mm.height + 32 }, pad: 0,
      marks: [{ n: 1, expr: `[...[...document.querySelectorAll('button,a')].find(e=>e.textContent.includes('Messages & Inquiries')).querySelectorAll('*')].find(s=>s.children.length===0&&/^[0-9]+$/.test(s.textContent.trim()))` }],
    });
  } finally { b.close(); }
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
