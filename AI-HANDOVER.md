# AI handover — read this first

This file lets a new AI session (Claude Code or any other) continue the work
without the old chat. Read it fully, then `ask-downloader/CLAUDE.md` (owner
rules and site details) and `TOOLS-GUIDE.md` (tools map), before changing
anything.

> ## Google switch - remind the owner when the domain changes
> **Owner decision 2026-11-07:** keep `SOUNDS_OPEN_TO_SEARCH = false` (`ask-downloader/server/soundsPublic.ts`)
> because the site is still on a **testing domain** (`social.al-marifat.org`). OFF means: `/sounds` and every sound page work for
> visitors (header link, home section, footer Report Content link) but are `noindex` and are NOT in `sitemap.xml`, so Google does not list them.
> **When the owner says the real domain is live (or the domain changes), ASK/REMIND HIM** to decide about turning it ON. Checklist then:
> 1. Owner listens to the approved sounds and Rejects songs/edits/copyrighted ones (e.g. nostalgia.zz, 60 s) BEFORE the switch (once Google indexes a page, removal takes days).
> 2. Only on his clear yes: set the constant to `true`, `npm run lint && npm run build`, make a small ZIP, push, owner deploys.
> 3. Open `/sitemap.xml` on the real domain: `/sounds` and each approved sound must be listed; check a sound page says `index, follow`.
> 4. Owner submits the sitemap in Google Search Console for the real domain (guide him one click at a time).
> 5. Optional first: serve the MP3 from a path outside `/api/` (robots.txt has `Disallow: /api/`) so Google can reach the audio file; check the Report Content page works on the new domain.
> 6. Also check that data (`.fdownloader-data`, the saved MP3s in its `sounds/` folder) is present on the new domain/host.
>
Last updated: 2026-11-07, end of day (v39 built = whole public Sounds front end; Google switch still OFF; owner to deploy and test; see section 6 "NEWEST" and `PLAN-TRENDING-SOUNDS.md` section 13).

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

> **Planned next feature (not built):** daily auto-updated **Trending Sounds** directory with admin panel, full SEO and
> a free-tier API fallback chain. Full agreed plan, test results and step order (start at Step A): **`PLAN-TRENDING-SOUNDS.md`**.
> Owner decisions of 2026-11-04 (section 11 of that plan): stay on Hostinger; only spoken-word memes, funny dialogues, SFX
> and AI voice templates (no commercial music); a "Report Content" page with admin review (no auto-delete) before any public sound page.
> Step A is NOT started yet; ask the owner first and also ask whether v26 is deployed.

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

- **v40 (2026-11-07, later) - newest of all:** owner checked the live site (v39 deployed; `/sounds` showed 4 approved sounds with MP3 working on Hostinger, so the MP3 test passed) and said nothing showed on the front end: there was no link to it. v40 adds (1) a "Sounds" link in the header (desktop + phone menu, `t.soundsHome.nav`) and (2) a "Trending Sounds" section on the home page ABOVE "Free Online Tools" (`src/components/TrendingSoundsSection.tsx`, top 4 sounds from `/api/sounds`, renders nothing while no sound is approved; words in `translations/extra/*` group `soundsHome`, 11 languages). Footer link to Report Content exists since v39. Google switch `SOUNDS_OPEN_TO_SEARCH` is still false. Honest notes: on phones the new row pushes "Free Online Tools" lower than before (the owner had designed tools to fit the first screen); the section appears after a fetch, so the layout can shift once; Urdu/other languages of the new header link and section were not opened in a browser (only type-checked). Live nostalgia.zz (60 s) is still approved; owner must listen and Reject it if it is music.
- **NEWEST before v40 (2026-11-07, end of day) - the "Next steps" list in the bullet below is OUTDATED, everything in it is built:** the whole public Sounds front end is BUILT. Latest ZIP: **`releases/ask-downloader-v39-report-content.zip`** (commit 7b832ff; it contains v35-v39, so only v39 needs uploading). Owner had NOT yet deployed v36-v39 when this was written; the last thing confirmed live is v34.
  - **2c (v37, commit a7004ae):** single sound page `/sounds/<slug>` (`src/pages/SoundPage.tsx`, `src/tools/sounds/SoundAbout.tsx`): player, Download MP3, "about" text of 4 paragraphs filled from the sound's own data (name, creator, seconds, views, regions, first-seen date), link to the video downloader, 4-question FAQ, related sounds (from `/api/sounds/:slug` `related`), "Report this sound" link. Schema: WebPage + BreadcrumbList + AudioObject + FAQPage. Server `getRouteMeta` gives each sound its own title/description and a real HTTP 404 for unknown/unapproved slugs. List cards link to the page. Route names: `public-sounds`, `public-sound` (slug read from the URL), `report-content`; `'sounds'` is still the ADMIN route. Right-to-left fix: Latin names are wrapped in Unicode isolates (U+2068/2069) for on-screen text only, never in meta/schema.
  - **2d (v38, commit 7e5bbc4):** `SOUNDS_OPEN_TO_SEARCH` in `server/soundsPublic.ts` = **false (the switch)**. OFF: `/sounds` and sound pages work for anyone with the link but are `noindex` (server meta AND client Seo via the API's `indexable` field) and are left out of `sitemap.xml`. ON (tested once locally): `index, follow`, `/sounds` + every approved sound in the sitemap with real `lastmod` (= last day seen trending). MP3 route limited to 60 requests/min per visitor (site-wide `/api` limit of 180/min also applies).
  - **2e (v39, commit 7b832ff):** `/report-content` page (`src/pages/ReportContentPage.tsx`; words in `src/tools/sounds/i18n/*` keys `report*`/`reason*`; footer word `footer.reportContent` in `src/translations/extra/*`). It posts to the existing `/api/contact` with topic `legal` and topicLabel `Sound report: <link>`, so reports appear in Admin -> Messages as "Copyright / DMCA". Hidden honeypot field; no automatic deletion (owner decision). Footer link in 11 languages. Tested: empty form error, successful send saved in `messages.json`, footer link in English and Urdu on a phone.
  - **Owner decisions still open / to do:** (1) deploy v39, press "Run now" in `/admin/sounds`, open `/sounds`, tell whether MP3 files were saved on Hostinger (first real test of TikWM MP3 links from the Hostinger IP; if the admin row says an error, read it). (2) When the owner says so: set `SOUNDS_OPEN_TO_SEARCH = true`, build a small ZIP; then submit the sitemap in Search Console. (3) Header link to `/sounds` NOT added on purpose (it would show the pages to everyone); add when the owner agrees. (4) `robots.txt` has `Disallow: /api/`, so Google cannot fetch the MP3 (`/api/sounds/<slug>/mp3`, also the schema `contentUrl`): pages and text get indexed, the audio file probably not. Small fix idea: serve the MP3 from a path outside `/api/` (e.g. `/sounds/<slug>/file.mp3`) and point `contentUrl` at it. (5) Report emails: reports only show in Admin -> Messages; no email/notification to the owner. (6) Translations of the new texts were written by the AI, no native speaker checked them (ask the owner to look at Urdu). (7) Not checked in a browser: the other 8 languages of the new pages, the admin Messages page with a report in it.
  - **Test setup used (do not repeat blindly):** seed a temp data folder with `soundsData.json` (status approved, a `slug`) and `sounds/<id>.mp3`, run `DATA_DIR=<tmp> NODE_ENV=production PORT=3998 node dist/server.cjs` with the Bash tool's `run_in_background`, stop it with PowerShell `Stop-Process` on the port owner. The server caches the data files in memory: restart it after editing them. In PowerShell 5.1 do not pass multi-line git messages with double quotes; write the message to a file and use `git commit -F`. `Set-Content -Encoding utf8` adds a BOM (remove with `sed -i '1s/^\xEF\xBB\xBF//'`).
- **LATEST PROGRESS (2026-11-07, later) - older than the bullet above, but still true for v35/2a/2b:** owner chose front end first; steps are done ONE at a time, owner says "ok" before each.
  - **v35** (commit 8651765, `releases/ask-downloader-v35-sounds-mp3.zip`): collector saves the MP3 link (`mp3` = `music_info.play`, refreshed each sighting); Approve downloads the MP3 to `<data>/sounds/<id>.mp3` (`server/soundsMp3.ts`: https + TikTok CDN/TikWM hosts only, 8 MB max, MP3 header check, own file name, one download at a time); after every collector run, approved sounds without a file are retried; admin shows "MP3 saved" or the reason. Tested with real TikWM (88 KB MP3 saved; bad host/http/bad id rejected).
  - **Step 2a** (commit b19a30e): `server/soundsPublic.ts` = public read-only API `GET /api/sounds`, `/api/sounds/:slug`, `/api/sounds/:slug/mp3` (Range works, `?dl=1` forces download). Only approved + MP3 saved sounds are visible. Each approved sound gets a permanent `slug` (`<name>-mp3`) once, in `addSlugs()` (`trendingSounds.ts`), at Approve time or at the end of the next collector run.
  - **Step 2b = v36** (commit 37ffa33, `releases/ask-downloader-v36-sounds-list-page.zip`): public `/sounds` list page (`src/pages/SoundsListPage.tsx`, `src/tools/sounds/SoundCard.tsx`, words in `src/tools/sounds/i18n/` for 11 languages), route name `public-sounds` (`'sounds'` is the ADMIN route), server meta for `/sounds` in `getRouteMeta` (noindex while no approved sound exists). Tested in the browser: desktop, 375 px phone, English + Urdu (RTL), play/pause/switch, search. Only checked with 3 sample sounds on a local data folder; the other 8 languages and the admin pages were not opened.
  - **Owner must:** deploy v36 (includes v35), then in `/admin/sounds` press "Run now" so his 4 approved sounds get MP3 + slug, then open `/sounds`. Not confirmed yet that this worked on Hostinger (first real test of TikWM MP3 links from the Hostinger IP).
  - **Next steps, in order:** **2c** single sound page `/sounds/<slug>` (route e.g. `public-sound` + slug, server meta + JSON-LD AudioObject/BreadcrumbList, big player, Download MP3, link to the video downloader, FAQ, >= 150 words of unique text built from the sound's data, related sounds from `/api/sounds/:slug` `related`; make the card title a link; add its strings to all 11 `i18n` files); **2d** sitemap entries (published sounds only, `lastmod`), "Sounds" link in header/footer, rate limit on the MP3 route, check how other languages are routed; **2e** "Report Content" page (footer link, form -> admin inbox, no auto-delete) BEFORE any sound is shown to Google. Code is kept in small files; do not write long code in one go (owner rule).
  - Bash note: very long heredocs with many files failed once in the Bash tool; use the Write tool for many files. Background servers for tests: use the Bash `run_in_background` and stop them with PowerShell `Stop-Process` on the port owner.
- **WHERE WE STOP (2026-11-07, earlier):** v33 and v34 are DEPLOYED (owner pasted admin pages showing the new checkbox and the "Min days seen" box).
  The collector is alive on Hostinger (Last run 8:39 AM and 11:54 AM on 7 Nov, all 8 regions ok), so no hPanel cron is needed. 902 sounds saved, **40 pass the filter**.
  The owner approved 4 sounds: nostalgia.zz (60 s, 150M - doubtful, probably music/edit, he must listen and Reject if so), Abdi (7 s), Eva (8 s), Daisy (15 s).
  **OWNER PRIORITY (2026-11-07): he wants the FRONT END (public pages), not more admin.** I had put admin (Sounds Manager) before public pages and he objected.
  New order, agreed in principle (he had not yet said "yes" to the exact order when this was written, ask once): (1) MP3 download when he clicks Approve (TikWM `music_info.play` link, yt-dlp+ffmpeg fallback, validated, own file name, disk cap, one download at a time) +
  (2) public `/sounds` list and `/sounds/<name>-mp3` pages with player + Download MP3 button + link to the video downloader + FAQ + SEO (server meta, JSON-LD AudioObject, sitemap) in 11 languages +
  (3) "Report Content" page (footer link, reports arrive in admin, no auto-delete) BEFORE any sound page is public. No new admin panels; the existing Approve/Reject buttons are the publish switch. First test with the 4 approved sounds.
  Check first: does the collector save the MP3 link (`music_info.play`)? Not confirmed (it saves `video` {id,user,views}); if not, get it again at Approve time.
  Honest limits: the AI cannot hear audio, so meme vs song is the owner's decision by ear; "meme" does not mean "no owner" (copyright risk, told to the owner). In this session SSH reading of the live server was blocked by the permission system, so server data came only from the admin pages the owner pasted.
  **v34 (deployed, commit d42f5b7, `releases/ask-downloader-v34-sounds-min-days.zip`):** new setting "Min days seen" (default 2, `minDays`; 902 -> 40 rows pass; a 1-day sound such as John Pork 141M is hidden until it returns; set to 1 to see all) and more junk words (famous people/channels, songs, religious pages, some brands).
  **v33 (deployed, commit f2a7f32):** `excludeJunk` checkbox "No brands/news/lyrics" (junk word list in `server/soundsFilter.ts`, matched after NFKC + removing marks so fancy letters work), reason "no creator" for blank creator names, score weighs days seen x8. Filter reasons shown in admin: bad name, no creator, junk word, music, few days, low views, too short, too long, duplicate, same creator. Hidden, never deleted; approved always pass.
- **Earlier stop (2026-11-05):** Trending Sounds step A (collect only, admin only, nothing public) is live and collecting by itself (8 regions, every 6 h, retries after 45 min; switch is ON; no daily "Run now" needed). The owner will look again on **2026-11-07** at `/admin/sounds`. Simple health check for him: the "Last run" date/time must be recent (within ~6 h); most regions `ok` (US `failed` sometimes is normal). What to ask him then: paste the two top lines ("N sounds saved - N pass the filter" and "Last run: ...") and say how many rows have Days 2 or 3 ("Days" counts distinct UTC days a sound was seen). Then decide with him: filter numbers (min 1M views, 3-60 s, no songs, 2 per creator), then Step C/D/E (MP3 pipeline, Sounds Manager with Approve/Reject as publish switch, Report Content page BEFORE any public page, public pages + SEO + 11 languages). Decisions already made: Hostinger stays; only spoken-word memes/dialogues/SFX/AI voices, no commercial music; manual approval first; no extra APIs (RapidAPI/Apify) and no "total videos" number (plan section 12). Known limits: only the free TikWM feed is used (single point of failure; if it blocks us, old data stays, new sounds stop, tell the owner honestly); "Views" = top video's views, not the sound's total use; phone width of the admin page not checked; the Node process staying alive on Hostinger not proven (if "Last run" gets old, add an hPanel cron).
- **Owner decision 2026-11-05: no extra APIs and no "total videos" number (plan section 12; Step B dropped).**
- **Latest (2026-11-05): `releases/ask-downloader-v32-sounds-more-regions.zip`** (DEPLOYED by the owner on 2026-11-05; v26-v31 are deployed too, they are older steps of the same line). Owner asked why the sounds count did not grow after several uploads. Facts from his admin paste: collector ON, last run all 4 regions ok, 86 saved / 28 pass, all rows "Days 1" (only one day of data), so it WAS growing (42 -> 86) and the feed only gives ~4-20 videos per region per run. v32: 8 regions (PK, IN, US, GB, AE, SA, ID, BR; tested 2026-11-05: ~20 regions answer, US/IN worked this time but US sometimes gives HTTP 531, which is retried after 45 min), 4 runs a day (every 6 h), a run takes about 1-2 min. A title that is not a string (Beyonce row showed "[object Object]") is now ignored and old ones are cleared. A run now added ~36-50 new sounds locally. TikWM may start blocking if call volume grows (its other endpoints already sit behind Cloudflare): watch the "Last run" line. v31 below.
- Previous: `releases/ask-downloader-v31-sounds-clean-views.zip`** (built, NOT yet deployed). v31 = clean-up on top of v30: at the end of each run, old sounds that have no saved `video`, no owner decision (status new/empty) and were not seen again are DELETED (their number was unverified; they return when they trend again); approved/rejected old ones are kept and show "?" after the views. Checked on a TikTok page by hand twice (Eva 101.9M, Abdi 48.5M vs 48.6M): feed numbers match TikTok. **Owner asked for the sound's total usage ("N videos", shown on TikTok's sound page) in admin: NOT possible for free today.** Tested 2026-11-05: TikTok's sound page loads it from a signed private API (`/api/music/detail/`, not in the HTML); TikWM `music/info` and `music/posts` are behind Cloudflare; scraping TikTok from the server is fragile (got a bot page) and a request to call the private API was blocked on purpose. Only way left: a RapidAPI TikTok API that returns music info (Step B, owner creates the key). Until then the "Sound" link opens TikTok's page, where the number is visible.
- Previous: `releases/ask-downloader-v30-sounds-views-fix.zip`** (built). BUG FIX found by the owner checking a sound on TikTok (admin showed 203.8M, real top video 101.9M): the TikWM feed repeats 3-4 of 20 videos, and v27-v29 added a repeated video twice. v30: each video counted once (`seenVideo` in `soundsFetch.ts`), and "Views" now means the **top video's views** (the same number the "Video" link shows). Old sounds are marked `vs` and corrected when seen again, or at the end of a run if they have a saved `video`. Sounds from v27/v28 that have no `video` link and were not seen again may still show inflated views. Tested: after a run every sound with a video link has views == its video views (0 mismatches). TikTok's "N videos" on the sound page (usage count) is NOT available from TikWM. v29 below.
- Previous: `releases/ask-downloader-v29-sounds-verify-links.zip`** (built). v28 is deployed (owner's list showed the filter; the owner rejected some sounds by hand, not a bug). v29 = only: each sound keeps its most viewed video (`video` {id,user,views}) and the admin table has a "Check on TikTok" column: "Video" -> `tiktok.com/@user/video/<id>`, "Sound" -> `tiktok.com/music/x-<id>`. Old sounds have only the Sound link until they are seen again. Verified by hand on real TikTok: video play count 876,400 vs saved 876,352, sound id equal, name "original sound - Daisy" equal, sound page opens ("23K videos"). Note: the "Views" column is the sum of the trending VIDEOS' plays in the feed, NOT the sound's total usage; TikWM gives no usage count. v28 = Trending Sounds, on top of v27: filter that hides but never deletes (`server/soundsFilter.ts`: min views 1M, 3-60 s, no songs, bad names, duplicates by name+duration, max 2 per creator; numbers editable in admin); per-sound score; approve/reject/undo buttons (status new/approved/rejected; this is meant to become the publish switch for Step E, owner chose manual approval first, auto-publish later); daily views history (`hist`, 14 days); providers list in `server/soundsFetch.ts` (`PROVIDERS`, each tried twice; only TikWM today); empty list counts as failure; a run with failed regions is repeated after 45 min; red warning in admin if all regions fail; `soundsData`/`soundsState` added to backup. Checked: lint, build, v27 data upgraded in place (42 sounds, 13 pass), a real run, reject/settings/bad-id API calls, admin page on desktop. NOT checked: phone width, Hostinger scheduler staying alive. **Backup source is still missing:** no key-free second source exists (tested 2026-11-05: TikWM `feed/search` is behind a Cloudflare challenge, TikTok Creative Center API says "no permission"). Plan: Step B = free RapidAPI APIs with keys the owner creates, plugged into `PROVIDERS`. Owner wants sounds fetched in every case, so do Step B soon.
- Previous (2026-11-04): `releases/ask-downloader-v27-sounds-collector.zip`** (deployed by the owner; TikWM works from the Hostinger IP: data arrived). v26 is deployed too. v27 = Trending Sounds **Step A**, collect-only, admin-only: `server/soundsFetch.ts` (TikWM feed, 1 region), `server/trendingSounds.ts` (job for PK/BR/GB/ID, 2x/day, catch-up when last run > 12 h, saves `soundsData.json` + `soundsState.json` in the data folder, drops sounds not seen for 60 days), `server/soundsRoutes.ts` (`/api/admin/sounds`, `/enabled`, `/run`), admin page `src/pages/SoundsPage.tsx` (sidebar "Trending Sounds", route `sounds`, switch is OFF by default). No MP3, nothing public, no existing file logic changed. Checked here: lint, build, one real run (4 regions ok, 42 sounds), anon gets 401, admin page opens. NOT checked: phone width, from the Hostinger IP (first thing to check after deploy: switch ON, "Run now", see if regions show "ok"), whether the Node process stays alive for the scheduler. Collections are not in the backup/restore list yet.
- Previous (2026-11-01): `releases/ask-downloader-v26-gradient-restored.zip`** (deployed). Change vs v25: in light mode the two home-page boxes the owner pointed at (the "All-in-One Video Downloader" heading box in `PublicHomePage.tsx` and the "All Platforms" header of the first-load card, `headerGradient` in `ToolPlatformCard.tsx`) have their original gradient back (`from-indigo-600 via-purple-600 to-pink-600`); everything else stays solid `#341d5b`. Original gradients of the other 56 places are in git (`git show b32772a^`). Checked: lint (tsc), build, gradient classes present in the built CSS; not checked in a browser.
- Previous (v25, 2026-10-28): `releases/ask-downloader-v25-first-load-flags-scrollbar.zip`** (built). Changes vs v24: the first-load card (platform `universal`, no tab active) uses solid `#341d5b` in light mode (header, button, border, Paste text, focus ring; dark mode unchanged); page scrollbar in light mode is 12px, `#341d5b` thumb on a light-purple track (`index.css`, rules on `html` and `html body` because Chromium reads the viewport scrollbar from either); the English card in "Browse blogs by language" shows the USA and UK flags together (`BlogLanguagesSection.tsx`, `UsaFlag` exported from `FlagIcon.tsx`). Checked: lint, build, computed styles and scrollbar width on desktop; mobile/Urdu not checked. The blog language dropdown (`LanguageFilterSelect`) still shows the UK flag only (not asked).
- Previous (v24, built, not confirmed deployed): `releases/ask-downloader-v24-solid-color-tabs.zip`** (v23 was deployed by the owner).
  Changes vs v23: home social tabs bigger (text 12/14px, icon 16px) and the active tab icon is white (`PublicHomePage.tsx`);
  in LIGHT mode every public gradient became solid `#341d5b` (58 places: header, footer, tool tiles, blog, contact, About, 404,
  tool pages and tool buttons). Dark mode keeps the old gradients through `dark:` classes. Not changed on purpose: admin pages,
  the downloader card (`ToolPlatformCard`, `VideoResultCard`), black/transparent fades, green success bars, ThemeToggle dots,
  header glow, toasts. Checked: lint, build, home page light/dark computed styles; blog/contact/404/mobile/Urdu not checked.
- Previous (v23): `releases/ask-downloader-v23-header-flags-fonts.zip`** (built, NOT yet confirmed deployed by the owner).
  Changes vs v22: About Us link removed from the header (desktop + mobile); English shows USA + UK flags together in the
  language picker (`LangFlag` in `FlagIcon.tsx`); header "Fast & Safe" badge removed and the line under the logo is now
  "Fast, Free & Safe" (`t.ui.fastFreeSafe`, 11 languages, ignores the admin tagline); bigger fonts in the downloader card
  (`ToolPlatformCard.tsx`). Checked: lint, build, no clipping in 11 languages at 360/768/1024/1280 px. The v22 entry below is the previous release.
- Previous (2026-10-27): `releases/ask-downloader-v22-tiktok-link-fix.zip`** (live, deployed by the owner via hPanel).
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
