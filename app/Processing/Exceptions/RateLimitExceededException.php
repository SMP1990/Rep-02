<?php

declare(strict_types=1);

namespace App\Processing\Exceptions;

use Throwable;

final class RateLimitExceededException extends ProcessingException
{
    public function __construct(string $message = '', ?Throwable $previous = null)
    {
        parent::__construct($message, 'Too many requests. Please wait a moment and try again.', $previous);
    }

    public function getErrorCode(): string
    {
        return 'RATE_LIMITED';
    }
}
