# Media Utility Platform — Phase 0: Requirements & Architecture Analysis

Status: **DRAFT — awaiting approval**
Scope: Planning only. No application code, no schema, no provider implementation in this phase.

Reference (`https://fdown.vn/en`) is used **only** to understand the general
workflow pattern (paste a link → see options → get your file). No source
code, markup, branding, copy, layout, or assets from that site are used
here or will be used in any later phase.

---

## 0.1 Product framing (assumptions — confirm or correct)

The brief does not fix a few product-level facts that materially affect
requirements below. I've made a reasonable working assumption for each so
Phase 0 can be concrete; all are flagged again in §0.9 for your explicit
sign-off.

| Item | Working assumption |
|---|---|
| Brand/name | Placeholder only (`[Platform]` below) — original name/logo to be chosen before Phase 5 (frontend) |
| Account model | Anonymous usage, like the reference — no visitor registration/login required to use the tool |
| Supported sources | Architecture is source-agnostic; the *set* of supported platforms at launch is a legal/product decision, not a technical one — deferred to §0.9 and revisited in depth at the Processing Provider phase |
| Audience/region | Global, English-first, i18n-ready via a `languages` table but not necessarily multi-language at launch |
| Monetization | Display advertising at launch (network-agnostic, admin-configurable); no payment/subscription system in this phase |

---

## 0.2 Functional Requirements

**Public / visitor-facing**

| ID | Requirement |
|---|---|
| FR-1 | Visitor submits a media URL via a single input field on the homepage |
| FR-2 | System validates URL syntax and (where feasible) recognizes which supported source it belongs to before processing |
| FR-3 | System retrieves and displays media metadata: title, thumbnail/preview, source, and the set of available output options (e.g. quality/format variants), where the source and provider expose them |
| FR-4 | Visitor selects one available option and initiates the processing/delivery action |
| FR-5 | System shows a distinct loading/processing state while the backend works |
| FR-6 | System presents a results state with the selected media/option ready for the visitor to obtain |
| FR-7 | System presents a clear, distinct error state for: invalid URL, unsupported/unrecognized source, provider failure, timeout, and rate-limit rejection — with actionable messaging, never a raw stack trace or internal error |
| FR-8 | Static informational pages: Homepage, How-it-works/Features, FAQ, About, Contact, Terms of Service, Privacy Policy, Copyright/DMCA policy, Footer |
| FR-9 | Fully responsive layout (mobile, tablet, desktop) |
| FR-10 | Per-visitor request rate limiting with a clear "please wait" message when exceeded |
| FR-11 | Optional bot/abuse challenge (e.g., CAPTCHA) triggerable by the rate-limiting/abuse layer without a frontend rebuild |

**Admin-facing**

| ID | Requirement |
|---|---|
| FR-12 | Secure admin authentication (separate from any future visitor accounts) |
| FR-13 | Dashboard: totals and daily/weekly/monthly trends for requests, successes, failures, and visitors |
| FR-14 | Site settings management (branding strings, feature toggles, maintenance mode, supported-source toggles) |
| FR-15 | SEO settings management (global + per-page meta title/description, canonical behavior, sitemap/robots controls) |
| FR-16 | Advertisement zone management (enable/disable and configure each ad slot; network-agnostic — see §0.8) |
| FR-17 | FAQ management (CRUD) |
| FR-18 | Static page/content management (CRUD for About/Terms/Privacy/DMCA-style pages) |
| FR-19 | Processing log viewer (per-request outcome, source, duration, provider used, failure reason) |
| FR-20 | Error log viewer |
| FR-21 | Visitor/traffic statistics viewer |
| FR-22 | Secure logout and session expiry |

**Explicitly out of scope for this platform (unless you tell me otherwise):**
- Visitor accounts, saved history, or personal libraries
- Payment processing / subscriptions
- Circumventing authentication, paywalls, DRM, or platform access controls
- Permanent hosting/re-publishing of third-party copyrighted media

---

## 0.3 Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Fast TTFB on shared hosting; homepage and static pages should be cache-friendly; processing requests must respect PHP execution-time/memory ceilings typical of shared hosting (see §0.5) |
| Reliability | A single failed/slow processing provider must degrade to a clean error state, never a fatal error or blank page |
| Portability | No code should assume shared-hosting-only capabilities (no reliance on persistent daemons, custom PHP extensions unlikely to exist on a VPS/cloud target, etc.) |
| Modularity | Processing/extraction logic must sit behind a swappable abstraction (Phase 2) so frontend and backend never hard-couple to one implementation |
| Security | OWASP-Top-10-conscious by default (detailed review is its own later phase, but nothing in earlier phases should knowingly violate it) |
| Maintainability | Consistent PHP coding standard (PSR-12), clear separation of layers, documented configuration |
| Legal/compliance | The product must not be designed to bypass access controls, DRM, or authentication; must provide a visible Terms of Service, Privacy Policy, and a copyright/DMCA takedown contact; must avoid permanent storage/redistribution of third-party copyrighted content beyond what's technically necessary to complete a single user-initiated transfer |
| Accessibility | Reasonable WCAG 2.1 AA effort on the public site (semantic HTML, contrast, keyboard nav, alt text) |
| SEO | Server-rendered, crawlable pages; fast Core Web Vitals; structured data where genuinely applicable |
| Privacy | Minimal PII collection; visitor logging limited to what's needed for abuse-prevention/analytics; documented retention period |
| Observability | Structured, centrally reviewable logs for processing outcomes and errors (admin-visible per FR-19/FR-20) |
| Resource-consciousness | Every request-path operation must complete within shared-hosting execution limits; no assumption of background workers/queues in Phase 1 hosting |

---

## 0.4 User Workflow (original interaction design — not the reference's visuals/copy)

```
Visitor lands on homepage
        │
        ▼
Enters a media URL into the input field
        │
        ▼
Client-side quick validation (format sanity check only)
        │
        ▼
Submits → Loading state (progress indicator, cancellable)
        │
        ▼
Backend: validate → identify source → invoke Processing Provider
        │
        ├── Failure/timeout/unsupported ──► Error state (specific, actionable message)
        │
        └── Success
              │
              ▼
        Results state: metadata (title/thumbnail/source) +
        available options (quality/format) presented as clear choices
              │
              ▼
        Visitor selects an option
              │
              ▼
        Delivery action (download/link) + logged outcome
```

Edge states to design for explicitly in Phase 5: empty input, malformed URL,
unsupported source, provider timeout, provider returns no options, slow
network on mobile, repeated/rapid submissions (rate-limited).

## 0.5 Admin Workflow

```
Admin navigates to /admin
        │
        ▼
Login (credentials + session, rate-limited, generic error on failure)
        │
        ▼
Dashboard (KPIs + trend charts)
        │
        ├── Settings (site / SEO / ads)
        ├── Content (FAQ / pages)
        ├── Monitoring (processing logs / error logs / visitor stats)
        └── Logout (session destroyed, cache-safe)
```

Admin session security, CSRF, and rate limiting are specified functionally
here; concrete implementation is in the Backend Foundation phase.

---

## 0.6 System Architecture — Layers (conceptual; full design in Phase 2)

The system is organized into independently-replaceable layers. Only the
**Processing/Extraction layer** is required by the brief to be a formal
provider-abstraction; the others are conventional layering but still kept
loosely coupled so any one of them can move (e.g., cache from files to
Redis, or DB from local MySQL to a managed instance) without touching the
others.

- **Frontend** — server-rendered HTML/CSS3/Bootstrap 5/vanilla JS; talks to the backend only through a defined API contract, never directly to a provider
- **Backend/API** — PHP 8.x request handlers implementing that API contract
- **Database** — MySQL, accessed only through the backend
- **Authentication** — admin auth (visitor auth out of scope per §0.2)
- **Administration** — the admin dashboard app, itself just another backend/frontend pair
- **Processing/Extraction layer** — abstracted behind `ProviderManager` / `ProcessingProvider` / `ProcessingResult` / `ProcessingException` (designed in Phase 2, implemented only after your explicit provider choice)
- **Logging** — structured application/error/processing logs
- **Analytics** — visitor and usage stats (own data path from logging, so analytics failures never affect processing)
- **Caching** — abstracted cache interface; file-based on shared hosting, swappable to Redis/Memcached later
- **Configuration** — environment-based config, no environment-specific code paths in business logic
- **SEO** — meta/sitemap/structured-data generation as a cross-cutting concern over the frontend layer
- **Monetization** — ad-zone rendering driven entirely by admin-configured data, no network SDK hard-coded into templates

Each layer is designed so it can be relocated (different server, different
technology) independently — this is what makes the shared-hosting →
VPS → dedicated processing → multi-node path in §0.10 possible without a
frontend rebuild.

---

## 0.7 Hosting Requirements (Phase 1 target: Hostinger shared hosting)

| Constraint | Detail / implication |
|---|---|
| PHP | 8.1+ (confirm exact version available in hPanel); no reliance on PECL extensions unlikely to be present |
| Database | MySQL 5.7/8 via hPanel; access typically via `localhost` only — no remote DB assumption |
| Web server | Apache or LiteSpeed (Hostinger uses LiteSpeed) — must rely only on standard `.htaccess`/rewrite behavior common to both |
| Process model | Pure request/response PHP-FPM style execution — **no persistent daemons, no background workers, no long-running processes**. Anything resembling a queue/worker must wait for the VPS phase or use cron-triggered short PHP scripts |
| Cron | Hostinger shared plans support scheduled cron jobs (typically 5-minute minimum granularity) — usable for periodic cleanup/aggregation, not for real-time processing |
| Execution limits | Expect `max_execution_time` in the 30–60s range and moderate `memory_limit` (commonly 256MB–512MB) unless raised in hPanel — every request-path operation must fit inside this |
| Outbound network | Outbound HTTPS/cURL from PHP is generally available on Hostinger shared hosting, but this must be verified for the account in question before Phase 2 provider decisions are finalized — some shared plans throttle or restrict outbound connections |
| Shell access | No SSH/root, no arbitrary binary execution — rules out any provider approach requiring a native extraction binary running server-side in Phase 1 |
| SSL | Free Let's Encrypt via hPanel — HTTPS is assumed mandatory site-wide |
| Storage | Shared, quota-limited disk — any temporary file storage from processing must be small, short-lived, and actively cleaned up (never relied on as durable storage) |
| Email | Outbound mail available via hPanel SMTP/mail() — usable for admin notifications |
| No Redis/Memcached (typically) | Caching layer defaults to file/DB-based on Phase 1, with the interface ready to swap to Redis on VPS |

**This is the section most likely to constrain the Processing Provider
choice in a later phase** — flagged now so it's not a surprise later.

---

## 0.8 Security Requirements (categories only — implementation is its own phase)

- Admin authentication: hashed credentials (`password_hash`/`password_verify`), brute-force rate limiting, generic failure messaging
- Session security: HTTPOnly/Secure/SameSite cookies, session regeneration on login, idle timeout
- CSRF tokens on every state-changing admin and public form
- Input validation/sanitization at every entry point; parameterized queries only (no string-built SQL)
- Output encoding to prevent XSS in any user- or admin-supplied content rendered back to a page
- Rate limiting on the processing endpoint specifically (abuse/cost-control, not just admin login)
- No use of `shell_exec`/`exec`/`system` against unsanitized input; if a provider ever requires a subprocess, arguments are never built by string concatenation from user input
- Temporary files (if any) written outside the web root or to a non-executable, access-controlled path, with guaranteed cleanup
- Database user with least-privilege grants (no `DROP`/`ALTER` in the app's runtime credentials)
- Secrets/config (DB credentials, future API keys) stored outside the web root, never in version control
- Logging must never record credentials, session tokens, or full request payloads that could contain sensitive data
- Backups: at minimum, scheduled DB + file backups (Hostinger provides some; document the policy in the deployment phase)

---

## 0.9 SEO Requirements

- Clean, human-readable URLs (no exposed query-string spaghetti for core pages)
- Per-page `<title>`/meta description, admin-editable (FR-15)
- Canonical URLs on every page
- Open Graph + Twitter Card tags
- Structured data where genuinely applicable (e.g., `WebApplication`/`SoftwareApplication`, `FAQPage` for the FAQ) — no fabricated review/rating markup
- `sitemap.xml` (static pages at minimum) and `robots.txt`, both admin/config-driven
- Fast Core Web Vitals: server-rendered HTML, minimal blocking JS, optimized images
- No content indexed that shouldn't be (e.g., admin routes disallowed in `robots.txt` and additionally protected by auth — never rely on robots.txt alone)

---

## 0.10 Scalability Requirements

- Backend handlers are stateless (no in-process session state that would block moving to multiple app servers later)
- Database schema indexed for the read/write patterns in §-to-come (Phase 3) with room to add read replicas later
- Caching interface abstracted so the *storage* can change (file → Redis) without changing call sites
- Processing layer is the primary scaling bottleneck by nature of the brief — it's the one layer explicitly designed (Phase 2) to move to its own server(s) independently of the rest of the stack
- Configuration-driven environment switching (Phase 1 shared host vs. later VPS) via environment config, not code branches

---

## 0.11 Monetization Architecture (structure only — no network integration yet)

- Defined, admin-toggleable ad zones: header, in-content, results-page, footer, mobile-specific
- Each zone stores an admin-supplied **snippet/config**, not a hard-coded network SDK — the platform stays network-agnostic (AdSense, another network, or direct/house ads are all just "what's in the zone")
- Ad rendering must never obscure or be confusable with the actual download/result action (both a UX requirement and a common ad-network policy requirement for this category of site)
- Ad performance/impact is tracked separately from core product analytics (FR-21) so one never distorts the other
- No payment/subscription system in this phase; schema will leave room for it (e.g., a future `plans`/`entitlements` concept) without building it now

---

## 0.12 Future Migration Strategy (high level — detailed in a later phase)

```
Phase 1: Hostinger shared hosting (PHP/MySQL, synchronous request/response)
        │  Processing Provider = whatever is chosen for Phase 1 constraints
        ▼
Phase 2: VPS
        │  Same frontend/backend/DB unchanged.
        │  Processing Provider swapped/upgraded behind the same interface;
        │  cron-based cleanup can become a real background worker.
        ▼
Phase 3: Dedicated processing server
        │  Processing Provider now calls out to a separate server/service
        │  over an internal API. Frontend/backend/admin still unchanged.
        ▼
Phase 4: Cloud / multiple processing servers
        │  ProviderManager load-balances/queues across multiple processing
        │  nodes. Frontend/backend/admin still unchanged.
```

The load-bearing design decision that makes this possible is the
Processing/Extraction abstraction (Phase 2) — every other layer is
conventional and portable by default as long as Phase 1 avoids
hosting-specific shortcuts.

---

## 0.13 Legal / ToS Posture (flagged now, decided in depth later)

Per your own rules (12–13) and the nature of this product category, I want
this on record before any further phase: the platform will be designed to
**never bypass authentication, DRM, or platform access controls**, and the
Processing Provider phase will include a dedicated legal/ToS discussion
(reference-site-style tools operate in a legally gray area that varies by
source platform and jurisdiction) before any provider is implemented. This
isn't a blocker for Phase 0, just a flag that §0.9's "which sources are
supported at launch" decision and the provider choice later are where this
gets resolved concretely — not silently assumed.

---

## 0.14 Open Decisions Requiring Your Explicit Input

These don't block moving to Phase 1 (architecture), but they do shape it,
so please confirm/correct before or alongside your approval:

1. **Brand name** (working placeholder `[Platform]` used until you supply one)
2. **Initial supported source(s)** at launch — even a provisional list helps scope Phase 2's provider discussion
3. **Anonymous-only usage** — confirm no visitor accounts are wanted, now or on the roadmap
4. **Monetization** — ads-only at launch confirmed, or should the schema also anticipate a premium/API tier later?
5. Any known compliance obligations you're already aware of (specific jurisdiction, DMCA agent registration, etc.)

---

## Potential problems / risks identified in Phase 0

- **Outbound network restrictions on shared hosting are unverified.** If Hostinger blocks/throttles outbound cURL to certain destinations on your specific plan, it directly constrains Phase 2's provider options. Needs a quick empirical check once we're implementing the backend foundation.
- **Execution-time ceiling vs. processing latency.** If any viable processing approach can occasionally exceed shared-hosting's `max_execution_time`, the UX (§0.4) needs a defined "still processing, check back" fallback rather than a hard timeout error — worth deciding in Phase 2, not discovering in testing.
- **Ad-network policy risk** for this site category (see §0.11) — some networks restrict or reject "downloader"-style sites outright. Not a technical blocker, but worth knowing before committing to a specific network later.
- **Legal exposure scales with which sources are supported** — the fewer/more clearly public the sources, the lower the risk; this is why §0.9's item 2 is called out as a decision rather than assumed.

## What's testable at this stage

Nothing executable yet — Phase 0 is a planning document. "Testing" here means: please read §0.2–0.11 and confirm they match your intent before I proceed, since every later phase is built on these requirements.

## What remains

Everything: system architecture detail (Phase 1 proper — you approved the
layer *names* here, not their designs), the Processing Provider
abstraction, directory structure, database design, backend foundation,
frontend, admin dashboard, provider selection/implementation, integration,
SEO/monetization implementation, security review, hosting optimization,
QA, and deployment — each its own gated phase per your instructions.

---

**STOP — awaiting your review of §0.1–0.14, corrections to any assumption,
answers to §0.14, and explicit approval (e.g. "APPROVED — NEXT STEP") before
Phase 1 (System Architecture) begins.**
