<?php
/**
 * Common bootstrap for every page (storefront and admin): config, session,
 * DB connection factory, and shared helpers, in the order each depends on
 * the last.
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/session.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/functions.php';
