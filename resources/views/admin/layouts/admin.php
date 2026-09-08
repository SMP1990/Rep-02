<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= e($title ?? 'Admin — Fetchpoint') ?></title>
    <meta name="robots" content="noindex, nofollow">
    <link href="/assets/vendor/bootstrap/css/bootstrap.min.css" rel="stylesheet">
    <link href="/assets/css/app.css" rel="stylesheet">
    <link href="/assets/css/admin.css" rel="stylesheet">
</head>
<body>
<div class="admin-shell">
    <aside class="admin-sidebar">
        <p class="fw-semibold mb-4">
            <a href="/admin" class="text-decoration-none">
                Fetch<span class="brand-accent">point</span>
                <span class="text-body-secondary fw-normal d-block small">Admin</span>
            </a>
        </p>
        <nav class="nav flex-column gap-1">
            <a class="nav-link <?= ($activeNav ?? '') === 'dashboard' ? 'active' : '' ?>" href="/admin">Dashboard</a>
            <a class="nav-link <?= ($activeNav ?? '') === 'settings' ? 'active' : '' ?>" href="/admin/settings">Site Settings</a>
            <a class="nav-link <?= ($activeNav ?? '') === 'seo' ? 'active' : '' ?>" href="/admin/seo">SEO Settings</a>
            <a class="nav-link <?= ($activeNav ?? '') === 'ads' ? 'active' : '' ?>" href="/admin/ads">Advertisements</a>
            <a class="nav-link <?= ($activeNav ?? '') === 'faq' ? 'active' : '' ?>" href="/admin/faq">FAQ</a>
            <a class="nav-link <?= ($activeNav ?? '') === 'pages' ? 'active' : '' ?>" href="/admin/pages">Pages</a>
            <hr class="my-2">
            <a class="nav-link <?= ($activeNav ?? '') === 'logs-processing' ? 'active' : '' ?>" href="/admin/logs/processing">Processing Logs</a>
            <a class="nav-link <?= ($activeNav ?? '') === 'logs-errors' ? 'active' : '' ?>" href="/admin/logs/errors">Error Logs</a>
            <hr class="my-2">
            <form method="post" action="/admin/logout" class="px-2">
                <input type="hidden" name="_csrf_token" value="<?= e($csrfToken ?? '') ?>">
                <button type="submit" class="btn btn-sm btn-outline-secondary w-100">Log out</button>
            </form>
        </nav>
    </aside>
    <main class="admin-main">
        <?php if (!empty($flash)): ?>
            <div class="alert alert-<?= $flash['type'] === 'error' ? 'danger' : 'success' ?>">
                <?= e($flash['message']) ?>
            </div>
        <?php endif; ?>
        <?= $content ?>
    </main>
</div>
<script src="/assets/vendor/bootstrap/js/bootstrap.bundle.min.js"></script>
</body>
</html>
