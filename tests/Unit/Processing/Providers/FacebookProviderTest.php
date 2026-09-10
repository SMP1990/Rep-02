<?php

declare(strict_types=1);

namespace Tests\Unit\Processing\Providers;

use App\Processing\Exceptions\ProviderUnavailableException;
use App\Processing\Exceptions\UpstreamRejectedException;
use App\Processing\Providers\FacebookProvider;
use App\Processing\Support\HttpClientInterface;
use App\Processing\Support\HttpRequestException;
use App\Processing\Support\HttpResponse;
use App\Processing\Support\InFlightLock;
use App\Support\CacheStore;
use PHPUnit\Framework\TestCase;

/**
 * These tests exercise FacebookProvider's parsing/decision logic against
 * synthetic fixture HTML built to mirror the shapes real facebook.com
 * pages have been observed embedding their video stream URLs in (see the
 * class docblock on FacebookProvider) — never against real Facebook,
 * since this sandbox's network policy can't reach facebook.com. Extraction
 * scans the raw HTML directly for `"key":"value"` occurrences of the
 * known key names (self::HD_KEYS / self::SD_KEYS), so it's indifferent to
 * whatever script tag or object-literal structure surrounds them —
 * production testing showed that structure varies (a
 * `<script type="application/json">` block in some cases, a plain
 * `<script>` tag invoking `(new ServerJS()).handle({...})` with a
 * JS-object-literal in others). These tests prove the parsing logic
 * behaves correctly against both observed shapes; they do NOT prove
 * Facebook's markup won't shift again. Real-world verification against
 * live public URLs is still required before this is trusted in
 * production.
 *
 * Every resolution now makes an extra "warm-up" request to the target
 * host's homepage first (to pick up baseline anonymous-visitor cookies —
 * see FacebookProvider::establishAnonymousVisitorCookies()), so most
 * tests here queue a generic fallback response *after* their specific
 * one: FakeHttpClient matches in registration order, so the specific,
 * longer pattern still wins for the actual content URL, and the warm-up
 * request (which never matches the specific pattern) falls through to
 * the generic one.
 */
final class FacebookProviderTest extends TestCase
{
    private const HTML_TWO_QUALITIES = <<<'HTML'
        <!DOCTYPE html>
        <html><head><title>Sample Cat Video</title></head>
        <body>
        <script type="application/json" data-sjs>{"require":[["ScheduledServerJS",[],[],{"__bbox":{"result":{"data":{"video":{"playable_url_quality_hd":"https:\/\/video.example.fbcdn.net\/hd.mp4?token=abc","playable_url":"https:\/\/video.example.fbcdn.net\/sd.mp4?token=abc"}}}}}]]}</script>
        </body></html>
        HTML;

    private const HTML_LOGIN_WALL = <<<'HTML'
        <!DOCTYPE html>
        <html><head><title>Log in to Facebook</title></head>
        <body><form id="login_form" action="/login/"><input name="email"></form></body></html>
        HTML;

    private const HTML_NO_VIDEO = <<<'HTML'
        <!DOCTYPE html>
        <html><head><title>Just a status update</title></head>
        <body><p>No video here.</p></body></html>
        HTML;

    public function testSupportsRecognizesFacebookHostsOnly(): void
    {
        $provider = $this->makeProvider();

        self::assertTrue($provider->supports('https://www.facebook.com/someone/videos/12345/'));
        self::assertTrue($provider->supports('https://facebook.com/reel/98765'));
        self::assertTrue($provider->supports('https://m.facebook.com/watch/?v=1'));
        self::assertTrue($provider->supports('https://fb.watch/abcDEF/'));
        self::assertFalse($provider->supports('https://www.instagram.com/reel/xyz/'));
        self::assertFalse($provider->supports('https://example.com/video.mp4'));
    }

    public function testFetchMetadataParsesTitleAndBothQualityOptions(): void
    {
        $http = new FakeHttpClient();
        $http->queue('facebook.com/someone/videos/12345', new HttpResponse(200, [], self::HTML_TWO_QUALITIES));
        $this->queueWarmup($http);

        $provider = $this->makeProvider($http);
        $result = $provider->fetchMetadata('https://www.facebook.com/someone/videos/12345/');

        self::assertTrue($result->success);
        self::assertSame('Sample Cat Video', $result->title);
        self::assertSame('facebook', $result->sourcePlatform);
        self::assertCount(2, $result->options);
        self::assertSame('hd', $result->options[0]->id);
        self::assertSame('sd', $result->options[1]->id);
    }

    public function testFetchMetadataRequestsTheCanonicalUrlDirectlyNotAnyRewrittenOne(): void
    {
        $http = new FakeHttpClient();
        $http->queue('facebook.com/someone/videos/12345', new HttpResponse(200, [], self::HTML_TWO_QUALITIES));
        $this->queueWarmup($http);

        $provider = $this->makeProvider($http);
        $provider->fetchMetadata('https://www.facebook.com/someone/videos/12345/');

        self::assertCount(2, $http->requestedUrls, 'one warm-up request, then the actual content request');
        self::assertSame('https://www.facebook.com/', $http->requestedUrls[0]);
        self::assertSame('https://www.facebook.com/someone/videos/12345/', $http->requestedUrls[1]);
    }

    public function testLoginWallIsRejectedNotBypassed(): void
    {
        $http = new FakeHttpClient();
        $http->queue('facebook.com/private/videos/1', new HttpResponse(200, [], self::HTML_LOGIN_WALL));
        $this->queueWarmup($http);

        $provider = $this->makeProvider($http);

        $this->expectException(UpstreamRejectedException::class);
        $provider->fetchMetadata('https://www.facebook.com/private/videos/1/');
    }

    public function testLoginWallAlsoSavesTheRawResponseForDiagnosis(): void
    {
        $logDirectory = dirname(__DIR__, 4) . '/storage/logs';
        foreach (glob($logDirectory . '/facebook-raw-*.html') ?: [] as $stale) {
            unlink($stale);
        }

        $http = new FakeHttpClient();
        $http->queue('facebook.com/private/videos/1', new HttpResponse(200, [], self::HTML_LOGIN_WALL));
        $this->queueWarmup($http);

        $provider = $this->makeProvider($http);

        try {
            $provider->fetchMetadata('https://www.facebook.com/private/videos/1/');
        } catch (UpstreamRejectedException) {
            // expected — the save happens before this is thrown
        }

        $saved = glob($logDirectory . '/facebook-raw-*.html') ?: [];
        self::assertCount(1, $saved);
        self::assertSame(self::HTML_LOGIN_WALL, file_get_contents($saved[0]));

        unlink($saved[0]);
    }

    public function testNonSuccessStatusAlsoSavesTheRawResponseForDiagnosis(): void
    {
        $logDirectory = dirname(__DIR__, 4) . '/storage/logs';
        foreach (glob($logDirectory . '/facebook-raw-*.html') ?: [] as $stale) {
            unlink($stale);
        }

        $http = new FakeHttpClient();
        $http->queue('facebook.com/someone/videos/2', new HttpResponse(403, [], '<html>blocked</html>'));
        $this->queueWarmup($http);

        $provider = $this->makeProvider($http);

        try {
            $provider->fetchMetadata('https://www.facebook.com/someone/videos/2/');
        } catch (UpstreamRejectedException) {
            // expected — the save happens before this is thrown
        }

        $saved = glob($logDirectory . '/facebook-raw-*.html') ?: [];
        self::assertCount(1, $saved);
        self::assertSame('<html>blocked</html>', file_get_contents($saved[0]));

        unlink($saved[0]);
    }

    public function testNoVideoFoundIsRejected(): void
    {
        $http = new FakeHttpClient();
        $http->queue('facebook.com/someone/posts/999', new HttpResponse(200, [], self::HTML_NO_VIDEO));
        $this->queueWarmup($http);

        $provider = $this->makeProvider($http);

        $this->expectException(UpstreamRejectedException::class);
        $provider->fetchMetadata('https://www.facebook.com/someone/posts/999/');
    }

    public function testNoVideoFoundSavesTheRawResponseForDiagnosis(): void
    {
        $logDirectory = dirname(__DIR__, 4) . '/storage/logs';
        foreach (glob($logDirectory . '/facebook-raw-*.html') ?: [] as $stale) {
            unlink($stale);
        }

        $http = new FakeHttpClient();
        $http->queue('facebook.com/someone/posts/999', new HttpResponse(200, [], self::HTML_NO_VIDEO));
        $this->queueWarmup($http);

        $provider = $this->makeProvider($http);

        try {
            $provider->fetchMetadata('https://www.facebook.com/someone/posts/999/');
        } catch (UpstreamRejectedException) {
            // expected — the save happens before this is thrown
        }

        $saved = glob($logDirectory . '/facebook-raw-*.html') ?: [];
        self::assertCount(1, $saved);
        self::assertSame(self::HTML_NO_VIDEO, file_get_contents($saved[0]));

        unlink($saved[0]);
    }

    public function testJsonBlocksThatDoNotMentionVideoKeysAreIgnored(): void
    {
        $html = <<<'HTML'
            <!DOCTYPE html>
            <html><head><title>Unrelated state</title></head>
            <body>
            <script type="application/json" data-sjs>{"some_unrelated_state":{"count":42,"nested":{"more":"stuff"}}}</script>
            </body></html>
            HTML;

        $http = new FakeHttpClient();
        $http->queue('facebook.com/someone/posts/1000', new HttpResponse(200, [], $html));
        $this->queueWarmup($http);

        $provider = $this->makeProvider($http);

        $this->expectException(UpstreamRejectedException::class);
        $provider->fetchMetadata('https://www.facebook.com/someone/posts/1000/');
    }

    public function testFallsBackToBrowserNativeKeysWhenPlayableUrlKeysAreAbsent(): void
    {
        $html = <<<'HTML'
            <!DOCTYPE html>
            <html><head><title>Native keys video</title></head>
            <body>
            <script type="application/json" data-sjs>{"__bbox":{"result":{"data":{"video":{"browser_native_hd_url":"https:\/\/video.example.fbcdn.net\/native-hd.mp4","browser_native_sd_url":"https:\/\/video.example.fbcdn.net\/native-sd.mp4"}}}}}</script>
            </body></html>
            HTML;

        $http = new FakeHttpClient();
        $http->queue('facebook.com/someone/videos/native', new HttpResponse(200, [], $html));
        $this->queueWarmup($http);

        $provider = $this->makeProvider($http);
        $result = $provider->fetchMetadata('https://www.facebook.com/someone/videos/native/');

        self::assertCount(2, $result->options);
        $urlById = [];
        foreach ($result->options as $option) {
            $urlById[$option->id] = $option;
        }
        self::assertArrayHasKey('hd', $urlById);
        self::assertArrayHasKey('sd', $urlById);
    }

    public function testFindsVideoUrlsEmbeddedOutsideAnyJsonScriptTag(): void
    {
        // Mirrors a real fetched Reel page from production testing: the
        // video data lives inside a plain <script> tag invoking
        // `(new ServerJS()).handle({...})` with a JavaScript object
        // literal — unquoted outer keys (clpData:, gkxData:, __bbox:) —
        // not inside a <script type="application/json"> block at all.
        // The leaf values are still proper double-quoted JSON strings.
        $html = <<<'HTML'
            <!DOCTYPE html>
            <html><head><title>Reel by Someone</title></head>
            <body>
            <script nonce="uxuDPMPE">requireLazy(["TimeSliceImpl","ServerJS"],function(TimeSlice,ServerJS){(new ServerJS()).handle({require:[["ScheduledServerJS",[],[],{clpData:{},gkxData:{},__bbox:{result:{data:{initial:{"playable_url_quality_hd":"https:\/\/video-cgk1-2.xx.fbcdn.net\/reel-hd.mp4?oh=abc&oe=def","playable_url":"https:\/\/video-cgk1-2.xx.fbcdn.net\/reel-sd.mp4?oh=abc&oe=def"}}}}}]]},"consistency")});</script>
            </body></html>
            HTML;

        $http = new FakeHttpClient();
        $http->queue('facebook.com/reel/998877', new HttpResponse(200, [], $html));
        $this->queueWarmup($http);

        $provider = $this->makeProvider($http);
        $metadata = $provider->fetchMetadata('https://www.facebook.com/reel/998877/');

        self::assertTrue($metadata->success);
        self::assertCount(2, $metadata->options);

        $hdResult = $provider->process('https://www.facebook.com/reel/998877/', 'hd');
        self::assertSame('https://video-cgk1-2.xx.fbcdn.net/reel-hd.mp4?oh=abc&oe=def', $hdResult->output->url);

        $sdResult = $provider->process('https://www.facebook.com/reel/998877/', 'sd');
        self::assertSame('https://video-cgk1-2.xx.fbcdn.net/reel-sd.mp4?oh=abc&oe=def', $sdResult->output->url);
    }

    public function testThumbnailIsExtractedFromOpenGraphMetaTag(): void
    {
        $html = <<<'HTML'
            <!DOCTYPE html>
            <html><head><title>Sample Cat Video</title>
            <meta property="og:image" content="https://scontent.example.fbcdn.net/thumb.jpg">
            </head>
            <body>
            <script type="application/json" data-sjs>{"playable_url_quality_hd":"https:\/\/video.example.fbcdn.net\/hd.mp4","playable_url":"https:\/\/video.example.fbcdn.net\/sd.mp4"}</script>
            </body></html>
            HTML;

        $http = new FakeHttpClient();
        $http->queue('facebook.com/someone/videos/thumb', new HttpResponse(200, [], $html));
        $this->queueWarmup($http);

        $provider = $this->makeProvider($http);
        $result = $provider->fetchMetadata('https://www.facebook.com/someone/videos/thumb/');

        self::assertSame('https://scontent.example.fbcdn.net/thumb.jpg', $result->thumbnailUrl);
    }

    public function testTitleStripsTrailingFacebookSuffix(): void
    {
        $html = <<<'HTML'
            <!DOCTYPE html>
            <html><head><title>Sample Cat Video | Facebook</title></head>
            <body>
            <script type="application/json" data-sjs>{"playable_url_quality_hd":"https:\/\/video.example.fbcdn.net\/hd.mp4","playable_url":"https:\/\/video.example.fbcdn.net\/sd.mp4"}</script>
            </body></html>
            HTML;

        $http = new FakeHttpClient();
        $http->queue('facebook.com/someone/videos/suffix', new HttpResponse(200, [], $html));
        $this->queueWarmup($http);

        $provider = $this->makeProvider($http);
        $result = $provider->fetchMetadata('https://www.facebook.com/someone/videos/suffix/');

        self::assertSame('Sample Cat Video', $result->title);
    }

    public function testLoginFormWidgetDoesNotBlockAPageThatAlsoCarriesVideoData(): void
    {
        $html = <<<'HTML'
            <!DOCTYPE html>
            <html><head><title>Sample Cat Video</title></head>
            <body>
            <form id="login_form" action="/login/"><input name="email"></form>
            <script type="application/json" data-sjs>{"playable_url_quality_hd":"https:\/\/video.example.fbcdn.net\/hd.mp4","playable_url":"https:\/\/video.example.fbcdn.net\/sd.mp4"}</script>
            </body></html>
            HTML;

        $http = new FakeHttpClient();
        $http->queue('facebook.com/someone/videos/nagbanner', new HttpResponse(200, [], $html));
        $this->queueWarmup($http);

        $provider = $this->makeProvider($http);
        $result = $provider->fetchMetadata('https://www.facebook.com/someone/videos/nagbanner/');

        self::assertTrue($result->success);
        self::assertCount(2, $result->options);
    }

    public function testFallsBackToTheMobileHostWhenTheCanonicalPageHasNoVideoData(): void
    {
        $http = new FakeHttpClient();
        // Registration order matters for FakeHttpClient's first-match scan
        // — these two specific patterns don't overlap ("www.facebook.com"
        // never contains the substring "m.facebook.com"), so either order
        // is safe, but both must come before the generic warm-up pattern.
        $http->queue('m.facebook.com/someone/videos/mobile-fallback', new HttpResponse(200, [], self::HTML_TWO_QUALITIES));
        $http->queue('facebook.com/someone/videos/mobile-fallback', new HttpResponse(200, [], self::HTML_NO_VIDEO));
        $this->queueWarmup($http);

        $provider = $this->makeProvider($http);
        $result = $provider->fetchMetadata('https://www.facebook.com/someone/videos/mobile-fallback/');

        self::assertTrue($result->success);
        self::assertCount(2, $result->options);
        self::assertCount(3, $http->requestedUrls, 'warm-up, canonical (no video), then mobile-host fallback (found it)');
    }

    public function testFallsBackToLegacyUnquotedKeysWhenModernKeysAreAbsent(): void
    {
        // Older Facebook markup generations have used hd_src/sd_src as
        // unquoted keys inside a JS object literal, rather than the
        // modern quoted playable_url/browser_native_* names.
        $html = <<<'HTML'
            <!DOCTYPE html>
            <html><head><title>Legacy key video</title></head>
            <body>
            <script>window.__data = {video: {hd_src:"https:\/\/video.example.fbcdn.net\/legacy-hd.mp4",sd_src:"https:\/\/video.example.fbcdn.net\/legacy-sd.mp4"}};</script>
            </body></html>
            HTML;

        $http = new FakeHttpClient();
        $http->queue('facebook.com/someone/videos/legacy', new HttpResponse(200, [], $html));
        $this->queueWarmup($http);

        $provider = $this->makeProvider($http);
        $result = $provider->fetchMetadata('https://www.facebook.com/someone/videos/legacy/');

        self::assertCount(2, $result->options);

        $hdResult = $provider->process('https://www.facebook.com/someone/videos/legacy/', 'hd');
        self::assertSame('https://video.example.fbcdn.net/legacy-hd.mp4', $hdResult->output->url);

        $sdResult = $provider->process('https://www.facebook.com/someone/videos/legacy/', 'sd');
        self::assertSame('https://video.example.fbcdn.net/legacy-sd.mp4', $sdResult->output->url);
    }

    public function testTransientHttpFailureBecomesProviderUnavailable(): void
    {
        $http = new FakeHttpClient();
        $http->queue('facebook.com/someone/videos/12345', new HttpRequestException('connection reset'));
        $this->queueWarmup($http);

        $provider = $this->makeProvider($http);

        $this->expectException(ProviderUnavailableException::class);
        $provider->fetchMetadata('https://www.facebook.com/someone/videos/12345/');
    }

    public function testProcessReturnsTheChosenQualityAsOutput(): void
    {
        $http = new FakeHttpClient();
        $http->queue('facebook.com/someone/videos/12345', new HttpResponse(200, [], self::HTML_TWO_QUALITIES));
        $this->queueWarmup($http);

        $provider = $this->makeProvider($http);
        $result = $provider->process('https://www.facebook.com/someone/videos/12345/', 'sd');

        self::assertNotNull($result->output);
        self::assertSame('redirect_url', $result->output->deliveryMethod);
        self::assertSame('https://video.example.fbcdn.net/sd.mp4?token=abc', $result->output->url);
        self::assertSame('video/mp4', $result->output->mimeType);
        self::assertStringEndsWith('.mp4', (string) $result->output->filename);
    }

    public function testProcessRejectsAnUnknownOptionId(): void
    {
        $http = new FakeHttpClient();
        $http->queue('facebook.com/someone/videos/12345', new HttpResponse(200, [], self::HTML_TWO_QUALITIES));
        $this->queueWarmup($http);

        $provider = $this->makeProvider($http);

        $this->expectException(UpstreamRejectedException::class);
        $provider->process('https://www.facebook.com/someone/videos/12345/', 'does-not-exist');
    }

    public function testSecondCallForTheSameUrlUsesTheCacheInsteadOfRefetching(): void
    {
        $http = new FakeHttpClient();
        $http->queue('facebook.com/someone/videos/12345', new HttpResponse(200, [], self::HTML_TWO_QUALITIES));
        $this->queueWarmup($http);

        $provider = $this->makeProvider($http);
        $provider->fetchMetadata('https://www.facebook.com/someone/videos/12345/');
        $provider->fetchMetadata('https://www.facebook.com/someone/videos/12345/');

        self::assertCount(2, $http->requestedUrls, 'second call should be served from cache — only the first call\'s warm-up + content requests happen');
    }

    public function testFbWatchLinksAreResolvedToTheirCanonicalUrlBeforeFetching(): void
    {
        $http = new FakeHttpClient();
        $http->queue(
            'fb.watch',
            new HttpResponse(200, [], '', effectiveUrl: 'https://www.facebook.com/someone/videos/555/'),
        );
        $http->queue('facebook.com/someone/videos/555', new HttpResponse(200, [], self::HTML_TWO_QUALITIES));
        $this->queueWarmup($http);

        $provider = $this->makeProvider($http);
        $provider->fetchMetadata('https://fb.watch/abcDEF/');

        self::assertCount(3, $http->requestedUrls, 'short-link resolve, then warm-up, then the actual content request');
        self::assertStringContainsString('fb.watch', $http->requestedUrls[0]);
        self::assertSame('https://www.facebook.com/', $http->requestedUrls[1]);
        self::assertSame('https://www.facebook.com/someone/videos/555/', $http->requestedUrls[2]);
    }

    public function testShareLinksAreResolvedToTheirCanonicalUrlBeforeFetching(): void
    {
        $http = new FakeHttpClient();
        $http->queue(
            'web.facebook.com/share/v/',
            new HttpResponse(200, [], '', effectiveUrl: 'https://www.facebook.com/someone/videos/555/'),
        );
        $http->queue('facebook.com/someone/videos/555', new HttpResponse(200, [], self::HTML_TWO_QUALITIES));
        $this->queueWarmup($http);

        $provider = $this->makeProvider($http);
        $provider->fetchMetadata('https://web.facebook.com/share/v/1HGxDqQqVT/');

        self::assertCount(3, $http->requestedUrls, 'short-link resolve, then warm-up, then the actual content request');
        self::assertStringContainsString('/share/v/', $http->requestedUrls[0]);
        self::assertSame('https://www.facebook.com/', $http->requestedUrls[1]);
        self::assertSame('https://www.facebook.com/someone/videos/555/', $http->requestedUrls[2]);
    }

    public function testWhenAnotherProcessIsAlreadyResolvingTheSameUrlItWaitsThenFallsBackToItsOwnFetchIfStillUncached(): void
    {
        $http = new FakeHttpClient();
        $http->queue('facebook.com/someone/videos/777', new HttpResponse(200, [], self::HTML_TWO_QUALITIES));
        $this->queueWarmup($http);

        $lockDir = sys_get_temp_dir() . '/fetchpoint-fb-lock-test-' . uniqid('', true);
        $url = 'https://www.facebook.com/someone/videos/777/';
        $cacheKey = 'facebook:extract:' . hash('sha256', $url);

        // Simulate a concurrent "leader" already holding the coalescing
        // lock for this exact URL (see InFlightLockTest for why a second
        // file handle behaves like a separate process would).
        if (!is_dir($lockDir)) {
            mkdir($lockDir, 0755, true);
        }
        $lockPath = $lockDir . '/' . hash('sha256', $cacheKey) . '.lock';
        $externalHandle = fopen($lockPath, 'c');
        self::assertNotFalse($externalHandle);
        self::assertTrue(flock($externalHandle, LOCK_EX));

        $provider = new FacebookProvider(
            $http,
            new InMemoryCacheStore(),
            new InFlightLock($lockDir, waitTimeoutSeconds: 1, pollIntervalMicroseconds: 50_000),
        );

        $result = $provider->fetchMetadata($url);

        flock($externalHandle, LOCK_UN);
        fclose($externalHandle);

        self::assertTrue($result->success, 'should still succeed via its own independent fetch after giving up waiting');
        self::assertCount(2, $http->requestedUrls, 'gave up waiting and fetched independently (warm-up + content) since no leader ever populated the cache');
    }

    private function queueWarmup(FakeHttpClient $http): void
    {
        $http->queue('facebook.com', new HttpResponse(200, [], ''));
    }

    private function makeProvider(?HttpClientInterface $http = null): FacebookProvider
    {
        return new FacebookProvider(
            $http ?? new FakeHttpClient(),
            new InMemoryCacheStore(),
            new InFlightLock(sys_get_temp_dir() . '/fetchpoint-fb-lock-test-' . uniqid('', true)),
        );
    }
}

final class FakeHttpClient implements HttpClientInterface
{
    /** @var array<int, array{pattern: string, result: HttpResponse|HttpRequestException}> */
    private array $queue = [];

    /** @var string[] */
    public array $requestedUrls = [];

    public function queue(string $urlPattern, HttpResponse|HttpRequestException $result): void
    {
        $this->queue[] = ['pattern' => $urlPattern, 'result' => $result];
    }

    public function get(string $url, array $headers = [], ?string $cookieJarPath = null): HttpResponse
    {
        $this->requestedUrls[] = $url;

        return $this->resolve($url);
    }

    public function head(string $url, array $headers = []): HttpResponse
    {
        $this->requestedUrls[] = $url;

        return $this->resolve($url);
    }

    private function resolve(string $url): HttpResponse
    {
        foreach ($this->queue as $entry) {
            if (str_contains($url, $entry['pattern'])) {
                if ($entry['result'] instanceof HttpRequestException) {
                    throw $entry['result'];
                }

                return $entry['result'];
            }
        }

        throw new \RuntimeException("FakeHttpClient: no response queued matching {$url}");
    }
}

final class InMemoryCacheStore implements CacheStore
{
    private array $store = [];

    public function get(string $key): mixed
    {
        return $this->store[$key] ?? null;
    }

    public function set(string $key, mixed $value, int $ttlSeconds): void
    {
        $this->store[$key] = $value;
    }

    public function delete(string $key): void
    {
        unset($this->store[$key]);
    }
}
