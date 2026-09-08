<?php

declare(strict_types=1);

return [
    // Phase 1 kept this abstracted (App\Support\CacheStore) so a Redis/
    // Memcached driver can be dropped in later without touching call
    // sites. Only the file driver is implemented in this phase — matches
    // what a Hostinger shared-hosting plan can rely on being available.
    'driver' => 'file',
    'path' => dirname(__DIR__) . '/storage/cache',
    'default_ttl' => 300,
];
