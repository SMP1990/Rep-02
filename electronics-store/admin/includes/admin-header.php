<?php
/**
 * Shared <head> + opening <body> + sidebar shell for every admin page.
 * Pages that require this file are expected to have already required
 * includes/bootstrap.php and includes/auth.php and called
 * require_admin_login().
 *
 * Expects (optional) $page_title and $active_nav to be set before include.
 */
$page_title = $page_title ?? 'Admin — Voltix Electronics';
$active_nav = $active_nav ?? '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= htmlspecialchars($page_title, ENT_QUOTES, 'UTF-8') ?></title>
<meta name="robots" content="noindex, nofollow">
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          ink: '#0b1220',
          brand: { DEFAULT: '#2563eb', dark: '#1d4ed8', light: '#60a5fa' },
          accent: '#f59e0b',
        },
        fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui'] },
      },
    },
  };
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/electronics-store/assets/css/style.css">
</head>
<body class="bg-slate-100 text-slate-800 font-sans antialiased">
<div class="flex min-h-screen">

  <?php include __DIR__ . '/sidebar.php'; ?>

  <div class="flex-1 flex flex-col min-w-0">
    <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <h1 class="font-semibold text-lg text-ink"><?= htmlspecialchars($page_title, ENT_QUOTES, 'UTF-8') ?></h1>
      <div class="flex items-center gap-4">
        <span class="text-sm text-slate-500">👤 <?= e(current_admin_name()) ?></span>
        <a href="/electronics-store/admin/logout.php" class="text-sm text-slate-400 hover:text-red-500">Logout</a>
      </div>
    </header>
    <main class="flex-1 p-6">
      <?php foreach (flash_all() as $flash): ?>
        <div class="mb-4 rounded-lg px-4 py-3 text-sm border
                    <?= $flash['type'] === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700' ?>">
          <?= e($flash['message']) ?>
        </div>
      <?php endforeach; ?>
