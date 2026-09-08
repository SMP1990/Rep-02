<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Fixed-window rate limiter built on top of CacheStore. A window is
 * established on its first hit and keeps the same expiry for every
 * subsequent hit within it (rather than resetting the TTL on every call,
 * which would let a continuously-active caller avoid ever being limited).
 * Used by RateLimitMiddleware for both the public processing endpoint and
 * admin login (Phase 0 §0.8, Phase 1 §1.4).
 */
final class RateLimiter
{
    public function __construct(private readonly CacheStore $cache)
    {
    }

    public function tooManyAttempts(string $key, int $maxAttempts): bool
    {
        return $this->attempts($key) >= $maxAttempts;
    }

    public function hit(string $key, int $decaySeconds): int
    {
        $cacheKey = $this->cacheKey($key);
        $entry = $this->cache->get($cacheKey);
        $now = time();

        if (!is_array($entry) || !isset($entry['count'], $entry['expires_at']) || $entry['expires_at'] <= $now) {
            $entry = ['count' => 0, 'expires_at' => $now + $decaySeconds];
        }

        $entry['count']++;
        $remainingTtl = max(1, $entry['expires_at'] - $now);
        $this->cache->set($cacheKey, $entry, $remainingTtl);

        return $entry['count'];
    }

    public function attempts(string $key): int
    {
        $entry = $this->cache->get($this->cacheKey($key));

        if (!is_array($entry) || !isset($entry['count'], $entry['expires_at']) || $entry['expires_at'] <= time()) {
            return 0;
        }

        return (int) $entry['count'];
    }

    public function clear(string $key): void
    {
        $this->cache->delete($this->cacheKey($key));
    }

    private function cacheKey(string $key): string
    {
        return 'rate_limit:' . $key;
    }
}
