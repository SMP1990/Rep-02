<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Cache abstraction (Phase 1 §1.6.2). The file driver below is what
 * Hostinger shared hosting can rely on being available; a Redis/Memcached
 * implementation on the VPS phase satisfies the same interface, so
 * RateLimiter and any future caching call site never change.
 */
interface CacheStore
{
    public function get(string $key): mixed;

    public function set(string $key, mixed $value, int $ttlSeconds): void;

    public function delete(string $key): void;
}
