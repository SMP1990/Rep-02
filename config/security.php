<?php

declare(strict_types=1);

use App\Support\Config;

return [
    // Analytics IP hashing (App\Analytics\RequestRecorder) mixes this in
    // alongside a per-day salt so ip_hash can't be brute-forced back to a
    // raw IP even by someone who can enumerate the IPv4/IPv6 space for a
    // given day. Set a real random value via env at deploy time.
    'ip_hash_salt' => Config::env('IP_HASH_SALT', 'change-me-in-production'),

    'session' => [
        'name' => 'mup_session',
        'lifetime_minutes' => 60,
        'idle_timeout_minutes' => 20,
    ],

    // Fixed-window rate limits, keyed per visitor IP (App\Support\RateLimiter).
    'rate_limit' => [
        'processing' => ['max_attempts' => 10, 'decay_seconds' => 60],
        'admin_login' => ['max_attempts' => 5, 'decay_seconds' => 300],
    ],

    'admin_lockout' => [
        'attempts_before_lock' => 5,
        'lock_minutes' => 15,
    ],
];
