# Media Utility Platform — Phase 8: Integration Testing

Status: **COMPLETE — no code changes, one real finding flagged for your decision**
Builds on: Phases 0–7c
Scope: Your exact test matrix — Frontend → Backend API → ProviderManager →
FacebookProvider → Processing Result → Frontend Result Interface, tested
against valid input, invalid input, empty input, malformed input,
provider failure, timeout, repeated requests, mobile usage, large
requests, and concurrent requests.

All testing here used the real running application (PHP built-in server
+ a real MariaDB instance, same setup as prior phases), not mocks. No
application code was changed — this phase's job was to find problems,
and where none were found, that's a real result too, not an assumption.

---

## 8.1 Results by category

| Category | Result |
|---|---|
| **Valid input** | A well-formed Facebook URL correctly resolves to `FacebookProvider` (not `UNSUPPORTED_SOURCE`); a well-formed non-Facebook URL correctly stays `UNSUPPORTED_SOURCE`. |
| **Invalid input** | Non-URL strings, `javascript:`, and `ftp:` schemes all rejected with `INVALID_URL` — none reached the provider layer. |
| **Empty input** | Missing `url` key, empty string, and a fully empty body all correctly rejected with `INVALID_URL`, no crash. |
| **Malformed input** | Unparseable JSON, `url` as a number, `url` as an array, a top-level JSON array instead of an object — every case degraded to a clean `INVALID_URL` rather than a fatal error. `Validator::string()`'s `is_string()` guard is doing exactly the job it was written for. |
| **Provider failure** | Confirmed via a genuine network failure (this sandbox truly cannot reach `facebook.com`) — surfaces as `PROVIDER_UNAVAILABLE` (503) with a safe, generic message. No internal error text reached the client at any point in this phase's testing. |
| **Timeout** | Tested in isolation against a local server that sleeps 6s, with the client configured for a 2s ceiling: the request was cut off at ~2.00s, not 6s — `CURLOPT_TIMEOUT` bounds the request exactly as designed, so a hung upstream can never hang a user's request. |
| **Repeated requests** | Rate limit (10/60s) enforced at the exact boundary: requests 1–10 pass, 11 onward blocked with `RATE_LIMITED` (429). |
| **Mobile usage** | Real device-emulated browser test (Playwright, iPhone 13 profile): pasted a Facebook URL into the actual homepage form, watched the real error state render correctly, styled, with a working "Try another link" recovery action. Screenshot sent separately. |
| **Large requests** | A URL past the 2048-character limit is rejected cleanly; a 5MB JSON request body was accepted and processed without crashing or hanging (~2.5s, dominated by the network-failure retry schedule, not the body size). |
| **Concurrent requests** | 20 truly simultaneous requests (parallel OS processes, not sequential) from the same IP: **exactly** 10 allowed through and 10 rate-limited — no over/under-count race condition. Verified against the database too: exactly 10 rows written to `processing_requests`, and `visitor_daily_stats`'s upsert-based counters were exactly correct under concurrent writes. |

## 8.2 A real finding: no request coalescing on identical concurrent URLs

Firing 5 simultaneous requests for the *same* uncached Facebook URL
produced **5 independent provider attempts**, not 1 shared lookup — each
concurrent request sees an empty cache (nothing has completed and written
to it yet) and proceeds independently. This isn't a correctness bug
(nothing corrupts, nothing crashes), but it's a real characteristic worth
your input on: if two users paste the same trending video URL moments
apart, this provider will contact Facebook that many times instead of
once, which cuts directly against the "don't look aggressive to
anti-bot systems" concern Phase 7b raised.

**I did not fix this** — it's a real design decision (typically solved
with a short-lived "this URL is already being resolved, wait for it"
lock), not a bug fix, and I didn't want to add that complexity without
your steer. Options, if you want it addressed:

1. **Leave it** — at low/moderate traffic this is unlikely to matter much.
2. **Add an in-flight lock** keyed by URL hash (e.g., a cache entry marking
   "resolution in progress," with concurrent callers waiting briefly or
   falling back to their own fetch after a short timeout) — a real,
   boundedly-scoped addition to `FacebookProvider`/the cache layer.

## 8.3 A related observation, not a bug: request body size has no app-level ceiling

The 5MB test body was handled fine, but `Request::fromGlobals()` reads
the entire request body into memory with no size check of its own —
today's real ceiling is whatever the hosting environment's `post_max_size`
(PHP ini) enforces before our code even runs, which is out of this
codebase's control and varies by host/plan. Not a finding that needs
fixing *now* (nothing broke, and PHP's own ini setting is a reasonable
first line of defense on real hosting), but worth carrying into the
dedicated Security Review phase as a candidate for an explicit
application-level cap, rather than relying entirely on server
configuration.

## 8.4 What this phase does not claim

Same honest boundary as Phase 7c: every test here exercises the pipeline
*around* the provider — routing, validation, timeout enforcement, rate
limiting, concurrency safety, error handling, and the frontend's display
of failure states — all verified for real. None of it exercises the
provider's actual Facebook-parsing success path, because this sandbox
still cannot reach Facebook. That remains the one open item only a
real-internet environment can close (see the standalone script from
last phase).

## What remains

Your decision on §8.2, then: SEO/monetization implementation, the
dedicated security review (where §8.3 belongs), hosting optimization,
full QA, and deployment.

---

**STOP — let me know how you want to handle §8.2 (leave it / add
coalescing), and reply when ready to move to the next phase.**
