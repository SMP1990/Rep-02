# ASK Downloader — tools: where everything is

A map of the work on the site's online tools, so any part can be found and
restored later. Everything below is in this GitHub repository
(`SMP1990/Rep-02`).

## Permanent markers (git tags)

Tags never move and keep every file in their history reachable, even if a
branch is deleted.

| Tag | What it holds |
|---|---|
| `tools-v1` | The complete state when the tools section and the Background Remover went live: site source, tool source, models, deploy ZIP. |
| `bg-remover-model-isnet-v1` | Commit `f971bc3`: the first fast model (ISNet, 1024 only), used by `tools-v1`. |
| `bg-remover-model-u2net-v1` | Commit `bfcf318`: the "Need better results?" AI model (U2Net) that the live site downloads. |

**Do not delete these tags.** The live site loads its AI models from GitHub
through jsDelivr using the two model commits above.

## Model versions the site loads

| Commit | What it is |
|---|---|
| `d472b3d` | Fast model (ISNet) that works at any size: phones use 768, computers 1024. Loaded by the site from the "fast on mobile" release on. |
| `bfcf318` | "Need better results?" model (U2Net). |

These commits are in the history of the protected branches, so they stay.

## Where the Background Remover runs

On the server first (`ask-downloader/server/bgRemover.ts`, model in a worker
thread, one photo at a time, 768px): visitors download nothing big and
phones are as fast as computers. The server fetches the model files from the
commits above into its data folder on its own. If the host cannot install
`onnxruntime-node`, or the server is busy, the page runs the model in the
visitor's browser instead (the older way), so the tool always works.

## Backup branch

`backup/tools-v1` is a copy of the work at commit `1ed196e` (same state as
`tools-v1`, including both model commits in its history). Never merge into it
or delete it; it only exists so the code can always be found.

## Folders

| Folder | Contents |
|---|---|
| `ask-downloader/` | The website (React + Express) with the tools added. Deploy from here. |
| `ask-downloader/src/tools/background-remover/` | Background Remover code inside the site (UI, AI worker, 11 languages). |
| `ask-downloader/src/components/ToolsSection.tsx` | The "Free Online Tools" tiles on the home page. |
| `ask-downloader/src/config/tools.ts` | List of tool tiles. To launch a new tool, give its tile a `path`. |
| `ask-downloader/src/pages/BackgroundRemoverPage.tsx` | The `/background-remover` page. |
| `bg-remover-tool/` | The Background Remover as a standalone project (where it was built and tested), plus `model/` (ISNet) and `model-hd/` (U2Net) parts and the scripts that made them. |
| `releases/` | Ready-to-upload deploy ZIPs for Hostinger. |

## Getting something back

- **The deploy ZIP:** download the newest one from `releases/` on GitHub
  (open the file, then "Download raw file"). Upload it on Hostinger as usual.
  Older ZIPs are inside their release tag (for example `tools-v1`).
- **The whole project at the "tools-v1" moment:** on GitHub, open the
  branch/tag menu, choose the tag `tools-v1`, then "Code" → "Download ZIP".
- **The site exactly as it was before the tools were added:** commit
  `b53b38c` ("Add the ASK Downloader site source, unchanged").

## Rebuilding the deploy ZIP (for a developer)

```bash
cd ask-downloader
npm install
npm run lint && npm run build
rm -f dist/server.cjs.map
zip -qr ../releases/ask-downloader-<name>.zip . -x "node_modules/*" -x ".git/*"
```

## Adding the next tool

1. Build it as its own folder under `ask-downloader/src/tools/<tool-name>/`
   (words in `i18n/en.ts` + 10 languages, with `faq1Q`/`faq1A`... for its FAQ).
2. Add it to `ask-downloader/src/config/toolPages.ts` (path, name, default SEO
   title, description, keywords). That alone gives it: server title /
   description / keywords / share image / robots tag, a sitemap entry, and a
   section in Admin -> Tools SEO & FAQ.
3. Add one line for its FAQ in `ask-downloader/src/tools/defaultFaqs.ts`.
4. Give it a lazy-loaded page that calls `useToolSeo('<id>', ...)` and shows
   the shared `tools/shared/ToolGuide.tsx` (see `PasswordGeneratorPage.tsx`),
   plus its route (`App.tsx`, `AdminContext.tsx`, `types/admin.ts`,
   `PageLink.tsx` ROUTE_PATHS).
5. Turn one "Coming soon" tile into it in `src/config/tools.ts`
   (`fullLoad: true` only if it needs its own server headers).
6. Only if it needs a CDN or extra speed, add its path to `TOOL_PAGES` in
   `server.ts`. Run the full site check before deploying.

## Admin -> Tools SEO & FAQ

Per tool: meta title ({brand} = site name), meta description, keywords,
share image, "hide from search engines" (noindex + out of the sitemap), and
the FAQ. Empty fields use the defaults. Saved in the `toolsContent` data file
(included in Settings backups). The admin's English text is translated into
all languages automatically (Content Editor -> Translations to correct it);
FAQ questions left as built in keep their human translations.
