# Media Utility Platform — Phase 7b: Facebook Provider — Targeted Research

Status: **RESEARCH ONLY — no Facebook-specific code in this phase, awaiting your explicit go/no-go**
Builds on: Phase 7 (general provider options/legal framework)
Scope: You asked me to research the technically reliable and legally
appropriate approach specifically for a public Facebook video/Reels
downloader before implementing anything, and to clearly explain
Hostinger limitations and whether VPS/cloud is required. This is that
research. Sources are in §7b.6.

---

## 7b.1 How Facebook video is actually served (technical reality)

Public Facebook videos and Reels are **not DRM-protected** for normal
playback — the video file itself is reachable once you know its URL. The
part that's hard is *finding that URL*: Facebook is a JavaScript-heavy
React/GraphQL application, and the direct video URL isn't sitting in
static HTML — it's embedded in JSON blobs the page loads, or reachable
through Facebook's internal (undocumented) mobile-web/GraphQL endpoints.
This is exactly the technique `yt-dlp`'s Facebook extractor and every
similar tool actually uses: fetch the page/an internal endpoint, parse
out embedded JSON, pull the video URL from it [1][2]. It is **not**
inherently a "needs a real Python interpreter/headless browser" problem —
it's fundamentally an HTTP request + JSON/regex parsing problem, which
**is** something PHP can do on shared hosting, resource-wise.

**What makes it hard is reliability, not raw feasibility:** Facebook
changes this internal page/app structure often, and extractors visibly
lag. Current (2026) reports on `yt-dlp` — the most actively maintained,
community-scaled tool in this space — describe a recurring "Cannot parse
data" failure that **specifically hits Reels hardest**, "because Facebook
changes its page structure faster than the extractor can track" [1]. That
tool has a large community shipping fixes quickly; a bespoke
single-maintainer PHP implementation should expect to lag further behind,
not less.

**Public content only, no login needed** — for genuinely public
videos/Reels, no cookies/session/authentication are required to extract
them, which aligns with your instruction not to bypass login or private
content. (`yt-dlp` only needs cookies for private/age-gated content,
which is out of scope here anyway [1].)

**No official API covers this use case.** I checked Meta's Graph API
Video API specifically: video access requires an App-Review-gated Page or
User access token, and for another person's video you'd need *that
person* to log in and grant your app the `user_videos` permission
themselves [3]. There's no API where you hand Meta an arbitrary public
video URL/ID and get a file back for content you don't own or that its
poster hasn't personally authorized your app to access. This isn't a gap
in my research — it's Meta not offering that as a product, which makes
sense given it would let a third party disintermediate their own
platform.

## 7b.2 Legal reality — this is the part that changed recently and matters most

- **Meta's Terms of Service were rewritten specifically to close the gap
  a downloader like this would rely on.** Effective **January 1, 2025**,
  Meta's ToS explicitly prohibits automated data collection "regardless
  of whether such automated access or collection is undertaken while
  logged-in to a Facebook account" [4] — closing the logged-off loophole
  that a prior court case had turned on (next point). This is current,
  not legacy language.
- **Context on why that specific wording exists:** in January 2024, a
  federal judge ruled in *Meta Platforms v. Bright Data* that Bright
  Data's **logged-off** scraping of public Facebook/Instagram data didn't
  breach Meta's *then-current* ToS, because that ToS's "your use"
  language didn't reach activity performed while logged out — Meta
  dropped the case a month later [5]. That ruling is real and often cited
  as "scraping public Facebook data is fine," but it was decided under
  contract language Meta has since rewritten *in direct response*. Relying
  on that precedent today, against the current ToS, is materially weaker
  than the "Bright Data won" headline suggests.
- **This is contract risk, not criminal risk** — the same CFAA
  distinction from Phase 7 §7.7 still applies (*hiQ v. LinkedIn*: scraping
  public pages isn't a federal computer-crime violation). What's
  different here is that Facebook specifically closed the contract-law
  gap that made the public/logged-off case for other platforms more
  defensible. Realistic consequences of breach are civil: cease-and-desist,
  IP/account bans, and — Meta has a documented history of suing
  scraping-as-a-service operators at scale — potential litigation if this
  operates as a sustained commercial service rather than a one-off.
- **Bottom line**: there is no configuration of "public content only, no
  login bypass, no DRM circumvention" that makes this ToS-compliant for
  Facebook specifically, post-January-2025. Staying public-only and
  login-free (which you've already directed) avoids the *more severe*
  DMCA anti-circumvention category from Phase 7 §7.7 and avoids touching
  private/authenticated content — but it does not avoid ToS/contract
  exposure. That exposure is the one thing I can't design around; it's a
  decision only you can make, which is why I'm stopping here rather than
  building it.

## 7b.3 Does this need Hostinger shared hosting, or VPS/cloud?

Not a single yes/no — it depends on which part:

| Concern | Shared hosting (Phase 1) | Needs VPS/cloud |
|---|---|---|
| Fetching the page/internal endpoint + parsing out a video URL | **Feasible.** Plain HTTP + JSON parsing, no `exec()`/ffmpeg needed for this step. | — |
| Serving/muxing separate high-quality audio+video streams (when Facebook splits them, common at higher qualities) | Not feasible — this needs `ffmpeg`, which shared PHP hosting doesn't provide (Phase 7 §7.2) | **Required** for full HD support |
| Sustained reliability at real traffic | Weak — shared-hosting IP ranges are more likely to already be flagged by Facebook's anti-bot systems than a dedicated IP, worsening the block/CAPTCHA rate independent of your own behavior | **Strongly recommended** — a dedicated IP (and, realistically, eventual proxy rotation, which nearly every serious "Facebook scraping" resource I found treats as a prerequisite [6]) meaningfully reduces this |
| Retry/backoff headroom for transient blocks | Constrained by shared hosting's `max_execution_time` (Phase 0 §0.7) | More headroom, and a real background worker becomes possible |

**My honest read:** a public-video/Reel-metadata-and-direct-URL provider
is *not strictly blocked* on shared hosting for a low-volume proof of
concept — the extraction technique itself is lightweight. But this is
the one provider category in your whole roadmap where I'd actually
recommend moving to VPS *before* real traffic, not after: the dominant
practical failure mode here isn't compute, it's IP reputation and
anti-bot response, and shared hosting is structurally the worse
environment for that specific problem, independent of anything you build
correctly. That said, if you want a technical proof-of-concept first to
validate the architecture, shared hosting can carry that far enough to
learn something before committing to VPS costs.

## 7b.4 What this means for the `ProcessingProvider` contract

No changes needed to the abstraction itself. A `FacebookProvider` would:

- `supports()`: match `facebook.com`/`fb.watch` URL patterns — cheap,
  no network call, exactly per contract (Phase 1 §1.7.2).
- `fetchMetadata()`: fetch the page/internal endpoint, parse the embedded
  video data, return title/thumbnail/duration + available quality
  options as a normal `ProcessingResult` — or throw `UpstreamRejectedException`
  if the post is private/removed/unavailable (never attempt to bypass
  that — matches your instruction).
- `process()`: return the resolved direct URL for the chosen quality as
  a `ProcessingOutput`.
- Its own network client enforces its own timeout (Phase 4 §4.3's
  correction already anticipates this — `ProviderManager` measures, it
  doesn't enforce).

This is exactly why the architecture was built the way it was: whichever
way you decide to go, this slots into `config/providers.php` as one
registration line, with zero changes to the frontend, the API contract,
or the admin dashboard.

## 7b.5 What I did *not* do

I did not write any Facebook-specific parsing/URL-pattern/extraction
code, did not register anything in `config/providers.php`, and did not
touch login/session/private-content handling in any way. Per your
instructions, that's gated behind your explicit approval — see §7b.7.

## 7b.6 Sources consulted

- [1] [How to Download Facebook Videos in 2026 (3 Free Methods)](https://alejandrorioja.com/how-to-download-facebook-videos/)
- [2] [yt-dlp Supported Extractors](https://github.com/yt-dlp/yt-dlp/wiki/extractors)
- [3] [Video API — Get Started, Meta for Developers](https://developers.facebook.com/docs/video-api/getting-started/)
- [4] [Is Scraping Facebook Legal? Terms of Service Explained (2026)](https://facebookscraperapi.com/blog/is-scraping-facebook-legal)
- [5] [Judge Sides Against Meta In Battle Over Scraping Public Data](https://www.mediapost.com/publications/article/392920/bright-data-didnt-violate-metas-terms-by-scrapin.html), [Court Rules in Favor of Bright Data in Meta v. Bright Data Case](https://brightdata.com/blog/web-data/court-rules-in-favor-of-bright-data-in-meta-v-bright-data-case)
- [6] [Best Proxies for Scraping Facebook in 2026 — Tested](https://scrapeops.io/websites/facebook/)

## 7b.7 What I need from you before writing any Facebook-specific code

This isn't a technical fork in the road (the technical path is fairly
clear: PHP-based, public-only, HTTP+JSON parsing). It's a risk-acceptance
decision, and I've laid out exactly what that risk is in §7b.2 so it's
informed rather than assumed. I'll ask this directly next rather than
guessing your risk tolerance for you.
