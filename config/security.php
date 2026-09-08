<?php

declare(strict_types=1);

return [
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
