<?php

declare(strict_types=1);

namespace App\Processing;

/**
 * The final deliverable produced by ProcessingProvider::process(). Kept
 * deliberately abstract ($deliveryMethod is a free-form string rather than
 * an enum) so a future provider isn't constrained to a vocabulary decided
 * before any concrete provider existed.
 */
final class ProcessingOutput
{
    public function __construct(
        public readonly string $deliveryMethod,
        public readonly ?string $url,
        public readonly ?string $filename,
        public readonly ?string $mimeType,
    ) {
    }
}
