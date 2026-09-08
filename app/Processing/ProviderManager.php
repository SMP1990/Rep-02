<?php

declare(strict_types=1);

namespace App\Processing;

use App\Processing\Exceptions\InternalProcessingException;
use App\Processing\Exceptions\ProcessingException;
use App\Processing\Exceptions\UnsupportedSourceException;
use App\Support\Logger;
use Throwable;

/**
 * The seam described in Phase 1 §1.7.3: registration, resolution, and
 * exception normalization all live here, so the Backend/API layer and
 * everything above it stay identical no matter which provider(s) are
 * registered or where they run.
 *
 * Implementation note vs. the Phase 1 design doc: that phase described
 * ProviderManager as enforcing a timeout on each call. In practice,
 * synchronous PHP has no way to interrupt a call that's already in
 * flight (no pcntl/async on typical shared hosting) — a wrapper that
 * "throws timeout" only after the underlying call already returned would
 * either do nothing useful or, worse, discard an already-successful
 * result. Timeout enforcement has been moved to where it's actually
 * achievable: each ProcessingProvider's own network client (e.g. curl's
 * own CURLOPT_TIMEOUT). ProviderManager still measures and logs duration
 * for every call, which is what the processing log/dashboard needs.
 */
final class ProviderManager
{
    /** @param ProcessingProvider[] $providers */
    public function __construct(private readonly array $providers)
    {
    }

    /**
     * @throws UnsupportedSourceException
     */
    public function resolve(string $url): ProcessingProvider
    {
        $candidates = $this->providers;
        usort(
            $candidates,
            static fn (ProcessingProvider $a, ProcessingProvider $b) => $b->getPriority() <=> $a->getPriority(),
        );

        foreach ($candidates as $provider) {
            if ($provider->supports($url)) {
                return $provider;
            }
        }

        throw new UnsupportedSourceException('No registered provider supports this URL.');
    }

    /**
     * @throws ProcessingException
     */
    public function fetchMetadata(string $url): ProcessingResult
    {
        return $this->run($url, static fn (ProcessingProvider $provider) => $provider->fetchMetadata($url));
    }

    /**
     * @throws ProcessingException
     */
    public function process(string $url, string $optionId): ProcessingResult
    {
        return $this->run($url, static fn (ProcessingProvider $provider) => $provider->process($url, $optionId));
    }

    /**
     * @param callable(ProcessingProvider): ProcessingResult $operation
     * @throws ProcessingException
     */
    private function run(string $url, callable $operation): ProcessingResult
    {
        $startedAt = microtime(true);
        $provider = null;

        try {
            $provider = $this->resolve($url);
            $result = $operation($provider);
        } catch (ProcessingException $e) {
            // Also reached when resolve() itself throws UnsupportedSourceException
            // (no $provider yet) — every processing attempt gets logged, not just
            // ones that made it to a resolved provider.
            $this->logOutcome($provider, $startedAt, false, $e->getErrorCode());
            throw $e;
        } catch (Throwable $e) {
            Logger::channel('processing')->error('Unhandled provider exception', [
                'provider' => $provider?->getName(),
                'exception' => $e::class,
                'message' => $e->getMessage(),
            ]);
            $this->logOutcome($provider, $startedAt, false, 'INTERNAL_ERROR');

            throw new InternalProcessingException('An unexpected processing error occurred.', $e);
        }

        $this->logOutcome($provider, $startedAt, true, null);

        return $result;
    }

    private function logOutcome(?ProcessingProvider $provider, float $startedAt, bool $success, ?string $errorCode): void
    {
        Logger::channel('processing')->info('Processing call completed', [
            'provider' => $provider?->getName(),
            'success' => $success,
            'error_code' => $errorCode,
            'duration_ms' => (int) ((microtime(true) - $startedAt) * 1000),
        ]);
    }
}
