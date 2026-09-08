<?php

declare(strict_types=1);

use App\Support\Config;

return [
    'name' => Config::env('APP_NAME', 'Media Utility Platform'),
    'env' => Config::env('APP_ENV', 'production'),
    'debug' => (bool) Config::env('APP_DEBUG', false),
    'url' => Config::env('APP_URL', 'http://localhost'),
    'timezone' => Config::env('APP_TIMEZONE', 'UTC'),
];
