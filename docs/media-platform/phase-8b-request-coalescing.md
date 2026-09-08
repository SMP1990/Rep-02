# Media Utility Platform — Phase 8b: Request Coalescing (Finding #1)

Status: **IMPLEMENTED AND VERIFIED under genuine multi-process concurrency**
Builds on: Phase 8's Finding #1
Scope: `App\Processing\Support\InFlightLock` — generic, provider-independent
coordination so concurrent requests for the same URL share one upstream
fetch — wired into `FacebookProvider`, re-tested live.

Finding #2 (no application-level request-size cap) is untouched, as
instructed — it's carried into the Security Review phase.

---

## 8b.1 What was built

`App\Processing\Support\InFlightLock` — a `flock()`-based, cross-process
"only one of you does the work" primitive. Built generic (keyed by an
arbitrary string, no Facebook knowledge) so any future provider
(Instagram/TikTok/YouTube) gets the same behavior for free, same pattern
as `HttpClient` from Phase 7b/7c.

- `acquire($key)` returns a lock handle if this call becomes the
  exclusive "leader" for that key, or `null` in every other case
  (someone else holds it and released within the wait window, the wait
  timed out, or the lock file couldn't even be opened).
- `null` always means the same thing to the caller: *don't do the
  exclusive work yourself — check whether the leader already produced
  it, and only proceed independently if it's still missing.*
- Bounded polling (`LOCK_EX | LOCK_NB` + `usleep`), not a plain blocking
  `flock()` — chosen deliberately so a wait is bounded by a configurable
  timeout under this app's control, rather than depending on whether
  `max_execution_time` reliably interrupts a blocking syscall (uncertain
  and platform-dependent — not something to build a load-bearing
  assumption on for shared hosting).

`FacebookProvider::resolve()` now: checks the cache, and only if empty,
tries to become the lock leader for that URL. The leader does the real
fetch/parse and populates the cache; everyone else waits (bounded), then
re-checks the cache and reuses it — falling back to its own independent
fetch only if the leader's attempt failed (deliberate: **only the success
path is coalesced**, so one transient failure is never inherited by every
other concurrent caller).

Two small, test-only constructor parameters were added to
`FacebookProvider` (`mbasicHost`, `mbasicScheme`, both defaulting to the
real production values) — needed to point the provider at a local stand-in
server for testing, since this sandbox still cannot reach the real
`mbasic.facebook.com`. Production behavior is unchanged; these are never
overridden outside tests.

## 8b.2 Testing

**27 tests total now** (was 21): 5 new `InFlightLockTest` cases (uncontended
acquire, re-acquire after release, independent keys don't contend, bounded
wait-then-give-up when externally held — measured with real elapsed time,
release-on-invalid-handle is a safe no-op), plus 1 new
`FacebookProviderTest` case proving the wiring falls back correctly when
a lock is externally held and never releases.

**The real proof — genuine multi-process concurrency, not a simulation:**
I could not honestly test true coalescing-under-concurrency inside
PHPUnit (one process can't simulate two independent OS processes racing
on a file lock the way real concurrent requests would on Hostinger). So
I built a temporary local stand-in for `mbasic.facebook.com` (a fixture
server returning the same two-quality HTML used in the unit tests, with
a deliberate 500ms delay to widen the race window) and pointed the real,
unmodified `FacebookProvider` production code at it via the test-only
host/scheme parameters. Then:

- Launched **10 genuinely separate OS processes** (`php` CLI, backgrounded
  shell jobs — the same technique already used for Phase 8's rate-limit
  concurrency proof) simultaneously requesting the identical URL.
- **Result: the fixture server was hit exactly once.** All 10 processes
  completed in ~0.5–0.6s each and every one received the correct,
  identical successful result (title + both quality options) — 9 of them
  from the coalesced cache, not from their own fetch.

This is the strongest evidence I can produce in this environment that the
mechanism is correct: real `flock()` semantics, across real separate
processes, doing real (if locally-substituted) HTTP I/O.

**Re-tested the original Phase 8 scenario too**, through the actual live
app (5 concurrent requests to `/api/v1/metadata` for the same real
Facebook URL): **still 5 independent provider attempts**, unchanged from
before. This is correct, expected behavior, not a regression — in this
sandbox every attempt still fails (can't reach `facebook.com`), and
failures are deliberately never cached/coalesced (§8b.1). The fix works
exactly as designed: it coalesces successes, not failures, and this
sandbox can only ever exercise the failure path for the real host.

## 8b.3 What remains unaddressed, deliberately

- **Finding #2** (no app-level request-size cap) — untouched, carried
  into the Security Review phase per your instruction.
- **Facebook's real markup is still unverified** in this environment —
  unchanged limitation from Phase 7c, not something this phase could
  address.

---

**STOP — awaiting your approval before the next phase.**
