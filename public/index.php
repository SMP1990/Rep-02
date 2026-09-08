<?php

declare(strict_types=1);

require dirname(__DIR__) . '/app/bootstrap.php';

use App\Auth\AdminAuthenticator;
use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\MetadataController;
use App\Http\Controllers\Api\ProcessController;
use App\Http\Middleware\AdminAuthMiddleware;
use App\Http\Middleware\CsrfMiddleware;
use App\Http\Middleware\RateLimitMiddleware;
use App\Http\Request;
use App\Http\Router;
use App\Processing\ProviderManager;
use App\Repositories\AdministratorRepository;
use App\Support\Config;
use App\Support\FileCacheStore;
use App\Support\RateLimiter;
use App\Support\Session;

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

$router = new Router();

// Public API
$router->get('/api/v1/health', new HealthController());
$router->post('/api/v1/metadata', new MetadataController($providerManager), [$processingThrottle]);
$router->post('/api/v1/process', new ProcessController($providerManager), [$processingThrottle]);

// Admin API
$router->get('/admin/api/csrf-token', [$authController, 'csrfToken']);
$router->post('/admin/api/login', [$authController, 'login'], [$loginThrottle]);
$router->post('/admin/api/logout', [$authController, 'logout'], [$csrf, $adminAuth]);

$router->dispatch(Request::fromGlobals())->send();
