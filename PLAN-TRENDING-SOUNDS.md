# Plan: Trending Sounds directory (daily auto-updated)

Status: **PLAN ONLY, nothing is built yet** (agreed with the owner on 2026-11-01).
Source idea: the owner's file `Additional Tools.docx` ("Viral Sounds & Memes MP3 Directory", plus a list of 8 more
tool ideas, see the end). Owner rules in `AI-HANDOVER.md` section 2 apply: Roman Urdu replies, one step at a time,
test before delivering, 11 languages, ZIP deploy, never break existing features.

## 1. The idea in one line
Every day the server finds the sounds that are trending on TikTok (later Reels/Shorts), saves the MP3, and creates a
SEO-ready page `/sounds/<name>-mp3` for each good one. People search "<sound name> tiktok sound download mp3", land on
the page, download the MP3, and are sent on to the video downloader.

**No separate "Audio Downloader" tool is needed.** The video downloader already has an audio/MP3 button
(`MediaItemCard.tsx`, `MediaFilterBar.tsx`, `extractAudioAsMp3` in `server/mux.ts`). Only the daily directory is new.
Owner said copyright is not a concern for him; it is still a real risk (many sounds are commercial songs), so keep
the admin hide/delete tools and a takedown path.

## 2. What was tested (2026-11-01, from the owner's PC, not from the server)
- TikWM trending feed works with no key: `GET https://www.tikwm.com/api/feed/list?region=XX&count=20`
  (worked for PK, BR, GB, ID; **IN and US returned HTTP 531**; one PK call also failed once, so it is flaky;
  a call takes about 4-5 s).
- Each video in the feed carries `music_info`: `id`, `title`, `author`, `duration`, `original`, `cover`,
  **`play` = direct MP3 URL**. One MP3 was downloaded: HTTP 200, `audio/mpeg`, 2.8 MB, valid `ID3` header.
- The feed is trending **videos**, not a sounds list. Sounds must be derived from them. Many are
  "original sound - username" (little search value); some are real songs (more search value, more copyright risk).
  Up to 20 videos per call and some sounds repeat (GB: 16 unique of 20).
- There is no TikWM "trending music" endpoint (`/api/music/trending` does not exist).
- **Not tested:** any RapidAPI API (names, free limits, whether they give an MP3 link), TikWM from the Hostinger IP,
  whether yt-dlp on the server can pull audio from a TikTok video link (it is the same binary that already serves
  TikTok video downloads, so very likely yes). yt-dlp cannot list what is trending; it needs a link.

## 3. Data sources and fallbacks (free tiers only)
Provider chain, tried top to bottom, first one that works wins:

| Job | Chain |
|---|---|
| Trending list | TikWM -> free RapidAPI API #1 -> #2 -> #3 -> yesterday's saved list |
| MP3 file | MP3 URL from the list -> **yt-dlp + ffmpeg** (already on the server) from the video link -> sound is not published, retry tomorrow |

Rules for the chain (owner wants free tiers only, auto-switch when one runs out):
- Server keeps per-provider counters (calls today / this month, remaining quota, last success/fail).
- HTTP 429 or "quota exceeded" (RapidAPI also reports remaining requests in response headers) puts that provider to
  rest until the next month; 3 failures puts it to rest for the day.
- Keep calls low: run 2x a day, about 4 regions, cache results, TikWM first (always free), RapidAPI only as fallback.
- The owner creates any RapidAPI account/key himself and pastes keys in the admin panel. Never put keys in the repo
  or the frontend. The AI must not create accounts or enter keys.

## 4. Filtering "really trending" sounds (needs real data first)
Score each sound; publish only the top 5-10 a day. Signals: view count of the videos using it, appears in several
videos and/or several regions, appears on several days, duration (about 60-90 s max), a real title (an
"original sound - user" only counts if views are very high and it repeats), not already published.
**The numeric thresholds are open until Step A has produced 2-3 days of data.**

## 5. Admin panel (must match the blog section)
New tab **Sounds Manager**, built like `BlogManagerPage.tsx`: search, filters (status / platform / language),
Published / Draft / Hidden counts, publish toggle, bulk actions, delete/hide. Per sound: title, slug, description,
category/tags, cover image, replace MP3, platform, language, related video links.
- **SEO box:** reuse the idea/component of `BlogSeoConfigSection.tsx`: meta title (60-char meter), meta description
  (160-char meter), target keywords, canonical URL, noindex switch, desktop + mobile Google preview, auto-fill.
- **Auto-job control:** on/off, sounds per day, regions, filter limits, "auto-publish" or "draft first".
- **API Providers panel:** order, on/off, key box (write-only), calls today/month, quota left, last success/fail,
  "Test" button, alert (like the notification bell) when all providers fail.
- **Job log:** when it ran, what was created, what failed.
- New sounds start as **draft** unless the owner turns auto-publish on.

## 6. SEO requirements (keep at 100%)
Reuse what `server.ts` already does for other pages (server-side `getRouteMeta`, canonical, OG/Twitter tags, 301 to
lower-case/no trailing slash, `sitemap.xml` with hreflang, `robots.txt`). Per sound page:
- Title, meta description, canonical, OG/Twitter injected on the server (Google sees full HTML without JS).
- JSON-LD `AudioObject` + `BreadcrumbList` (optionally `VideoObject` for related videos) in the head.
- Sitemap section for sounds with `lastmod`; only published + indexable pages; hreflang when translated.
- Drafts/hidden never indexable; admin noindex per sound; removed sounds -> archive, or 301/410, never a soft 404.
- URL `/sounds/<name>-mp3`, plus a `/sounds` listing; internal links to related sounds and to the downloader;
  link in header/footer.
- Not thin pages: at least about 150 words of unique text per page (name, creator, why trending, views, FAQ),
  not one copy-pasted template.
- Speed: audio `preload="none"`, no heavy scripts; Core Web Vitals must not drop.
- 11 languages for every visible word (en, ur, ar, hi, es, pt, fr, de, id, ru, ja; ur and ar are RTL).

## 7. Security requirements
- All admin routes behind the existing admin session; public routes read-only.
- Escape/sanitise every text that comes from an API (titles, names) before it reaches HTML (XSS).
- MP3 checks: size limit, valid MP3 header; the file name is our own id, never the API's name (no path traversal).
- Server fetches MP3 only from allowed hosts (TikTok CDN, TikWM), never an arbitrary URL (SSRF).
- API keys only in server storage/environment, shown write-only in admin.
- Rate-limit the download route; limit concurrent yt-dlp/ffmpeg work (host is about 1 CPU core).
- Disk cap: keep MP3s only for the last N days / top N sounds; delete older files (50 GB shared by 3 sites).
- New code goes in **new files** (for example `server/trendingSounds.ts`), uses the existing JSON store (`store.ts`) and
  the data folder that survives redeploys. Do not touch existing extractors. Job errors are caught and only logged.
- After every step: `npm run lint`, `npm run build`, test, then report.

## 8. Step order (one step at a time, wait for the owner's OK after each)
- **Step A - collect data only.** A job inside the server, 2x/day, TikWM, 4 regions (PK, BR, GB, ID), saves per sound:
  name, creator, duration, view counts, regions, first/last seen. **No MP3 download, no pages, nothing public.** On/off
  switch in admin, plus a way to look at the data (small admin-only view; SSH is for looking only). Catch-up logic:
  "if the last run is older than 12 h, run now" because the Hostinger Node process may restart (unverified whether it
  stays alive; hPanel cron is an alternative). **First thing to learn: does TikWM work from the Hostinger IP at all?**
  This is real site code, so it needs one small ZIP deploy. The owner chose to run it on the server (not on his PC).
  Let it run 2-3 days, then analyse: new sounds per day, share of "original sound", repeat sounds, view threshold,
  failure rate.
- **Step B** - find and test 3-4 free RapidAPI TikTok APIs (list + MP3 link?). Owner creates account/keys.
- **Step C** - provider chain + quota tracking + MP3 pipeline (with yt-dlp fallback) + storage; pages still hidden.
- **Step D** - admin: Sounds Manager, API Providers panel, SEO box.
- **Step E** - public pages, schema, sitemap, 11 languages.
- **Step F** - go live small (top 5 a day), watch Search Console, then scale.

## 9. Open questions
- Which free RapidAPI APIs exist and what do their free plans allow (Step B).
- Does TikWM work from the Hostinger IP? Does the Node process stay alive for a scheduler?
- Exact filter thresholds (after Step A data).
- Serve MP3 from our server (needs storage) or link to the original (saves disk)? Leaning: our server, with a disk cap.
- How per-page SEO meta is organised for dynamic routes (check `getRouteMeta` in `server.ts` before Step E).

## 10. Other ideas from the same document (not planned yet)
1. CapCut viral template links directory
2. Reels dynamic backgrounds / green-screen clips
3. Social media font style and bio generators (copy-paste)
4. TikTok/Reels hashtag bundles and analytics
5. AI voice-over / text-to-speech meme audio downloads
6. No-watermark thumbnail downloader (single + bulk)
7. Social media status / short clips video library
8. Platform aspect ratio and video resizer templates

Suggested first of these (safe, fits the existing tools): hashtag bundles, font/bio generators, thumbnail downloader.
