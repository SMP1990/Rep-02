# Media Utility Platform — Phase 3: Database Design

Status: **DRAFT — awaiting approval**
Builds on: Phase 0 (requirements), Phase 1 (architecture), Phase 2 (structure)
Scope: MySQL schema design + the installation script (`database/schema.sql`),
generated after the design below per your instruction. No application code
that *uses* this schema yet (Repositories/models come in the Backend
Foundation phase).

---

## 3.1 Entity list — and where it deviates from the brief's suggested list

The brief's example entities were: `administrators`, `settings`,
`processing_requests`, `processing_results`, `visitors`, `download_logs`,
`error_logs`, `advertisements`, `seo_settings`, `pages`, `faq`,
`languages`. Per your instruction ("do not create unnecessary tables"), I
consolidated a few of these and added one small table that a listed
requirement (FR-13 "visitors" stat) actually needs to work correctly.
Every change is explained, not silent (rule 16):

| Brief suggested | Decision | Why |
|---|---|---|
| `processing_requests` + `processing_results` + `download_logs` | **Merged into one table: `processing_requests`** | A metadata lookup and a process/download action are the same kind of event at different stages (`request_type` column distinguishes them). Splitting them into three tables would mean joining across all three for every dashboard query and every log-viewer row, for no relational benefit — nothing about a "result" or a "download" has a separate lifecycle from its request. |
| `visitors` | **Replaced with two tables: `visitor_daily_stats` + `visitor_daily_seen`** | A raw per-visitor row (Phase 0 §0.9 flags minimal-PII as a requirement) would mean storing an indefinitely-growing, identity-adjacent table for every unique caller. Instead, daily aggregate counters (`visitor_daily_stats`) power the dashboard (FR-13), and a small, deliberately short-lived dedup table (`visitor_daily_seen`) is what makes an *exact* unique-visitor count possible without retaining raw IPs — see §3.3 for its self-pruning design. |
| `seo_settings` | **Kept, but scoped to non-CMS routes + sitewide defaults** | `pages` (custom content) carries its own SEO columns inline, since a page's SEO fields are part of that content record (same pattern the existing Haven Realty project in this repo already uses). `seo_settings` is only needed for routes that *aren't* a `pages` row — home, FAQ index, and a `global` row for sitewide fallbacks (default OG image, title suffix). |

Nothing else was removed. Net result: **11 tables**, each tied to a
specific functional requirement from Phase 0.

---

## 3.2 Conventions used throughout

- Engine: **InnoDB** everywhere (row-level locking, foreign key support).
- Charset/collation: **`utf8mb4` / `utf8mb4_unicode_ci`** everywhere (full
  Unicode incl. emoji in titles/FAQ text; `_unicode_ci` chosen over
  `0900_ai_ci` for compatibility across both MySQL 5.7 and 8, since the
  exact version on the Hostinger account isn't confirmed yet).
- Primary keys: `BIGINT UNSIGNED AUTO_INCREMENT` on tables expected to grow
  large (logs), smaller types where a table is inherently bounded.
- `created_at`/`updated_at` follow `TIMESTAMP ... DEFAULT CURRENT_TIMESTAMP`
  (+ `ON UPDATE CURRENT_TIMESTAMP` where a row is ever updated in place).
- Every raw SQL statement that will ever touch these tables lives only in
  `app/Repositories/` (Phase 2 §2.5) and uses parameterized queries — the
  schema constrains types/enums as defense-in-depth, not as the primary
  injection defense.

---

## 3.3 Table-by-table design

### `administrators`
Admin accounts (Phase 1 §1.4). No visitor accounts exist in this platform.

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | PK, AUTO_INCREMENT |
| `username` | `VARCHAR(64)` | UNIQUE, NOT NULL |
| `email` | `VARCHAR(255)` | UNIQUE, NOT NULL |
| `password_hash` | `VARCHAR(255)` | NOT NULL — output of PHP `password_hash()` (bcrypt/argon2id), never plaintext |
| `is_active` | `TINYINT(1)` | NOT NULL DEFAULT 1 |
| `failed_login_attempts` | `SMALLINT UNSIGNED` | NOT NULL DEFAULT 0 — brute-force lockout counter |
| `locked_until` | `DATETIME` | NULL — set when lockout threshold hit |
| `last_login_at` | `DATETIME` | NULL |
| `created_at` / `updated_at` | `TIMESTAMP` | standard |

**Security:** `password_hash` is never logged, never returned by any API
response, and the lockout columns exist specifically so brute-force
protection (Phase 0 §0.8) is enforceable at the data layer, not just in
application memory (which wouldn't survive a request-per-process model).

### `settings`
Site-wide key/value configuration (FR-14), avoids a fixed wide-column table
that needs a migration every time a new toggle is added.

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | PK, AUTO_INCREMENT |
| `setting_key` | `VARCHAR(100)` | UNIQUE, NOT NULL |
| `setting_value` | `TEXT` | NULL |
| `setting_type` | `ENUM('string','bool','int','json')` | NOT NULL DEFAULT `'string'` — tells the app layer how to cast |
| `updated_at` | `TIMESTAMP` | standard |

### `languages`
Minimal i18n-readiness (FR requirement, kept intentionally small — see
Phase 0 §0.1: not necessarily multi-language at launch).

| Column | Type | Notes |
|---|---|---|
| `code` | `VARCHAR(10)` | PK (e.g. `en`, `en-US`) |
| `name` | `VARCHAR(60)` | NOT NULL |
| `is_default` | `TINYINT(1)` | NOT NULL DEFAULT 0 — exactly one row should be 1; enforced at the application layer (MySQL has no native "exactly one" constraint short of a trigger, which is avoided here to keep the schema portable/simple) |
| `is_active` | `TINYINT(1)` | NOT NULL DEFAULT 1 |
| `sort_order` | `SMALLINT UNSIGNED` | NOT NULL DEFAULT 0 |

### `pages`
Admin-managed static content (About, Terms, Privacy, Copyright/DMCA,
Contact — FR-18). SEO fields inline since they belong to this content.

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | PK, AUTO_INCREMENT |
| `slug` | `VARCHAR(190)` | NOT NULL |
| `language_code` | `VARCHAR(10)` | NOT NULL DEFAULT `'en'`, FK → `languages(code)` |
| `title` | `VARCHAR(255)` | NOT NULL |
| `content` | `MEDIUMTEXT` | NOT NULL — admin-authored HTML, sanitized on save (app layer) |
| `meta_title` | `VARCHAR(255)` | NULL |
| `meta_description` | `VARCHAR(320)` | NULL |
| `noindex` | `TINYINT(1)` | NOT NULL DEFAULT 0 |
| `is_published` | `TINYINT(1)` | NOT NULL DEFAULT 1 |
| `created_at` / `updated_at` | `TIMESTAMP` | standard |

Keys: `UNIQUE (slug, language_code)`; `INDEX (is_published)`.
FK: `language_code` → `languages(code)` `ON UPDATE CASCADE ON DELETE RESTRICT`
(a language in use by content can't be silently deleted).

### `faq`
FAQ entries (FR-17).

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | PK, AUTO_INCREMENT |
| `language_code` | `VARCHAR(10)` | NOT NULL DEFAULT `'en'`, FK → `languages(code)` |
| `question` | `VARCHAR(500)` | NOT NULL |
| `answer` | `MEDIUMTEXT` | NOT NULL |
| `sort_order` | `SMALLINT UNSIGNED` | NOT NULL DEFAULT 0 |
| `is_published` | `TINYINT(1)` | NOT NULL DEFAULT 1 |
| `created_at` / `updated_at` | `TIMESTAMP` | standard |

Keys: `INDEX (language_code, sort_order)`, `INDEX (is_published)`.
Same FK behavior as `pages`.

### `seo_settings`
Non-CMS routes + sitewide defaults (FR-15) — see §3.1 for scope decision.

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | PK, AUTO_INCREMENT |
| `route_key` | `VARCHAR(100)` | UNIQUE, NOT NULL — e.g. `global`, `home`, `faq_index` |
| `meta_title` | `VARCHAR(255)` | NULL |
| `meta_description` | `VARCHAR(320)` | NULL |
| `og_image_path` | `VARCHAR(255)` | NULL |
| `canonical_override` | `VARCHAR(255)` | NULL |
| `noindex` | `TINYINT(1)` | NOT NULL DEFAULT 0 |
| `updated_at` | `TIMESTAMP` | standard |

The `global` row is the sitewide fallback the SEO layer (Phase 1 §1.6.5)
reads when a specific `route_key` has no override.

### `advertisements`
Ad zones (FR-16, Phase 0 §0.11) — network-agnostic by design.

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | PK, AUTO_INCREMENT |
| `zone_key` | `VARCHAR(50)` | NOT NULL — `header`\|`in_content`\|`results`\|`footer`\|`mobile` |
| `name` | `VARCHAR(150)` | NOT NULL — admin-facing label |
| `snippet_html` | `MEDIUMTEXT` | NULL — admin-supplied ad code/snippet |
| `device_target` | `ENUM('all','desktop','mobile')` | NOT NULL DEFAULT `'all'` |
| `is_active` | `TINYINT(1)` | NOT NULL DEFAULT 0 |
| `sort_order` | `SMALLINT UNSIGNED` | NOT NULL DEFAULT 0 |
| `starts_at` / `ends_at` | `DATETIME` | NULL — optional scheduling window |
| `created_at` / `updated_at` | `TIMESTAMP` | standard |

Keys: `INDEX (zone_key, is_active)`, `INDEX (starts_at, ends_at)`.

**Security consideration flagged explicitly:** `snippet_html` is raw
HTML/JS storage, writable only by authenticated administrators. This is
accepted as by-design (it's how a network-agnostic ad slot has to work —
Phase 0 §0.11 explicitly rules out hard-coding one network's SDK), but it
means the admin account is a higher-value target than in a typical CMS,
and this field must **never** be reachable from any non-admin-authenticated
endpoint. Revisited concretely in the Security Review phase (length caps,
rendering isolation, CSP).

### `processing_requests`
The core operational log — every metadata lookup and every process/download
action (Phase 1 §1.7, Phase 0 FR-19). Powers both the admin processing-log
viewer and the dashboard's request/success/failure counters.

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | PK, AUTO_INCREMENT |
| `request_type` | `ENUM('metadata','process')` | NOT NULL |
| `source_platform` | `VARCHAR(60)` | NULL — `ProcessingResult::$sourcePlatform` |
| `provider_name` | `VARCHAR(60)` | NULL — which `ProcessingProvider` handled it |
| `url_hash` | `CHAR(64)` | NOT NULL — SHA-256 of the submitted URL (see note below) |
| `option_id` | `VARCHAR(100)` | NULL — set for `request_type = 'process'` |
| `status` | `ENUM('success','failure')` | NOT NULL |
| `error_code` | `VARCHAR(60)` | NULL — matches a `ProcessingException` code (Phase 1 §1.7.4) |
| `duration_ms` | `MEDIUMINT UNSIGNED` | NULL |
| `ip_hash` | `CHAR(64)` | NOT NULL — SHA-256 of visitor IP + daily salt (see note below) |
| `user_agent` | `VARCHAR(255)` | NULL |
| `created_at` | `TIMESTAMP` | NOT NULL DEFAULT CURRENT_TIMESTAMP |

Keys: `INDEX (created_at)`, `INDEX (status, created_at)`,
`INDEX (source_platform, created_at)`, `INDEX (ip_hash, created_at)`,
`INDEX (url_hash)`.

**Why hashed, not raw, URL and IP:** Phase 0 §0.3 requires minimal PII
collection with a documented retention policy. Neither the dashboard
counters nor rate-limiting/abuse analysis need the *actual* URL or IP —
they need to detect repeats and compute aggregates, which a SHA-256 hash
supports identically to the raw value while meaning this table never
becomes a durable, plaintext record of "which third-party links this IP
downloaded." (If an active-incident investigation ever needs more detail
than the hash gives, that's what the separate, shorter-retention
`storage/logs/processing.log` file from Phase 1 §1.6.3 is for — a
deliberately different retention policy for a deliberately different
purpose.) `ip_hash` includes a daily salt specifically so it can't be
brute-forced back to a raw IP by hashing the IPv4/IPv6 space, while still
being stable *within* a day for rate-limiting purposes.

**Growth note:** this is the highest-write table in the schema. See §3.5.

### `error_logs`
Application/security-level errors not already captured as a processing
outcome (FR-20) — admin login failures, uncaught exceptions, etc.

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | PK, AUTO_INCREMENT |
| `channel` | `ENUM('application','security')` | NOT NULL |
| `level` | `ENUM('warning','error','critical')` | NOT NULL |
| `message` | `VARCHAR(500)` | NOT NULL |
| `context_json` | `JSON` | NULL — structured extra detail |
| `created_at` | `TIMESTAMP` | NOT NULL DEFAULT CURRENT_TIMESTAMP |

Keys: `INDEX (channel, created_at)`, `INDEX (level, created_at)`.

**Security consideration:** `context_json` must never contain credentials,
session identifiers, or password hashes — enforced at the application
logging call sites (Phase 1 §1.6.3), not by the schema itself.

### `visitor_daily_stats`
Daily aggregate counters for the dashboard (FR-13).

| Column | Type | Notes |
|---|---|---|
| `stat_date` | `DATE` | PK |
| `unique_visitors` | `INT UNSIGNED` | NOT NULL DEFAULT 0 |
| `total_requests` | `INT UNSIGNED` | NOT NULL DEFAULT 0 |
| `successful_requests` | `INT UNSIGNED` | NOT NULL DEFAULT 0 |
| `failed_requests` | `INT UNSIGNED` | NOT NULL DEFAULT 0 |
| `updated_at` | `TIMESTAMP` | standard |

One row per calendar day, upserted as the day progresses (or rolled up
nightly — an application-layer decision for the Backend Foundation phase).
Weekly/monthly dashboard views are `SUM()`/`GROUP BY` queries over this
table, not separate tables.

### `visitor_daily_seen`
Exists solely to make `unique_visitors` above an **exact** count without
storing a permanent per-visitor identity — this is the one table added
beyond the brief's original list, justified below.

| Column | Type | Notes |
|---|---|---|
| `stat_date` | `DATE` | PK (composite) |
| `ip_hash` | `CHAR(64)` | PK (composite) — same daily-salted hash as `processing_requests.ip_hash` |
| `first_seen_at` | `TIMESTAMP` | NOT NULL DEFAULT CURRENT_TIMESTAMP |

Composite PK `(stat_date, ip_hash)` makes "have we counted this visitor
today" an `INSERT ... ON DUPLICATE KEY` no-op check — the row's mere
existence *is* the dedup, no scan required. This table is **self-pruning
by design**: once a day's rows have been rolled into that day's
`visitor_daily_stats.unique_visitors` count, the day's rows in this table
serve no further purpose and are deleted by a scheduled cleanup script
(§3.5) — it never grows unbounded, unlike a permanent `visitors` table
would.

---

## 3.4 Entity-relationship summary

```
languages ──1───────< pages          (language_code FK)
languages ──1───────< faq            (language_code FK)

seo_settings, settings, advertisements, administrators,
processing_requests, error_logs, visitor_daily_stats,
visitor_daily_seen                    — standalone, no FKs to other tables
                                         (all are logs/config, not content
                                          that references other content)
```

Deliberately shallow. This is a utility/content-config schema, not a
deeply relational one — most tables are either configuration (edited by
one admin, read by the app) or append-only logs (written by the app, read
by the admin). The only real relationships are `pages`/`faq` → `languages`.

---

## 3.5 Optimizing for growth

- `processing_requests` and `error_logs` are append-only and will be the
  fastest-growing tables. They're indexed for the query patterns the
  dashboard and log viewers actually need (`created_at` ranges, filtered
  by `status`/`channel`/`level`). Once volume grows meaningfully, a
  time-based archival job (e.g., move rows older than 12 months to an
  archive table, or drop them once rolled into `visitor_daily_stats`-style
  aggregates) should run from `scripts/` via cron — not built now, but the
  indexing already supports it (`created_at` range scans are cheap).
- `visitor_daily_seen` is bounded by design (§3.3) — a daily cron prunes
  rows once their day's count is finalized, so this table never
  accumulates history.
- `BIGINT UNSIGNED` primary keys on every log/growth table avoid ever
  hitting an `INT` ceiling.
- All foreign-key columns are indexed (MySQL does this automatically for
  InnoDB FKs, kept here for explicitness).
- Nothing in this schema assumes a single-server MySQL instance forever —
  moving to a managed/replicated MySQL instance later (Phase 1 §1.10,
  Phase 0 §0.10) requires no schema changes, only a `config/database.php`
  connection-target change.

## 3.6 Potential problems

- **`is_default` on `languages` has no DB-level uniqueness guarantee** —
  enforced at the application layer when writing admin settings. A DB
  trigger could enforce it strictly, but that adds portability risk
  (trigger behavior/permissions can differ across hosting environments)
  for a low-severity edge case (worst case: two "default" languages,
  caught by an admin-UI validation, not a data-integrity emergency).
- **`snippet_html` (advertisements) storing raw markup** is a known,
  accepted trade-off (§3.3) that the Security Review phase needs to
  revisit with concrete mitigations, not just a schema-level note.
- **Retention policy for `processing_requests`/`error_logs` isn't decided
  yet** — the schema supports whatever policy is chosen (indexed for
  range deletes), but the actual number of months to retain is a product
  decision, not a technical one. Flagging for your input before the
  Deployment/Backup-strategy phase.

## What's testable at this stage

The script below can be validated for syntax/logical soundness now (no
live MySQL instance in this environment to execute it against yet):

```
$ grep -c "CREATE TABLE" database/schema.sql   # expect 11
$ php -l is not applicable (this is SQL, not PHP)
```

I'll do a syntax/consistency read-through myself before presenting it, and
recommend running it against a local/staging MySQL 8 instance (or
Hostinger's phpMyAdmin) before applying it to production, per your own
approval gate.

## What remains

Backend Foundation (Repositories that use this schema, config, routing,
sessions, CSRF, rate limiting), frontend, admin dashboard, provider
selection/implementation, integration, SEO/monetization implementation,
security review, hosting optimization, QA, deployment.

---

## 3.7 SQL installation script

Generated after the design above, per your instruction. Full script:
`database/schema.sql` (also committed to the branch this phase).

---

**STOP — awaiting your review of the schema (and specifically the three
consolidation/addition decisions in §3.1), plus explicit approval before
Phase 4 (Backend Foundation) begins.**
