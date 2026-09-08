<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Synchronizer-token CSRF protection for admin state-changing requests
 * (Phase 0 §0.8). Token lives in the session; comparison uses hash_equals
 * to avoid timing side channels.
 */
final class Csrf
{
    private const SESSION_KEY = '_csrf_token';

    public static function token(): string
    {
        if (empty($_SESSION[self::SESSION_KEY]) || !is_string($_SESSION[self::SESSION_KEY])) {
            $_SESSION[self::SESSION_KEY] = bin2hex(random_bytes(32));
        }

        return $_SESSION[self::SESSION_KEY];
    }

    public static function verify(?string $token): bool
    {
        $expected = $_SESSION[self::SESSION_KEY] ?? null;

        if (!is_string($token) || $token === '' || !is_string($expected) || $expected === '') {
            return false;
        }

        return hash_equals($expected, $token);
    }
}
