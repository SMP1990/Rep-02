# Media Utility Platform — Phase 7c: Facebook Provider Implementation

Status: **IMPLEMENTED — public content only, unverified against live Facebook, awaiting your review**
Builds on: Phase 7 (options/legal framework), Phase 7b (Facebook-specific research), your explicit risk acceptance
Scope: A real `FacebookProvider` registered in the application, plus the
provider-independent HTTP infrastructure it depends on.

---

## 7c.1 The one thing you need to know before anything else

**This has not been verified against real, live Facebook.** This
sandbox's network policy cannot reach `facebook.com` (confirmed via a
direct connection test — the egress proxy rejects it under organization
policy, the same way it rejects several other external hosts used
earlier in this project). Everything below has been verified as
thoroughly as that constraint allows:

- The parsing logic is verified against **synthetic fixture HTML** built
  to mirror the documented mbasic.facebook.com markup shape (10 dedicated
  tests, §7c.4).
- The full request pipeline (routing → provider resolution → HTTP client
  → error handling → logging) is verified **live, end-to-end, against
  the real running application** — the one thing that's genuinely
  untestable here is whether Facebook's actual current markup still
  matches the documented pattern the parser looks for.

Treat this as **"correctly built and defensively tested," not "confirmed
working on real Facebook videos."** The honest next step is for you (or
a session with real internet access) to try it against a handful of real
public Facebook video and Reel URLs before relying on it for anything.
I'd rather tell you that plainly than imply a confidence I don't have.

## 7c.2 What was built

| Requirement (your instructions) | How it's met |
|---|---|
| Real, working Facebook video/Reels support, not a demo | `app/Processing/Providers/FacebookProvider.php` — real extraction logic, not a stub |
| No hard-coded unverified third-party API | Nothing here calls any third-party service — it's a direct HTTP fetch + parse of Facebook's own public mobile interface |
| No unreliable scraper without research first | Phases 7/7b did that research before any code was written |
| Public content only — no login/private/DRM bypass | `supports()` matches only ordinary Facebook hosts; `looksLikeLoginWall()` detects a login gate and throws rather than working around it; nothing sends credentials, cookies, or a session anywhere |
| Provider stays replaceable | Zero changes to `ProviderManager`, the API contract, the frontend, or the admin dashboard — this is one more registration in `public/index.php` |
| Provider-independent infrastructure first | `App\Processing\Support\HttpClient`/`HttpClientInterface`/`HttpResponse` (Phase 7b), extended this phase with a response-size cap and effective-URL tracking — still fully generic, used by zero Facebook-specific logic itself |

### `FacebookProvider` mechanics

- `supports()`: matches `facebook.com`, `www.facebook.com`,
  `m.facebook.com`, `mbasic.facebook.com`, `web.facebook.com`, `fb.watch`.
- `fetchMetadata()`/`process()`: resolve `fb.watch` short links to their
  canonical URL (via `HttpResponse::$effectiveUrl`, a Phase 7c addition
  to `HttpClient`), rewrite to `mbasic.facebook.com` (the lighter,
  historically less JS-dependent interface), fetch it, and:
  - If the response looks like a login wall → `UpstreamRejectedException`
    (never attempts to authenticate).
  - If no video link pattern is found → `UpstreamRejectedException`
    (also logged at `warning` level so this is visible operationally —
    expected to happen periodically given the documented fragility).
  - Otherwise parse the title and every `video_redirect` link into
    HD/SD `ProcessingOption`s.
  - Extraction results are cached for 5 minutes (`App\Support\CacheStore`,
    Phase 4's existing file-based cache — no new storage mechanism) so a
    metadata call followed shortly by a process call doesn't double the
    number of requests made to Facebook.
- `process()`: looks up the chosen option and returns it as a
  `redirect_url` `ProcessingOutput` — **the video file itself is never
  fetched or stored by our server**; the browser downloads directly from
  Facebook's own CDN URL. This was a deliberate choice, not an
  oversight: it avoids tying up a PHP worker or shared-hosting
  memory/bandwidth on potentially large video files, and it means there's
  nothing to write to `storage/tmp/` or clean up — no temporary file
  handling was needed for this provider's design.

## 7c.3 A real bug found and fixed while wiring this up

Building the first real provider surfaced a genuine defect in code from
Phase 4: `public/index.php` constructed `ProviderManager` by passing
`Config::get('providers.providers', [])` directly — but `ProviderManager`
takes `ProcessingProvider` *instances*, not class-name strings. It was
never actually run with a non-empty list before now, so a call to
`$provider->supports()` on a plain string would have fatally errored the
moment anything was registered. Fixed by constructing providers
explicitly in `public/index.php`, same as every other dependency in that
file — `config/providers.php` is now documentation of what's registered
and why, not something the code resolves automatically.

## 7c.4 Testing performed

```
$ find app config public tests resources -name "*.php" -print0 | xargs -0 -n1 php -l
```
Clean.

```
$ vendor/bin/phpunit
OK (21 tests, 39 assertions)
```
10 new `FacebookProviderTest` cases, all against synthetic fixture HTML:
host matching, successful two-quality extraction, correct mbasic URL
rewriting, login-wall rejection, no-video rejection, transient-failure
→ `ProviderUnavailableException` translation, correct option resolution
in `process()`, rejection of an unknown option id, cache reuse on a
second call (verified by asserting the fake HTTP client was only hit
once), and `fb.watch` canonical-URL resolution.

**A real bug was found via this testing, not just theorized:** the
initial quality-label heuristic looked at HTML *before* each matched
link to guess "HD" vs "SD," which — once tested against a fixture with
two adjacent links, the realistic case — bled into the *previous* link's
label text and collapsed both options into one. Fixed to look strictly
after each link ends; re-verified with a debug script showing the exact
byte windows involved (see the fix commit) before re-running the suite
clean.

**Live end-to-end test against the real running application** (not
fixtures): started the actual PHP server and hit the real
`/api/v1/metadata` endpoint —

- A non-Facebook URL still correctly returns `UNSUPPORTED_SOURCE` (the
  new provider didn't over-broaden matching).
- A Facebook URL correctly resolves to `FacebookProvider`, attempts a
  **real** network call to `mbasic.facebook.com`, which **genuinely
  fails** in this sandbox (confirmed connection rejection, not a
  simulated failure), and that failure surfaces as a clean
  `PROVIDER_UNAVAILABLE` (503) with a safe, generic message — no cURL
  error text, no hostname, no stack trace reached the client.
- `storage/logs/processing.log` correctly recorded `"provider":"facebook"`
  and the real elapsed time (~1.5s, consistent with the retry/backoff
  schedule actually running: 3 attempts, ~600ms of backoff plus
  per-attempt overhead).
- The existing per-IP rate limit (Phase 4) still applies uniformly to
  Facebook requests — verified with repeated calls.
- Re-verified the extended `HttpClient` (response-size cap,
  effective-URL capture) against a local test server: all 8 prior +
  new scenarios still pass after the internal rewrite from
  `CURLOPT_RETURNTRANSFER` to a size-limited write callback.

## 7c.5 What I did not do

- Did not add any second/fallback parsing strategy for the full
  `www.facebook.com` interface — one well-documented, clearly-scoped
  technique (§7c.2) beats two unverified ones. If mbasic-based extraction
  proves unreliable in real testing, that's a natural next iteration.
- Did not attempt to detect or work around DRM, age gates, or any other
  access control beyond a plain login wall.
- Did not implement Instagram/TikTok/YouTube — you asked for those as
  future expansion, each as its own replaceable provider; nothing about
  this implementation blocks that, and `HttpClient` is already shared,
  provider-agnostic infrastructure ready for them.

## 7c.6 Potential problems

- **The core, unavoidable one**: if Facebook's real markup doesn't match
  the documented `video_redirect` pattern right now (entirely possible —
  this is exactly the fragility Phase 7b's research described), every
  real request will currently throw `UpstreamRejectedException`
  ("we couldn't find a downloadable video"), not crash — but it also
  won't work. This needs real-world testing to know for sure.
- **Cached extraction results include a live CDN URL with a 5-minute
  TTL.** If Facebook's URLs expire faster than that in practice, a
  `process()` call late in that window could return a dead link. Worth
  tightening once real behavior is observed.
- **No stream muxing** — if Facebook ever requires combining separate
  audio/video tracks for a given quality, this provider doesn't attempt
  it (would need `ffmpeg`, which Phase 7b already flagged as a VPS-only
  capability). Right now it only surfaces whatever single-file URLs
  `video_redirect` exposes.
- **IP-reputation risk remains exactly as described in Phase 7b** — this
  is still running from this environment's IP for now; the VPS
  recommendation from that research still stands before real traffic.

## What remains

Real-world verification against live public Facebook URLs (needs an
environment with actual internet access to facebook.com — not available
here), then: integration/QA at volume, SEO/monetization implementation,
the dedicated security review, hosting optimization, full QA, and
deployment. Instagram/TikTok/YouTube providers whenever you want to
prioritize them, following this same research-first pattern.

---

**STOP — this is implemented and defensively tested, but not confirmed
against real Facebook. Please test it against a few real public
video/Reel URLs when you have an environment that can reach Facebook,
and let me know what you find — that result determines whether the
extraction technique itself needs adjustment.**
