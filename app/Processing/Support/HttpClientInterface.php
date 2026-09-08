<?php

declare(strict_types=1);

namespace App\Processing\Support;

/**
 * Extracted so providers depend on this rather than the concrete
 * HttpClient — lets tests substitute a fake implementation instead of
 * hitting the network (needed for FacebookProvider's tests, since this
 * sandbox's network policy can't reach facebook.com to test against the
 * real thing — see docs/media-platform/phase-7c).
 */
interface HttpClientInterface
{
    /** @param array<string, string> $headers */
    public function get(string $url, array $headers = []): HttpResponse;

    /** @param array<string, string> $headers */
    public function head(string $url, array $headers = []): HttpResponse;
}
