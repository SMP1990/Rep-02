<?php

declare(strict_types=1);

namespace App\Http;

use App\Http\Middleware\Middleware;

/**
 * Minimal method+path router with per-route middleware. Every request —
 * public API and admin API alike — enters through this single dispatch
 * point (Phase 2 §2.1/§2.3: one front controller), so auth/CSRF/rate-limit
 * middleware is applied consistently rather than duplicated per section.
 */
final class Router
{
    /**
     * @var array<int, array{
     *     method: string,
     *     pattern: string,
     *     handler: callable|array,
     *     middleware: Middleware[]
     * }>
     */
    private array $routes = [];

    /** @param Middleware[] $middleware */
    public function get(string $path, callable|array $handler, array $middleware = []): void
    {
        $this->add('GET', $path, $handler, $middleware);
    }

    /** @param Middleware[] $middleware */
    public function post(string $path, callable|array $handler, array $middleware = []): void
    {
        $this->add('POST', $path, $handler, $middleware);
    }

    /** @param Middleware[] $middleware */
    private function add(string $method, string $path, callable|array $handler, array $middleware): void
    {
        $this->routes[] = [
            'method' => $method,
            'pattern' => $this->compile($path),
            'handler' => $handler,
            'middleware' => $middleware,
        ];
    }

    private function compile(string $path): string
    {
        $normalized = rtrim($path, '/');
        $normalized = $normalized === '' ? '/' : $normalized;
        $pattern = preg_replace('#\{([a-zA-Z_][a-zA-Z0-9_]*)\}#', '(?P<$1>[^/]+)', $normalized);

        return '#^' . $pattern . '$#';
    }

    public function dispatch(Request $request): Response
    {
        $method = $request->method();
        $path = $request->path();
        $pathMatchedAnyMethod = false;

        foreach ($this->routes as $route) {
            if (!preg_match($route['pattern'], $path, $matches)) {
                continue;
            }

            $pathMatchedAnyMethod = true;

            if ($route['method'] !== $method) {
                continue;
            }

            $params = array_filter($matches, static fn ($key) => is_string($key), ARRAY_FILTER_USE_KEY);

            $handler = $route['handler'];
            $pipeline = static function (Request $req) use ($handler, $params): Response {
                return call_user_func($handler, $req, $params);
            };

            foreach (array_reverse($route['middleware']) as $middleware) {
                $next = $pipeline;
                $pipeline = static fn (Request $req): Response => $middleware->handle($req, $next);
            }

            return $pipeline($request);
        }

        if ($pathMatchedAnyMethod) {
            return Response::error('METHOD_NOT_ALLOWED', 'This method is not allowed for this route.', 405);
        }

        return Response::error('NOT_FOUND', 'The requested resource was not found.', 404);
    }
}
