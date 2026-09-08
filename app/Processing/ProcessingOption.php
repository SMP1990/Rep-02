<?php

declare(strict_types=1);

namespace App\Processing;

/**
 * One selectable output option returned from ProcessingProvider::fetchMetadata().
 * $format and $approxSizeBytes are optional because not every provider can
 * know them in advance.
 */
final class ProcessingOption
{
    public function __construct(
        public readonly string $id,
        public readonly string $label,
        public readonly ?string $format,
        public readonly ?int $approxSizeBytes,
    ) {
    }
}
