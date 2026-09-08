<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Http\Request;
use App\Http\Response;
use App\Support\RateLimiter;

/**
 * Per-IP rate limiting (Phase 0 §0.8, FR-10). Bucketed by name so the
 * public processing endpoint and admin login use independent limits.
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
            return Response::error(
                'RATE_LIMITED',
                'Too many requests. Please wait a moment and try again.',
                429,
            );
        }

        $this->limiter->hit($key, $this->decaySeconds);

        return $next($request);
    }
}
