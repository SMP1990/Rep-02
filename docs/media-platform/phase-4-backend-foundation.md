# Media Utility Platform — Phase 4: Secure PHP Backend Foundation

Status: **DRAFT — awaiting approval**
Builds on: Phases 0–3 (requirements, architecture, structure, database)
Scope: Real, working infrastructure code — configuration, DB connection,
routing, request/response, sessions, CSRF, rate limiting, error handling,
logging, admin authentication. **No platform-specific media extraction.**
`config/providers.php` is empty and `app/Processing/Providers/` has no
concrete class — every processing endpoint call correctly resolves to
`UNSUPPORTED_SOURCE` until a provider is chosen and implemented in a later,
separately-approved phase.

---

## 4.1 What was built

| Concern (from your brief) | File(s) |
|---|---|
| Configuration system | `app/Support/Config.php`, `config/*.php`, `config/.env.example` |
| Database connection | `app/Support/Database.php` |
| Environment/config separation | `config/.env` (git-ignored) vs. `config/*.php` (versioned); real host env vars always win over the file |
| Routing/API structure | `app/Http/Router.php`, `public/index.php` |
| Request validation | `app/Support/Validator.php`, `app/Support/ValidationException.php` |
| Response handling | `app/Http/Response.php` (the `{success,data}`/`{success,error}` envelope from Phase 1 §1.3) |
| Error handling | `app/Support/ErrorHandler.php` |
| Logging | `app/Support/Logger.php` |
| Secure sessions | `app/Support/Session.php` |
| CSRF protection | `app/Support/Csrf.php`, `app/Http/Middleware/CsrfMiddleware.php` |
| Input sanitization | `Validator::url()` restricts to http/https only; every DB write goes through parameterized queries in `app/Repositories/` |
| Rate limiting architecture | `app/Support/CacheStore.php` + `FileCacheStore.php`, `app/Support/RateLimiter.php`, `app/Http/Middleware/RateLimitMiddleware.php` |

Also implemented this phase, because the API/routing layer needed
something real to route to and because Phase 1 §1.11 specifically
promised these as "the first tests in the suite":

- **The full Processing abstraction as working code** — `app/Processing/ProcessingProvider.php`, `ProviderManager.php`, `ProcessingResult.php`, `ProcessingOption.php`, `ProcessingOutput.php`, and all 7 `app/Processing/Exceptions/*.php` classes. Zero concrete providers.
- **Admin authentication end-to-end** — `app/Repositories/AdministratorRepository.php`, `app/Auth/AdminAuthenticator.php`, `app/Http/Controllers/Admin/AuthController.php` (login/logout/csrf-token).
- **Two working public API endpoints** — `POST /api/v1/metadata` and `POST /api/v1/process` (`app/Http/Controllers/Api/`), which exercise validation → rate limiting → `ProviderManager` → exception mapping → response envelope end-to-end with no provider registered — proving the architecture, not the extraction.
- **A health check** — `GET /api/v1/health`, useful for confirming the deployment is wired correctly.
- **Unit tests** — `tests/Unit/Processing/ProviderManagerTest.php` (resolution order, priority, exception normalization — against fake providers only) and `tests/Unit/Support/ValidatorTest.php` (including a test that `javascript:`/`file:`/`data:` URLs are rejected).
- `composer.json`, `phpunit.xml`.

---

## 4.2 Request lifecycle, as actually wired in `public/index.php`

```
public/index.php
  → app/bootstrap.php (Config::boot, ErrorHandler::register, timezone)
  → Session::start()
  → build FileCacheStore, RateLimiter, ProviderManager, AdministratorRepository, AdminAuthenticator
  → Router::dispatch(Request::fromGlobals())
        → matches method+path
        → runs route middleware (rate limit / CSRF / admin-auth) in order
        → runs the controller
        → controller returns a Response
  → Response::send()
```

Every dependency is constructed once in `public/index.php` and handed to
controllers via constructor — no service container, no global state beyond
`Config`/`Logger`/`Database`'s intentional statics (documented below).

## 4.3 Technical decisions worth flagging

- **One correction to the Phase 1 design, made honestly rather than
  silently.** Phase 1 described `ProviderManager` as enforcing a call
  timeout. Implementing it revealed that's not actually achievable in
  synchronous PHP without `pcntl` (not available on typical shared
  hosting) — a wrapper that "detects" a timeout only after a call already
  returned would, at best, do nothing, and at worst discard an
  already-successful result. `ProviderManager` now measures and logs
  duration only; **each future concrete provider is contractually
  responsible for its own network-level timeout** (e.g. curl's own
  `CURLOPT_TIMEOUT`). This is called out explicitly in
  `app/Processing/ProviderManager.php`'s docblock so it isn't lost by the
  time the Processing Provider phase arrives.
- **No Composer package beyond PHPUnit (dev-only).** Config parsing,
  routing, and the cache store are all hand-rolled rather than pulling in
  `vlucas/phpdotenv`, a router package, etc. This directly resolves the
  Composer-availability risk flagged in Phase 2 §2.6: production only
  needs the *generated* `vendor/autoload.php` (a plain PHP file with zero
  runtime dependencies of its own), so even if the Hostinger account
  can't run Composer itself, `composer install --no-dev` run locally and
  the resulting `vendor/` uploaded via FTP works identically.
- **Timing-safe admin login.** `AdminAuthenticator::attempt()` always
  calls `password_verify()` — against a real hash or a dummy one — so a
  nonexistent username and a wrong password take statistically the same
  time, closing a username-enumeration side channel that's easy to miss.
- **URL scheme allowlist lives in `Validator`, not the Processing layer.**
  `javascript:`, `file:`, `data:`, and any non-http(s) scheme are rejected
  before a URL ever reaches `ProviderManager` — a defensive baseline that
  exists independent of, and ahead of, any concrete provider (tested in
  `ValidatorTest`).
- **`Logger` redacts known-sensitive context keys mechanically.** Not a
  substitute for care at call sites, but a backstop: if any code
  accidentally logs a `password`/`token`/`session_id` key, the logger
  overwrites the value before it's ever written to disk.
- **File-based cache/rate-limiting.** Matches Phase 1 §1.6.2 — the same
  `CacheStore` interface a Redis implementation would satisfy later, with
  zero call-site changes.

## 4.4 Security review of this phase specifically

- SQL: 100% parameterized (`PDO::prepare`/`execute` with named params);
  `PDO::ATTR_EMULATE_PREPARES => false` forces real server-side prepared
  statements rather than PHP-side interpolation.
- Sessions: `HttpOnly`, `Secure` (auto-detected HTTPS), `SameSite=Strict`,
  regenerated on login, server-enforced idle timeout.
- CSRF: synchronizer token, `hash_equals` comparison, required on every
  non-GET admin route.
- Passwords: never stored or logged in plaintext; `password_hash`/
  `password_verify` only.
- Errors: `display_errors` forced off unconditionally; uncaught
  exceptions always logged in full server-side, and only ever shown to a
  client as a fixed generic message in production (real message only in
  explicit `APP_DEBUG=true` local development).
- Rate limiting: applied to both the public processing endpoints and
  admin login, independently bucketed.
- `config/.env`, `.git`, and any dotfile are denied at the web server
  level (`public/.htaccess`) as well as by directory placement (outside
  `public/` entirely) — defense in depth, not reliance on one mechanism.

This is a self-review of the code just written, not the full dedicated
Security Review phase later in your plan — that phase will re-examine
this code adversarially alongside everything built after it.

## 4.5 Testing performed

```
$ find app config public tests -name "*.php" -print0 | xargs -0 -n1 php -l
```
Every file: **no syntax errors detected.**

```
$ composer install
$ vendor/bin/phpunit
```
Installed PHPUnit via Composer and ran the real test suite in this
environment (PHP 8.4 available here) — results below.

## 4.6 Potential problems

- **`ProviderManager`'s duration logging still can't bound a hung
  provider call** (§4.3) — the request-level ceiling is still whatever
  Hostinger's `max_execution_time` is. The UX implication flagged in
  Phase 0 (a "still processing" fallback for near-timeout cases) remains
  an open design question for the Frontend phase.
- **`FileCacheStore` has no cross-request locking beyond `LOCK_EX` on
  write** — fine for rate-limiting counters at expected shared-hosting
  traffic levels, but a real race (two simultaneous requests from the
  same IP at the exact same moment) could under-count by one hit. Not
  worth a more complex mechanism on file-based storage; noted as a
  reason Redis is the natural upgrade on the VPS phase (Phase 1 §1.10).
- **No administrator account is seeded anywhere** (by design — flagged in
  the database script). Creating the first admin login is a deploy-time
  step, covered concretely in the Deployment phase, not before.
- **CSRF is only enforced on admin routes.** The public processing
  endpoints are unauthenticated by design (Phase 0: anonymous usage), so
  classic session-cookie CSRF doesn't apply the same way there — abuse
  resistance for those routes is rate limiting (already applied) rather
  than a token. Worth revisiting in the Security Review phase if that
  assumption changes.

## What remains

Frontend (Phase 5), admin dashboard (Phase 6), the Processing Provider
discussion/selection/implementation, integration testing, SEO/monetization
implementation, the dedicated security review, hosting optimization, QA,
and deployment.

---

**STOP — awaiting your review of the code (paths above) and the test
results reported once Composer finishes installing, plus explicit approval
before Phase 5 (Frontend) begins.**
