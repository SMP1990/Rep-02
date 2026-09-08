<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= e($title ?? 'Fetchpoint') ?></title>
    <meta name="description" content="<?= e($metaDescription ?? 'Fetchpoint lets you save media from a link in seconds — fast, private, and free.') ?>">
    <link href="/assets/vendor/bootstrap/css/bootstrap.min.css" rel="stylesheet">
    <link href="/assets/css/app.css" rel="stylesheet">
</head>
<body>
<a class="visually-hidden-focusable skip-link" href="#main-content">Skip to content</a>

<header class="site-header">
    <nav class="navbar navbar-expand-md">
        <div class="container">
            <a class="navbar-brand fw-semibold" href="/">Fetch<span class="brand-accent">point</span></a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#siteNav"
                    aria-controls="siteNav" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="siteNav">
                <ul class="navbar-nav ms-auto">
                    <li class="nav-item"><a class="nav-link" href="/">Home</a></li>
                    <li class="nav-item"><a class="nav-link" href="/faq">FAQ</a></li>
                    <li class="nav-item"><a class="nav-link" href="/about">About</a></li>
                    <li class="nav-item"><a class="nav-link" href="/contact">Contact</a></li>
                </ul>
            </div>
        </div>
    </nav>
</header>

<main id="main-content">
    <?= $content ?>
</main>

<footer class="site-footer">
    <div class="container">
        <div class="row gy-4">
            <div class="col-md-4">
                <p class="fw-semibold mb-1">Fetch<span class="brand-accent">point</span></p>
                <p class="text-body-secondary small mb-0">Save media from a link — fast, private, and free.</p>
            </div>
            <div class="col-md-4">
                <p class="fw-semibold mb-2">Site</p>
                <ul class="list-unstyled small">
                    <li><a href="/faq">FAQ</a></li>
                    <li><a href="/about">About</a></li>
                    <li><a href="/contact">Contact</a></li>
                </ul>
            </div>
            <div class="col-md-4">
                <p class="fw-semibold mb-2">Legal</p>
                <ul class="list-unstyled small">
                    <li><a href="/terms">Terms of Service</a></li>
                    <li><a href="/privacy">Privacy Policy</a></li>
                    <li><a href="/copyright">Copyright / DMCA</a></li>
                </ul>
            </div>
        </div>
        <hr class="my-4">
        <p class="text-body-secondary small mb-0">&copy; <?= (int) date('Y') ?> Fetchpoint. All rights reserved.</p>
    </div>
</footer>

<script src="/assets/vendor/bootstrap/js/bootstrap.bundle.min.js"></script>
<script src="/assets/js/app.js" defer></script>
</body>
</html>
