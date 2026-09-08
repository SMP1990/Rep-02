<?php

declare(strict_types=1);

namespace App\Processing\Exceptions;

use RuntimeException;
use Throwable;

/**
 * Base of the closed exception vocabulary from Phase 1 §1.7.4. Every
 * subtype maps 1:1 to an API error.code (Phase 1 §1.3) and a Frontend
 * error state (Phase 0 §0.4). $message carries internal detail for logs;
 * getUserMessage() is always a fixed, safe string that's never a raw
 * exception message — this is the boundary that guarantees provider
 * internals never reach a visitor.
 */
abstract class ProcessingException extends RuntimeException
{
    public function __construct(string $message, private readonly string $userMessage, ?Throwable $previous = null)
    {
        parent::__construct($message !== '' ? $message : $userMessage, 0, $previous);
    }

    abstract public function getErrorCode(): string;

    public function getUserMessage(): string
    {
        return $this->userMessage;
    }
}
