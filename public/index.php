<?php

declare(strict_types=1);

require dirname(__DIR__) . '/app/bootstrap.php';

use App\Auth\AdminAuthenticator;
use App\Http\Controllers\Admin\AuthController;
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
use App\Processing\ProviderManager;
use App\Repositories\AdministratorRepository;
use App\Support\Config;
use App\Support\FileCacheStore;
use App\Support\RateLimiter;
use App\Support\Session;
use App\Support\View;

Session::start();

$cache = new FileCacheStore((string) Config::get('cache.path'));
$rateLimiter = new RateLimiter($cache);

// No provider is registered yet (config/providers.php) — see
// docs/media-platform/phase-1-technical-architecture.md. ProviderManager
// with an empty provider list correctly answers every request with
// UNSUPPORTED_SOURCE, proving the pipeline without any extraction logic.
$providerManager = new ProviderManager(providers: Config::get('providers.providers', []));

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

$pages = new PageController();

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
$router->post('/api/v1/metadata', new MetadataController($providerManager), [$processingThrottle]);
$router->post('/api/v1/process', new ProcessController($providerManager), [$processingThrottle]);

// Admin API
$router->get('/admin/api/csrf-token', [$authController, 'csrfToken']);
$router->post('/admin/api/login', [$authController, 'login'], [$loginThrottle]);
$router->post('/admin/api/logout', [$authController, 'logout'], [$csrf, $adminAuth]);

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
