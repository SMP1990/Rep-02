# AI handover — read this first

This file lets a new AI session (Claude Code or any other) continue the work
without the old chat. Read it fully, then `ask-downloader/CLAUDE.md` (owner
rules and site details) and `TOOLS-GUIDE.md` (tools map), before changing
anything.

Last updated: 2026-10-27 (v22).

**Where the owner keeps it on his PC (since 2026-10-27):** `F:\ask-downloader` (a full git clone of `SMP1990/Rep-02`,
already on branch `claude/upbeat-archimedes-266v06`). Open Claude Code in that folder, then say: "AI-HANDOVER.md parho
aur batao kahan par hain". On 2026-10-27 the file `ask-downloader-v21-light-fonts.zip` from his Downloads folder was
compared with this branch: the zip is byte-for-byte the same as `releases/ask-downloader-v21-light-fonts.zip`, and its
source is identical to `ask-downloader/` (only the `dist/` build output is not in git). So GitHub and the zip were equal
and nothing newer existed on the PC. Confirmed on 2026-10-27 over SSH: the build live on Hostinger was v21 (16 Oct).
The owner then deployed **v22** the same day (see section 6).

## 1. Where the work is

| What | Where |
|---|---|
| GitHub repo | `SMP1990/Rep-02` (owner account: **SMP1990**) |
| **Branch with all this work** | **`claude/upbeat-archimedes-266v06`** |
| Repo default branch | `claude/hello-a3y98x` — a DIFFERENT project (Haven Realty WordPress). Do not build on it. |
| Backup copy (locked) | branch `backup/tools-v1`, tag/release `tools-v1` (state of commit `1ed196e`) |
| Live site | https://social.al-marifat.org (Hostinger "Web Apps", Node.js) |

A new session usually starts on the default branch or on a fresh branch made
from it. **First step in every new session:**

```bash
git fetch origin claude/upbeat-archimedes-266v06
git checkout claude/upbeat-archimedes-266v06   # or: merge it into the session's own branch
```

If the session must push to its own new branch, base that branch on
`claude/upbeat-archimedes-266v06` (never on the default branch), so nothing is
lost. Branches matching `claude/*` and `backup/*`, and tags `tools-v*`, are
protected on GitHub (no delete, no force-push).

## 2. The owner and how to work

- Non-developer. Writes **Roman Urdu**; answer in Roman Urdu, keep code and
  commands in English. Short, plain answers; no jargon.
- **One step at a time**: do a step, test it, report, then ask before the next.
- **Check the existing code first**; never redo or break existing work.
- **New tools must not affect** site speed, security, SEO or any existing
  feature, and must not conflict with existing code.
- Every visible word in **11 languages**: en, ur, ar, hi, es, pt, fr, de, id, ru, ja
  (ur and ar are right-to-left).
- Honest reviews; say clearly what is not verified.
- Deploy is **ZIP upload in hPanel** (Deployments → Settings and redeploy → Upload new files). SSH exists now (see
  "Server access" below) but is for **looking only**, not for deploying. Deliver a complete project ZIP in
  `releases/` and give the owner a download link:
  `https://github.com/SMP1990/Rep-02/raw/<commit>/releases/<zip-name>.zip`
- The deploy ZIP must stay small: no heavy files, no `node_modules`, no `.map`.
- Do not make the owner test again and again: **measure first, decide the
  approach from numbers, test fully here, then deliver**. (The Background
  Remover cost hours because the browser approach was chosen on a guess and
  phones were not considered; the server approach was right.)
- In this project, browser-based heavy work is slow on cheap Android phones
  (4 GB RAM): avoid it, or measure on a phone-like setup first.

## 3. The site (short)

`ask-downloader/` — React 19 + Vite + Tailwind client, Express server
(`server.ts` + `server/`), JSON file storage in a data folder outside the app
(survives redeploys). Admin at `/admin`. Full details, commands, deploy steps
and translation/SEO rules: **`ask-downloader/CLAUDE.md`**.

Commands (inside `ask-downloader/`): `npm install`, `npm run lint`
(tsc, must pass), `npm run build`, then
`rm -f dist/server.cjs.map` and
`zip -qr ../releases/<name>.zip . -x "node_modules/*" -x ".git/*"`.

Hosting: Hostinger **Business** plan: 3 GB RAM, CPU limit 100% (≈ 1 core),
50 GB disk, shared by 3 websites.

## 4. Tools added so far

Home page section **"Free Online Tools"** (above "Trending Stories"): 8 tiles,
phones show 4 per swipe page. Config: `ask-downloader/src/config/tools.ts`.

| # | Tool | Page | Status |
|---|---|---|---|
| 1 | Background Remover | `/background-remover` | Live. Runs **on the server** (onnxruntime-node in a worker thread, ISNet 768px + U2Net "Need better results?"), browser fallback if the server can't. |
| 2 | Password Generator | `/password-generator` | Live. Runs in the browser (Web Crypto), nothing sent or stored. Logic ported from generate-password (MIT). |
| 3 | Age Calculator | `/age-calculator` | Built 2026-10-11. Runs in the browser (`lib/age.ts`, no library), nothing sent or stored. 29 Feb birthdays count on 28 Feb in common years (owner's choice). Its page links to the other live tools (`tools/shared/RelatedTools.tsx`, on this page only, owner's choice). |
| 4 | Word Counter | `/word-counter` | Built 2026-10-12. Runs in the browser (`lib/count.ts`): words = whitespace-separated pieces with a letter/digit; Japanese/Chinese/Thai via `Intl.Segmenter` only when present (10x slower, measured); characters = Unicode graphemes (fast path verified against Intl.Segmenter on 20,000 random texts); text over 20,000 chars is counted when typing pauses (`lib/useSettled.ts`). Paste/Copy/Clear with Undo. |
| 5 | Image Compressor | `/image-compressor` | Built 2026-10-13, ideas from Sethispr/image-compressor (MIT). Runs in the browser in Web Workers (`lib/worker.ts` builds to `assets/worker-*.js`, which server.ts already lets use WebAssembly — no server change). Codecs: jSquash (Apache-2.0) MozJPEG / WebP (Safari only) / OxiPNG, bundled, loaded on demand; WebP uses the browser's own encoder (same size, measured). No AVIF (14–31 s per photo). Phones 1 image at a time, desktop 2. Target-size mode keeps quality >= 40 and shrinks the image instead. |
| 6–8 | "Coming soon" | — | Placeholders. The owner said more tools will come. |

**Admin → Tools SEO & FAQ** (`src/pages/ToolsSeoPage.tsx`): per tool meta
title ({brand}), description, keywords, share image, noindex, and the FAQ.
Data file `toolsContent`; admin text is machine-translated into all languages
(like the home FAQ). Built-in FAQ items keep their human translations.

How to add the next tool (registry, page, route, tile, SEO, FAQ): see
**`TOOLS-GUIDE.md` → "Adding the next tool"**. Reuse
`src/tools/shared/ToolGuide.tsx` and `src/tools/shared/useToolSeo.ts`.

## 5. Important technical facts (learned the hard way)

- Background Remover models (int8, split in 15 MB parts) are in
  `bg-remover-tool/model` (ISNet, commit `d472b3d`) and `bg-remover-tool/model-hd`
  (U2Net, commit `bfcf318`). The server downloads them from GitHub raw /
  jsDelivr into its data folder; they are NOT in the deploy ZIP. Never delete
  those commits.
- `onnxruntime-node` is an **optional** dependency; `.npmrc` has
  `onnxruntime-node-install=skip` so Hostinger does not download 400 MB of
  CUDA files. The model must run in a **worker thread** (`server/bgWorker.ts`,
  built to `dist/bg-worker.cjs`); on the main thread it froze the whole site
  for seconds.
- Phones: WebGPU on cheap Android GPUs froze the screen and gave broken
  output — never use the GPU on phones (`isPhone()` in `lib/models.ts`).
- Hidden test mode on the Background Remover page: `?test=1` shows timings
  (used to diagnose a real phone).
- Tool pages that need special headers (Background Remover: COOP/COEP + CDN
  CSP, `TOOL_PAGES` in `server.ts`) open with a full page load
  (`fullLoad: true` in tools.ts). Other tools use normal navigation and the
  site's normal strict CSP.
- Translations of tool texts live in the tool's own folder
  (`src/tools/<tool>/i18n/*.ts`), so they load only with that tool's page;
  the tile's two words are in `src/translations/extra/*.ts` (`toolsHub`).
- TypeScript quirks of this project: `noUnusedLocals` is on; use `Fragment key`
  instead of `key` on typed components.
- Testing here: Playwright + Chromium at `/opt/pw-browsers/chromium-1194`;
  run the production server with
  `DATA_DIR=<tmp> NODE_ENV=production PORT=3999 node dist/server.cjs`;
  first admin via `POST /api/admin/setup`. Always check desktop and a
  390 px-wide phone, English + Urdu + one Latin language, and that the admin
  pages still open.
- The owner may also work on a Windows PC (PowerShell, no `zip`/`rm`): build
  the deploy ZIP with .NET `System.IO.Compression` using `/` in entry names
  (PowerShell 5's `Compress-Archive` writes `\`, which breaks on Linux), and
  start Vite with `--host 127.0.0.1` so the browser can reach it.

## 6. Last state

- **Latest (2026-10-27): `releases/ask-downloader-v22-tiktok-link-fix.zip`** (live, deployed by the owner via hPanel).
  Only change vs v21: `cleanMediaUrl()` in `ask-downloader/server/extractorCommon.ts` now turns `/` into `/`.
  Before, some TikTok videos returned a broken download link (`https:u002Fu002F...`) because the page JSON escapes slashes
  as `/` and the old code stripped the backslash. Verified: server diff vs live v21 = this one file only; after
  deploy Facebook, Instagram and TikTok links still work. Note: after the deploy the two test TikTok links used the
  yt-dlp route (`/api/video/ytdlp-stream/...`), so the live proof of the fix itself is indirect.
- **Live check on 2026-10-27 (real links, `POST /api/video/info`):** Facebook OK, Instagram post + reel OK, TikTok OK.
  Not checked yet: Twitter/X, Pinterest, Reddit, Threads, Dailymotion. Small cosmetic gaps seen: some Facebook videos show a stock
  photo thumbnail; Instagram title is just "#ViralReel" and duration "--:--" when real metadata is missing.
- **Speed:** Google PageSpeed score could not be obtained (API quota, website hung, local Lighthouse got 403 from the host).
  Measured by hand: home HTML 1.3 KB (page is built by JS), ~400 KB brotli JS+CSS, immutable caching. Owner: "speed later".
  Next idea: split the 188 KB `index` chunk, but get a real PageSpeed score first.
- **Audit the owner pasted (CORS, SSL, word counter, 5 MB image, speed, mobile)** was checked against code and live site:
  mostly wrong or outdated. Only real weakness: extractors can break when Instagram/TikTok/Facebook change.

### Server access (SSH) — added 2026-10-27
- hPanel → Websites → social.al-marifat.org → Advanced → **SSH Access** is Active. Port **65002**, user `u770730940`.
  A dedicated key pair was made on the owner's PC (`~/.ssh/ask_hostinger`, public key added in hPanel). Never put a
  password or private key in chat, git or this file.
- Use it to **read only** (logs, files). The server has no `node` in the SSH shell. Hostinger itself runs
  `npm install` + build, copies to `hbuilds/versions/<id>`, switches `hbuilds/current` and restarts, so keep deploying by ZIP.
- Live code: `~/domains/social.al-marifat.org/hbuilds/current/nodejs`. Data (survives redeploys): `.fdownloader-data`.
  Deploy logs: `hbuilds/logs/<id>/`. The home folder also holds the owner's WordPress site and `backup-*.sql`: do not touch.

### Earlier state

- **Latest (2026-10-16): `releases/ask-downloader-v21-light-fonts.zip`** (live).
  v8 (DNS Checker) and v9 (Watermark Remover) were built in other sessions and
  had not been pushed; v20/v21 contain them and everything after. Highlights:
  - Speed: long cache on hashed `/assets`, Google Fonts preloaded (no render
    block), non-English translations lazy-loaded (`src/translations/loadLanguage.ts`,
    entry JS 925 → 486 KB), home page chunks modulepreloaded by the server
    (`server/preloadHints.ts`, needs `build.manifest`).
  - v21: the Arabic/Urdu/Hindi Google fonts (~443 KB) load only when `<html lang>`
    or the saved interface language is ur/ar/hi (`src/loadFonts.ts`; index.html
    preloads the Latin fonts only). Measured live, new visitor, mobile home:
    ~1,005 KB → ~558 KB. Biggest part now: JS 356 KB.
  - Images: `/thumb/<w>/<file>` gives a sharp WebP copy of `/uploads/<file>`
    (`server/imageResize.ts`, `src/utils/imageSize.ts`). On Hostinger, LiteSpeed
    serves real files under `/uploads/` itself, so query strings there never
    reach Node: use non-existent paths for Node-side image work.
  - Security: `server.cjs`, worker `.cjs` files and `/.vite/` are not served (404).
  - New tool: Grade Calculator - Swift Score at `/grade-calculator-swift-score`
    (`src/tools/grade-calculator/`, tool id `grade-calculator`).
  - Password Generator: the typed length box works (`LengthInput.tsx`).
  - Phones only (desktop checked identical): hero heading in a gradient box with
    a "More info" fold, tools as a 4×2 icon grid (`ToolsIconGrid.tsx`) so the
    downloader and all tools fit the first screen, slimmer header (theme in the
    menu), reworked menu drawer (theme at the top, one scroll, language and
    downloader lists folded, its words in 11 languages).
  - Owner rule: no change that could break the live site, even for speed.
  Ask the owner which ZIP is live before building on it.
- Older history follows.

- Last delivered ZIP: `releases/ask-downloader-v7-image-compressor.zip`
  (Image Compressor added on top of v6 = Word Counter). v5 = `ask-downloader-age-calculator-v5.zip`
  (Age Calculator; everything from `ask-downloader-tools.zip` still in it).
  v2 also fixes a crash that was in the site since its first commit: after
  "Download", English and 7 other languages showed "Something went wrong"
  whenever the browser had not yet been asked about notifications
  (`t.notifications` / `t.preview` existed only in ur/hi/ja). Those words now
  live in `translations/extra` (all 11 languages, type-checked).
  v3 also fixes `/api/video/download-proxy` for files found by yt-dlp
  (TikTok, Reddit, Pinterest): it fetched `http://127.0.0.1:${PORT}/api/...`,
  but on Hostinger PORT is not a number, so the app is not on
  127.0.0.1:3000 and every such download failed with "Could not download this
  file from the source". The proxy now reads the token in-process
  (`ytdlpFile()` in `server/ytdlp.ts`). Never make the server call itself
  over HTTP.
- After v3 went live (2026-10-12): Reddit and Pinterest video + MP3, and
  TikTok MP3, download. TikTok VIDEO still got 502: `ytdlpFile()` probed the
  CDN link (OK) and then fetched it again, and TikTok refused the second
  request. v4 uses the first successful response as the download.
- **TOP PRIORITY (owner's order, 2026-10-12):** with v4 live, TikTok VIDEO
  still failed (MP3 worked). v5: when the CDN refuses Node's fetch,
  `ytdlpFile()` falls back to `viaYtdlp()` — yt-dlp downloads the file itself
  (`-f b[height<=H] -o -`) and it is streamed through (max 3 at once).
  Every yt-dlp download response carries `X-Source-Status` ("cdn 200",
  "yt-dlp after cdn 403", "cdn 403; yt-dlp failed") — read it with curl on
  `/api/video/ytdlp-stream/<token>` to see what happened. NOT yet verified
  live; if yt-dlp also fails, its stderr is logged as
  "[yt-dlp] direct download gave no data".
  The previous one, `releases/ask-downloader-tools.zip` (commit `acf0cad`),
  stays as the fallback. Ask the owner whether the newest one is deployed and
  working before building on it.
- Next: the owner will name the next tool. Plan it the same way: check the
  code, research GitHub for compatible MIT/Apache code (no GPL), measure,
  build step by step, add it to the registry so its SEO and FAQ are ready.
