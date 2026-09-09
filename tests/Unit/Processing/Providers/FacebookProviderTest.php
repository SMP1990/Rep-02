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
 * synthetic fixture HTML built to mirror the documented mbasic.facebook.com
 * markup shape (see the class docblock on FacebookProvider) — never
 * against real Facebook, since this sandbox's network policy can't reach
 * facebook.com. They prove the parsing logic behaves correctly against
 * that shape; they do NOT prove Facebook's real, current markup still
 * matches it. Real-world verification against live public URLs is still
 * required before this is trusted in production.
 */
final class FacebookProviderTest extends TestCase
{
    private const HTML_TWO_QUALITIES = <<<'HTML'
        <!DOCTYPE html>
        <html><head><title>Sample Cat Video</title></head>
        <body>
        <div id="video_container">
        <a href="/video_redirect/?src=https%3A%2F%2Fvideo.example.fbcdn.net%2Fhd.mp4%3Ftoken%3Dabc&fb">HD</a>
        <a href="/video_redirect/?src=https%3A%2F%2Fvideo.example.fbcdn.net%2Fsd.mp4%3Ftoken%3Dabc&fb">SD</a>
        </div>
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
        $http->queue('mbasic.facebook.com', new HttpResponse(200, [], self::HTML_TWO_QUALITIES));

        $provider = $this->makeProvider($http);
        $result = $provider->fetchMetadata('https://www.facebook.com/someone/videos/12345/');

        self::assertTrue($result->success);
        self::assertSame('Sample Cat Video', $result->title);
        self::assertSame('facebook', $result->sourcePlatform);
        self::assertCount(2, $result->options);
        self::assertSame('hd', $result->options[0]->id);
        self::assertSame('sd', $result->options[1]->id);
    }

    public function testFetchMetadataRequestsTheMbasicRewrittenUrl(): void
    {
        $http = new FakeHttpClient();
        $http->queue('mbasic.facebook.com', new HttpResponse(200, [], self::HTML_TWO_QUALITIES));

        $provider = $this->makeProvider($http);
        $provider->fetchMetadata('https://www.facebook.com/someone/videos/12345/');

        self::assertCount(1, $http->requestedUrls);
        self::assertStringStartsWith('https://mbasic.facebook.com/someone/videos/12345/', $http->requestedUrls[0]);
    }

    public function testLoginWallIsRejectedNotBypassed(): void
    {
        $http = new FakeHttpClient();
        $http->queue('mbasic.facebook.com', new HttpResponse(200, [], self::HTML_LOGIN_WALL));

        $provider = $this->makeProvider($http);

        $this->expectException(UpstreamRejectedException::class);
        $provider->fetchMetadata('https://www.facebook.com/private/videos/1/');
    }

    public function testNoVideoFoundIsRejected(): void
    {
        $http = new FakeHttpClient();
        $http->queue('mbasic.facebook.com', new HttpResponse(200, [], self::HTML_NO_VIDEO));

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
        $http->queue('mbasic.facebook.com', new HttpResponse(200, [], self::HTML_NO_VIDEO));

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

    public function testTransientHttpFailureBecomesProviderUnavailable(): void
    {
        $http = new FakeHttpClient();
        $http->queue('mbasic.facebook.com', new HttpRequestException('connection reset'));

        $provider = $this->makeProvider($http);

        $this->expectException(ProviderUnavailableException::class);
        $provider->fetchMetadata('https://www.facebook.com/someone/videos/12345/');
    }

    public function testProcessReturnsTheChosenQualityAsOutput(): void
    {
        $http = new FakeHttpClient();
        $http->queue('mbasic.facebook.com', new HttpResponse(200, [], self::HTML_TWO_QUALITIES));

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
        $http->queue('mbasic.facebook.com', new HttpResponse(200, [], self::HTML_TWO_QUALITIES));

        $provider = $this->makeProvider($http);

        $this->expectException(UpstreamRejectedException::class);
        $provider->process('https://www.facebook.com/someone/videos/12345/', 'does-not-exist');
    }

    public function testSecondCallForTheSameUrlUsesTheCacheInsteadOfRefetching(): void
    {
        $http = new FakeHttpClient();
        $http->queue('mbasic.facebook.com', new HttpResponse(200, [], self::HTML_TWO_QUALITIES));

        $provider = $this->makeProvider($http);
        $provider->fetchMetadata('https://www.facebook.com/someone/videos/12345/');
        $provider->fetchMetadata('https://www.facebook.com/someone/videos/12345/');

        self::assertCount(1, $http->requestedUrls, 'second call should be served from cache, not re-fetched');
    }

    public function testFbWatchLinksAreResolvedToTheirCanonicalUrlBeforeRewriting(): void
    {
        $http = new FakeHttpClient();
        $http->queue(
            'fb.watch',
            new HttpResponse(200, [], '', effectiveUrl: 'https://www.facebook.com/someone/videos/555/'),
        );
        $http->queue('mbasic.facebook.com', new HttpResponse(200, [], self::HTML_TWO_QUALITIES));

        $provider = $this->makeProvider($http);
        $provider->fetchMetadata('https://fb.watch/abcDEF/');

        self::assertCount(2, $http->requestedUrls);
        self::assertStringContainsString('fb.watch', $http->requestedUrls[0]);
        self::assertStringStartsWith('https://mbasic.facebook.com/someone/videos/555/', $http->requestedUrls[1]);
    }

    public function testWhenAnotherProcessIsAlreadyResolvingTheSameUrlItWaitsThenFallsBackToItsOwnFetchIfStillUncached(): void
    {
        $http = new FakeHttpClient();
        $http->queue('mbasic.facebook.com', new HttpResponse(200, [], self::HTML_TWO_QUALITIES));

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
        self::assertCount(1, $http->requestedUrls, 'gave up waiting and fetched independently since no leader ever populated the cache');
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

    public function get(string $url, array $headers = []): HttpResponse
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
