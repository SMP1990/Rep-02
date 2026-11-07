// Builds a demo data folder for the user-guide screenshots from the real collected sounds in data3.
const fs = require('fs'), path = require('path');
const S = process.argv[2];
const src = path.join(S, 'data3'), dst = path.join(S, 'guide-data');
fs.rmSync(dst, { recursive: true, force: true });
fs.mkdirSync(path.join(dst, 'sounds'), { recursive: true });
for (const f of ['adminUsers.json', 'siteSettings.json', 'landingContent.json', 'blogCategories.json', 'visitors.json']) {
  if (fs.existsSync(path.join(src, f))) fs.copyFileSync(path.join(src, f), path.join(dst, f));
}
const sound = JSON.parse(fs.readFileSync(path.join(src, 'soundsData.json'), 'utf8'));
const all = Object.values(sound);
const REG = ['PK', 'IN', 'US', 'GB', 'AE', 'SA', 'ID', 'BR'];
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const dayPool = ['2026-11-05', '2026-11-06', '2026-11-07'];

for (const s of all) {
  const n = 2 + Math.floor(rnd() * 2);                  // 2 or 3 days seen, so most pass the default filter
  s.days = dayPool.slice(3 - n);
  s.firstSeen = s.days[0]; s.lastSeen = '2026-11-07';
  const extra = Math.floor(rnd() * 3);
  for (let i = 0; i < extra; i++) { const r = REG[Math.floor(rnd() * REG.length)]; if (!s.regions.includes(r)) s.regions.push(r); }
  s.status = 'new'; delete s.mp3Error; delete s.mp3Ms; delete s.mp3Kb; delete s.slug;
}
// The test browser has no emoji font: strip emoji so the screenshots do not show empty boxes.
const EMOJI = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{2B50}\u{2764}]/gu;
for (const s of all) { s.name = s.name.replace(EMOJI, '').trim(); s.creator = s.creator.replace(EMOJI, '').trim(); }
for (const s of all) {
  if (s.name.includes('ali_safroj_786')) s.creator = 'Ali Safroj';
  if (s.name.includes('Eyyad_4_Short')) s.creator = 'Eyyad 4 Short';
}
const by = (part) => all.find((s) => s.name.includes(part));
const approve = (part, slug) => { const s = by(part); s.status = 'approved'; s.slug = slug; return s; };
const good = [
  approve('memeute', 'memeute-mp3'),
  approve('Eyyad_4_Short', 'eyyad-4-short-mp3'),
  approve('saroj_bhattrai_', 'saroj-bhattrai-mp3'),
  approve('ali_safroj_786', 'ali-safroj-786-mp3'),
];
for (const s of good) {
  const f = path.join(src, 'sounds', s.id + '.mp3');
  fs.copyFileSync(f, path.join(dst, 'sounds', s.id + '.mp3'));
  s.mp3Error = ''; s.mp3Ms = 900 + Math.floor(rnd() * 600); s.mp3Kb = Math.round(fs.statSync(f).size / 1024);
}
const noFile = approve('chauhaneleena', 'eleena-chauhan-mp3'); noFile.mp3Error = 'download failed (HTTP 403)';
// two rejected ones
const rej = all.filter((s) => s.status === 'new' && s.views > 2e6).slice(0, 2); rej.forEach((s) => (s.status = 'rejected'));

const out = {}; for (const s of all) out[s.id] = s;
fs.writeFileSync(path.join(dst, 'soundsData.json'), JSON.stringify(out));

const now = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
const regions = {}; for (const r of REG) regions[r] = 'ok ' + (4 + Math.floor(rnd() * 17)) + ' (tikwm)';
fs.writeFileSync(path.join(dst, 'soundsState.json'), JSON.stringify({
  enabled: true, lastRun: now,
  log: [{ at: now, found: 118, added: 31, failed: 0, regions }],
  settings: { minViews: 1000000, minSec: 3, maxSec: 60, perCreator: 2, minDays: 2, excludeMusic: true, excludeJunk: true },
}));

const users = JSON.parse(fs.readFileSync(path.join(dst, 'adminUsers.json'), 'utf8'));
users[0].name = 'Admin'; fs.writeFileSync(path.join(dst, 'adminUsers.json'), JSON.stringify(users));
const ss = JSON.parse(fs.readFileSync(path.join(dst, 'siteSettings.json'), 'utf8'));
ss.siteName = 'ASK video Downloader'; fs.writeFileSync(path.join(dst, 'siteSettings.json'), JSON.stringify(ss));

fs.writeFileSync(path.join(dst, 'messages.json'), JSON.stringify([{
  id: 'msg_demo_1', name: 'Sara Khan', email: 'sara@example.com', topic: 'legal',
  topicLabel: 'Sound report: https://your-site.com/sounds/memeute-mp3',
  message: 'Sound: https://your-site.com/sounds/memeute-mp3\nReason: Copyright\n\nThis audio is a clip from my short film. I am the owner and I did not give permission to publish it.',
  status: 'unread', createdAt: new Date(Date.now() - 3600 * 1000).toISOString(), userAgent: 'demo',
}]));
console.log('approved with file:', good.map((s) => s.name.replace('original sound - ', '')).join(', '));
console.log('approved without file:', noFile.name, '| rejected:', rej.map((s) => s.name).join(', '));
