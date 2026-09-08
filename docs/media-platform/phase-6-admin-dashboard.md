# Media Utility Platform — Phase 6: Admin Dashboard

Status: **DRAFT — awaiting approval**
Builds on: Phases 0–5
Scope: A complete, secure, server-rendered admin dashboard — dashboard
stats, site/SEO/ad/FAQ/page management, processing/error log monitoring —
plus the repositories and analytics write-path needed to make the
dashboard's data real rather than placeholder.

---

## 6.1 What was built

| Brief requirement | Delivered as |
|---|---|
| Dashboard: total/successful/failed requests, visitors, daily/weekly/monthly stats | `Admin\DashboardController` + `resources/views/admin/dashboard/index.php` |
| Management: site settings | `Admin\SettingsController` |
| Management: SEO settings | `Admin\SeoController` |
| Management: advertisement management | `Admin\AdvertisementController` |
| Management: FAQ management | `Admin\FaqController` |
| Management: page/content management | `Admin\PageController` (admin) |
| Monitoring: processing logs | `Admin\LogController::processing` |
| Monitoring: error logs | `Admin\LogController::errors` |
| Monitoring: visitor statistics | Folded into the dashboard's daily-activity chart (below) |
| Security: admin authentication | Phase 4's `AdminAuthenticator`, reused unchanged |
| Security: session protection | Phase 4's `Session`, reused unchanged |
| Security: rate limiting | Phase 4's `RateLimitMiddleware`, reused (and fixed — §6.3) |
| Security: secure logout | New plain-form logout route, CSRF + session-guarded |

**A gap this phase had to close first:** the admin dashboard's stats and
logs are only meaningful if something actually writes to the
`processing_requests`/`visitor_daily_stats`/`error_logs` tables Phase 3
designed. Nothing did yet — Phase 4's controllers only wrote to files.
This phase adds that write path (`App\Analytics\RequestRecorder`, wired
into `MetadataController`/`ProcessController`) and DB-backed error
persistence (`ErrorHandler` → `ErrorLogRepository`), verified with a real
MariaDB instance rather than assumed (§6.5).

## 6.2 New repositories (all parameterized, no raw SQL elsewhere)

`SettingsRepository`, `SeoSettingsRepository`, `AdvertisementRepository`,
`FaqRepository`, `PageRepository` (admin CMS), `ProcessingLogRepository`,
`ErrorLogRepository`, `VisitorStatsRepository`.

## 6.3 Real bugs found and fixed via live testing, not by inspection

I stood up an actual MariaDB instance in this environment, applied the
Phase 3 schema, seeded a real admin account, and drove the dashboard
through a real browser session (cookies, CSRF tokens, form posts) rather
than only reading the code. That surfaced three genuine bugs no amount of
re-reading would have caught, all fixed and re-verified:

1. **Unauthenticated `/admin` returned raw JSON.** `AdminAuthMiddleware`
   always responded with the JSON `401` envelope, which is correct for
   `/admin/api/...` but a broken-looking dead end for a browser hitting a
   dashboard page. Fixed to redirect to `/admin/login` for page routes,
   keeping JSON only for the API surface — same pattern already used for
   404s in Phase 5.
2. **Rate-limit rejection on the plain-form login also returned raw JSON.**
   `RateLimitMiddleware` had the identical problem: submitting the login
   form after too many attempts would show a raw JSON blob instead of the
   login page with a flash message. Fixed with the same
   path-based branching (JSON for `/api/`, `/admin/api/`; redirect+flash
   for everything else). I only found this because a Playwright-driven
   login attempt genuinely timed out waiting for a redirect that never
   came — not from reading the middleware.
3. **A misreading of my own analytics design**, caught before it became a
   bug: I first tried to verify DB-backed error logging by breaking the
   `processing_requests` table and expecting an `error_logs` row to
   appear. None did — correctly, because `RequestRecorder` deliberately
   swallows its own failures (Phase 1 §1.6.4: analytics must never break
   the request it's describing) rather than escalating to the global
   `ErrorHandler`. I re-tested against a genuinely uncaught path (breaking
   the `administrators` table during login) and confirmed `error_logs`
   captured it correctly — worth recording so this distinction isn't
   re-discovered the hard way later.

## 6.4 Technical decisions

- **Plain HTML forms + Post/Redirect/Get, not JS/fetch, for the whole
  admin CRUD surface.** `App\Support\Flash` gives one-shot success/error
  messages across the redirect. This keeps the entire dashboard fully
  functional with zero admin-side JavaScript — deliberately different
  from the public site's fetch-driven flow (Phase 5), because an internal
  CRUD tool gains little from avoiding page reloads but gains a lot from
  fewer moving parts to secure-review. Phase 4's original JSON
  `/admin/api/login|logout|csrf-token` endpoints are untouched, so a
  future JS admin UI (or mobile client) still has something to call.
- **Inline edit forms via `<details>`/`<summary>`**, no JS. A native,
  keyboard-accessible disclosure widget rather than a modal — no
  dependency, no route needed for "edit this row."
- **No charting library for "daily/weekly/monthly statistics.”** A small
  CSS-bar visualization (relative-width `<div>`s) covers the 14-day
  activity view without adding Chart.js or similar — consistent with the
  "no new frontend dependency beyond what's vendored" posture from
  Phase 5.
- **Settings/SEO/Ads are manageable now; the public site doesn't read
  them yet.** This isn't an oversight — your own phase list puts "wire
  the public site to render dynamic ads/SEO" in the later SEO/Monetization
  implementation phase, after the Processing Provider work. Building that
  wiring now would mean re-touching Phase 5's already-approved frontend
  ahead of schedule. Each relevant admin page says this explicitly.
- **`error_logs` stays scoped to uncaught/critical exceptions**, not
  every `Logger` call. Admin login failures are logged to the `security`
  file channel (Phase 1's original channel design) rather than the DB —
  keeping the auth hot path free of a database dependency it doesn't
  otherwise need, while still giving the security channel real content.

## 6.5 Testing performed — against a real database, not mocked

No MySQL/MariaDB server existed in this environment before this phase, so
I installed MariaDB, applied `database/schema.sql` verbatim, seeded a real
`administrators` row with a real `password_hash`, and drove the entire
flow live:

- `php -l` across every new/changed file: clean.
- `vendor/bin/phpunit`: still **11/11 passing** (this phase added no new
  unit-testable pure logic — it's almost entirely DB-backed CRUD and
  view rendering, exercised live instead, which is the more meaningful
  test for this kind of code).
- **Full browser-driven login flow** (Playwright): wrong password →
  redirected back with a flash error; correct password → redirected to
  a dashboard showing **real, live numbers** matching what was actually
  in the database (screenshots below).
- **Real analytics write path**: submitted several requests to the public
  `/api/v1/metadata` and `/api/v1/process` endpoints, confirmed rows
  landed in `processing_requests` and `visitor_daily_stats` with correctly
  hashed URLs/IPs, and confirmed the dashboard's stat cards reflected
  exactly those numbers.
- **Full CRUD lifecycle** on advertisements (create → update → delete,
  verified against the DB after each step, including that an unchecked
  checkbox correctly cleared `is_active`), and create on FAQ, Pages, and
  SEO settings.
- **Log viewers**: confirmed the processing log table shows real rows
  with working status filters, and confirmed the error log table shows a
  **real captured exception** — I deliberately broke the `administrators`
  table mid-test to force a genuine uncaught error, confirmed the visitor
  saw only the safe branded 500 page (Phase 5) while the full detail
  (`SQLSTATE[42S02]... doesn't exist`) landed in `error_logs` for the
  admin to see, exactly as designed. Verified the message is HTML-escaped
  in the viewer (no stored-XSS risk from an error message).
- **CSRF verified both ways**: a login submission without a valid token
  is rejected; every admin mutation route requires the session-bound
  token embedded in its form.
- All test artifacts (test DB, test admin account, `.env`, MariaDB
  process) were removed/stopped before finishing — nothing test-related
  is in the branch.

Screenshots (desktop, real data, real login session) sent separately —
dashboard with live stats, FAQ management with an open edit form, and the
processing log viewer with real rows.

## 6.6 Potential problems

- **Only one admin account exists in the test environment I used, and
  none exists in the repository** (by design, per Phase 3/4 — creating
  the first production admin is a deploy-time step, not a checked-in
  credential).
- **No pagination stress-test** — pagination logic is straightforward
  `LIMIT`/`OFFSET`, verified to compute the right page count, but only
  tested against a handful of rows; worth a sanity check with real
  volume once there's real traffic.
- **`snippet_html` on advertisements remains a raw-HTML field**, per the
  Phase 3 design's accepted trade-off — still flagged for the dedicated
  Security Review phase, not resolved here.
- **Settings/SEO/Ads changes have no effect on the public site yet**
  (§6.4) — worth restating so it isn't mistaken for a bug when you click
  around: it's the correct scope boundary for this phase, not a missing
  feature.

## What remains

The Processing Provider discussion/selection/implementation, integration
testing against a real provider, SEO/monetization implementation
(including wiring the public site to the settings/SEO/ads managed here),
the dedicated security review, hosting optimization, full QA, and
deployment.

---

**STOP — awaiting your review (screenshots attached) and explicit
approval before the Processing Provider discussion begins — the phase
where we talk through what your Hostinger environment can and can't
support, the options, and I wait for your explicit choice before anything
is implemented.**
