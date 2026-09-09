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
    /**
     * @param array<string, string> $headers
     * @param ?string $cookieJarPath when given, cookies the response sets
     *     are written to this file and cookies already in it are sent
     *     with the request — lets two calls sharing a path chain like two
     *     page loads in the same browser session.
     */
    public function get(string $url, array $headers = [], ?string $cookieJarPath = null): HttpResponse;

    /** @param array<string, string> $headers */
    public function head(string $url, array $headers = []): HttpResponse;
}
