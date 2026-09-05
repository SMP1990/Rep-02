<?php
/**
 * Shared helper functions.
 *
 * Placeholder only — implementations land in Phase 2 (functionality &
 * business logic) once the structure below is approved.
 */

function format_price(float $amount): string
{
    return STORE_CURRENCY_SYMBOL . number_format($amount, 2);
}

function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

// TODO (Phase 2): slugify(), paginate(), fetch_products(), search/filter
// query builders, cart helpers, order-number generator, etc.
