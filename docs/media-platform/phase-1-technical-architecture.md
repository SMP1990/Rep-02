# Media Utility Platform — Phase 1: Complete Technical Architecture

Status: **DRAFT — awaiting approval**
Builds on: `docs/media-platform/phase-0-requirements-and-architecture.md`
Scope: Full layered architecture + the modular Processing/Extraction
abstraction (interfaces/contracts only). **No concrete provider, no
wiring/bootstrap code, no database schema** — those are later phases.

---

## 1.1 Layered architecture — data flow

```
                         ┌─────────────────────────┐
                         │        Frontend          │  HTML5 / CSS3 / Bootstrap 5 / vanilla JS
                         │  (public site + admin UI)│  Talks ONLY to the Backend API contract below
                         └────────────┬─────────────┘
                                      │ HTTPS, JSON (public API) / form+session (admin)
                         ┌────────────▼─────────────┐
                         │        Backend / API      │  PHP 8.x request handlers
                         │  routing · validation ·   │
                         │  response envelopes       │
                         └───┬────────┬────────┬─────┘
              ┌──────────────┘        │        └──────────────┐
   ┌──────────▼─────────┐  ┌──────────▼─────────┐   ┌──────────▼─────────┐
   │   Authentication     │  │  Processing/Extraction│  │   Administration    │
   │  (admin sessions)    │  │  ProviderManager      │  │  (settings/CMS/ads/ │
   │                       │  │  → ProcessingProvider │  │   SEO/logs UI)      │
   └──────────┬────────────┘  └──────────┬────────────┘   └──────────┬─────────┘
              │                          │                             │
   ┌──────────▼──────────────────────────▼─────────────────────────────▼─────────┐
   │                          Cross-cutting layers                                │
   │   Configuration  ·  Caching  ·  Logging  ·  Analytics  ·  SEO  ·  Monetization│
   └──────────────────────────────────┬───────────────────────────────────────────┘
                                       │
                              ┌────────▼────────┐
                              │     Database      │  MySQL — accessed only through
                              │     (MySQL)        │  the Backend layer, never directly
                              └────────────────────┘
```

**Rule that makes this portable:** every arrow in this diagram is an
interface, not a concrete dependency. The Frontend depends on the Backend
API's *contract* (stable JSON shape), not its internals. The Backend
depends on `ProviderManager`'s *contract*, not on any specific extraction
implementation. This is what lets the Processing layer move to a different
server later while nothing above it changes.

---

## 1.2 Frontend layer

- Server-rendered PHP views (fast first paint, SEO-friendly, no SPA
  framework) with vanilla JS progressively enhancing the URL-submission
  flow (AJAX call to the Backend API, loading/result/error state
  rendering) — matches the workflow from Phase 0 §0.4.
- Bootstrap 5 for layout/components; a small original design-token set
  (colors/type/spacing) layered on top so the result reads as an original
  brand, not default Bootstrap.
- Talks to the backend exclusively through the **Public API contract**
  defined in §1.4 — it never knows which processing provider is active,
  how many exist, or where they run.
- Admin UI is the same pattern (server-rendered PHP + vanilla JS) served
  from `/admin`, authenticated separately (§1.5).

## 1.3 Backend / API layer

Two response envelopes, used consistently across every endpoint so the
frontend has exactly one parsing path:

```json
// success
{ "success": true, "data": { /* endpoint-specific payload */ } }

// failure
{ "success": false, "error": { "code": "UNSUPPORTED_SOURCE", "message": "This link isn't from a supported source." } }
```

`error.code` is a stable, enumerable string (frontend can branch on it for
UI treatment); `error.message` is always safe to show a visitor — never a
raw exception message, stack trace, file path, or provider-internal detail
(this is enforced at the `ProcessingException` boundary, §1.7.4).

**Public API surface (Phase 1 contract — implemented in the Backend
Foundation phase):**

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/metadata` | body `{ "url": "..." }` → media info + available options |
| POST | `/api/v1/process` | body `{ "url": "...", "option_id": "..." }` → final result/output |

This two-step shape (metadata first, then process a chosen option) mirrors
the Phase 0 user workflow and lets the UI show options before committing
to the heavier processing step.

**Admin API surface** follows the same envelope, under `/admin/api/...`,
gated by the Authentication layer (§1.5) on every request — not just at
login.

## 1.4 Authentication layer

- Admin-only in this platform (no visitor accounts, per Phase 0 §0.2).
- Session-based (PHP native sessions, `HTTPOnly`/`Secure`/`SameSite=Strict`
  cookies), not token-based — simplest correct option for a single admin
  surface on shared hosting.
- Session regenerated on login; idle + absolute timeout; every admin
  request re-validates the session server-side (never trusts a client flag).
- Login attempts rate-limited per IP+username, generic failure message
  (no "wrong password" vs "unknown user" distinction).
- Full implementation (password hashing, CSRF tokens, rate-limit storage)
  is Backend Foundation phase; this phase fixes the *shape* only.

## 1.5 Administration layer

A conventional server-rendered admin app sitting behind Authentication,
covering the FR-12…FR-22 requirements from Phase 0: dashboard, settings,
SEO settings, ad-zone config, FAQ/page CMS, processing/error logs,
visitor stats. Structurally it's just another Backend+Frontend pair reusing
every cross-cutting layer below — no separate architecture needed.

---

## 1.6 Cross-cutting layers

### 1.6.1 Configuration

- Environment values (`DB_HOST`, `DB_NAME`, future provider credentials,
  etc.) loaded from a `.env`-style file **stored outside the web root**,
  never committed to version control.
- A single `Config::get('section.key', $default)` accessor used
  everywhere — no `getenv()`/`$_ENV` scattered through business logic —
  so moving from shared hosting to VPS is a config-file change, not a
  code change.
- Environment name (`local`/`production`/etc.) selects behavior like
  error-detail visibility (verbose locally, sanitized in production) —
  via config, never via scattered `if` checks on hostname.

### 1.6.2 Caching

```php
interface CacheStore
{
    public function get(string $key): mixed;
    public function set(string $key, mixed $value, int $ttlSeconds): void;
    public function delete(string $key): void;
}
```

- Phase 1 hosting implementation: file-based store under a
  non-web-accessible `storage/cache/` path.
- Later (VPS): a `RedisCacheStore` implementing the same interface — call
  sites never change.
- Used for: metadata lookups that are safe to reuse briefly, rate-limit
  counters, and rendered-page fragments where it helps TTFB.

### 1.6.3 Logging

- Three logical channels: **application** (general errors/warnings),
  **processing** (every processing request's outcome — FR-19), and
  **security** (auth failures, rate-limit hits).
- A single `Logger::info/warning/error(string $channel, string $message, array $context)`
  call site; Phase 1 implementation writes structured lines to files under
  `storage/logs/`; the interface allows swapping to a log-aggregation
  service later without touching call sites.
- Logging is explicitly barred from ever writing credentials, session
  identifiers, or full raw request bodies (Phase 0 §0.8).

### 1.6.4 Analytics

- Its own write path (visitor/request counters) so an analytics failure
  can never break the processing flow or the admin dashboard's core data.
- Phase 1 implementation: MySQL-backed aggregation tables, read by the
  admin dashboard (FR-13, FR-21). No third-party analytics script assumed
  or required by the architecture — one can be added later purely as
  frontend markup, independent of this layer.

### 1.6.5 SEO

- A thin rendering-time layer that pulls admin-configured meta/canonical
  data (FR-15) and injects it into every server-rendered page — not a
  separate service, just a consistent set of template helpers.

### 1.6.6 Monetization

- `AdZone` rendering helper: given a zone name (`header`, `in_content`,
  `results`, `footer`, `mobile`), reads that zone's admin-configured
  snippet/config and renders it — or renders nothing if disabled. No ad
  network SDK is referenced by the architecture itself (Phase 0 §0.11).

---

## 1.7 Processing / Extraction layer (the modular abstraction)

This is the layer the entire brief is built around: **the rest of the
application must never know which provider is active, how many are
registered, or where they run.** Everything below is an interface/contract
— no concrete provider is chosen or implemented in this phase.

### 1.7.1 `ProcessingResult` — value object

```php
namespace MediaPlatform\Processing;

final class ProcessingResult
{
    public function __construct(
        public readonly bool $success,
        public readonly string $sourceUrl,
        public readonly ?string $sourcePlatform,   // e.g. identified source label, provider-defined
        public readonly ?string $title,
        public readonly ?string $thumbnailUrl,
        public readonly ?int $durationSeconds,
        /** @var ProcessingOption[] */
        public readonly array $options,            // available choices, empty until an option is selected/produced
        public readonly ?ProcessingOutput $output,  // set only after process() with a chosen option
        public readonly string $providerName,
        public readonly array $meta = [],           // provider-specific extras, never trusted blindly by callers
    ) {}
}

final class ProcessingOption
{
    public function __construct(
        public readonly string $id,
        public readonly string $label,      // e.g. human-readable quality/format description
        public readonly ?string $format,
        public readonly ?int $approxSizeBytes,
    ) {}
}

final class ProcessingOutput
{
    public function __construct(
        public readonly string $deliveryMethod,  // e.g. "redirect_url" | "stream" — kept abstract on purpose
        public readonly ?string $url,
        public readonly ?string $filename,
        public readonly ?string $mimeType,
    ) {}
}
```

Immutable, provider-agnostic. `$sourcePlatform`, `$deliveryMethod`, and
`$meta` are intentionally generic strings/arrays rather than enums tied to
one provider's vocabulary — the concrete vocabulary is a Phase-2-provider
decision, not part of the architecture.

### 1.7.2 `ProcessingProvider` — interface every provider implements

```php
namespace MediaPlatform\Processing;

interface ProcessingProvider
{
    public function getName(): string;

    public function getPriority(): int;              // resolution order when multiple providers could match

    public function supports(string $url): bool;      // cheap, no network call — pattern/host check only

    public function fetchMetadata(string $url): ProcessingResult;   // step 1: identify + list options

    public function process(string $url, string $optionId): ProcessingResult; // step 2: produce the chosen output
}
```

Every provider — whatever it turns out to be — must satisfy this same
contract. `supports()` is required to be cheap and side-effect-free so
`ProviderManager` can probe multiple providers quickly.

### 1.7.3 `ProviderManager` — the seam that enables migration

```php
namespace MediaPlatform\Processing;

final class ProviderManager
{
    /** @param ProcessingProvider[] $providers registered via config, ordered by priority */
    public function __construct(
        private readonly array $providers,
        private readonly Logger $logger,
        private readonly int $timeoutSeconds,
    ) {}

    public function resolve(string $url): ProcessingProvider { /* first supports()===true, else throw UnsupportedSourceException */ }

    public function fetchMetadata(string $url): ProcessingResult { /* resolve() + timeout-wrapped call + normalized exceptions + logging */ }

    public function process(string $url, string $optionId): ProcessingResult { /* same pattern as fetchMetadata() */ }
}
```

Responsibilities, all of which live **here** and nowhere else, so the
Backend/API layer stays trivial:

- **Registration** — which providers are active, and in what priority
  order, comes from Configuration (§1.6.1), not a code edit. Adding,
  removing, or reordering providers is a config change.
- **Resolution** — picks the right provider for a given URL via
  `supports()`; throws `UnsupportedSourceException` if none match.
- **Timeout enforcement** — wraps every provider call with a hard ceiling
  (tuned to shared-hosting's `max_execution_time` in Phase 1, loosened on
  VPS later) and converts an overrun into `ProviderTimeoutException`
  rather than letting the request hang or fatal-error.
- **Exception normalization** — catches *anything* a provider throws
  (including unexpected errors), logs the raw detail internally, and
  re-throws only a sanitized `ProcessingException` upward — this is the
  single choke point that guarantees the Backend/API layer (§1.3) never
  leaks provider internals to a visitor.
- **This is the whole migration story**: moving from a Phase-1 provider
  to a VPS-hosted one, or to an external processing microservice, means
  writing a new class that implements `ProcessingProvider` and flipping a
  config entry. `ProviderManager`, the Backend/API contract, and the
  entire Frontend are untouched.

### 1.7.4 `ProcessingException` hierarchy

```php
namespace MediaPlatform\Processing;

abstract class ProcessingException extends \RuntimeException
{
    abstract public function getErrorCode(): string;      // maps 1:1 to the API envelope's error.code
    abstract public function getUserMessage(): string;    // always safe to show a visitor
}

final class InvalidUrlException extends ProcessingException { /* ERROR_CODE = "INVALID_URL" */ }
final class UnsupportedSourceException extends ProcessingException { /* "UNSUPPORTED_SOURCE" */ }
final class ProviderTimeoutException extends ProcessingException { /* "PROVIDER_TIMEOUT" */ }
final class ProviderUnavailableException extends ProcessingException { /* "PROVIDER_UNAVAILABLE" */ }
final class RateLimitExceededException extends ProcessingException { /* "RATE_LIMITED" */ }
final class UpstreamRejectedException extends ProcessingException { /* "UPSTREAM_REJECTED" — e.g. content unavailable/removed/private, not an app bug */ }
final class InternalProcessingException extends ProcessingException { /* "INTERNAL_ERROR" — generic catch-all, never exposes cause */ }
```

Every subtype maps directly to one of the Phase 0 §0.2 FR-7 error states
and one `error.code` in the API envelope (§1.3) — the Frontend's error-state
handling is written once, against this fixed vocabulary, regardless of
which provider or failure produced it.

### 1.7.5 Why this satisfies the brief's migration requirement

| Target environment | What changes | What doesn't |
|---|---|---|
| Hostinger shared hosting (Phase 1) | A `ProcessingProvider` implementation constrained to synchronous, in-request work | Frontend, API contract, `ProviderManager`, exception vocabulary |
| VPS | New/updated provider implementation, possibly with longer timeouts and a real background worker for cleanup | Same as above |
| Dedicated processing server | Provider implementation becomes a thin HTTP client calling that server's internal API | Same as above |
| Cloud / multiple processing servers | `ProviderManager` config lists multiple provider instances/endpoints; provider-level load distribution | Same as above |

No frontend rebuild at any step, per the brief's explicit requirement.

---

## 1.8 Cross-cutting error handling strategy

```
Provider throws (anything)
        │
        ▼
ProviderManager catches → logs full detail (processing/security channel)
        │
        ▼
Re-throws as the nearest-fitting ProcessingException subtype
        │
        ▼
Backend/API layer catches ProcessingException → maps to { error.code, error.message } envelope
        │
        ▼
Frontend renders the matching error state (Phase 0 §0.4) from error.code
```

An exception that isn't already a `ProcessingException` is always treated
as `InternalProcessingException` at the `ProviderManager` boundary —
nothing unrecognized ever reaches the Backend/API layer or the visitor.

---

## 1.9 Technical decisions explained

- **Interfaces over a plugin/hook system.** A small, fixed interface
  (`ProcessingProvider`) is enough for this brief's needs and is far
  easier to reason about and secure-review than a generic hook/event
  system — no dynamic loading of arbitrary code.
- **Two-step metadata/process split**, not one combined call. Matches the
  approved user workflow (see options before committing) and lets
  `fetchMetadata()` be cheaper/cacheable independently of the heavier
  `process()` step.
- **Value objects, not associative arrays**, for `ProcessingResult`/
  `ProcessingOption`/`ProcessingOutput`. Enforces a stable shape at the
  language level so a future provider can't silently change the contract.
- **Exception vocabulary is closed and finite** (§1.7.4) specifically so
  the Frontend's error UI and the API's `error.code` enum never need to
  anticipate an unknown failure mode from a future provider.
- **Session-based admin auth, not JWT/token.** Single admin surface,
  no cross-domain API consumers in scope — sessions are simpler and have
  fewer moving parts to secure on shared hosting.

## 1.10 Potential problems

- **PHP has no native async/concurrency.** `ProviderManager`'s calls are
  synchronous; if a chosen provider is inherently slow, the only levers
  are the timeout ceiling and the UX's loading state — there's no
  background-job fallback until the VPS phase (flagged already in Phase 0
  §"Potential problems", reiterated here because it's now visible in the
  interface design: `process()` is a blocking call by contract).
- **`supports()` must stay cheap.** If a provider's `supports()`
  implementation ever needs a network call to decide, `ProviderManager`'s
  resolution step could itself become slow under multiple registered
  providers — worth enforcing as a hard rule when providers are built.
- **`meta` array on `ProcessingResult` is an escape hatch.** Useful for
  provider-specific extras now, but it's the one place a provider could
  leak something it shouldn't — the Backend/API layer must treat `meta`
  as internal/logging-only, never forward it to the Frontend unfiltered.
- **Config-driven provider registration** means a misconfigured priority
  order could route a URL to the wrong provider. Worth a startup-time
  sanity check (e.g., no two enabled providers silently overlapping)
  when this is implemented — noted for the Backend Foundation phase.

## 1.11 Testability (design-level, nothing executable yet)

This shape is deliberately unit-test-friendly for when code exists:
`ProviderManager` can be tested against fake `ProcessingProvider`
implementations (no network, no real extraction) to verify resolution
order, timeout handling, and exception normalization in isolation — before
any real provider is chosen. I'd plan to write exactly those tests in the
Backend Foundation phase as the first tests in the suite.

## 1.12 What remains

Phase 2 (project directory structure), Phase 3 (database design), Phase 4
(backend foundation — where these interfaces get a real
autoloader/bootstrap and their first concrete (non-provider) code),
Phase 5 (frontend), Phase 6 (admin dashboard), the dedicated Processing
Provider options/selection discussion, implementation, integration/testing,
SEO/monetization implementation, security review, hosting optimization,
QA, and deployment.

---

**STOP — awaiting your review of the layer architecture and the
`ProcessingProvider` / `ProviderManager` / `ProcessingResult` /
`ProcessingException` contracts, and explicit approval before Phase 2
(project directory structure) begins.**
