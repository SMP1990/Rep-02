<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Http\Request;
use App\Http\Response;
use App\Support\Flash;
use App\Support\RateLimiter;

/**
 * Per-IP rate limiting (Phase 0 §0.8, FR-10). Bucketed by name so the
 * public processing endpoint and admin login use independent limits.
 *
 * Response shape depends on the route it guards: a JSON API route
 * (/api/..., /admin/api/...) gets the JSON error envelope, but the plain
 * HTML admin login form (Phase 6) needs a redirect+flash instead — a raw
 * JSON body is a dead end in a browser that just submitted an HTML form.
 */
final class RateLimitMiddleware implements Middleware
{
    public function __construct(
        private readonly RateLimiter $limiter,
        private readonly string $bucket,
        private readonly int $maxAttempts,
        private readonly int $decaySeconds,
    ) {
    }

    public function handle(Request $request, callable $next): Response
    {
        $key = $this->bucket . ':' . hash('sha256', $request->ip());

        if ($this->limiter->tooManyAttempts($key, $this->maxAttempts)) {
            $path = $request->path();

            if (str_starts_with($path, '/api/') || str_starts_with($path, '/admin/api/')) {
                return Response::error(
                    'RATE_LIMITED',
                    'Too many requests. Please wait a moment and try again.',
                    429,
                );
            }

            Flash::set('error', 'Too many attempts. Please wait a moment and try again.');

            return Response::redirect($path);
        }

        $this->limiter->hit($key, $this->decaySeconds);

        return $next($request);
    }
}
