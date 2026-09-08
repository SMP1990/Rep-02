<?php

declare(strict_types=1);

namespace App\Processing\Exceptions;

use Throwable;

final class UnsupportedSourceException extends ProcessingException
{
    public function __construct(string $message = '', ?Throwable $previous = null)
    {
        parent::__construct($message, "This link isn't from a supported source.", $previous);
    }

    public function getErrorCode(): string
    {
        return 'UNSUPPORTED_SOURCE';
    }
}
