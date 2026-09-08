<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= e($title ?? 'Admin Login') ?></title>
    <meta name="robots" content="noindex, nofollow">
    <link href="/assets/vendor/bootstrap/css/bootstrap.min.css" rel="stylesheet">
    <link href="/assets/css/app.css" rel="stylesheet">
</head>
<body class="bg-body-tertiary">
<div class="container" style="max-width: 420px; padding-top: 6rem;">
    <p class="text-center fw-semibold mb-4 fs-4">
        <a href="/" class="text-decoration-none">Fetch<span class="brand-accent">point</span></a>
    </p>

    <?php if (!empty($flash)): ?>
        <div class="alert alert-<?= $flash['type'] === 'error' ? 'danger' : 'success' ?>">
            <?= e($flash['message']) ?>
        </div>
    <?php endif; ?>

    <div class="card">
        <div class="card-body p-4">
            <h1 class="h5 mb-3">Admin sign in</h1>
            <form method="post" action="/admin/login">
                <input type="hidden" name="_csrf_token" value="<?= e($csrfToken) ?>">
                <div class="mb-3">
                    <label for="username" class="form-label">Username</label>
                    <input type="text" class="form-control" id="username" name="username" required autofocus>
                </div>
                <div class="mb-3">
                    <label for="password" class="form-label">Password</label>
                    <input type="password" class="form-control" id="password" name="password" required>
                </div>
                <button type="submit" class="btn btn-primary w-100">Sign in</button>
            </form>
        </div>
    </div>
</div>
</body>
</html>
