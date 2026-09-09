# Media Utility Platform — Hostinger Deployment & Real-World Testing

Status: **Deployment package ready — awaiting your approval to consider this phase started**
Scope: An out-of-sequence detour you asked for — deploy the current build
(Phases 0–8b) to your real Hostinger environment and test it for real,
**before** SEO, Security Review, Performance, Scalability, Final QA,
Monetization, or Production Release. Those remain paused until you say
otherwise.

This matters most for one specific thing: **this sandbox has never been
able to reach `facebook.com`**, so `FacebookProvider`'s actual extraction
has only ever been verified against synthetic fixtures (Phase 7c/8b).
Your Hostinger account has real internet access. Getting this deployed is
the only way to find out whether the extraction technique itself actually
works — everything else in this platform has already been tested live in
this environment.

---

## 1. What was prepared this phase

Three real gaps were found and fixed while preparing for deployment, not
just documentation written:

1. **`composer.json` was missing three extensions the code actually
   uses**: `ext-curl` (all of `HttpClient`/`FacebookProvider`),
   `ext-mbstring` (`Validator`, `FacebookProvider`, `ErrorLogRepository`),
   and the specific `ext-pdo_mysql` driver (not just generic `ext-pdo`).
   Found by grepping the codebase for actual extension usage, not
   guessing. `composer.lock` regenerated to match.
2. **`public/.htaccess` had no HTTPS-enforcement rule**, despite Phase 0
   requiring HTTPS site-wide. Added, checking both `%{HTTPS}` and
   `X-Forwarded-Proto` so it works regardless of exactly how Hostinger
   terminates TLS for your plan.
3. **There was no safe way to create the first admin account.** No admin
   is seeded in `database/schema.sql` on purpose (a hard-coded credential
   in version control would be a real security issue) — but phpMyAdmin
   alone can't fix this either: MySQL has no equivalent of PHP's
   `password_hash()`, so a row inserted by hand there would never pass
   `password_verify()` at login. Built `scripts/create-first-admin.php`
   to close this gap: CLI-only (refuses to run over HTTP even if
   accidentally left somewhere web-accessible), validates its own inputs,
   and was tested end-to-end against a real database — created an
   account and confirmed it logs in through the real, unmodified login
   flow before being written up here.

`config/.env.example` was also filled in with Hostinger-specific guidance
(exact `DB_HOST`/naming conventions) and the `IP_HASH_SALT` variable that
was missing from it.

---

## 2. What Hostinger shared hosting needs to provide

| Requirement | Detail |
|---|---|
| PHP version | **8.1 or newer** (set via hPanel → Websites → Manage → PHP Configuration) |
| PHP extensions | `pdo`, `pdo_mysql`, `json`, `curl`, `mbstring`, `session` — all standard/default-enabled on Hostinger's PHP builds; verify under the same PHP Configuration screen's extension list |
| Database | MySQL 5.7+ (or the MariaDB-compatible equivalent Hostinger provisions), InnoDB, `utf8mb4` — create via hPanel → Databases → MySQL Databases |
| Disk | Minimal — the app itself is a few MB; no media files are ever stored server-side (Phase 7c: downloads redirect straight to Facebook's own CDN URL) |
| SSL | Free Let's Encrypt via hPanel → SSL — enable **before** relying on the new HTTPS-redirect rule in `.htaccess` |
| Cron | Not required for anything currently built. (Optional future item, not built yet: periodically pruning the `visitor_daily_seen` table per Phase 3's design — low priority, doesn't block deployment or testing.) |
| Outbound HTTPS | Required for `FacebookProvider` to reach `facebook.com`/`mbasic.facebook.com` — **this is the one thing this environment could never verify and yours can** |
| Composer / SSH | Helpful but not required — see §4, Option B if your plan doesn't include terminal access |

## 3. Document root — the one decision only you can make (Phase 2 §2.1)

Only `public/` should ever be web-accessible; everything else (`app/`,
`config/`, `storage/`, `database/`) must sit outside the document root so
there's no URL that can reach them, full stop — not "protected by
`.htaccess`," genuinely unreachable.

**Option A — preferred, if your plan supports it.** In hPanel, check for
"Change PHP Document Root" or similar under your domain's advanced
settings. Point it at wherever `public/` ends up on disk (e.g.
`/home/u123456789/domains/yourdomain.com/fetchpoint/public`). Then the
rest of the project (`app/`, `config/`, etc.) sits one level up, outside
`public_html`, automatically unreachable.

**Option B — fallback, works on every Hostinger plan.** Only the
*contents* of `public/` go into `public_html/`; everything else uploads
to a sibling directory outside it (e.g. `~/fetchpoint-app/`), and
`public/index.php` needs one line changed to point at that sibling
path instead of `dirname(__DIR__)`. Tell me which option your hPanel
actually offers once you've checked, and if it's B, I'll make that
one-line adjustment for you rather than have you guess at it.

---

## 4. Step-by-step deployment instructions

### 4.1 Build the dependency folder locally (this environment, before upload)

`vendor/` is git-ignored and never committed — Composer generates it.
I'll run this now so what you upload already includes it:

```
composer install --no-dev --optimize-autoloader
```

### 4.2 Upload the code

Via hPanel File Manager or FTP/SFTP (credentials under hPanel → Files →
FTP Accounts), upload the whole project — following whichever layout
Option A or B above requires. Do **not** upload:

- `.git/` (version control metadata, not needed to run the app)
- `config/.env` (doesn't exist yet locally — you'll create it directly
  on the server in the next step, never commit or upload it from
  elsewhere)
- `tests/` (optional to skip — harmless either way, just unused weight)

### 4.3 Create `config/.env` directly on the server

Copy `config/.env.example` to `config/.env` (File Manager's copy/rename,
or `cp` over SSH) and fill in:

- `APP_ENV=production`, `APP_DEBUG=false` (never `true` in production —
  `ErrorHandler`, Phase 4 §4.5, only shows real error detail when this is
  `true`)
- `APP_URL` — your real domain, `https://...`
- `DB_HOST`/`DB_DATABASE`/`DB_USERNAME`/`DB_PASSWORD` — from hPanel →
  Databases (see §5)
- `IP_HASH_SALT` — generate one **on the server** (or here, and paste it
  over) with:
  ```
  php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
  ```

### 4.4 Set file permissions

```
find . -type d -exec chmod 755 {} \;
find . -type f -exec chmod 644 {} \;
chmod -R 775 storage/cache storage/logs storage/tmp
```

The `storage/` subtree specifically must be writable by the PHP
process — `FileCacheStore`, `Logger`, and the rate limiter all write
there on every request. If your account's file-ownership model already
makes everything writable by your own PHP process by default (common on
Hostinger's per-account PHP-FPM setup), the broad `775` isn't strictly
necessary, but it's a safe, standard baseline that won't break anything.

### 4.5 Import the database

hPanel → Databases → phpMyAdmin → select your database → **Import** tab
→ choose `database/schema.sql` → Go. This creates all 11 tables (Phase 3)
in one pass — no admin account is created by this (by design, see §1).

### 4.6 Create the first admin account

**If your plan has SSH/Terminal access** (hPanel → Advanced → SSH
Access, or the in-browser Terminal some plans offer):

```
cd <project-root>
php scripts/create-first-admin.php
```

Follow the prompts, then **delete the script**:
```
rm scripts/create-first-admin.php
```

**If you have no terminal access at all**, tell me — I'd rather adjust
this step for your actual environment than have you invent a workaround.
(One safe option: run it locally against a temporary SSH tunnel or a
local copy of the schema, generate the `password_hash` output, and I'll
give you the exact `INSERT` statement to run once through phpMyAdmin
instead — still no plaintext password ever touches the database.)

### 4.7 Enable SSL and verify HTTPS

hPanel → SSL → enable the free certificate for your domain. Wait for it
to issue (usually a few minutes), then load `https://yourdomain.com/`
directly to confirm it works **before** relying on the `.htaccess`
redirect rule (§1) to catch `http://` visitors.

---

## 5. Deployment checklist

- [ ] PHP version set to 8.1+ in hPanel
- [ ] Required extensions confirmed enabled (`pdo_mysql`, `curl`,
      `mbstring`, `json`)
- [ ] MySQL database created in hPanel, credentials noted
- [ ] Document root decision made (Option A or B, §3) and code uploaded
      accordingly
- [ ] `vendor/` uploaded (built locally with `--no-dev`)
- [ ] `config/.env` created on the server with real values, `APP_DEBUG=false`
- [ ] `IP_HASH_SALT` set to a freshly generated random value (not the dev
      placeholder)
- [ ] File permissions set (§4.4), `storage/{cache,logs,tmp}` confirmed
      writable
- [ ] `database/schema.sql` imported via phpMyAdmin, all 11 tables present
- [ ] First admin account created via `scripts/create-first-admin.php`,
      then the script deleted from the server
- [ ] SSL certificate issued and active; site loads over `https://`
      directly
- [ ] `.htaccess` HTTPS redirect confirmed working (visit `http://`,
      land on `https://`)

## 6. Verifying the installation

1. `GET https://yourdomain.com/api/v1/health` → should return
   `{"success":true,"data":{"status":"ok","time":"..."}}`. This is the
   fastest possible smoke test — if this fails, nothing else will work
   either, and the fix is almost always the document-root/`.env`/DB
   connection setup, not application code.
2. Load the homepage — should render styled (Bootstrap self-hosted under
   `public/assets/vendor/`, Phase 5 — if it looks unstyled, the document
   root is probably wrong).
3. Log in at `/admin/login` with the account from §4.6; confirm the
   dashboard loads (it'll show all-zero stats on a fresh install — that's
   correct, not a bug).

## 7. Testing checklist — validate all major functionality

**Public site**
- [ ] Homepage, `/faq`, `/about`, `/contact`, `/terms`, `/privacy`,
      `/copyright` all load
- [ ] Submitting an empty/malformed link shows the styled error state
      (Phase 8's validation tests, now against real PHP/MySQL versions)
- [ ] **The one thing this environment could never test**: submit a real,
      public Facebook video URL and a real Reel URL. Does metadata come
      back? Are HD/SD options listed? Does clicking one produce a working
      download link that actually plays/downloads the video? This is the
      result I most want to hear back on.
- [ ] Submit the same real Facebook URL from two browser tabs at once —
      confirms request coalescing (Phase 8b) works in a real multi-request
      environment, not just this sandbox's simulated one
- [ ] Mobile: load the homepage on an actual phone, confirm the responsive
      layout and full submit → result flow

**Admin dashboard**
- [ ] Login/logout work; wrong password is rejected; rate limiting kicks
      in after repeated failed attempts
- [ ] Dashboard stats update after a real public submission (should no
      longer show all zeros)
- [ ] Create/edit/delete a FAQ entry, a page, an ad zone; confirm each
      persists after a page reload
- [ ] SEO settings and site settings save correctly
- [ ] Processing log viewer shows the real Facebook attempts you made
      above, with correct status/provider/duration
- [ ] Error log viewer — trigger a real error if you can (e.g., a
      temporarily wrong DB password) and confirm it's captured without
      leaking detail to visitors

**Cross-cutting**
- [ ] No PHP warnings/errors visible on any page (check `storage/logs/`
      instead of the browser — nothing should ever display there per
      `ErrorHandler`)
- [ ] `config/.env`, `.git`, and anything under `app/`/`config/`/`storage/`
      are confirmed **not** reachable by URL (try
      `https://yourdomain.com/config/.env` directly — must 404, never
      show contents)

---

**STOP — this is the deployment package: preparation, step-by-step
instructions, requirements, checklist, and testing checklist. No further
phases (SEO, Security Review, Performance, Scalability, Final QA,
Monetization, Production Release) will proceed until you've deployed,
tested, and come back with results or issues to fix.**
