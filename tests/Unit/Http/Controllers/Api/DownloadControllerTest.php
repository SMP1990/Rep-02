<?php

declare(strict_types=1);

namespace Tests\Unit\Http\Controllers\Api;

use App\Http\Controllers\Api\DownloadController;
use App\Http\Request;
use PHPUnit\Framework\TestCase;

/**
 * Only exercises the synchronous rejection path (an upstream host outside
 * the fbcdn.net allowlist) — the actual streaming path needs a real
 * network call to Facebook's CDN, which this sandbox's network policy
 * can't make (same constraint as FacebookProviderTest). That path is
 * verified in production instead.
 */
final class DownloadControllerTest extends TestCase
{
    protected function tearDown(): void
    {
        $_GET = [];
        $_POST = [];
    }

    public function testRejectsAUrlOnAHostOutsideTheFbcdnAllowlist(): void
    {
        $request = $this->makeGetRequest(['url' => 'https://evil.example.com/video.mp4']);

        $response = (new DownloadController())($request);

        self::assertSame(422, $response->status());
    }

    public function testRejectsAPlainHttpUrlEvenOnAnAllowedHost(): void
    {
        $request = $this->makeGetRequest(['url' => 'http://video-cgk1-2.xx.fbcdn.net/video.mp4']);

        $response = (new DownloadController())($request);

        self::assertSame(422, $response->status());
    }

    public function testRejectsAMissingUrl(): void
    {
        $request = $this->makeGetRequest([]);

        $response = (new DownloadController())($request);

        self::assertSame(422, $response->status());
    }

    public function testRejectsAHostThatMerelyContainsFbcdnNetAsASubstring(): void
    {
        // e.g. "fbcdn.net.evil.example.com" or "notfbcdn.net" must not
        // pass a naive str_contains-style check.
        $request = $this->makeGetRequest(['url' => 'https://fbcdn.net.evil.example.com/video.mp4']);

        $response = (new DownloadController())($request);

        self::assertSame(422, $response->status());
    }

    /** @param array<string, string> $query */
    private function makeGetRequest(array $query): Request
    {
        $_GET = $query;
        $_POST = [];
        $_SERVER['REQUEST_METHOD'] = 'GET';
        $_SERVER['REQUEST_URI'] = '/api/v1/download';

        return Request::fromGlobals();
    }
}
