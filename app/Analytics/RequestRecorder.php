<?php

declare(strict_types=1);

namespace App\Analytics;

use App\Repositories\ProcessingLogRepository;
use App\Repositories\VisitorStatsRepository;
use App\Support\Config;
use App\Support\Logger;
use Throwable;

/**
 * The Analytics layer's own write path (Phase 1 §1.6.4) — called from the
 * public API controllers after every metadata/process attempt. Kept
 * strictly separate from App\Processing so a database failure here can
 * never surface as a failure of the processing request it's describing;
 * every write is wrapped and any exception is logged and swallowed.
 *
 * Neither the raw submitted URL nor the raw visitor IP is ever persisted —
 * only SHA-256 hashes (the IP hash additionally salted per-day, see
 * config/security.php) — per Phase 0's minimal-PII requirement and the
 * Phase 3 schema design.
 */
final class RequestRecorder
{
    public function __construct(
        private readonly ProcessingLogRepository $processingLog,
        private readonly VisitorStatsRepository $visitorStats,
    ) {
    }

    public function record(
        string $requestType,
        string $url,
        ?string $sourcePlatform,
        ?string $providerName,
        ?string $optionId,
        bool $success,
        ?string $errorCode,
        int $durationMs,
        string $ip,
        ?string $userAgent,
    ): void {
        try {
            $ipHash = $this->hashIp($ip);

            $this->processingLog->record([
                'request_type' => $requestType,
                'source_platform' => $sourcePlatform,
                'provider_name' => $providerName,
                'url_hash' => hash('sha256', $url),
                'option_id' => $optionId,
                'status' => $success ? 'success' : 'failure',
                'error_code' => $errorCode,
                'duration_ms' => $durationMs,
                'ip_hash' => $ipHash,
                'user_agent' => $userAgent,
            ]);

            $this->visitorStats->recordVisit(date('Y-m-d'), $ipHash, $success);
        } catch (Throwable $e) {
            Logger::channel('application')->error('Failed to record processing analytics', [
                'exception' => $e::class,
                'message' => $e->getMessage(),
            ]);
        }
    }

    private function hashIp(string $ip): string
    {
        $salt = (string) Config::get('security.ip_hash_salt', '');

        return hash('sha256', $ip . '|' . date('Y-m-d') . '|' . $salt);
    }
}
