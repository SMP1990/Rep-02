<?php

declare(strict_types=1);

/**
 * One-time CLI tool to create the first admin account. No admin is
 * seeded in database/schema.sql on purpose (Phase 3/4) — creating one is
 * a deploy-time step, not a checked-in credential. phpMyAdmin can't do
 * this on its own: MySQL has no equivalent of PHP's password_hash(), so
 * inserting a row by hand there would either store a plaintext password
 * or a hash AdminAuthenticator can't verify. This script exists to close
 * that gap safely.
 *
 * Refuses to run over HTTP even if this file ends up somewhere
 * web-accessible by mistake — that check comes before anything else.
 *
 * Usage (interactive):
 *   php scripts/create-first-admin.php
 *
 * Usage (non-interactive, e.g. a scripted deploy):
 *   php scripts/create-first-admin.php --username=admin --email=admin@example.com --password='a long real password'
 *
 * Delete this file from the server once you've used it.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('This script only runs from the command line.');
}

$root = dirname(__DIR__);

require $root . '/app/Support/Config.php';
require $root . '/app/Support/Logger.php';
require $root . '/app/Support/Database.php';

use App\Support\Config;
use App\Support\Database;

Config::boot($root . '/config', $root . '/config/.env');

/** @param string[] $args */
function readArgOrPrompt(array $args, string $name, string $prompt): string
{
    foreach ($args as $arg) {
        if (str_starts_with($arg, "--{$name}=")) {
            return substr($arg, strlen("--{$name}="));
        }
    }

    echo $prompt;
    $value = fgets(STDIN);

    return $value === false ? '' : trim($value);
}

$args = array_slice($argv, 1);

$username = readArgOrPrompt($args, 'username', 'Username: ');
$email = readArgOrPrompt($args, 'email', 'Email: ');
$password = readArgOrPrompt($args, 'password', 'Password (min 12 characters, will be visible as you type): ');

if ($username === '' || $email === '' || $password === '') {
    fwrite(STDERR, "Username, email, and password are all required.\n");
    exit(1);
}

if (strlen($password) < 12) {
    fwrite(STDERR, "Password must be at least 12 characters.\n");
    exit(1);
}

if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    fwrite(STDERR, "That doesn't look like a valid email address.\n");
    exit(1);
}

try {
    $pdo = Database::connection();
} catch (\Throwable $e) {
    fwrite(STDERR, "Could not connect to the database — check config/.env: {$e->getMessage()}\n");
    exit(1);
}

$existing = $pdo->prepare('SELECT id FROM administrators WHERE username = :username OR email = :email');
$existing->execute(['username' => $username, 'email' => $email]);

if ($existing->fetch() !== false) {
    fwrite(STDERR, "An administrator with that username or email already exists.\n");
    exit(1);
}

$hash = password_hash($password, PASSWORD_DEFAULT);

$stmt = $pdo->prepare(
    'INSERT INTO administrators (username, email, password_hash, is_active) VALUES (:username, :email, :hash, 1)',
);
$stmt->execute(['username' => $username, 'email' => $email, 'hash' => $hash]);

echo "\nAdmin account '{$username}' created. Log in at /admin/login.\n";
echo "For your own security, delete this script from the server now:\n";
echo "  rm scripts/create-first-admin.php\n";
