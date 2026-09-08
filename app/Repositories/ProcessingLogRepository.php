<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Support\Database;
use PDO;

/**
 * Backs the `processing_requests` table — the structured, queryable
 * record of every metadata/process attempt (Phase 3 §3.3). Written by
 * App\Analytics\RequestRecorder, read by the admin dashboard and log
 * viewer (Phase 6).
 */
final class ProcessingLogRepository
{
    public function record(array $entry): void
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO processing_requests
                (request_type, source_platform, provider_name, url_hash, option_id, status, error_code, duration_ms, ip_hash, user_agent)
             VALUES
                (:request_type, :source_platform, :provider_name, :url_hash, :option_id, :status, :error_code, :duration_ms, :ip_hash, :user_agent)',
        );
        $stmt->execute($entry);
    }

    /** @return array{total: int, success: int, failure: int} */
    public function totals(): array
    {
        $row = Database::connection()->query(
            "SELECT COUNT(*) AS total, SUM(status = 'success') AS success, SUM(status = 'failure') AS failure
             FROM processing_requests",
        )->fetch();

        return $this->normalizeTotals($row);
    }

    /** @return array{total: int, success: int, failure: int} */
    public function totalsSince(string $sinceDateTime): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT COUNT(*) AS total, SUM(status = 'success') AS success, SUM(status = 'failure') AS failure
             FROM processing_requests
             WHERE created_at >= :since",
        );
        $stmt->execute(['since' => $sinceDateTime]);

        return $this->normalizeTotals($stmt->fetch());
    }

    /** @return array{rows: array, total: int} */
    public function paginate(int $page, int $perPage, ?string $status = null): array
    {
        $offset = max(0, ($page - 1) * $perPage);
        $where = $status !== null ? 'WHERE status = :status' : '';

        $countStmt = Database::connection()->prepare("SELECT COUNT(*) FROM processing_requests {$where}");
        if ($status !== null) {
            $countStmt->bindValue('status', $status);
        }
        $countStmt->execute();
        $total = (int) $countStmt->fetchColumn();

        $stmt = Database::connection()->prepare(
            "SELECT id, request_type, source_platform, provider_name, status, error_code, duration_ms, created_at
             FROM processing_requests
             {$where}
             ORDER BY created_at DESC
             LIMIT :limit OFFSET :offset",
        );
        if ($status !== null) {
            $stmt->bindValue('status', $status);
        }
        $stmt->bindValue('limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return ['rows' => $stmt->fetchAll(), 'total' => $total];
    }

    /** @return array{total: int, success: int, failure: int} */
    private function normalizeTotals(mixed $row): array
    {
        return [
            'total' => (int) ($row['total'] ?? 0),
            'success' => (int) ($row['success'] ?? 0),
            'failure' => (int) ($row['failure'] ?? 0),
        ];
    }
}
