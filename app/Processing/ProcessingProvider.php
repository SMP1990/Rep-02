<?php

declare(strict_types=1);

namespace App\Processing;

use App\Processing\Exceptions\ProcessingException;

/**
 * Contract every processing/extraction provider must implement (Phase 1
 * §1.7.2). No concrete implementation exists yet — see
 * app/Processing/Providers/ (intentionally empty) and config/providers.php.
 *
 * supports() must be cheap and side-effect-free (no network calls): it's
 * used by ProviderManager to probe every registered provider when
 * resolving a URL, so an expensive supports() would make resolution itself
 * slow as more providers are registered.
 *
 * Each implementation is responsible for enforcing its own network-level
 * timeout (e.g. curl CURLOPT_TIMEOUT/CURLOPT_CONNECTTIMEOUT). PHP has no
 * built-in way to interrupt a synchronous call from the outside, so
 * ProviderManager cannot enforce a hard ceiling on a provider's behalf —
 * it can only log how long a call took after the fact.
 */
interface ProcessingProvider
{
    public function getName(): string;

    /**
     * Resolution priority when more than one registered provider's
     * supports() matches the same URL — higher wins.
     */
    public function getPriority(): int;

    public function supports(string $url): bool;

    /**
     * @throws ProcessingException
     */
    public function fetchMetadata(string $url): ProcessingResult;

    /**
     * @throws ProcessingException
     */
    public function process(string $url, string $optionId): ProcessingResult;
}
