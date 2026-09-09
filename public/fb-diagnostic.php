<?php

declare(strict_types=1);

/**
 * TEMPORARY web-accessible diagnostic tool — for exactly the situation
 * where neither SSH nor Cron Jobs are available. Upload this one file
 * into public/ (alongside index.php), visit it in your browser, then
 * DELETE IT from the server the moment you're done. It is not part of
 * the application, is never linked to from anywhere in the app itself,
 * and does nothing unless visited with the correct key below.
 *
 * BEFORE UPLOADING: change $SECRET to a value only you know.
 *
 * Usage in your browser:
 *   https://yourdomain.com/fb-diagnostic.php?key=YOUR_SECRET&url=https://www.facebook.com/watch/?v=...
 *
 * Add &full=1 to see the entire raw response instead of just a preview.
 */

$SECRET = 'change-me-before-uploading';

header('Content-Type: text/plain; charset=utf-8');

if ($SECRET === 'change-me-before-uploading') {
    http_response_code(403);
    echo "You forgot to change \$SECRET in this file before uploading it. Edit the file, set a real secret, re-upload.\n";
    exit;
}

if (($_GET['key'] ?? '') !== $SECRET) {
    http_response_code(403);
    echo "Forbidden.\n";
    exit;
}

$url = $_GET['url'] ?? null;

if ($url === null || $url === '') {
    echo "Usage: ?key=YOUR_SECRET&url=https://www.facebook.com/watch/?v=...\n";
    exit;
}

$root = dirname(__DIR__);

require $root . '/app/Processing/Support/HttpResponse.php';
require $root . '/app/Processing/Support/HttpRequestException.php';
require $root . '/app/Processing/Support/HttpClientInterface.php';
require $root . '/app/Processing/Support/HttpClient.php';

use App\Processing\Support\HttpClient;
use App\Processing\Support\HttpRequestException;

function toMbasicUrl(string $url): string
{
    $parts = parse_url($url);
    $rebuilt = 'https://mbasic.facebook.com' . ($parts['path'] ?? '/');

    if (isset($parts['query'])) {
        $rebuilt .= '?' . $parts['query'];
    }

    return $rebuilt;
}

echo "=== Fetchpoint Facebook Diagnostic (web mode) ===\n";
echo "REMINDER: delete public/fb-diagnostic.php from the server when you're done.\n\n";

$http = new HttpClient(timeoutSeconds: 15, connectTimeoutSeconds: 5);

$host = strtolower((string) parse_url($url, PHP_URL_HOST));
$canonicalUrl = $url;

if (str_contains($host, 'fb.watch')) {
    echo "Detected fb.watch short link — resolving redirect...\n";

    try {
        $resolved = $http->get($url);
        $canonicalUrl = $resolved->effectiveUrl !== '' ? $resolved->effectiveUrl : $url;
        echo "Resolved to: {$canonicalUrl}\n\n";
    } catch (HttpRequestException $e) {
        echo "FAILED to resolve the fb.watch link: {$e->getMessage()}\n";
        exit;
    }
}

$fetchUrl = toMbasicUrl($canonicalUrl);
echo "Fetching (exactly what FacebookProvider fetches): {$fetchUrl}\n\n";

try {
    $start = microtime(true);
    $response = $http->get($fetchUrl, ['Accept-Language' => 'en-US,en;q=0.9']);
    $elapsedMs = (int) round((microtime(true) - $start) * 1000);
} catch (HttpRequestException $e) {
    echo "FAILED — could not reach Facebook at all: {$e->getMessage()}\n";
    echo "=> This IS a connectivity problem, not a parsing problem.\n";
    exit;
}

echo "HTTP status: {$response->status}\n";
echo "Effective URL after redirects: {$response->effectiveUrl}\n";
echo 'Response size: ' . strlen($response->body) . " bytes\n";
echo "Elapsed: {$elapsedMs} ms\n\n";

$loginSignals = ['You must log in to continue', 'log_in_to_continue', 'id="login_form"'];
$matchedLoginSignal = null;
foreach ($loginSignals as $signal) {
    if (stripos($response->body, $signal) !== false) {
        $matchedLoginSignal = $signal;
        break;
    }
}
$videoRedirectCount = preg_match_all('/href="(\/video_redirect\/\?[^"]+)"/i', $response->body);

echo "--- Same checks FacebookProvider itself makes ---\n";
echo 'Login-wall signal matched: ' . ($matchedLoginSignal !== null ? "YES ('{$matchedLoginSignal}')" : 'no') . "\n";
echo "video_redirect links found: {$videoRedirectCount}\n";

if (preg_match('/<title>(.*?)<\/title>/is', $response->body, $m) === 1) {
    echo 'Page <title>: ' . trim($m[1]) . "\n";
}

echo "\n--- Additional diagnostic signals ---\n";
$otherSignals = [
    'no longer available' => 'a "feature no longer available" message',
    'checkpoint' => 'a security/identity checkpoint page',
    'cookie' => 'a cookie-consent page',
    'consent' => 'a consent page',
    'video_redirect' => 'the string "video_redirect" ANYWHERE (not just as a live link)',
];
foreach ($otherSignals as $needle => $label) {
    echo '  - ' . $label . ': ' . (stripos($response->body, $needle) !== false ? 'YES' : 'no') . "\n";
}

$showFull = isset($_GET['full']);
echo "\n--- " . ($showFull ? 'Full raw response' : 'First 3000 characters of the raw response (add &full=1 for everything)') . " ---\n";
echo $showFull ? $response->body : substr($response->body, 0, 3000);

echo "\n\n=== End of diagnostic. DELETE public/fb-diagnostic.php FROM THE SERVER NOW. ===\n";
