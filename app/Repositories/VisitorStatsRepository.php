<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Support\Database;

/**
 * Backs `visitor_daily_stats` (aggregate counters) and `visitor_daily_seen`
 * (the short-lived per-day dedup set — Phase 3 §3.3) that together make
 * an exact unique-visitor count possible without a permanent per-visitor
 * identity table.
 */
final class VisitorStatsRepository
{
    public function recordVisit(string $date, string $ipHash, bool $success): void
    {
        $pdo = Database::connection();

        $seenStmt = $pdo->prepare(
            'INSERT IGNORE INTO visitor_daily_seen (stat_date, ip_hash) VALUES (:date, :ip_hash)',
        );
        $seenStmt->execute(['date' => $date, 'ip_hash' => $ipHash]);
        $isNewVisitorToday = $seenStmt->rowCount() > 0;

        $stmt = $pdo->prepare(
            'INSERT INTO visitor_daily_stats (stat_date, unique_visitors, total_requests, successful_requests, failed_requests)
             VALUES (:date, :new_visitor, 1, :succ, :fail)
             ON DUPLICATE KEY UPDATE
                unique_visitors = unique_visitors + VALUES(unique_visitors),
                total_requests = total_requests + 1,
                successful_requests = successful_requests + VALUES(successful_requests),
                failed_requests = failed_requests + VALUES(failed_requests)',
        );
        $stmt->execute([
            'date' => $date,
            'new_visitor' => $isNewVisitorToday ? 1 : 0,
            'succ' => $success ? 1 : 0,
            'fail' => $success ? 0 : 1,
        ]);
    }

    /** @return array<int, array{stat_date:string, unique_visitors:int, total_requests:int, successful_requests:int, failed_requests:int}> */
    public function dailyStats(int $days): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT stat_date, unique_visitors, total_requests, successful_requests, failed_requests
             FROM visitor_daily_stats
             WHERE stat_date >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
             ORDER BY stat_date DESC',
        );
        $stmt->execute(['days' => $days]);

        return $stmt->fetchAll();
    }

    public function pruneSeenBefore(string $date): void
    {
        $stmt = Database::connection()->prepare('DELETE FROM visitor_daily_seen WHERE stat_date < :date');
        $stmt->execute(['date' => $date]);
    }
}
