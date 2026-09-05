<?php
/**
 * Admin Login — verifies credentials against the admins table and starts
 * a session on success.
 */
require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/auth.php';

if (is_admin_logged_in()) {
    redirect('/electronics-store/admin/dashboard.php');
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf($_POST['csrf_token'] ?? null)) {
        $error = 'Your session expired. Please try again.';
    } else {
        $email = trim($_POST['email'] ?? '');
        $password = (string) ($_POST['password'] ?? '');

        if ($email === '' || $password === '') {
            $error = 'Please enter your email and password.';
        } elseif (admin_attempt_login($email, $password)) {
            redirect('/electronics-store/admin/dashboard.php');
        } else {
            $error = 'Invalid email or password.';
        }
    }
}

$page_title = 'Admin Login — Voltix Electronics';
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= e($page_title) ?></title>
<meta name="robots" content="noindex, nofollow">
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = {
    theme: { extend: { colors: { ink: '#0b1220', brand: { DEFAULT: '#2563eb', dark: '#1d4ed8' } },
    fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui'] } } },
  };
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body class="bg-ink font-sans antialiased min-h-screen flex items-center justify-center px-4">

  <div class="w-full max-w-sm">
    <div class="flex items-center justify-center gap-2 font-extrabold text-2xl text-white mb-8">
      <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand">⚡</span>
      Voltix Admin
    </div>

    <form method="post" action="" class="bg-white rounded-2xl shadow-xl p-8 space-y-5">
      <?= csrf_field() ?>
      <div>
        <h1 class="text-xl font-bold text-ink mb-1">Welcome back</h1>
        <p class="text-sm text-slate-500">Sign in to manage your store.</p>
      </div>

      <?php if ($error): ?>
        <div class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
          <?= e($error) ?>
        </div>
      <?php endif; ?>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
        <input type="email" name="email" value="<?= e($_POST['email'] ?? '') ?>" placeholder="admin@voltix.example"
               class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" required autofocus>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
        <input type="password" name="password" placeholder="••••••••"
               class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" required>
      </div>

      <button type="submit" class="w-full bg-brand hover:bg-brand-dark text-white font-semibold py-2.5 rounded-lg transition">
        Sign In
      </button>
    </form>
  </div>

</body>
</html>
