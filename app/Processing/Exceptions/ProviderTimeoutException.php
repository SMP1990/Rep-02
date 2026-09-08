<?php

declare(strict_types=1);

namespace App\Processing\Exceptions;

use Throwable;

final class ProviderTimeoutException extends ProcessingException
{
    public function __construct(string $message = '', ?Throwable $previous = null)
    {
        parent::__construct($message, 'This is taking longer than expected. Please try again.', $previous);
    }

    public function getErrorCode(): string
    {
        return 'PROVIDER_TIMEOUT';
    }
}
