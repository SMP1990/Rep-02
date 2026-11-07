const fs = require('fs'), path = require('path');
const { start } = require('./cdp.cjs');
const annotate = require('./annotate.cjs');
const OUT = 'F:/ask-downloader/user-guide/shots';
fs.mkdirSync(path.join(OUT, 'raw'), { recursive: true });

const HELPERS = `window.T=(sel,txt)=>[...document.querySelectorAll(sel)].find(e=>e.textContent.trim().startsWith(txt));window.R=(i,txt)=>[...document.querySelectorAll('tbody tr')[i].querySelectorAll('button')].find(b=>b.textContent.trim()===txt);window.TT=(sel,txt)=>[...document.querySelectorAll(sel)].find(e=>e.textContent.trim()===txt);`;

/** Takes a picture of an area and draws numbered boxes on it. opts: {clip:expr | rect, pad, height, marks:[{n,expr}]} */
async function capture(b, name, opts) {
  await b.evalJs(HELPERS);
  const pad = opts.pad ?? 12;
  let c = opts.rect || (await b.rect(opts.clip));
  if (!c) throw new Error(`${name}: area not found`);
  c = { x: Math.max(0, c.x - pad), y: Math.max(0, c.y - pad), width: c.width + pad * 2, height: (opts.height ?? c.height) + pad * 2 };
  if (opts.maxWidth) c.width = Math.min(c.width, opts.maxWidth);
  const raw = path.join(OUT, 'raw', `${name}.png`);
  await b.shot(raw, c);
  const rects = [];
  for (const m of opts.marks || []) {
    const r = await b.rect(m.expr);
    if (!r) { console.warn(`  ! ${name}: mark ${m.n} not found`); continue; }
    rects.push({ pos: m.pos, n: m.n, x: (r.x - c.x) * b.dsf, y: (r.y - c.y) * b.dsf, width: r.width * b.dsf, height: r.height * b.dsf });
  }
  await annotate(raw, path.join(OUT, `${name}.png`), rects, b.dsf);
  console.log('ok', name, `${Math.round(c.width)}x${Math.round(c.height)}`, rects.length + ' marks');
}

async function adminLogin(b) {
  await b.go('http://localhost:3990/admin', 1200);
  await b.evalJs(`fetch('/api/admin/login',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'test@example.com',password:'TestPass12345'})}).then(r=>r.status)`);
  await b.evalJs(`localStorage.setItem('fdownloader_admin_auth','true')`);
}
const setSelect = (v) => `(()=>{const s=document.querySelector('select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,'${v}');s.dispatchEvent(new Event('change',{bubbles:true}));return s.value})()`;

module.exports = { start, capture, adminLogin, setSelect, OUT };
