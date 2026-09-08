<?php

declare(strict_types=1);

use App\Support\Config;
use App\Support\ErrorHandler;
use App\Support\View;

$root = dirname(__DIR__);

require $root . '/vendor/autoload.php';
require __DIR__ . '/Support/helpers.php';

Config::boot($root . '/config', $root . '/config/.env');

View::boot($root . '/resources/views');

ErrorHandler::register((bool) Config::get('app.debug', false));

date_default_timezone_set((string) Config::get('app.timezone', 'UTC'));
