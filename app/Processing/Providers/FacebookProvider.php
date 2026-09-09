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
 * IMPORTANT — read this before relying on it: the extraction technique
 * below (mbasic.facebook.com's `video_redirect` links) is a
 * well-documented public technique, but this sandbox's network policy
 * cannot reach facebook.com, so it has been verified only against
 * synthetic fixture HTML that mirrors the documented markup shape
 * (tests/Unit/Processing/Providers/FacebookProviderTest.php), never
 * against a real, current Facebook response. Facebook is known to change
 * this markup without notice (see the Phase 7b research doc). This must
 * be tested against real public video/Reel URLs before being trusted in
 * production — treat it as "implemented and structurally tested," not
 * "verified working."
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

    public function __construct(
        private readonly HttpClientInterface $http,
        private readonly CacheStore $cache,
        private readonly InFlightLock $lock,
        private readonly int $priority = 10,
        // Both injectable only for tests, which can't reach the real host
        // (and a local test server is plain HTTP, not HTTPS) — production
        // code never has a reason to override either default.
        private readonly string $mbasicHost = 'mbasic.facebook.com',
        private readonly string $mbasicScheme = 'https',
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
        $fetchUrl = $this->toMbasicUrl($canonicalUrl);

        try {
            $response = $this->http->get($fetchUrl, ['Accept-Language' => 'en-US,en;q=0.9']);
        } catch (HttpRequestException $e) {
            throw new ProviderUnavailableException('Could not reach Facebook right now.', $e);
        }

        if ($this->looksLikeLoginWall($response->body)) {
            $savedAs = $this->saveRawResponseForDiagnosis($response->body);

            Logger::channel('processing')->warning('Facebook provider detected a login wall', [
                'url_hash' => hash('sha256', $url),
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
     * to a canonical facebook.com URL — neither has a matching mbasic
     * route of its own, so rewriting either straight onto mbasic (the
     * naive path-copy toMbasicUrl() does) fails with mbasic's generic
     * "Sorry, something went wrong" page instead of the actual content.
     * Both must be resolved to their real, canonical URL first — by
     * fetching the *original* (non-mbasic) URL and letting redirects run
     * their course — before that gets rewritten to mbasic.
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

    private function toMbasicUrl(string $url): string
    {
        $parts = parse_url($url);

        if ($parts === false) {
            throw new UpstreamRejectedException('This link could not be parsed.');
        }

        $rebuilt = $this->mbasicScheme . '://' . $this->mbasicHost . ($parts['path'] ?? '/');

        if (isset($parts['query'])) {
            $rebuilt .= '?' . $parts['query'];
        }

        return $rebuilt;
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
     * Looks for mbasic's `video_redirect` links, which historically
     * expose a direct video URL as a query-encoded `src` parameter (e.g.
     * `/video_redirect/?src=<url-encoded-mp4-url>...`). See this class's
     * docblock: this is a documented technique, unverified live in this
     * environment.
     *
     * @return array<string, string> quality label ('hd'|'sd') => direct URL
     */
    private function extractVideoCandidates(string $html): array
    {
        $candidates = [];

        if (preg_match_all('/href="(\/video_redirect\/\?[^"]+)"/i', $html, $matches) > 0) {
            foreach ($matches[1] as $index => $relativeLink) {
                $decoded = html_entity_decode($relativeLink, ENT_QUOTES | ENT_HTML5, 'UTF-8');
                $query = (string) parse_url($decoded, PHP_URL_QUERY);
                parse_str($query, $params);

                if (!isset($params['src']) || !is_string($params['src'])) {
                    continue;
                }

                $label = $this->guessQualityLabel($html, $relativeLink, (int) $index);
                $candidates[$label] = $params['src'];
            }
        }

        return $candidates;
    }

    private function guessQualityLabel(string $html, string $link, int $index): string
    {
        // The label text (e.g. "HD"/"SD") is the anchor's own text content,
        // which comes right after the closing `">` of the href we matched —
        // i.e. strictly *after* $link ends, never before it. Looking
        // backward risks bleeding into a neighboring link's own label when
        // two video_redirect links sit close together, which is exactly
        // what happened here before this was tested against a fixture with
        // two adjacent links.
        $position = strpos($html, $link);

        if ($position !== false) {
            $window = substr($html, $position + strlen($link), 40);

            if (stripos($window, '>HD<') !== false || stripos($window, 'HD Quality') !== false) {
                return 'hd';
            }

            if (stripos($window, '>SD<') !== false || stripos($window, 'SD Quality') !== false) {
                return 'sd';
            }
        }

        return $index === 0 ? 'hd' : 'sd';
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
