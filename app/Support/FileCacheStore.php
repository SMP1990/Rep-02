<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Phase 1 file-based CacheStore implementation. Keys are hashed to a flat
 * filename (no path traversal risk from an arbitrary key), and values are
 * unserialized with allowed_classes disabled to avoid PHP object-injection
 * if a cache file were ever tampered with directly on disk.
 */
final class FileCacheStore implements CacheStore
{
    public function __construct(private readonly string $directory)
    {
        if (!is_dir($this->directory)) {
            @mkdir($this->directory, 0755, true);
        }
    }

    public function get(string $key): mixed
    {
        $path = $this->pathFor($key);

        if (!is_file($path)) {
            return null;
        }

        $raw = @file_get_contents($path);
        if ($raw === false || $raw === '') {
            return null;
        }

        $payload = @unserialize($raw, ['allowed_classes' => false]);
        if (!is_array($payload) || !array_key_exists('expires_at', $payload) || !array_key_exists('value', $payload)) {
            return null;
        }

        if ($payload['expires_at'] !== 0 && $payload['expires_at'] < time()) {
            @unlink($path);
            return null;
        }

        return $payload['value'];
    }

    public function set(string $key, mixed $value, int $ttlSeconds): void
    {
        $payload = [
            'expires_at' => $ttlSeconds > 0 ? time() + $ttlSeconds : 0,
            'value' => $value,
        ];

        @file_put_contents($this->pathFor($key), serialize($payload), LOCK_EX);
    }

    public function delete(string $key): void
    {
        @unlink($this->pathFor($key));
    }

    private function pathFor(string $key): string
    {
        return $this->directory . '/' . hash('sha256', $key) . '.cache';
    }
}
