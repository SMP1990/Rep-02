# ASK Downloader — instructions for Claude Code

Social video downloader (Facebook, TikTok, Instagram, Twitter/X, Pinterest, Reddit,
Threads, Dailymotion) with a blog, an admin dashboard and RankMath-level SEO.
Live at **social.al-marifat.org**, hosted on **Hostinger "Web Apps" (Node.js)**.

---

## 1. How to work with the owner (most important)

- **Language:** the owner writes Roman Urdu (Urdu in English letters). Reply in the same
  style. Keep code, file names and commands in English.
- **The owner is not a developer.** Explain results in plain words. For hosting or
  deploy tasks give one-click-at-a-time steps, never a technical document.
- **One step at a time.** For multi-step work: do ONE step, test it, report, then
  **stop and ask permission** before the next step. Never do all steps at once.
- **Check before building.** When asked to add something, first check whether it
  already exists in the code and say so. Do not redo existing work.
- **Honest review.** If an idea or request has a problem, say what is wrong and
  suggest the fix. No automatic praise.
- **Code stays short.** Prefer small new files (helpers, components) over growing
  big files. A long change goes into several small pieces.
- **If the same request arrives twice by mistake,** ask before redoing the work.
- **Test what you build**, in the real app where possible (see section 7), and say
  what you tested. Never claim something works without checking it.
- **Measure before choosing an approach** (speed, memory, phone limits) and test fully
  here before delivering, so the owner does not have to test again and again.
- **New session?** Read ../AI-HANDOVER.md first: it says which branch holds this work.

## 2. Deploying (owner does this; you prepare the zip)

There is **no SSH or terminal on the hosting** — only zip upload. Never suggest SSH,
`npm install` on the server, or any command the owner must run on Hostinger.

After every finished change, deliver a **complete project zip**:

```bash
npm run build                  # builds dist/ (client) and dist/server.cjs (server)
rm -f dist/server.cjs.map      # never ship it: it would expose the server source
zip -qr ../ask-downloader-<name>.zip . -x "node_modules/*" -x ".git/*"
```

Check the zip still contains every original file (nothing missing), then tell the
owner the redeploy steps:

1. hPanel → Websites → Dashboard → **Deployments**
2. **Settings and redeploy**
3. Choose **"Upload new files"** (NOT the default "Use previous files")
4. Upload the zip → **Save and redeploy**

## 3. Commands

```bash
npm install
npm run dev        # tsx server.ts (Vite dev middleware), http://localhost:3000
npm run build      # vite build + esbuild server -> dist/server.cjs
npm start          # node dist/server.cjs (production mode)
npm run lint       # tsc --noEmit — must pass before every delivery
```

Local production test with throw-away data:
`DATA_DIR=/tmp/ask-data NODE_ENV=production PORT=3999 node dist/server.cjs`
First admin account: `POST /api/admin/setup` with `{ "email", "password" }` (8+ chars).
Admin panel is at `/admin` only — there is no admin link on the public site, by design.

Env vars (Hostinger panel): `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `DB_HOST`, `DB_PORT`,
`DB_USER`, `DB_PASSWORD`, `DB_NAME`, `FASTSAVER_API_KEY`, `SAVERAPI_KEY`.
`PORT` must always come from `process.env.PORT` (fallback 3000).

## 4. Project map

- `server.ts` — Express server: extraction API, admin API, blog API, sitemap,
  robots.txt, RSS, 301 redirect middleware, server-side meta tags, CSP headers.
- `server/` — small server modules:
  - extractors: `fbExtractor.ts` (+ `facebookPatterns.ts`), `igExtractor.ts`, `tiktokExtractor.ts`,
    `twitterExtractor.ts`, `pinterestExtractor.ts`, `redditExtractor.ts`, `threadsExtractor.ts`,
    `dailymotionExtractor.ts`, `extractorCommon.ts`, `ytdlp.ts`, `mux.ts`
  - `store.ts` — JSON file storage (data folder). `redirects.ts` — 301 table.
    `media.ts` — Media Library + ALT edits. `analytics.ts` — GA4. `uploads.ts` — image upload (WebP, descriptive names).
  - `bgRemover.ts` + `bgWorker.ts` + `bgRoutes.ts` — Background Remover on the server (worker thread,
    one photo at a time). Needs the optional `onnxruntime-node` (CPU only via `.npmrc`); without it
    the tool page falls back to running the model in the browser.
- `src/config/toolPages.ts` — every tool page (default SEO); `src/tools/<tool>/` — each tool;
  Admin → Tools SEO & FAQ (`ToolsSeoPage.tsx`) edits their SEO and FAQ. See ../TOOLS-GUIDE.md.
- `src/pages/` — public pages (`Public*`, `AboutUsPage`, legal pages, `NotFoundPage`)
  and admin pages (`BlogManagerPage`, `MediaLibraryPage`, `RedirectsPage`, `SettingsPage`, …).
- `src/components/` — UI. `Seo.tsx` sets title/meta/OG/canonical/JSON-LD on every page.
- `src/context/` — `AdminContext.tsx` (data + routing), `LanguageContext.tsx` (i18n).
- `src/utils/` — `slug.ts`, `canonical.ts`, `months.ts`, `relatedPosts.ts`, `i18n.ts`,
  `publicErrors.ts`, `cmsField.ts`, `seoSchema.ts`.
- `src/translations/` — dictionaries (see section 5).

## 5. Translations — every visible word, 11 languages

Languages: en, ur, ar, hi, es, pt, fr, de, id, ru, ja (ur and ar are right-to-left).
Switching the header language must change **every word** of the public site.

- **Never hard-code English text** in a public component: no JSX text, `title`,
  `aria-label`, `placeholder`, `alt` text, toast or error message.
- Put new words in `src/translations/extra/en.ts` **and the other 10 files** in the
  same folder (`ur.ts`, `ar.ts`, …). The type `ExtraDict` makes TypeScript fail if a
  language is missing a key — keep it that way. Use them as `t.ui.xxx`, `t.blogPost.xxx`, etc.
- Placeholders: `{brand}` is replaced automatically; use `fill()` from `src/utils/i18n.ts`
  for `{lang}`, `{n}`, `{file}`, `{network}`. Language names: `langName()`. Dates: `uiDate()`.
- `t` is typed `any`, so a typo in a key fails silently — check that every key you use exists.
- Content the admin wrote (posts, FAQ, tagline, keywords) shows as written. Shipped
  default text (default FAQ, tagline, author bio/role) is shown translated until the
  admin changes it — keep that pattern (`isAuthored` in `cmsField.ts`).
- Posts in other languages are siblings by id: `post_1`, `post_1__ur`, `post_1__es`.
- Messages that arrive in English from the server or `AdminContext` are mapped to
  translated text (`ErrorAlert.tsx` by error code, `utils/publicErrors.ts`).
- Brand/platform names (Facebook, TikTok, MP4…) and each language's own name in the
  language picker stay as they are.

## 6. SEO system — keep all of this working

- **Slugs:** `utils/slug.ts` — keyword-only, no years/numbers, max 6 words / 60 chars;
  admin can edit; duplicates get a word (category/language), a number only as last resort.
- **301 redirects:** changing a published post's slug adds a redirect automatically;
  admin page "301 Redirects"; no chains/loops; system paths can't be redirected.
- **Canonical:** never store a post's own URL. `utils/canonical.ts` — the page computes
  its own canonical; a stored one is used only when it points to another live page.
- **"Last updated":** changes only when title, content, excerpt or cover image change —
  not for meta, slug, ALT, category or publish/draft. Sitemap `lastmod` uses real dates only.
- **Media Library:** images grouped by month, bulk ALT editing, unused-image cleanup;
  new uploads get keyword file names; cover images have their own ALT (`coverImageAlt`).
- **Blog:** month archive filter (`?month=`) and category filter (`?category=`) are
  in-page filters with canonical `/blog` (no thin archive pages). Related Articles
  under each post; `[text](url)` links in post content (`ContentLink.tsx`, safe URLs only).
- **Headings:** one H1 per page (the post title); content uses `##` / `###` only.
- **Tracking:** Google Search Console verification tags and GA4 ID live in Settings;
  GA scripts load only when an ID is saved, never on admin pages; CSP opens Google
  domains only while GA is on.
- **Legal pages:** "Last updated" is a real date from Settings, never "today".

## 7. Testing before you report

1. `npm run lint` — no errors.
2. `npm run build` — succeeds.
3. Start the production server with a temporary `DATA_DIR` and check the change in a
   real browser (Playwright/Chromium), on desktop and on a 390px-wide mobile screen.
   For text changes, check at least English, Urdu (RTL) and one Latin language.
4. Make sure the admin panel still opens (Blog Manager, Media Library, 301 Redirects, Settings).

## 8. Rules for this product

- Never show fake or sample videos or fake success. If extraction fails, show an
  honest, friendly error (`ErrorAlert`).
- Extraction order per platform: own free method → FastSaverAPI → SaverAPI → honest error.
- LinkedIn is not supported (removed on purpose). No Google Sign-In.
- The site name comes from the admin setting (`siteName` / `{brand}`), never hard-coded.
- Loading screen shows the real platform name; video duration comes from real metadata
  (`--:--` when unknown).
- Design: public site violet/purple primary with amber accents; admin dashboard
  purple-pink theme (Fraunces headings, Plus Jakarta Sans body). Check new UI on mobile.

## 9. When a new export arrives from Google AI Studio

The owner sometimes re-exports the project from Google AI Studio with new features.
Re-apply these fixes to the new export:

- `PORT` from `process.env.PORT` (fallback 3000, cast to Number).
- Remove the AI Studio "Awaiting Approval…" banner, the "Test with sample URLs" demo
  buttons and any mock/fake video data fallback.
- Remove Google Sign-In / Firebase auth; download history stays in local storage.
- Remove dev badges ("Hostinger Ready", "Node.js + Express", tech-stack line, "FDown.vn Style").
- Keep the branded favicon, the Plus Jakarta Sans `@theme` font fix, and the button
  hover/press animations.
- No admin/staff link on the public site; admin stays at `/admin`.
- Facebook patterns stay isolated in `server/facebookPatterns.ts`.
- Then check that everything in sections 5 and 6 still works.
