<?php

declare(strict_types=1);

namespace App\Processing\Providers;

use App\Processing\Exceptions\UpstreamRejectedException;
use App\Processing\Exceptions\ProviderUnavailableException;
use App\Processing\ProcessingOption;
use App\Processing\ProcessingOutput;
use App\Processing\ProcessingProvider;
use App\Processing\ProcessingResult;
use App\Processing\Support\HttpClientInterface;
use App\Processing\Support\HttpRequestException;
use App\Processing\Support\InFlightLock;
use App\Support\CacheStore;
use App\Support\Logger;

/**
 * Public Facebook video/Reel provider — implemented per your explicit
 * approval after the risk was explained (docs/media-platform/phase-7.md,
 * phase-7b-facebook-provider-research.md). Public content only: it never
 * attempts to authenticate, supply cookies, or otherwise access anything
 * behind a login wall — if the page looks login-gated or unavailable, it
 * throws UpstreamRejectedException rather than working around that.
 *
 * EXTRACTION TECHNIQUE (revised after live production debugging): fetches
 * the real facebook.com/web.facebook.com page directly — not the old
 * mbasic.facebook.com WAP interface this provider originally used, which
 * production testing showed doesn't carry this modern JSON embedding at
 * all and returned a generic error for content types tried (Reels, share
 * links). The current, real facebook.com page embeds its own video URLs
 * directly in inline `<script type="application/json">` blocks used to
 * hydrate the page — a plain HTTP fetch plus JSON parsing, needing no
 * browser engine, no Python, and no shell access, so it runs on ordinary
 * PHP shared hosting. This sandbox's network policy still can't reach
 * facebook.com, so this has only been verified against synthetic fixture
 * HTML shaped like the documented JSON structure
 * (tests/Unit/Processing/Providers/FacebookProviderTest.php) — real-world
 * verification happens on your production server.
 *
 * Concurrent requests for the SAME URL are coalesced via InFlightLock
 * (Phase 8 finding): only one caller actually fetches/parses Facebook's
 * page at a time; the rest wait (bounded) and then reuse the cached
 * result instead of each independently hitting Facebook. This only
 * coalesces the *success* path on purpose — a failed attempt is never
 * cached, so if the "leader" fails, the next caller in line tries again
 * independently rather than everyone inheriting one failure.
 */
final class FacebookProvider implements ProcessingProvider
{
    private const CACHE_TTL_SECONDS = 300;

    /** JSON keys Facebook uses for the HD stream, checked in this order. */
    private const HD_KEYS = ['playable_url_quality_hd', 'browser_native_hd_url'];

    /** JSON keys Facebook uses for the SD/default stream, checked in this order. */
    private const SD_KEYS = ['playable_url', 'browser_native_sd_url'];

    public function __construct(
        private readonly HttpClientInterface $http,
        private readonly CacheStore $cache,
        private readonly InFlightLock $lock,
        private readonly int $priority = 10,
    ) {
    }

    public function getName(): string
    {
        return 'facebook';
    }

    public function getPriority(): int
    {
        return $this->priority;
    }

    public function supports(string $url): bool
    {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        $host = preg_replace('/^www\./', '', $host) ?? $host;

        return in_array($host, ['facebook.com', 'm.facebook.com', 'mbasic.facebook.com', 'web.facebook.com', 'fb.watch'], true);
    }

    public function fetchMetadata(string $url): ProcessingResult
    {
        return $this->toResult($url, $this->resolve($url), null);
    }

    public function process(string $url, string $optionId): ProcessingResult
    {
        $extraction = $this->resolve($url);

        $chosen = null;
        foreach ($extraction['options'] as $option) {
            if ($option['id'] === $optionId) {
                $chosen = $option;
                break;
            }
        }

        if ($chosen === null) {
            throw new UpstreamRejectedException('The selected quality is no longer available for this video.');
        }

        $output = new ProcessingOutput(
            deliveryMethod: 'redirect_url',
            url: $chosen['url'],
            filename: $this->slugFilename($extraction['title']) . '.mp4',
            mimeType: 'video/mp4',
        );

        return $this->toResult($url, $extraction, $output);
    }

    /**
     * @return array{title: ?string, options: array<int, array{id: string, label: string, url: string}>}
     */
    private function resolve(string $url): array
    {
        $cacheKey = $this->cacheKeyFor($url);

        $cached = $this->readCache($cacheKey);
        if ($cached !== null) {
            return $cached;
        }

        $lock = $this->lock->acquire($cacheKey);

        if ($lock === null) {
            // Either coalescing wasn't available (lock file couldn't be
            // opened), or we waited for a concurrent "leader" call — check
            // whether it populated the cache before falling back to doing
            // the fetch ourselves.
            $cached = $this->readCache($cacheKey);

            return $cached ?? $this->fetchAndCache($url, $cacheKey);
        }

        try {
            return $this->fetchAndCache($url, $cacheKey);
        } finally {
            $this->lock->release($lock);
        }
    }

    /** @return array{title: ?string, options: array<int, array{id: string, label: string, url: string}>}|null */
    private function readCache(string $cacheKey): ?array
    {
        $cached = $this->cache->get($cacheKey);

        /** @var array{title: ?string, options: array<int, array{id: string, label: string, url: string}>}|null */
        return (is_array($cached) && isset($cached['options'])) ? $cached : null;
    }

    private function cacheKeyFor(string $url): string
    {
        return 'facebook:extract:' . hash('sha256', $url);
    }

    /**
     * The actual fetch-and-parse work — only ever runs once per URL at a
     * time thanks to InFlightLock, whether it's called as the lock
     * "leader" or as a fallback when coalescing wasn't possible.
     *
     * @return array{title: ?string, options: array<int, array{id: string, label: string, url: string}>}
     */
    private function fetchAndCache(string $url, string $cacheKey): array
    {
        $canonicalUrl = $this->resolveCanonicalUrl($url);

        try {
            $response = $this->http->get($canonicalUrl, ['Accept-Language' => 'en-US,en;q=0.9']);
        } catch (HttpRequestException $e) {
            throw new ProviderUnavailableException('Could not reach Facebook right now.', $e);
        }

        if ($this->looksLikeLoginWall($response->body)) {
            $savedAs = $this->saveRawResponseForDiagnosis($response->body);

            Logger::channel('processing')->warning('Facebook provider detected a login wall', [
                'url_hash' => hash('sha256', $url),
                'fetched_url' => $canonicalUrl,
                'http_status' => $response->status,
                'raw_response_saved_as' => $savedAs,
            ]);

            throw new UpstreamRejectedException(
                'This video is private, restricted, or requires logging in, so it cannot be processed.',
            );
        }

        if (!$response->isSuccessful()) {
            $savedAs = $this->saveRawResponseForDiagnosis($response->body);

            Logger::channel('processing')->warning('Facebook provider received a non-success HTTP status', [
                'url_hash' => hash('sha256', $url),
                'fetched_url' => $canonicalUrl,
                'http_status' => $response->status,
                'raw_response_saved_as' => $savedAs,
            ]);

            throw new UpstreamRejectedException('This content is unavailable, private, or has been removed.');
        }

        $title = $this->extractTitle($response->body);
        $candidates = $this->extractVideoCandidates($response->body);

        if ($candidates === []) {
            $savedAs = $this->saveRawResponseForDiagnosis($response->body);

            Logger::channel('processing')->warning('Facebook provider found no video candidates', [
                'url_hash' => hash('sha256', $url),
                'fetched_url' => $canonicalUrl,
                'raw_response_saved_as' => $savedAs,
            ]);

            throw new UpstreamRejectedException("We couldn't find a downloadable video on this page.");
        }

        $options = [];
        foreach ($candidates as $quality => $candidateUrl) {
            $options[] = [
                'id' => $quality,
                'label' => $quality === 'hd' ? 'HD quality' : 'Standard quality',
                'url' => $candidateUrl,
            ];
        }

        $extraction = ['title' => $title, 'options' => $options];
        $this->cache->set($cacheKey, $extraction, self::CACHE_TTL_SECONDS);

        return $extraction;
    }

    private function toResult(string $url, array $extraction, ?ProcessingOutput $output): ProcessingResult
    {
        return new ProcessingResult(
            success: true,
            sourceUrl: $url,
            sourcePlatform: 'facebook',
            title: $extraction['title'],
            thumbnailUrl: null,
            durationSeconds: null,
            options: array_map(
                static fn (array $o) => new ProcessingOption($o['id'], $o['label'], 'mp4', null),
                $extraction['options'],
            ),
            output: $output,
            providerName: $this->getName(),
        );
    }

    /**
     * fb.watch links and /share/... links are both short-link redirectors
     * to a canonical facebook.com URL — resolve them before fetching, by
     * fetching the original URL and letting redirects run their course.
     */
    private function resolveCanonicalUrl(string $url): string
    {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        $path = (string) parse_url($url, PHP_URL_PATH);

        $isShortLink = str_contains($host, 'fb.watch') || str_starts_with($path, '/share/');

        if (!$isShortLink) {
            return $url;
        }

        try {
            $response = $this->http->get($url);
        } catch (HttpRequestException $e) {
            throw new ProviderUnavailableException('Could not resolve this Facebook link.', $e);
        }

        return $response->effectiveUrl !== '' ? $response->effectiveUrl : $url;
    }

    private function looksLikeLoginWall(string $html): bool
    {
        foreach (['You must log in to continue', 'log_in_to_continue', 'id="login_form"'] as $signal) {
            if (stripos($html, $signal) !== false) {
                return true;
            }
        }

        return false;
    }

    private function extractTitle(string $html): ?string
    {
        if (preg_match('/<title>(.*?)<\/title>/is', $html, $matches) !== 1) {
            return null;
        }

        $title = html_entity_decode(trim($matches[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $title = preg_replace('/\s+/', ' ', $title) ?? $title;

        return $title !== '' ? $title : null;
    }

    /**
     * Facebook's real (non-mbasic) pages hydrate themselves from inline
     * `<script type="application/json">` blocks — dozens of them per page,
     * each a fragment of the page's own state. The video stream URLs live
     * as plain string values under a handful of stable key names
     * (self::HD_KEYS / self::SD_KEYS) somewhere inside that state, at a
     * depth/shape that Facebook changes often — so instead of matching an
     * exact JSON path, every candidate block is decoded and walked
     * recursively for those key names, which is resilient to the
     * surrounding structure shifting as long as the key names hold.
     *
     * @return array<string, string> quality label ('hd'|'sd') => direct URL
     */
    private function extractVideoCandidates(string $html): array
    {
        $candidates = [];

        if (preg_match_all('/<script type="application\/json"[^>]*>(.*?)<\/script>/is', $html, $matches) === 0) {
            return $candidates;
        }

        foreach ($matches[1] as $jsonBlob) {
            if (!str_contains($jsonBlob, 'playable_url') && !str_contains($jsonBlob, 'browser_native')) {
                continue;
            }

            $decoded = json_decode($jsonBlob, true);

            if (is_array($decoded)) {
                $this->collectVideoUrls($decoded, $candidates);
            }
        }

        return $candidates;
    }

    /** @param array<string, string> $candidates */
    private function collectVideoUrls(array $node, array &$candidates): void
    {
        if (!isset($candidates['hd'])) {
            foreach (self::HD_KEYS as $key) {
                if (isset($node[$key]) && is_string($node[$key]) && $node[$key] !== '') {
                    $candidates['hd'] = $node[$key];
                    break;
                }
            }
        }

        if (!isset($candidates['sd'])) {
            foreach (self::SD_KEYS as $key) {
                if (isset($node[$key]) && is_string($node[$key]) && $node[$key] !== '') {
                    $candidates['sd'] = $node[$key];
                    break;
                }
            }
        }

        foreach ($node as $value) {
            if (is_array($value)) {
                $this->collectVideoUrls($value, $candidates);
            }
        }
    }

    /**
     * TEMPORARY — remove once the extraction technique is confirmed
     * working against real Facebook markup in production (see this
     * class's docblock). Saves the exact raw HTML Facebook sent back
     * whenever no video links could be found in it, so this can be
     * diagnosed from storage/logs/ (already reachable via File Manager)
     * instead of needing a separate diagnostic tool or admin access.
     *
     * @return string the saved filename (not the full path — the path is
     *     already implied by storage/logs/ and doesn't need to appear in
     *     log output)
     */
    private function saveRawResponseForDiagnosis(string $body): string
    {
        $logDirectory = dirname(__DIR__, 3) . '/storage/logs';

        if (!is_dir($logDirectory)) {
            @mkdir($logDirectory, 0755, true);
        }

        $filename = 'facebook-raw-' . date('Ymd-His') . '-' . bin2hex(random_bytes(3)) . '.html';
        @file_put_contents($logDirectory . '/' . $filename, $body);

        return $filename;
    }

    private function slugFilename(?string $title): string
    {
        $base = ($title !== null && $title !== '') ? $title : 'facebook-video';
        $slug = preg_replace('/[^a-zA-Z0-9]+/', '-', $base) ?? 'facebook-video';
        $slug = trim($slug, '-');
        $slug = $slug !== '' ? $slug : 'facebook-video';

        return strtolower(mb_substr($slug, 0, 80));
    }
}
