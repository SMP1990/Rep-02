<?php

declare(strict_types=1);

namespace App\Processing\Support;

/**
 * Minimal HTTP response value object returned by HttpClient. Deliberately
 * provider-agnostic — nothing here knows about any specific platform.
 */
final class HttpResponse
{
    /** @param array<string, string> $headers */
    public function __construct(
        public readonly int $status,
        public readonly array $headers,
        public readonly string $body,
        public readonly string $effectiveUrl = '',
    ) {
    }

    public function isSuccessful(): bool
    {
        return $this->status >= 200 && $this->status < 300;
    }

    /** @return array<mixed>|null */
    public function json(): ?array
    {
        $decoded = json_decode($this->body, true);

        return is_array($decoded) ? $decoded : null;
    }
}
