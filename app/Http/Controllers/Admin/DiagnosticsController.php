<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Request;
use App\Http\Response;
use App\Processing\Support\HttpClient;
use App\Processing\Support\HttpRequestException;

/**
 * Admin-only, session-gated equivalent of the old standalone
 * public/fb-diagnostic.php tool. Lives inside the application itself so
 * it rides the same autoloading, routing, and error handling that's
 * already proven to work in production — no separate file, no document
 * -root path guessing, no risk of an upload tool silently renaming it.
 * Reachable only by a logged-in administrator (AdminAuthMiddleware on
 * the route), so no separate secret key is needed here.
 */
final class DiagnosticsController
{
    public function facebook(Request $request): Response
    {
        $url = (string) $request->input('url', '');

        if ($url === '') {
            return Response::text("Usage: /admin/diagnostics/facebook?url=https://www.facebook.com/watch/?v=...\n");
        }

        $http = new HttpClient(timeoutSeconds: 8, connectTimeoutSeconds: 3, maxRetries: 0);

        $out = "=== Fetchpoint Facebook Diagnostic (admin route) ===\n\n";

        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        $canonicalUrl = $url;

        if (str_contains($host, 'fb.watch')) {
            $out .= "Detected fb.watch short link — resolving redirect...\n";

            try {
                $resolved = $http->get($url);
                $canonicalUrl = $resolved->effectiveUrl !== '' ? $resolved->effectiveUrl : $url;
                $out .= "Resolved to: {$canonicalUrl}\n\n";
            } catch (HttpRequestException $e) {
                $out .= "FAILED to resolve the fb.watch link: {$e->getMessage()}\n";

                return Response::text($out);
            }
        }

        $out .= "Fetching (exactly what FacebookProvider fetches): {$canonicalUrl}\n\n";

        try {
            $start = microtime(true);
            $response = $http->get($canonicalUrl, ['Accept-Language' => 'en-US,en;q=0.9']);
            $elapsedMs = (int) round((microtime(true) - $start) * 1000);
        } catch (HttpRequestException $e) {
            $out .= "FAILED — could not reach Facebook at all: {$e->getMessage()}\n";
            $out .= "=> This IS a connectivity problem, not a parsing problem.\n";

            return Response::text($out);
        }

        $out .= "HTTP status: {$response->status}\n";
        $out .= "Effective URL after redirects: {$response->effectiveUrl}\n";
        $out .= 'Response size: ' . strlen($response->body) . " bytes\n";
        $out .= "Elapsed: {$elapsedMs} ms\n\n";

        $loginSignals = ['You must log in to continue', 'log_in_to_continue', 'id="login_form"'];
        $matchedLoginSignal = null;
        foreach ($loginSignals as $signal) {
            if (stripos($response->body, $signal) !== false) {
                $matchedLoginSignal = $signal;
                break;
            }
        }
        $videoKeys = ['playable_url_quality_hd', 'browser_native_hd_url', 'playable_url', 'browser_native_sd_url'];
        $foundKeys = [];
        foreach ($videoKeys as $key) {
            if (preg_match('/"' . preg_quote($key, '/') . '"\s*:\s*"/', $response->body) === 1) {
                $foundKeys[] = $key;
            }
        }

        $out .= "--- Same checks FacebookProvider itself makes ---\n";
        $out .= 'Login-wall signal matched: ' . ($matchedLoginSignal !== null ? "YES ('{$matchedLoginSignal}')" : 'no') . "\n";
        $out .= 'Video URL keys found anywhere in the raw body: ' . ($foundKeys !== [] ? implode(', ', $foundKeys) : 'none') . "\n";

        if (preg_match('/<title>(.*?)<\/title>/is', $response->body, $m) === 1) {
            $out .= 'Page <title>: ' . trim($m[1]) . "\n";
        }

        $out .= "\n--- Additional diagnostic signals ---\n";
        $otherSignals = [
            'no longer available' => 'a "feature no longer available" message',
            'checkpoint' => 'a security/identity checkpoint page',
            'cookie' => 'a cookie-consent page',
            'consent' => 'a consent page',
            'video_redirect' => 'the string "video_redirect" ANYWHERE (not just as a live link)',
        ];
        foreach ($otherSignals as $needle => $label) {
            $out .= '  - ' . $label . ': ' . (stripos($response->body, $needle) !== false ? 'YES' : 'no') . "\n";
        }

        $showFull = $request->input('full') !== null;
        $out .= "\n--- " . ($showFull ? 'Full raw response' : 'First 3000 characters of the raw response (add &full=1 for everything)') . " ---\n";
        $out .= $showFull ? $response->body : substr($response->body, 0, 3000);

        return Response::text($out);
    }
}
