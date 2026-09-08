<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Support\Database;

/**
 * The only class allowed to hold SQL for the administrators table
 * (Phase 2 §2.5). Every statement is parameterized.
 */
final class AdministratorRepository
{
    public function findByUsername(string $username): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, username, email, password_hash, is_active, locked_until
             FROM administrators
             WHERE username = :username
             LIMIT 1',
        );
        $stmt->execute(['username' => $username]);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    public function recordSuccessfulLogin(int $id): void
    {
        $stmt = Database::connection()->prepare(
            'UPDATE administrators
             SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW()
             WHERE id = :id',
        );
        $stmt->execute(['id' => $id]);
    }

    public function recordFailedLogin(int $id, int $lockThreshold, int $lockMinutes): void
    {
        $stmt = Database::connection()->prepare(
            'UPDATE administrators
             SET failed_login_attempts = failed_login_attempts + 1,
                 locked_until = CASE
                     WHEN failed_login_attempts + 1 >= :threshold
                     THEN DATE_ADD(NOW(), INTERVAL :lock_minutes MINUTE)
                     ELSE locked_until
                 END
             WHERE id = :id',
        );
        $stmt->execute(['threshold' => $lockThreshold, 'lock_minutes' => $lockMinutes, 'id' => $id]);
    }
}
