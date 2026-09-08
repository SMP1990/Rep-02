<?php

declare(strict_types=1);

if (!function_exists('e')) {
    /**
     * Escape a value for safe HTML output. Every view echoes user- or
     * admin-supplied text through this — the one place output encoding
     * happens, rather than trusting each template to remember.
     */
    function e(mixed $value): string
    {
        return htmlspecialchars((string) ($value ?? ''), ENT_QUOTES, 'UTF-8');
    }
}
