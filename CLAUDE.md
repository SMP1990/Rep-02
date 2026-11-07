# Read first

This branch (`claude/upbeat-archimedes-266v06`) holds the **ASK Downloader**
website (`ask-downloader/`) and its online tools. Before doing anything:

1. Read `AI-HANDOVER.md` (where everything is, owner rules, current state).
2. Read `ask-downloader/CLAUDE.md` (site rules: Roman Urdu replies, one step
   at a time, 11 languages, ZIP deploy, testing).
3. For tools, read `TOOLS-GUIDE.md`.

> **STANDING REMINDER (owner decision 2026-11-07):** the site is still on a
> **testing domain**. Keep `SOUNDS_OPEN_TO_SEARCH = false` in
> `ask-downloader/server/soundsPublic.ts` (sound pages stay noindex and out of the
> sitemap). **When the owner says the domain has changed / the real domain is
> live, REMIND HIM** about the Google switch and the checklist in
> `AI-HANDOVER.md` ("Google switch - remind the owner when the domain changes").
> Do not turn it ON without his clear yes.

The repository's default branch (`claude/hello-a3y98x`) is a different project
(Haven Realty WordPress, `wp-content/`). Do not build the site on it.
