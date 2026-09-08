<?php

declare(strict_types=1);

namespace App\Processing\Exceptions;

use Throwable;

final class ProviderUnavailableException extends ProcessingException
{
    public function __construct(string $message = '', ?Throwable $previous = null)
    {
        parent::__construct($message, 'This service is temporarily unavailable. Please try again shortly.', $previous);
    }

    public function getErrorCode(): string
    {
        return 'PROVIDER_UNAVAILABLE';
    }
}
