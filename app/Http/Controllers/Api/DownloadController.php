<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Request;
use App\Http\Response;

/**
 * GET /api/v1/download — proxies the direct CDN URL FacebookProvider
 * hands back from /api/v1/process, so the browser gets a real file
 * download instead of just opening the video.
 *
 * Why this exists: /api/v1/process's redirect_url output is a direct
 * fbcdn.net URL. Pointing a link straight at it doesn't work as a
 * download — fbcdn.net never sends Content-Disposition: attachment, and
 * browsers ignore the HTML `download` attribute on a cross-origin link
 * (a deliberate browser security restriction, not a bug in this app).
 * The only fix is to have our own server fetch the bytes and re-serve
 * them with that header ourselves.
 *
 * Security: this only ever fetches from Facebook's own CDN hostnames
 * (ALLOWED_HOST_SUFFIXES) — never an arbitrary caller-supplied host —
 * so it can't be used as a general-purpose open proxy/SSRF vector. It
 * doesn't otherwise authenticate the URL against a specific prior
 * /api/v1/process response, since fbcdn.net content is already public
 * (anyone with the token Facebook issued can fetch it directly); this
 * endpoint only spends our own bandwidth re-serving it, which the same
 * per-IP rate limit as /api/v1/process (see public/index.php) bounds.
 */
final class DownloadController
{
    private const ALLOWED_HOST_SUFFIXES = ['fbcdn.net'];

    /** Generous ceiling so a pathological/misbehaving upstream can't tie up a worker forever. */
    private const MAX_BYTES = 500 * 1024 * 1024;

    private const DEFAULT_FILENAME = 'video.mp4';

    public function __invoke(Request $request): Response
    {
        // Defensive: this app's global handler turns even a PHP warning
        // into a thrown exception, which would otherwise crash the whole
        // request with the generic 500 page. A problem specific to this
        // one route (an unusual upstream response, a hosting quirk with
        // cURL or output buffering) should fail as a download error, not
        // take the page down — so nothing above the actual byte-streaming
        // is allowed to propagate uncaught.
        try {
            $url = (string) $request->input('url', '');

            if (!$this->isAllowedUpstreamUrl($url)) {
                return Response::error('INVALID_URL', 'This download link is not valid.', 422);
            }

            $filename = $this->sanitizeFilename((string) $request->input('filename', self::DEFAULT_FILENAME));

            return Response::stream(
                function () use ($url): void {
                    try {
                        $this->streamUpstream($url);
                    } catch (\Throwable) {
                        // Headers/some bytes may already be on the wire at
                        // this point, so there's no clean response left to
                        // return — best we can do is stop without a fatal
                        // error. The browser sees a truncated download,
                        // not a crashed page.
                    }
                },
                [
                    'Content-Type' => 'video/mp4',
                    'Content-Disposition' => 'attachment; filename="' . $filename . '"',
                    'X-Robots-Tag' => 'noindex',
                ],
            );
        } catch (\Throwable) {
            return Response::error('DOWNLOAD_FAILED', 'Could not start the download. Please try again.', 500);
        }
    }

    private function isAllowedUpstreamUrl(string $url): bool
    {
        if ($url === '' || strlen($url) > 2048) {
            return false;
        }

        $parts = parse_url($url);

        if (!is_array($parts) || ($parts['scheme'] ?? '') !== 'https' || empty($parts['host'])) {
            return false;
        }

        $host = strtolower($parts['host']);

        foreach (self::ALLOWED_HOST_SUFFIXES as $suffix) {
            if ($host === $suffix || str_ends_with($host, '.' . $suffix)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Strips to a safe, header-injection-proof character set and forces
     * a .mp4 extension — never trusts the caller-supplied name as-is.
     */
    private function sanitizeFilename(string $filename): string
    {
        $filename = basename($filename);
        $filename = preg_replace('/[^A-Za-z0-9._-]+/', '-', $filename) ?? '';
        $filename = trim($filename, '-.');

        if ($filename === '') {
            return self::DEFAULT_FILENAME;
        }

        if (!str_ends_with(strtolower($filename), '.mp4')) {
            $filename .= '.mp4';
        }

        return mb_substr($filename, 0, 150);
    }

    /**
     * Streams the upstream response body straight to the client via
     * cURL's write callback — never buffers it into a PHP string, which
     * would blow shared hosting's per-request memory limit on a
     * multi-hundred-MB video.
     */
    private function streamUpstream(string $url): void
    {
        // Shared hosting's default max_execution_time (often 30-60s) is
        // sized for ordinary requests, not a large video re-streamed
        // through this server — without this, a slow/large download
        // would be killed mid-transfer regardless of cURL's own timeout.
        // Suppressed: some hosts disable set_time_limit() entirely, and
        // that's not fatal to this feature, just a smaller safety margin.
        @set_time_limit(0);

        $ch = curl_init($url);

        if ($ch === false) {
            return;
        }

        $written = 0;
        $maxBytes = self::MAX_BYTES;

        curl_setopt_array($ch, [
            CURLOPT_HTTPGET => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 3,
            CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 120,
            CURLOPT_USERAGENT => 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_WRITEFUNCTION => function ($handle, string $chunk) use (&$written, $maxBytes): int {
                $written += strlen($chunk);

                if ($written > $maxBytes) {
                    return -1; // aborts the transfer
                }

                echo $chunk;

                if (ob_get_level() > 0) {
                    @ob_flush();
                }

                @flush();

                return strlen($chunk);
            },
        ]);

        curl_exec($ch);
        curl_close($ch);
    }
}
