// Tiny Chrome-DevTools-protocol helper for Edge (headless): navigate, run JS, screenshot a region + report element rectangles.
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function start(port = 9333) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-guide-'));
  const proc = spawn(EDGE, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars', '--no-first-run', '--disable-gpu', 'about:blank',
  ], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(500);
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page'); } catch {}
  }
  if (!target) throw new Error('Edge did not start');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pending = new Map(); const waiters = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { const { res, rej } = pending.get(d.id); pending.delete(d.id); d.error ? rej(new Error(d.error.message)) : res(d.result); }
    else if (d.method) waiters.slice().forEach((w) => w(d));
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval failed');
    return r.result.value;
  };
  await send('Page.enable'); await send('Runtime.enable');
  const api = {
    send, evalJs, sleep,
    async view(w, h, dsf = 1.5, mobile = false) {
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dsf, mobile });
      api.dsf = dsf;
    },
    async go(url, waitMs = 2500) {
      let done; const p = new Promise((r) => { done = r; });
      const w = (d) => { if (d.method === 'Page.loadEventFired') done(); }; waiters.push(w);
      await send('Page.navigate', { url });
      await Promise.race([p, sleep(15000)]); waiters.splice(waiters.indexOf(w), 1);
      await sleep(waitMs);
    },
    /** Screenshot a region: clip = {x,y,width,height} in CSS px (page coordinates). Returns the PNG buffer. */
    async shot(file, clip) {
      const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...clip, scale: 1 } });
      fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
    },
    /** What is on screen right now (no clip). */
    async viewShot(file) { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(file, Buffer.from(r.data, 'base64')); },
    /** Rectangle of the first element returned by a JS expression, in page coordinates. */
    async rect(expr) {
      return evalJs(`(()=>{const e=(${expr});if(!e)return null;const b=e.getBoundingClientRect();return {x:b.left+scrollX,y:b.top+scrollY,width:b.width,height:b.height}})()`);
    },
    close() { try { ws.close(); } catch {} proc.kill(); },
  };
  return api;
}
module.exports = { start, sleep };
