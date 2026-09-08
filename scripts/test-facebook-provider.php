<?php

declare(strict_types=1);

/**
 * Standalone CLI smoke test for FacebookProvider — no Composer, no
 * database, no web server. Just PHP (with the curl extension) and normal
 * internet access to facebook.com, which this project's own sandbox does
 * not have (see docs/media-platform/phase-7c-facebook-provider-implementation.md).
 * Run this from a machine that CAN reach Facebook to find out whether the
 * extraction technique still matches Facebook's real, current markup.
 *
 * Usage:
 *   php scripts/test-facebook-provider.php "https://www.facebook.com/.../videos/.../"
 */

$root = dirname(__DIR__);

// Manual requires in dependency order — deliberately not using Composer's
// autoloader so this script has zero setup beyond "have PHP installed."
require $root . '/app/Support/CacheStore.php';
require $root . '/app/Support/FileCacheStore.php';
require $root . '/app/Support/Logger.php';
require $root . '/app/Processing/Support/HttpResponse.php';
require $root . '/app/Processing/Support/HttpRequestException.php';
require $root . '/app/Processing/Support/HttpClientInterface.php';
require $root . '/app/Processing/Support/HttpClient.php';
require $root . '/app/Processing/ProcessingOption.php';
require $root . '/app/Processing/ProcessingOutput.php';
require $root . '/app/Processing/ProcessingResult.php';
require $root . '/app/Processing/ProcessingProvider.php';
require $root . '/app/Processing/Exceptions/ProcessingException.php';
require $root . '/app/Processing/Exceptions/UpstreamRejectedException.php';
require $root . '/app/Processing/Exceptions/ProviderUnavailableException.php';
require $root . '/app/Processing/Providers/FacebookProvider.php';

use App\Processing\Exceptions\ProcessingException;
use App\Processing\Providers\FacebookProvider;
use App\Processing\Support\HttpClient;
use App\Support\FileCacheStore;

$url = $argv[1] ?? null;

if ($url === null) {
    fwrite(STDERR, "Usage: php scripts/test-facebook-provider.php <facebook-video-or-reel-url>\n");
    exit(1);
}

// A temp-dir cache, not the project's storage/cache — this script never
// touches anything else in the repo except storage/logs (via Logger).
$cache = new FileCacheStore(sys_get_temp_dir() . '/fetchpoint-provider-test-cache');
$http = new HttpClient(timeoutSeconds: 15, connectTimeoutSeconds: 5);
$provider = new FacebookProvider($http, $cache);

echo "Checking: {$url}\n";

if (!$provider->supports($url)) {
    echo "This isn't a URL FacebookProvider recognizes (expected a facebook.com/fb.watch link).\n";
    exit(1);
}

try {
    $result = $provider->fetchMetadata($url);

    echo 'Title: ' . ($result->title ?? '(none found)') . "\n";
    echo 'Options found: ' . count($result->options) . "\n";

    foreach ($result->options as $option) {
        echo "  - [{$option->id}] {$option->label}\n";
    }

    if ($result->options === []) {
        echo "\nNo options were found — see the FAILED case below for what that usually means.\n";
        exit(1);
    }

    $first = $result->options[0];
    echo "\nResolving the download link for option '{$first->id}'...\n";

    $processed = $provider->process($url, $first->id);

    echo "Direct video URL:\n" . ($processed->output?->url ?? '(none)') . "\n";
    echo "\nSUCCESS — the extraction technique worked against this real URL.\n";
} catch (ProcessingException $e) {
    echo "FAILED [{$e->getErrorCode()}]: {$e->getUserMessage()}\n";

    if ($e->getPrevious() !== null) {
        echo 'Underlying detail: ' . $e->getPrevious()->getMessage() . "\n";
    }

    echo "\nThis usually means either the URL is private/unavailable, or Facebook's\n";
    echo "markup no longer matches the pattern this provider looks for — see\n";
    echo "docs/media-platform/phase-7c-facebook-provider-implementation.md §7c.6.\n";

    exit(1);
}
