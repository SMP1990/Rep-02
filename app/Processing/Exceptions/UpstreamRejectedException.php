<?php

declare(strict_types=1);

namespace App\Processing\Exceptions;

use Throwable;

final class UpstreamRejectedException extends ProcessingException
{
    public function __construct(string $message = '', ?Throwable $previous = null)
    {
        parent::__construct($message, 'This content is unavailable, private, or has been removed.', $previous);
    }

    public function getErrorCode(): string
    {
        return 'UPSTREAM_REJECTED';
    }
}
