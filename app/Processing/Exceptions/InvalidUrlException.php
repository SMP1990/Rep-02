<?php

declare(strict_types=1);

namespace App\Processing\Exceptions;

use Throwable;

final class InvalidUrlException extends ProcessingException
{
    public function __construct(string $message = '', ?Throwable $previous = null)
    {
        parent::__construct($message, 'Please enter a valid link.', $previous);
    }

    public function getErrorCode(): string
    {
        return 'INVALID_URL';
    }
}
