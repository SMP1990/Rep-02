<?php

declare(strict_types=1);

namespace App\Processing\Exceptions;

use Throwable;

/**
 * Catch-all for anything a provider throws that isn't already a
 * ProcessingException. ProviderManager normalizes every unexpected
 * Throwable into this, so nothing unrecognized ever reaches the Backend
 * API layer or a visitor (Phase 1 §1.8).
 */
final class InternalProcessingException extends ProcessingException
{
    public function __construct(string $message = '', ?Throwable $previous = null)
    {
        parent::__construct($message, 'An unexpected error occurred. Please try again.', $previous);
    }

    public function getErrorCode(): string
    {
        return 'INTERNAL_ERROR';
    }
}
