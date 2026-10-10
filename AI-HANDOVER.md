# AI handover — read this first

This file lets a new AI session (Claude Code or any other) continue the work
without the old chat. Read it fully, then `ask-downloader/CLAUDE.md` (owner
rules and site details) and `TOOLS-GUIDE.md` (tools map), before changing
anything.

Last updated: 2026-10-10.

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
- Deploy is **ZIP upload only** (no SSH). Deliver a complete project ZIP in
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
| 3–8 | "Coming soon" | — | Placeholders. The owner said 3–4 more tools will come. |

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

## 6. Last state

- Last delivered ZIP: `releases/ask-downloader-tools.zip` at commit `acf0cad`
  (Background Remover on the server, Password Generator, Tools SEO & FAQ).
  Ask the owner whether it is deployed and working before building on it.
- Next: the owner will name the next tool. Plan it the same way: check the
  code, research GitHub for compatible MIT/Apache code (no GPL), measure,
  build step by step, add it to the registry so its SEO and FAQ are ready.
