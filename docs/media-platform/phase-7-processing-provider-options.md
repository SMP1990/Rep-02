# Media Utility Platform — Phase 7: Processing Provider — Environment, Options & Legal Considerations

Status: **DISCUSSION ONLY — no code in this phase, awaiting your explicit choice**
Builds on: Phases 0–6
Scope: Per your instructions, this phase is exclusively the explanation
you asked for before any provider is implemented. **No provider is
implemented, no third-party API is called, and nothing is hard-coded in
this phase.** `config/providers.php` stays empty until you choose.

I researched current (2026) information for the technical and legal
claims below rather than relying only on prior knowledge — sources are
listed in §7.8.

---

## 7.1 What the current Hostinger shared-hosting environment can support

- **Outbound HTTPS requests from PHP** (cURL/streams) to fetch a public
  page, call a JSON API, or check a direct file URL — this is ordinary
  web traffic and works fine within PHP's normal execution model.
- **Lightweight parsing in PHP** — regex, DOM parsing, JSON decoding of
  whatever a request above returns. CPU-light, fits comfortably in a
  shared-hosting request.
- **Cron-triggered PHP scripts** (Phase 0 §0.7) for periodic cleanup —
  already used by nothing yet, but available.
- **`exec()`/`shell_exec()`/`proc_open()` — more available than Phase 0
  assumed, with a real caveat.** These are disabled by default on
  Hostinger's shared plans, but *can* be individually re-enabled per
  account through hPanel's PHP Configuration → disabled-functions list
  [1]. I'm correcting my own earlier framing here: this isn't an
  SSH-only capability — if you enable it, a PHP script *can* shell out.
  What it can shell out **to** is the real constraint (next section).

## 7.2 What cannot reliably run there

- **There is nothing installed to `exec()` even if it's enabled.**
  Shared PHP hosting doesn't ship Python, `yt-dlp`, or `ffmpeg`. Getting
  a real extraction tool running would mean uploading a static,
  self-contained binary yourself — fragile (wrong glibc/architecture is
  a common failure), almost certainly against Hostinger's acceptable-use
  policy for shared plans (running arbitrary third-party executables),
  and likely to exceed shared hosting's CPU/memory allotment the moment
  it tries to transcode or download something non-trivial. I'm not
  presenting this as a viable Phase-1 option below because of this,
  not because `exec()` is unconditionally unavailable.
- **No persistent background workers or queues** — every request is
  bounded by PHP's `max_execution_time` (Phase 0: commonly 30–60s on
  shared plans). A slow extraction has nowhere to run except inside that
  window.
- **No durable large-file storage** — shared hosting quotas are small
  and not meant as a media buffer.
- **Sustained scraping traffic from a shared-hosting IP** is more likely
  to trip a target platform's anti-bot defenses than traffic from a
  dedicated IP, simply because shared-hosting IP ranges are commonly
  already on abuse-detection watchlists from unrelated tenants.

## 7.3 Available approaches

### Option A — Direct media URL support (no extraction at all)

If the pasted link *already points directly at a media file* (a
publicly linked `.mp4`/`.mp3`, a podcast RSS enclosure, a
Creative-Commons/public-domain file, or a platform's own
officially-provided download link — e.g. a SoundCloud track its creator
explicitly marked downloadable, which SoundCloud's own permissions
system exposes for exactly this purpose [2]), the "provider" just
verifies the URL (a `HEAD`/ranged `GET`) and returns it as the option.
No extraction, no ToS boundary crossed — the file was already made
directly, publicly available by whoever posted it.

### Option B — Local PHP-based scraping/parsing per platform

A `ProcessingProvider` implementation that fetches a source platform's
public page or internal API and parses out a media URL — the closest
thing to "how the reference site's category of tool generally works."

### Option C — Third-party extraction API/service

Delegate the actual extraction to an external service; our
`ProcessingProvider` becomes a thin HTTP client to it.

### Option D — Defer entirely

Keep the architecture exactly as built (Phases 1–6, zero providers
registered) and ship nothing provider-specific yet, revisiting once
you've decided a legal posture and/or evaluated vendors yourself.

These aren't mutually exclusive — Option A is cheap enough to include
alongside whichever of B/C/D you choose, since it covers a real (if
narrower) slice of the workflow with zero legal exposure.

## 7.4 Advantages / disadvantages

| | Option A: Direct URL | Option B: Local scraping | Option C: Third-party API |
|---|---|---|---|
| **Legal exposure** | Effectively none — no access-control or ToS boundary involved | Real, platform-dependent (§7.7) | Doesn't eliminate exposure, just relocates who does the fetching (§7.7) |
| **Technical fit on shared hosting** | Excellent — a `HEAD` request | Feasible for simple public pages/JSON; poor for platforms behind heavy anti-bot defenses or DRM-style streaming | Excellent — it's an outbound API call, same shape as Option A |
| **Reliability** | High — you're not depending on anyone's undocumented internals | Breaks whenever the source platform changes its page/app structure — this is exactly the maintenance burden the brief warned about | **Documented as poor in this category as of 2026** — testing of RapidAPI-marketplace video-download wrapper APIs found providers going offline for days at a time within a 4-week window, undocumented field/response changes, and tier limits changing without notice [3] |
| **Cost** | None | None beyond your own maintenance time | Usually metered per request/month |
| **Maintenance burden** | Minimal | High, ongoing, per platform (§7.5) | Low code maintenance, but real *vendor-risk* maintenance (watching for the service disappearing or changing) |
| **Coverage** | Only sources that already expose a direct/opt-in link | Whatever you're willing to build and maintain per platform | Whatever the chosen vendor supports, which can change without your input |

## 7.5 Expected maintenance requirements

- **Option A**: near zero — direct links don't change shape.
- **Option B**: ongoing, per-platform. Every source you scrape is
  something you're implicitly committing to re-fix whenever that
  platform's page/app markup or internal API changes — which happens
  without notice and without a changelog, because you're not a
  documented integration partner.
- **Option C**: low code maintenance, but you inherit the vendor's own
  maintenance failures as user-facing outages, and per the research
  above, that risk is not hypothetical in this specific category. You
  should also expect to occasionally need to switch vendors — which
  `ProviderManager`'s abstraction (Phase 1) is specifically designed to
  make cheap, but "cheap" still means "will happen."

## 7.6 Migration path to VPS/cloud

Unchanged from Phase 1 §1.7.5 regardless of which option you pick now:
the `ProviderManager`/`ProcessingProvider` boundary is what moves the
provider off shared hosting later, not a rewrite. Concretely:

- **Option A** never needs to move — a `HEAD` request is cheap anywhere.
- **Option B** benefits most from a VPS/dedicated move: real headless
  browser automation (for platforms whose content is only reachable via
  JS-rendered pages) becomes viable once you're not fighting shared
  hosting's `exec()`/binary constraints, and a dedicated IP reduces the
  shared-abuse-watchlist problem in §7.2.
- **Option C** barely changes — an HTTP call to a vendor works the same
  from shared hosting or a VPS. It might matter for latency/throughput
  at higher volume, not for correctness.

## 7.7 Legal / Terms-of-Service considerations

This is the section your own rules ask me not to gloss over, so I'm
laying out the actual legal shape rather than a blanket "it's fine" or
"it's illegal":

- **Scraping publicly accessible data is not, by itself, a CFAA
  ("unauthorized access") violation in the US.** *hiQ Labs v. LinkedIn*
  — the Ninth Circuit ruled for hiQ in both 2019 and 2022, and that
  holding (public-page scraping isn't "without authorization" under the
  CFAA) remains good law as of 2026 [4]. This means the *criminal/federal
  computer-crime* exposure some people assume exists for scraping
  generally doesn't, for genuinely public content.
- **That is a completely separate question from Terms of Service.**
  ToS violations are a **contract-law** risk, not a computer-crime one —
  a platform can still pursue a civil breach-of-contract claim, and more
  practically, can and does use technical countermeasures (rate
  limiting, IP bans, CAPTCHAs, cease-and-desist letters) regardless of
  whether they'd win in court [4]. YouTube's ToS is explicit on this
  point: downloading is prohibited "through any technology or means
  other than the video playback pages of the Service itself... or other
  explicitly authorized means," and their API terms separately prohibit
  using undocumented endpoints [5].
- **A materially more serious legal category applies when a platform
  uses a technical protection measure specifically to prevent
  downloading** (signed/expiring URLs, DRM, chunked streaming used as an
  access-control mechanism) **and a provider is built to defeat it.**
  That can implicate DMCA anti-circumvention provisions (17 U.S.C. §1201)
  — a different and more serious exposure than a plain ToS breach, and
  one that exists independent of whether the underlying content itself
  is copyrighted. This is precisely why Option B's per-platform risk
  varies enormously by platform: a platform with no technical
  download-prevention measure and a permissive ToS is a very different
  proposition from one using DRM-backed streaming specifically to block
  downloads.
- **Delegating to a third-party service (Option C) does not make this
  risk disappear** — it relocates who is technically performing the
  extraction, but your platform is still the one presenting the
  "download" workflow to your users for that source. If the underlying
  extraction breaches that platform's ToS or circumvents a technical
  measure, that fact doesn't change because a vendor's server did the
  actual fetching instead of yours.
- **Platform-by-platform reality varies a lot**, which is exactly why
  Phase 0 §0.14 left "which sources at launch" as an open decision
  rather than assumed:
  - **Lowest risk**: direct file links, RSS/podcast enclosures,
    Creative Commons/public-domain content, SoundCloud tracks a creator
    explicitly marked downloadable via SoundCloud's own permission
    system [2] — all Option A territory.
  - **Meaningfully higher risk**: platforms whose ToS explicitly
    prohibits downloading outside their own official mechanism (YouTube
    is the clearest documented example [5]) or that use DRM/signed-URL
    delivery as a deliberate access control.
- **None of this is legal advice** — it's an accurate summary of the
  publicly available legal landscape as background for *your* decision,
  not a substitute for actual counsel if you intend to operate this
  commercially at scale. I'm flagging that distinction explicitly rather
  than implying I've cleared this for you.

## 7.8 Sources consulted for this phase

- [1] [How to Enable Disabled PHP Functions in Hostinger](https://support.hostinger.com/en/articles/3212034-how-to-enable-disabled-php-functions)
- [2] [Manage your track's permissions – SoundCloud Help Center](https://help.soundcloud.com/hc/en-us/articles/31423603670043-Manage-your-track-s-permissions)
- [3] [4 YouTube Downloader APIs for Developers, Tested in 2026](https://www.socialkit.dev/blog/best-youtube-downloader-api-for-developers-2026), [3 Best Instagram Download APIs in 2026](https://www.socialkit.dev/blog/best-instagram-download-api)
- [4] [Web Scraping Legal Guide 2026: GDPR, CFAA, hiQ vs LinkedIn, and More](https://dataresearchtools.com/web-scraping-legal-2026/)
- [5] [YouTube API Services Terms of Service](https://developers.google.com/youtube/terms/api-services-terms-of-service)

---

## 7.9 What I need from you

Per your instructions, I'm not choosing this — I've explained the
environment, the options, and the real trade-offs above, and I'm
stopping here. Two things would help me implement the right thing next:
which approach (or combination) you want, and — since it directly
determines what "Option B" or "Option C" even means in practice — at
least a starting answer on which source(s) this platform targets at
launch (still fine to say "not sure yet, let's start with Option A and
figure out the rest").

**Nothing is implemented until you answer.**
