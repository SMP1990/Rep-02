# Background Remover (browser tool)

Removes photo backgrounds entirely in the visitor's browser: no server work,
no API key, photos never leave the device. Built as a standalone tool first;
it joins the ASK Downloader site later as one lazy-loaded page.

## How it works

- **Fast pass (every photo):** ISNet (Apache-2.0), 47MB, int8 weights.
- **"Need better results?" (on request):** U2Net (Apache-2.0), 44MB. Its
  confident areas are added to the ISNet mask (`src/lib/combine.ts`), which
  brings back parts ISNet cuts away (e.g. a body in front of a dark door).
- Models run in a Web Worker (`src/lib/worker.ts`) with onnxruntime-web,
  WASM by default, WebGPU only on devices with a real GPU (a blank GPU result
  falls back to WASM). Multi-threaded when the page is cross-origin isolated.
- Nothing heavy is bundled: the runtime comes from jsDelivr, the model parts
  from this repo via jsDelivr (GitHub raw as a backup), and are kept in the
  browser's Cache Storage after the first visit. The fast model starts
  downloading when the visitor first points at the upload box.
- Editing (Erase / Restore brush, backgrounds) works on a screen-sized
  preview; downloads are rebuilt at full resolution (`src/lib/compose.ts`).

## Commands

```bash
npm install
npm run dev            # http://localhost:5173
npm run lint           # tsc --noEmit
npm run build          # dist/ (~260KB JS, mostly React)
npm run build:single   # dist-single/index.html: one file to preview the tool
```

Models are rebuilt with `python3 scripts/prepare_model.py` (ISNet) and
`python3 scripts/prepare_hd_model.py` (U2Net). After committing new parts,
update `commit`, `parts` and `bytes` in `src/lib/models.ts`.

## Joining the site — checklist

1. Copy `src/components`, `src/lib`, the tool styles at the end of
   `src/index.css`, and lazy-load `BackgroundRemover` on its own route so the
   rest of the site never loads it.
2. Move the words in `src/i18n/en.ts` into the site's
   `src/translations/extra/*.ts` (all 11 languages) and pass them as `t`.
3. Content-Security-Policy (`server.ts`), additions needed by the tool:
   - `script-src`: `https://cdn.jsdelivr.net 'wasm-unsafe-eval'`
   - `connect-src`: `https://cdn.jsdelivr.net https://raw.githubusercontent.com`
   - `img-src`: `blob:`
   - `worker-src`: `'self'`
4. On the tool's route only, for ~3x faster processing:
   `Cross-Origin-Opener-Policy: same-origin` and
   `Cross-Origin-Embedder-Policy: credentialless` (Safari ignores it and
   simply runs single-threaded).
5. SEO page text, FAQ and sitemap entry come from the site.

## Tested (Chromium, desktop and 390px mobile, light and dark)

Upload / paste / drag, progress, compare slider, brush + undo, backgrounds,
PNG/JPG downloads at full size, "Need better results?" (incl. offline
failure keeping the first result), CDN failure + retry, model cache, 20MP
photo on a simulated 2GB phone, keyboard-only use, axe accessibility scan:
no violations. Not testable here: a real GPU and the live jsDelivr URLs.
