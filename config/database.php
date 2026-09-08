<?php

declare(strict_types=1);

use App\Support\Config;

return [
    'host' => Config::env('DB_HOST', '127.0.0.1'),
    'port' => (int) Config::env('DB_PORT', 3306),
    'database' => Config::env('DB_DATABASE', ''),
    'username' => Config::env('DB_USERNAME', ''),
    'password' => Config::env('DB_PASSWORD', ''),
    'charset' => 'utf8mb4',
];
