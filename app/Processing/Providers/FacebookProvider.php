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
 */
final class FacebookProvider implements ProcessingProvider
{
    private const CACHE_TTL_SECONDS = 300;

    public function __construct(
        private readonly HttpClientInterface $http,
        private readonly CacheStore $cache,
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
        $cacheKey = 'facebook:extract:' . hash('sha256', $url);
        $cached = $this->cache->get($cacheKey);

        if (is_array($cached) && isset($cached['options'])) {
            /** @var array{title: ?string, options: array<int, array{id: string, label: string, url: string}>} $cached */
            return $cached;
        }

        $canonicalUrl = $this->resolveCanonicalUrl($url);
        $fetchUrl = $this->toMbasicUrl($canonicalUrl);

        try {
            $response = $this->http->get($fetchUrl, ['Accept-Language' => 'en-US,en;q=0.9']);
        } catch (HttpRequestException $e) {
            throw new ProviderUnavailableException('Could not reach Facebook right now.', $e);
        }

        if ($this->looksLikeLoginWall($response->body)) {
            throw new UpstreamRejectedException(
                'This video is private, restricted, or requires logging in, so it cannot be processed.',
            );
        }

        if (!$response->isSuccessful()) {
            throw new UpstreamRejectedException('This content is unavailable, private, or has been removed.');
        }

        $title = $this->extractTitle($response->body);
        $candidates = $this->extractVideoCandidates($response->body);

        if ($candidates === []) {
            Logger::channel('processing')->warning('Facebook provider found no video candidates', [
                'url_hash' => hash('sha256', $url),
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
     * fb.watch is a short-link redirector to a canonical facebook.com URL
     * — resolve it before rewriting to mbasic, since mbasic doesn't proxy
     * fb.watch links directly.
     */
    private function resolveCanonicalUrl(string $url): string
    {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));

        if (!str_contains($host, 'fb.watch')) {
            return $url;
        }

        try {
            $response = $this->http->get($url);
        } catch (HttpRequestException $e) {
            throw new ProviderUnavailableException('Could not resolve this fb.watch link.', $e);
        }

        return $response->effectiveUrl !== '' ? $response->effectiveUrl : $url;
    }

    private function toMbasicUrl(string $url): string
    {
        $parts = parse_url($url);

        if ($parts === false) {
            throw new UpstreamRejectedException('This link could not be parsed.');
        }

        $rebuilt = 'https://mbasic.facebook.com' . ($parts['path'] ?? '/');

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

    private function slugFilename(?string $title): string
    {
        $base = ($title !== null && $title !== '') ? $title : 'facebook-video';
        $slug = preg_replace('/[^a-zA-Z0-9]+/', '-', $base) ?? 'facebook-video';
        $slug = trim($slug, '-');
        $slug = $slug !== '' ? $slug : 'facebook-video';

        return strtolower(mb_substr($slug, 0, 80));
    }
}
