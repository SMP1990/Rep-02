# Media Utility Platform — Phase 2: Production Project Directory Structure

Status: **DRAFT — awaiting approval**
Builds on: Phase 0 (requirements) and Phase 1 (architecture, provider abstraction)
Scope: Directory/file layout and the purpose of each. Directories have been
physically created in this branch (with `.gitkeep` placeholders) so the
structure is real, but **no application logic has been written** — no
routing, no controllers, no config loader, no provider implementation.
That begins in the Backend Foundation phase.

---

## 2.1 The one structural decision that needs your confirmation: document root

The brief's example structure puts `/public`, `/config`, `/admin`, `/api`
side by side at the project root. I deviated from that on purpose, for a
security reason worth flagging explicitly (per rule 16 — no silent
workarounds):

**If every folder sits at the project root and the web server's document
root is that same project root, then `/config` (database credentials),
`/app` (source), and `/storage` (logs, temp files) are all directly
web-accessible by URL unless every single one is individually hardened.**
That's a fragile default — one missing `.htaccess` rule and credentials or
logs are exposed.

Instead, this structure follows the standard PHP convention: **only
`/public` is ever web-accessible.** Everything else — `app/`, `config/`,
`storage/`, `database/`, `resources/` — lives one level up, outside the
document root, and is simply unreachable by any URL, no `.htaccess` rule
required. This isn't a stylistic choice; it removes an entire class of
"forgot to protect this folder" mistakes.

This requires the hosting account's document root to point at `public/`
rather than the account's default `public_html/`. Two ways this can work
on Hostinger, and **I need you to tell me which applies to your plan**
before Phase 4 (Backend Foundation), since it changes zero application
code but does change the deployment step:

| Option | How it works | Availability |
|---|---|---|
| **A — Preferred.** Set document root to a subfolder | hPanel → Advanced → "Change PHP/Document Root" (or equivalent) points the domain at `.../public_html/mediaplatform/public` (or similar) instead of `public_html/` itself | Available on most Hostinger Business/Premium/Cloud plans; availability on the entry-level shared plan varies by account — needs a quick check in your hPanel |
| **B — Fallback.** Everything ships inside `public_html/` | Only `public/`'s *contents* are copied into `public_html/` at deploy time; `app/`, `config/`, `storage/`, `database/`, `resources/` are uploaded to a sibling folder **outside** `public_html/` (Hostinger gives shell/file-manager access one level above it) | Works on every Hostinger plan, no setting needed |

Both options result in the exact same repository structure below and the
exact same application code — only the deployment step (§2.6) differs.
I'll default to documenting both in the deployment phase; flag now if you
already know which applies to your account.

---

## 2.2 Full structure

```
project-root/
├── app/                              # Application source (PSR-4 autoloaded via Composer). Never web-accessible.
│   ├── Auth/                         # Admin authentication: login, session guard, password hashing (Phase 1 §1.4)
│   ├── Http/
│   │   ├── Router.php                # Maps method+path → controller action; the single dispatch point
│   │   ├── Controllers/
│   │   │   ├── Api/                  # Public API: MetadataController, ProcessController (Phase 1 §1.3)
│   │   │   └── Admin/                # DashboardController, SettingsController, SeoController,
│   │   │                             # AdZoneController, FaqController, PageController, LogController
│   │   └── Middleware/                # CsrfMiddleware, RateLimitMiddleware, AdminAuthMiddleware, etc. —
│   │                                   # composable request filters, applied per-route by the Router
│   ├── Processing/                    # The Phase 1 abstraction — unchanged from that phase
│   │   ├── ProcessingProvider.php     # interface
│   │   ├── ProviderManager.php
│   │   ├── ProcessingResult.php
│   │   ├── ProcessingOption.php
│   │   ├── ProcessingOutput.php
│   │   ├── Exceptions/                # ProcessingException + the 7 concrete subtypes
│   │   └── Providers/                 # concrete provider classes live here — EMPTY until the
│   │                                   # Processing Provider phase; nothing is implemented yet
│   ├── Domain/                        # Plain entity/model classes matching the DB schema (Phase 3):
│   │                                   # Administrator, Setting, ProcessingRequestLog, ErrorLog, Visitor,
│   │                                   # Advertisement, SeoSetting, Page, Faq, Language
│   ├── Repositories/                  # One class per entity; the ONLY layer that writes SQL —
│   │                                   # keeps every query in one place, always parameterized
│   ├── Support/                       # Cross-cutting utilities (Phase 1 §1.6):
│   │   ├── Config.php                 # Config::get('section.key') accessor
│   │   ├── CacheStore.php             # interface; FileCacheStore.php Phase-1 implementation
│   │   ├── Logger.php                 # app/processing/security channel logger
│   │   └── RateLimiter.php            # shared by the public processing endpoint and admin login
│   ├── Seo/                           # Meta/canonical/OG/structured-data/sitemap rendering helpers
│   ├── Monetization/                  # AdZone.php — reads admin-configured zone config and renders it
│   └── Analytics/                     # Visitor/usage write path + aggregation read path (kept
│                                       # separate from Processing so an analytics bug can't break it)
│
├── config/                            # Environment & app configuration. Never web-accessible.
│   ├── app.php                        # app name, environment, base URL, timezone
│   ├── database.php                   # DB connection params (reads from env, never hard-coded)
│   ├── providers.php                  # registered ProcessingProvider list + priority (Phase 1 §1.7.3)
│   ├── cache.php                      # active CacheStore driver + TTLs
│   ├── security.php                   # rate-limit thresholds, session lifetime, cookie flags
│   └── .env.example                   # documented template of required env vars — the real `.env`
│                                       # is created at deploy time and is git-ignored (§2.4)
│
├── database/
│   ├── schema.sql                     # the full installation script — generated and reviewed in
│   │                                   # Phase 3 (Database Design), not before
│   └── migrations/                    # incremental .sql changes applied after initial launch
│
├── storage/                           # Writable at runtime. Never web-accessible.
│   ├── cache/                         # FileCacheStore's backing files
│   ├── logs/                          # app.log, processing.log, security.log
│   └── tmp/                           # short-lived processing temp files — actively cleaned,
│                                       # never treated as durable storage (Phase 0 §0.7)
│
├── resources/
│   └── views/                         # Server-rendered PHP templates (no template engine dependency)
│       ├── layouts/                   # shared header/footer/nav shell
│       ├── home/                      # homepage (URL input, loading/result/error states)
│       ├── pages/                     # About, Terms, Privacy, Copyright/DMCA, Contact
│       ├── faq/
│       ├── errors/                    # 404 / 500 / generic-error templates
│       └── admin/
│           ├── layouts/
│           ├── dashboard/
│           ├── settings/
│           ├── seo/
│           ├── ads/
│           ├── content/               # FAQ + static page CRUD views
│           └── logs/
│
├── public/                            # THE ONLY web-accessible directory — see §2.1
│   ├── index.php                      # single front controller; every request enters here
│   ├── .htaccess                      # rewrite-everything-to-index.php + security headers (§2.3)
│   ├── robots.txt
│   ├── sitemap.xml                    # generated output (or a rewritten route aliasing here)
│   └── assets/
│       ├── css/                       # compiled/hand-written stylesheet(s), original design tokens
│       ├── js/                        # vanilla JS: URL-submission flow, admin UI interactions
│       ├── images/                    # original branding assets (no reference-site imagery)
│       └── fonts/
│
├── scripts/                           # Small CLI entry points invoked by Hostinger cron (Phase 0 §0.7)
│                                       # e.g. cleanup-temp.php (purges storage/tmp on a schedule),
│                                       # aggregate-analytics.php (future). Never web-accessible.
│
├── tests/                             # PHPUnit, from the Backend Foundation phase onward
│   ├── Unit/
│   │   └── Processing/                # ProviderManager tested against fake providers (Phase 1 §1.11)
│   └── Integration/
│
├── vendor/                            # Composer dependencies — git-ignored, installed at deploy time
├── composer.json                      # PSR-4 autoload mapping (`App\` → `app/`) + minimal dependencies
├── .gitignore                         # updated this phase (see §2.4)
└── docs/media-platform/               # this planning documentation
```

Every directory above now exists in the branch (empty ones hold a
`.gitkeep` placeholder so git tracks them); no `.php` source files have
been added yet.

---

## 2.3 `public/index.php` and `.htaccess` — role, not implementation

Two files are worth explaining even though neither is written yet:

- **`public/index.php`** is the *only* PHP entry point the web server ever
  executes directly. It will bootstrap Configuration/Logging, build a
  `Router`, dispatch to the matched controller, and let that controller's
  response flow back out. Every other `app/` class is loaded via Composer
  autoloading, never requested directly by URL.
- **`public/.htaccess`** will rewrite any request that isn't an existing
  file (i.e., isn't a real asset under `assets/`) to `index.php`, plus set
  a few security headers (`X-Content-Type-Options`, `X-Frame-Options`,
  etc.). One rule set, works the same whether Hostinger serves it via
  Apache or LiteSpeed's Apache-compatible mode.

Actual file contents are written in the Backend Foundation phase — noted
here only so the structure's rationale is clear.

## 2.4 `.gitignore` additions this phase

```gitignore
/vendor/
/.env
/config/.env
/storage/cache/*
!/storage/cache/.gitkeep
/storage/logs/*
!/storage/logs/.gitkeep
/storage/tmp/*
!/storage/tmp/.gitkeep
```

Keeps the directory *structure* tracked (via `.gitkeep`) while keeping
generated/runtime/secret content out of version control — consistent with
the existing repository's convention for the unrelated WordPress project
(which already ignores `wp-config.php`, uploads, and cache).

## 2.5 Naming/placement decisions explained

- **`app/` not `src/`** — arbitrary but consistent with common PSR-4 PHP
  convention; no framework is implied or required.
- **`Providers/` starts empty** — deliberately, per your instruction not
  to secretly substitute or hard-code a provider before that phase.
- **`Repositories/` is the only layer allowed to contain SQL** — makes the
  "no SQL injection" security requirement (Phase 0 §0.8) mechanically
  easier to review: every query lives in one small set of files.
- **`Analytics/` is separate from `Processing/`** even though both log
  activity, because Phase 0 required an analytics failure to never affect
  the processing flow — separate write paths make that guarantee visible
  in the structure, not just a policy.
- **`scripts/` for cron entry points** — Hostinger's shared-hosting cron
  can only invoke a PHP file directly (no persistent worker per Phase 0
  §0.7); giving these their own top-level, non-web-accessible folder keeps
  them clearly distinct from both the front controller and the app's
  internal classes.

## 2.6 Potential problems

- **Document root decision (§2.1) is unresolved** — this is the one item
  that needs your input before deployment steps can be written concretely;
  it doesn't block the next phases (database design, backend foundation)
  since the internal structure is identical either way.
- **Composer availability on the shared plan is unverified** — most
  Hostinger plans expose Composer via the hPanel SSH/Terminal feature, but
  if this specific account doesn't have it, `vendor/` would need to be
  built locally and uploaded, or a Composer-free PSR-4 autoloader used
  instead. Flagging now; resolving in the Backend Foundation phase where
  `composer.json` is first populated.
- **`storage/` write permissions** — the hosting account's PHP process
  must be able to write to `storage/cache/`, `storage/logs/`, and
  `storage/tmp/`. Standard on shared hosting but worth an explicit
  permissions check during deployment rather than assuming it.

## What's testable at this stage

Structure only — I verified the directories exist and are empty apart from
`.gitkeep`, and that `.gitignore` correctly excludes runtime/secret paths
without excluding the structure itself:

```
$ git status --short
```
confirms only intended files (new dirs via `.gitkeep`, the updated
`.gitignore`, and this document) are staged — no `vendor/`, no `.env`, no
log/cache/tmp content.

## What remains

Database design (Phase 3 — including the `schema.sql` referenced above),
backend foundation (where `app/`, `config/`, and `public/index.php` first
get real code), frontend, admin dashboard, provider selection and
implementation, integration, SEO/monetization implementation, security
review, hosting optimization, QA, and deployment.

---

**STOP — awaiting your review of the structure and, specifically, your
answer on §2.1 (document root: Option A or B, or "not sure yet"), plus
explicit approval before Phase 3 (database design) begins.**
