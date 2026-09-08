<?php

declare(strict_types=1);

namespace App\Support;

/**
 * One-shot session flash message, used by the admin dashboard's
 * Post/Redirect/Get form flows to show a "saved"/"deleted"/error message
 * after a redirect without needing any client-side JS.
 */
final class Flash
{
    private const SESSION_KEY = '_flash';

    public static function set(string $type, string $message): void
    {
        $_SESSION[self::SESSION_KEY] = ['type' => $type, 'message' => $message];
    }

    /** @return array{type: string, message: string}|null */
    public static function consume(): ?array
    {
        $flash = $_SESSION[self::SESSION_KEY] ?? null;
        unset($_SESSION[self::SESSION_KEY]);

        return is_array($flash) ? $flash : null;
    }
}
