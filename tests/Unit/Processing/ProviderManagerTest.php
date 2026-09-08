<?php

declare(strict_types=1);

namespace Tests\Unit\Processing;

use App\Processing\Exceptions\InternalProcessingException;
use App\Processing\Exceptions\UnsupportedSourceException;
use App\Processing\Exceptions\UpstreamRejectedException;
use App\Processing\ProcessingOption;
use App\Processing\ProcessingProvider;
use App\Processing\ProcessingResult;
use App\Processing\ProviderManager;
use PHPUnit\Framework\TestCase;
use RuntimeException;

/**
 * Exercises ProviderManager against fake providers only — no network
 * calls, no real extraction logic. This is exactly the test suite
 * Phase 1 §1.11 promised: resolution order, exception normalization, and
 * "no provider matches" behavior, all verifiable before any concrete
 * provider exists.
 */
final class ProviderManagerTest extends TestCase
{
    public function testResolvesUrlToSupportingProvider(): void
    {
        $manager = new ProviderManager([$this->fakeProvider('fake', supports: true)]);

        $result = $manager->fetchMetadata('https://example.com/video/123');

        self::assertTrue($result->success);
        self::assertSame('fake', $result->providerName);
    }

    public function testThrowsUnsupportedSourceWhenNoProviderMatches(): void
    {
        $manager = new ProviderManager([$this->fakeProvider('fake', supports: false)]);

        $this->expectException(UnsupportedSourceException::class);

        $manager->fetchMetadata('https://example.com/video/123');
    }

    public function testHigherPriorityProviderIsPreferredWhenBothSupport(): void
    {
        $low = $this->fakeProvider('low', supports: true, priority: 1);
        $high = $this->fakeProvider('high', supports: true, priority: 10);

        $manager = new ProviderManager([$low, $high]);

        $result = $manager->fetchMetadata('https://example.com/video/123');

        self::assertSame('high', $result->providerName);
    }

    public function testKnownProcessingExceptionPropagatesUnchanged(): void
    {
        $provider = $this->throwingProvider(new UpstreamRejectedException('Content removed upstream.'));
        $manager = new ProviderManager([$provider]);

        $this->expectException(UpstreamRejectedException::class);

        $manager->fetchMetadata('https://example.com/video/123');
    }

    public function testUnexpectedThrowableIsNormalizedToInternalProcessingException(): void
    {
        $provider = $this->throwingProvider(new RuntimeException('boom'));
        $manager = new ProviderManager([$provider]);

        $this->expectException(InternalProcessingException::class);

        $manager->fetchMetadata('https://example.com/video/123');
    }

    private function fakeProvider(string $name, bool $supports, int $priority = 1): ProcessingProvider
    {
        return new class($name, $supports, $priority) implements ProcessingProvider {
            public function __construct(
                private readonly string $name,
                private readonly bool $supportsUrl,
                private readonly int $priority,
            ) {
            }

            public function getName(): string
            {
                return $this->name;
            }

            public function getPriority(): int
            {
                return $this->priority;
            }

            public function supports(string $url): bool
            {
                return $this->supportsUrl;
            }

            public function fetchMetadata(string $url): ProcessingResult
            {
                return new ProcessingResult(
                    success: true,
                    sourceUrl: $url,
                    sourcePlatform: 'fake',
                    title: 'Fake title',
                    thumbnailUrl: null,
                    durationSeconds: null,
                    options: [new ProcessingOption('opt1', 'Original quality', null, null)],
                    output: null,
                    providerName: $this->name,
                );
            }

            public function process(string $url, string $optionId): ProcessingResult
            {
                return $this->fetchMetadata($url);
            }
        };
    }

    private function throwingProvider(\Throwable $exception): ProcessingProvider
    {
        return new class($exception) implements ProcessingProvider {
            public function __construct(private readonly \Throwable $exception)
            {
            }

            public function getName(): string
            {
                return 'failing';
            }

            public function getPriority(): int
            {
                return 1;
            }

            public function supports(string $url): bool
            {
                return true;
            }

            public function fetchMetadata(string $url): ProcessingResult
            {
                throw $this->exception;
            }

            public function process(string $url, string $optionId): ProcessingResult
            {
                throw $this->exception;
            }
        };
    }
}
