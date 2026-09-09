<?php

declare(strict_types=1);

/**
 * Read-only diagnostic tool for "FacebookProvider says UPSTREAM_REJECTED /
 * no video candidates found" on a real server. Fetches exactly the page
 * FacebookProvider itself would fetch, and reports what's actually in the
 * response — without going through any of the provider's pass/fail
 * decisions, so it can tell you WHY the provider is rejecting a page
 * instead of just confirming that it does.
 *
 * Never modifies anything — no database writes, no cache writes, no
 * effect on the live application's behavior.
 *
 * Usage:
 *   php scripts/diagnose-facebook-provider.php "https://www.facebook.com/watch/?v=..."
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('This script only runs from the command line.');
}

$root = dirname(__DIR__);

require $root . '/app/Processing/Support/HttpResponse.php';
require $root . '/app/Processing/Support/HttpRequestException.php';
require $root . '/app/Processing/Support/HttpClientInterface.php';
require $root . '/app/Processing/Support/HttpClient.php';

use App\Processing\Support\HttpClient;
use App\Processing\Support\HttpRequestException;

$url = $argv[1] ?? null;

if ($url === null) {
    fwrite(STDERR, "Usage: php scripts/diagnose-facebook-provider.php <facebook-url>\n");
    exit(1);
}

function toMbasicUrl(string $url): string
{
    $parts = parse_url($url);
    $rebuilt = 'https://mbasic.facebook.com' . ($parts['path'] ?? '/');

    if (isset($parts['query'])) {
        $rebuilt .= '?' . $parts['query'];
    }

    return $rebuilt;
}

$http = new HttpClient(timeoutSeconds: 8, connectTimeoutSeconds: 3, maxRetries: 0);

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
        echo "=> This points at a connectivity problem, not a parsing problem.\n";
        exit(1);
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
    echo "=> This IS a connectivity problem (diagnostic checklist item #2), not a parsing one.\n";
    exit(1);
}

echo "HTTP status: {$response->status}\n";
echo "Effective URL after redirects: {$response->effectiveUrl}\n";
echo 'Response size: ' . strlen($response->body) . " bytes\n";
echo "Elapsed: {$elapsedMs} ms\n\n";

// The exact same signals FacebookProvider itself checks.
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

// Additional signals the provider doesn't act on yet — these help
// distinguish "mbasic no longer exists" / "redirected somewhere else" /
// "a cookie or checkpoint interstitial" from a genuine login wall or a
// simple markup tweak.
echo "\n--- Additional diagnostic signals ---\n";
$otherSignals = [
    'no longer available' => 'a "feature no longer available" message',
    'checkpoint' => 'a security/identity checkpoint page',
    'cookie' => 'a cookie-consent page',
    'consent' => 'a consent page',
    'video_redirect' => 'the string "video_redirect" ANYWHERE (not just as a live link)',
    '<!DOCTYPE html PUBLIC "-//WAPFORUM' => 'old WAP-era doctype (classic mbasic signature)',
];
foreach ($otherSignals as $needle => $label) {
    echo '  - ' . ($label) . ': ' . (stripos($response->body, $needle) !== false ? 'YES' : 'no') . "\n";
}

$outDir = $root . '/storage/logs';
if (!is_dir($outDir)) {
    mkdir($outDir, 0755, true);
}
$outFile = $outDir . '/facebook-diagnostic-' . date('Ymd-His') . '.html';
file_put_contents($outFile, $response->body);

echo "\nFull raw response saved to:\n  {$outFile}\n";
echo "Download it (File Manager or SFTP) and open it in a browser or text editor —\n";
echo "that's the single most useful thing you can hand back for this to be diagnosed\n";
echo "for certain. Delete it afterward, since it's a full copy of whatever Facebook sent.\n";
