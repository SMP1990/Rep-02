<?php

declare(strict_types=1);

namespace App\Processing;

/**
 * Value object returned by every ProcessingProvider call (Phase 1 §1.7.1).
 * Immutable and provider-agnostic — controllers map this to the public API
 * envelope, never passing $meta through to the frontend unfiltered (it's
 * for internal/logging use only, since a provider could put anything in it).
 */
final class ProcessingResult
{
    /**
     * @param ProcessingOption[] $options
     * @param array<string, mixed> $meta
     */
    public function __construct(
        public readonly bool $success,
        public readonly string $sourceUrl,
        public readonly ?string $sourcePlatform,
        public readonly ?string $title,
        public readonly ?string $thumbnailUrl,
        public readonly ?int $durationSeconds,
        public readonly array $options,
        public readonly ?ProcessingOutput $output,
        public readonly string $providerName,
        public readonly array $meta = [],
    ) {
    }
}
