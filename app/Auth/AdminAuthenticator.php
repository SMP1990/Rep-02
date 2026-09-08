<?php

declare(strict_types=1);

namespace App\Auth;

use App\Repositories\AdministratorRepository;
use App\Support\Logger;
use App\Support\Session;
use DateTimeImmutable;

/**
 * Admin login/logout (Phase 1 §1.4). Runs password_verify() against a
 * real-looking dummy hash even when the username doesn't exist, so a
 * nonexistent account and a wrong password take the same amount of time —
 * without this, response timing alone could be used to enumerate valid
 * usernames.
 */
final class AdminAuthenticator
{
    private const DUMMY_HASH = '$2y$10$C6UzMDM.H6dfI/f/IKcEeO7Yb6h5uL5c3zJ8s6i0e0y1x2Z3vB4C5';

    public function __construct(
        private readonly AdministratorRepository $administrators,
        private readonly int $lockThreshold = 5,
        private readonly int $lockMinutes = 15,
    ) {
    }

    public function attempt(string $username, string $password): bool
    {
        $admin = $this->administrators->findByUsername($username);
        $hash = $admin['password_hash'] ?? self::DUMMY_HASH;
        $passwordMatches = password_verify($password, $hash);

        if ($admin === null || !(bool) $admin['is_active']) {
            Logger::channel('security')->warning('Admin login failed: unknown or inactive account', [
                'username' => $username,
            ]);

            return false;
        }

        if (!empty($admin['locked_until']) && new DateTimeImmutable($admin['locked_until']) > new DateTimeImmutable()) {
            Logger::channel('security')->warning('Admin login rejected: account locked', [
                'username' => $username,
            ]);

            return false;
        }

        if (!$passwordMatches) {
            $this->administrators->recordFailedLogin((int) $admin['id'], $this->lockThreshold, $this->lockMinutes);

            Logger::channel('security')->warning('Admin login failed: incorrect password', [
                'username' => $username,
            ]);

            return false;
        }

        $this->administrators->recordSuccessfulLogin((int) $admin['id']);

        Session::regenerate();
        $_SESSION['admin_id'] = (int) $admin['id'];
        $_SESSION['admin_username'] = $admin['username'];

        Logger::channel('security')->info('Admin login succeeded', ['username' => $username]);

        return true;
    }

    public function logout(): void
    {
        Session::destroy();
    }
}
