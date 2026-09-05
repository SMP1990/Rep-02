<?php
/**
 * Admin authentication. Requires includes/session.php and includes/db.php
 * to already be loaded by the including page.
 */

function admin_attempt_login(string $email, string $password): bool
{
    $pdo = get_pdo();
    $stmt = $pdo->prepare('SELECT id, full_name, password_hash, status FROM admins WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $admin = $stmt->fetch();

    if (!$admin || $admin['status'] !== 'active' || !password_verify($password, $admin['password_hash'])) {
        return false;
    }

    session_regenerate_id(true);
    $_SESSION['admin_id']   = (int) $admin['id'];
    $_SESSION['admin_name'] = $admin['full_name'];

    $pdo->prepare('UPDATE admins SET last_login_at = NOW() WHERE id = ?')->execute([$admin['id']]);

    return true;
}

function admin_logout(): void
{
    $_SESSION = [];
    session_destroy();
}

function is_admin_logged_in(): bool
{
    return !empty($_SESSION['admin_id']);
}

function require_admin_login(): void
{
    if (!is_admin_logged_in()) {
        redirect('/electronics-store/admin/login.php');
    }
}

function current_admin_name(): string
{
    return $_SESSION['admin_name'] ?? 'Admin';
}
