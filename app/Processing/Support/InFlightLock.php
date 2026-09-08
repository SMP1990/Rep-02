<?php

declare(strict_types=1);

namespace App\Processing\Support;

/**
 * Cross-process "only one of you does the work" coordination, built as
 * generic provider-independent infrastructure (any future provider —
 * Instagram, TikTok, YouTube — can use this the same way FacebookProvider
 * does) rather than something specific to one platform.
 *
 * PHP on shared hosting runs one process per request with no shared
 * memory between them, so this uses `flock()` on a per-key lock file —
 * the standard, portable way to coordinate across separate OS processes
 * from PHP, and available on ordinary shared hosting (no extension, no
 * daemon, no Redis required).
 *
 * Usage pattern (see FacebookProvider::resolve()):
 *   $lock = $inFlightLock->acquire($key);
 *   if ($lock === null) {
 *       // Someone else was/is doing the work for this key — re-check
 *       // whatever they were expected to produce (e.g. a cache entry)
 *       // and only fall back to doing it yourself if it's still missing.
 *   } else {
 *       try {
 *           // You're the leader — do the work, then make its result
 *           // discoverable (e.g. write it to a cache) before returning.
 *       } finally {
 *           $inFlightLock->release($lock);
 *       }
 *   }
 *
 * Deliberately does not cache/share the work's *result* itself — that's
 * the caller's job (e.g. via CacheStore). This class only answers "am I
 * the one who should do the work right now, or did/will someone else."
 */
final class InFlightLock
{
    public function __construct(
        private readonly string $lockDirectory,
        private readonly int $waitTimeoutSeconds = 15,
        private readonly int $pollIntervalMicroseconds = 100_000,
    ) {
        if (!is_dir($this->lockDirectory)) {
            @mkdir($this->lockDirectory, 0755, true);
        }
    }

    /**
     * Returns an opaque lock handle if this call becomes the exclusive
     * "leader" for $key (the caller MUST call release() when done, in a
     * finally block) — or null in every other case: another process
     * holds the lock and released it within the wait window, the wait
     * timed out, or the lock file itself couldn't be opened (e.g. an
     * unwritable directory). A null return always means the same thing
     * to the caller: don't do the exclusive work yourself yet — check
     * whether the leader already produced what you need, and only do
     * the work independently if it's still missing.
     */
    public function acquire(string $key): mixed
    {
        $handle = @fopen($this->pathFor($key), 'c');

        if ($handle === false) {
            return null;
        }

        if (flock($handle, LOCK_EX | LOCK_NB)) {
            return $handle;
        }

        $deadline = microtime(true) + $this->waitTimeoutSeconds;

        while (microtime(true) < $deadline) {
            if (flock($handle, LOCK_EX | LOCK_NB)) {
                // We only needed to confirm the previous leader finished —
                // release immediately rather than holding it ourselves, so
                // we never silently *become* leader after just waiting.
                flock($handle, LOCK_UN);
                fclose($handle);

                return null;
            }

            usleep($this->pollIntervalMicroseconds);
        }

        fclose($handle);

        return null;
    }

    public function release(mixed $handle): void
    {
        if (!is_resource($handle)) {
            return;
        }

        flock($handle, LOCK_UN);
        fclose($handle);
    }

    private function pathFor(string $key): string
    {
        return $this->lockDirectory . '/' . hash('sha256', $key) . '.lock';
    }
}
