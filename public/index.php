<?php

declare(strict_types=1);

require dirname(__DIR__) . '/app/bootstrap.php';

use App\Analytics\RequestRecorder;
use App\Auth\AdminAuthenticator;
use App\Http\Controllers\Admin\AdvertisementController;
use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\DiagnosticsController;
use App\Http\Controllers\Admin\FaqController as AdminFaqController;
use App\Http\Controllers\Admin\LogController;
use App\Http\Controllers\Admin\PageController as AdminPageController;
use App\Http\Controllers\Admin\SeoController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\MetadataController;
use App\Http\Controllers\Api\ProcessController;
use App\Http\Controllers\PageController;
use App\Http\Middleware\AdminAuthMiddleware;
use App\Http\Middleware\CsrfMiddleware;
use App\Http\Middleware\RateLimitMiddleware;
use App\Http\Request;
use App\Http\Response;
use App\Http\Router;
use App\Processing\Providers\FacebookProvider;
use App\Processing\ProviderManager;
use App\Processing\Support\HttpClient;
use App\Processing\Support\InFlightLock;
use App\Repositories\AdministratorRepository;
use App\Repositories\AdvertisementRepository;
use App\Repositories\ErrorLogRepository;
use App\Repositories\FaqRepository;
use App\Repositories\PageRepository;
use App\Repositories\ProcessingLogRepository;
use App\Repositories\SeoSettingsRepository;
use App\Repositories\SettingsRepository;
use App\Repositories\VisitorStatsRepository;
use App\Support\Config;
use App\Support\FileCacheStore;
use App\Support\RateLimiter;
use App\Support\Session;
use App\Support\View;

Session::start();

$cache = new FileCacheStore((string) Config::get('cache.path'));
$rateLimiter = new RateLimiter($cache);

// Providers are constructed explicitly here, like everything else in
// this file — ProviderManager takes ProcessingProvider *instances*, not
// class-name strings, so config/providers.php is documentation of what's
// registered and why, not a list this file resolves automatically (that
// was a latent bug: it previously passed the raw config array straight
// through, which would have fatal-errored the moment a provider was
// actually listed there — caught while wiring the first real provider).
$facebookProvider = new FacebookProvider(
    http: new HttpClient(timeoutSeconds: 12, connectTimeoutSeconds: 4),
    cache: $cache,
    // Coalesces concurrent requests for the same URL (Phase 8 finding) —
    // lives alongside the file cache, not inside it, since a lock's
    // lifecycle (acquire/release) is a different concern from a cached
    // value's (get/set/expire).
    lock: new InFlightLock((string) Config::get('cache.path') . '/locks'),
);

$providerManager = new ProviderManager(providers: [$facebookProvider]);

$processingLog = new ProcessingLogRepository();
$visitorStats = new VisitorStatsRepository();
$recorder = new RequestRecorder($processingLog, $visitorStats);

$administrators = new AdministratorRepository();
$authenticator = new AdminAuthenticator($administrators);
$authController = new AuthController($authenticator);

$processingLimit = Config::get('security.rate_limit.processing', ['max_attempts' => 10, 'decay_seconds' => 60]);
$loginLimit = Config::get('security.rate_limit.admin_login', ['max_attempts' => 5, 'decay_seconds' => 300]);

$processingThrottle = new RateLimitMiddleware(
    $rateLimiter,
    'processing',
    (int) $processingLimit['max_attempts'],
    (int) $processingLimit['decay_seconds'],
);
$loginThrottle = new RateLimitMiddleware(
    $rateLimiter,
    'admin_login',
    (int) $loginLimit['max_attempts'],
    (int) $loginLimit['decay_seconds'],
);
$csrf = new CsrfMiddleware();
$adminAuth = new AdminAuthMiddleware();
$adminGuard = [$adminAuth, $csrf]; // order doesn't matter here — CSRF only acts on non-GET

$pages = new PageController();

$dashboard = new DashboardController($processingLog, $visitorStats);
$settings = new SettingsController(new SettingsRepository());
$seo = new SeoController(new SeoSettingsRepository());
$ads = new AdvertisementController(new AdvertisementRepository());
$adminFaq = new AdminFaqController(new FaqRepository());
$adminPages = new AdminPageController(new PageRepository());
$logs = new LogController($processingLog, new ErrorLogRepository());
$diagnostics = new DiagnosticsController();

$router = new Router();

// Public pages
$router->get('/', [$pages, 'home']);
$router->get('/faq', [$pages, 'faq']);
$router->get('/about', [$pages, 'about']);
$router->get('/contact', [$pages, 'contact']);
$router->get('/terms', [$pages, 'terms']);
$router->get('/privacy', [$pages, 'privacy']);
$router->get('/copyright', [$pages, 'copyright']);

// Public API
$router->get('/api/v1/health', new HealthController());
$router->post('/api/v1/metadata', new MetadataController($providerManager, $recorder), [$processingThrottle]);
$router->post('/api/v1/process', new ProcessController($providerManager, $recorder), [$processingThrottle]);

// Admin API (JSON — Phase 4, kept for any future JS/SPA/mobile consumer)
$router->get('/admin/api/csrf-token', [$authController, 'csrfToken']);
$router->post('/admin/api/login', [$authController, 'login'], [$loginThrottle]);
$router->post('/admin/api/logout', [$authController, 'logout'], [$csrf, $adminAuth]);

// Admin login (plain HTML form, Post/Redirect/Get — no JS required)
$router->get('/admin/login', [$authController, 'loginPage']);
$router->post('/admin/login', [$authController, 'loginSubmit'], [$loginThrottle, $csrf]);
$router->post('/admin/logout', [$authController, 'logoutSubmit'], $adminGuard);

// Admin dashboard (all protected by session auth + CSRF on every mutation)
$router->get('/admin', [$dashboard, 'index'], [$adminAuth]);

$router->get('/admin/settings', [$settings, 'edit'], [$adminAuth]);
$router->post('/admin/settings', [$settings, 'update'], $adminGuard);

$router->get('/admin/seo', [$seo, 'index'], [$adminAuth]);
$router->post('/admin/seo/{routeKey}', [$seo, 'update'], $adminGuard);

$router->get('/admin/ads', [$ads, 'index'], [$adminAuth]);
$router->post('/admin/ads', [$ads, 'store'], $adminGuard);
$router->post('/admin/ads/{id}', [$ads, 'update'], $adminGuard);
$router->post('/admin/ads/{id}/delete', [$ads, 'destroy'], $adminGuard);

$router->get('/admin/faq', [$adminFaq, 'index'], [$adminAuth]);
$router->post('/admin/faq', [$adminFaq, 'store'], $adminGuard);
$router->post('/admin/faq/{id}', [$adminFaq, 'update'], $adminGuard);
$router->post('/admin/faq/{id}/delete', [$adminFaq, 'destroy'], $adminGuard);

$router->get('/admin/pages', [$adminPages, 'index'], [$adminAuth]);
$router->post('/admin/pages', [$adminPages, 'store'], $adminGuard);
$router->post('/admin/pages/{id}', [$adminPages, 'update'], $adminGuard);
$router->post('/admin/pages/{id}/delete', [$adminPages, 'destroy'], $adminGuard);

$router->get('/admin/logs/processing', [$logs, 'processing'], [$adminAuth]);
$router->get('/admin/logs/errors', [$logs, 'errors'], [$adminAuth]);

// TEMPORARY — remove once the Facebook provider is confirmed working in
// production. Admin-only (session auth, same as the rest of /admin), so
// no separate secret key to manage; reuses the app's own bootstrap/
// autoloading instead of a standalone file, avoiding upload/path issues.
$router->get('/admin/diagnostics/facebook', [$diagnostics, 'facebook'], [$adminAuth]);

$request = Request::fromGlobals();
$response = $router->dispatch($request);

// A 404 on a non-API route should render the branded HTML error page
// (resources/views/errors/404.php), not the JSON envelope every API
// route uses — Router itself stays API/HTML-agnostic.
$isApiPath = str_starts_with($request->path(), '/api/') || str_starts_with($request->path(), '/admin/api');
if ($response->status() === 404 && !$isApiPath) {
    $response = Response::html(View::render('errors/404', ['title' => 'Page not found — Fetchpoint']), 404);
}

$response->send();
