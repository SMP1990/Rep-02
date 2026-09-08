<?php

declare(strict_types=1);

namespace App\Processing\Support;

/**
 * Shared, provider-agnostic HTTP client for App\Processing\Providers\*
 * implementations — built now as provider-independent infrastructure
 * (Phase 7b) so every future provider (Facebook, Instagram, TikTok,
 * YouTube, ...) composes this instead of duplicating cURL boilerplate
 * and retry/backoff logic per provider.
 *
 * Retries only on transient failures (connection errors, 5xx) with
 * exponential backoff — never on 4xx, which on the platforms this is
 * meant for usually means "blocked" or "not found," where retrying
 * immediately just spends the retry budget for no benefit and can look
 * more aggressive to anti-abuse systems, not less.
 *
 * This class enforces its own timeout via cURL's own options
 * (CURLOPT_TIMEOUT/CURLOPT_CONNECTTIMEOUT) — this is the "each provider
 * enforces its own network timeout" contract ProviderManager's docblock
 * describes (Phase 4 §4.3).
 */
final class HttpClient
{
    public function __construct(
        private readonly int $timeoutSeconds = 15,
        private readonly int $connectTimeoutSeconds = 5,
        private readonly string $userAgent = 'Mozilla/5.0 (compatible; FetchpointBot/1.0)',
        private readonly int $maxRetries = 2,
        private readonly int $maxRedirects = 5,
    ) {
    }

    /** @param array<string, string> $headers */
    public function get(string $url, array $headers = []): HttpResponse
    {
        return $this->request('GET', $url, $headers);
    }

    /** @param array<string, string> $headers */
    public function head(string $url, array $headers = []): HttpResponse
    {
        return $this->request('HEAD', $url, $headers);
    }

    /**
     * @param array<string, string> $headers
     * @throws HttpRequestException
     */
    private function request(string $method, string $url, array $headers): HttpResponse
    {
        $attempt = 0;
        $lastException = null;

        while ($attempt <= $this->maxRetries) {
            try {
                return $this->attempt($method, $url, $headers);
            } catch (HttpRequestException $e) {
                $lastException = $e;
                $attempt++;

                if ($attempt > $this->maxRetries) {
                    break;
                }

                usleep((int) (200_000 * (2 ** ($attempt - 1))));
            }
        }

        throw $lastException ?? new HttpRequestException("Request to {$url} failed.");
    }

    /** @param array<string, string> $headers */
    private function attempt(string $method, string $url, array $headers): HttpResponse
    {
        $ch = curl_init($url);

        if ($ch === false) {
            throw new HttpRequestException("Could not initialize a request to {$url}.");
        }

        $formattedHeaders = [];
        foreach ($headers as $name => $value) {
            $formattedHeaders[] = "{$name}: {$value}";
        }

        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_NOBODY => $method === 'HEAD',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER => false,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => $this->maxRedirects,
            CURLOPT_CONNECTTIMEOUT => $this->connectTimeoutSeconds,
            CURLOPT_TIMEOUT => $this->timeoutSeconds,
            CURLOPT_USERAGENT => $this->userAgent,
            CURLOPT_HTTPHEADER => $formattedHeaders,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);

        $body = curl_exec($ch);
        $errorNumber = curl_errno($ch);
        $errorMessage = curl_error($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($errorNumber !== 0) {
            throw new HttpRequestException("cURL error ({$errorNumber}): {$errorMessage}");
        }

        if ($status >= 500) {
            throw new HttpRequestException("Upstream returned HTTP {$status}.");
        }

        return new HttpResponse($status, [], $body === false ? '' : $body);
    }
}
