<?php

declare(strict_types=1);

use App\Support\Config;
use App\Support\ErrorHandler;

$root = dirname(__DIR__);

require $root . '/vendor/autoload.php';

Config::boot($root . '/config', $root . '/config/.env');

ErrorHandler::register((bool) Config::get('app.debug', false));

date_default_timezone_set((string) Config::get('app.timezone', 'UTC'));
