<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Support\Database;
use PDO;

/**
 * Backs `error_logs` — the DB-queryable subset of application errors the
 * admin dashboard can browse (Phase 3 §3.3, FR-20). Scoped narrowly to
 * uncaught/critical application errors (written from App\Support\
 * ErrorHandler); the full raw diagnostic trail still goes to
 * storage/logs/*.log via App\Support\Logger, which is a separate,
 * differently-retained concern.
 */
final class ErrorLogRepository
{
    public function record(string $channel, string $level, string $message, ?array $context = null): void
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO error_logs (channel, level, message, context_json)
             VALUES (:channel, :level, :message, :context_json)',
        );
        $stmt->execute([
            'channel' => $channel,
            'level' => $level,
            'message' => mb_substr($message, 0, 500),
            'context_json' => $context === null ? null : json_encode($context),
        ]);
    }

    /** @return array{rows: array, total: int} */
    public function paginate(int $page, int $perPage): array
    {
        $offset = max(0, ($page - 1) * $perPage);

        $total = (int) Database::connection()->query('SELECT COUNT(*) FROM error_logs')->fetchColumn();

        $stmt = Database::connection()->prepare(
            'SELECT id, channel, level, message, created_at
             FROM error_logs
             ORDER BY created_at DESC
             LIMIT :limit OFFSET :offset',
        );
        $stmt->bindValue('limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return ['rows' => $stmt->fetchAll(), 'total' => $total];
    }
}
