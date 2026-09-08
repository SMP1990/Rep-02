<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Admin session bootstrap (Phase 1 §1.4). HTTPOnly/Secure/SameSite=Strict
 * cookie, regenerated on login, with an idle timeout enforced server-side
 * on every request (not just at login) so a stolen cookie stops working
 * once it goes quiet.
 */
final class Session
{
    public static function start(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }

        $config = Config::get('security.session', []);
        $lifetimeSeconds = (int) ($config['lifetime_minutes'] ?? 60) * 60;

        session_name((string) ($config['name'] ?? 'mup_session'));
        session_set_cookie_params([
            'lifetime' => $lifetimeSeconds,
            'path' => '/',
            'domain' => '',
            'secure' => self::isHttps(),
            'httponly' => true,
            'samesite' => 'Strict',
        ]);

        session_start();

        self::enforceIdleTimeout((int) ($config['idle_timeout_minutes'] ?? 20) * 60);
    }

    public static function regenerate(): void
    {
        session_regenerate_id(true);
    }

    public static function destroy(): void
    {
        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params['path'],
                $params['domain'],
                $params['secure'],
                $params['httponly'],
            );
        }

        session_destroy();
    }

    private static function enforceIdleTimeout(int $idleSeconds): void
    {
        $lastActivity = $_SESSION['_last_activity'] ?? null;

        if ($lastActivity !== null && (time() - (int) $lastActivity) > $idleSeconds) {
            self::destroy();
            session_start();
        }

        $_SESSION['_last_activity'] = time();
    }

    private static function isHttps(): bool
    {
        return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (($_SERVER['SERVER_PORT'] ?? null) === '443')
            || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? null) === 'https');
    }
}
