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
 * describes (Phase 4 §4.3). It also enforces a response-size ceiling via
 * a write-callback abort (not CURLOPT_MAXFILESIZE, which only checks a
 * Content-Length header that a scraped page often won't send) — a
 * resource-limit safeguard for shared hosting's memory constraints
 * (Phase 0 §0.7), generic to any provider, not specific to one platform.
 */
final class HttpClient implements HttpClientInterface
{
    public function __construct(
        private readonly int $timeoutSeconds = 15,
        private readonly int $connectTimeoutSeconds = 5,
        private readonly string $userAgent = 'Mozilla/5.0 (compatible; FetchpointBot/1.0)',
        private readonly int $maxRetries = 2,
        private readonly int $maxRedirects = 5,
        private readonly int $maxResponseBytes = 10_485_760, // 10 MB
    ) {
    }

    /**
     * @param array<string, string> $headers
     * @param ?string $cookieJarPath when given, cookies the response sets
     *     are written to this file and cookies already in it are sent
     *     with the request — lets a caller chain a "warm-up" request and
     *     a follow-up request through the same anonymous-visitor cookie
     *     jar, the same way a real browser would across two page loads.
     *     Never shared with any other caller; the file is plain text
     *     (libcurl's own cookie-jar format), never anything sensitive
     *     like an authenticated session.
     */
    public function get(string $url, array $headers = [], ?string $cookieJarPath = null): HttpResponse
    {
        return $this->request('GET', $url, $headers, $cookieJarPath);
    }

    /** @param array<string, string> $headers */
    public function head(string $url, array $headers = []): HttpResponse
    {
        return $this->request('HEAD', $url, $headers, null);
    }

    /**
     * @param array<string, string> $headers
     * @throws HttpRequestException
     */
    private function request(string $method, string $url, array $headers, ?string $cookieJarPath): HttpResponse
    {
        $attempt = 0;
        $lastException = null;

        while ($attempt <= $this->maxRetries) {
            try {
                return $this->attempt($method, $url, $headers, $cookieJarPath);
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
    private function attempt(string $method, string $url, array $headers, ?string $cookieJarPath): HttpResponse
    {
        $ch = curl_init($url);

        if ($ch === false) {
            throw new HttpRequestException("Could not initialize a request to {$url}.");
        }

        $formattedHeaders = [];
        foreach ($headers as $name => $value) {
            $formattedHeaders[] = "{$name}: {$value}";
        }

        $buffer = '';
        $maxBytes = $this->maxResponseBytes;
        $exceeded = false;

        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_NOBODY => $method === 'HEAD',
            CURLOPT_RETURNTRANSFER => false,
            CURLOPT_HEADER => false,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => $this->maxRedirects,
            CURLOPT_CONNECTTIMEOUT => $this->connectTimeoutSeconds,
            CURLOPT_TIMEOUT => $this->timeoutSeconds,
            CURLOPT_USERAGENT => $this->userAgent,
            CURLOPT_HTTPHEADER => $formattedHeaders,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_WRITEFUNCTION => function ($handle, string $chunk) use (&$buffer, &$exceeded, $maxBytes): int {
                $buffer .= $chunk;
                if (strlen($buffer) > $maxBytes) {
                    $exceeded = true;

                    return -1; // aborts the transfer
                }

                return strlen($chunk);
            },
        ]);

        if ($cookieJarPath !== null) {
            // Same file for both: libcurl reads whatever cookies are
            // already there before the request, then writes the
            // (possibly updated) set back after — letting two calls
            // sharing a path behave like two page loads in one browser
            // session, entirely in plain-text cookie-jar format.
            curl_setopt($ch, CURLOPT_COOKIEFILE, $cookieJarPath);
            curl_setopt($ch, CURLOPT_COOKIEJAR, $cookieJarPath);
        }

        curl_exec($ch);
        $errorNumber = curl_errno($ch);
        $errorMessage = curl_error($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $effectiveUrl = (string) curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
        curl_close($ch);

        if ($exceeded) {
            throw new HttpRequestException("Response from {$url} exceeded the {$maxBytes}-byte limit.");
        }

        if ($errorNumber !== 0) {
            throw new HttpRequestException("cURL error ({$errorNumber}): {$errorMessage}");
        }

        if ($status >= 500) {
            throw new HttpRequestException("Upstream returned HTTP {$status}.");
        }

        return new HttpResponse($status, [], $buffer, $effectiveUrl);
    }
}
