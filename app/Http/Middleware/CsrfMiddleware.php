<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Http\Request;
use App\Http\Response;
use App\Support\Csrf;

/**
 * Applied to state-changing admin routes only (Phase 0 §0.8). Accepts the
 * token via an X-CSRF-Token header (preferred, for fetch()-based admin UI)
 * or a _csrf_token body field as a fallback for a plain form post.
 */
final class CsrfMiddleware implements Middleware
{
    public function handle(Request $request, callable $next): Response
    {
        if (in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true)) {
            return $next($request);
        }

        $token = $request->header('X-CSRF-Token');
        if ($token === null) {
            $bodyToken = $request->input('_csrf_token');
            $token = is_string($bodyToken) ? $bodyToken : null;
        }

        if (!Csrf::verify($token)) {
            return Response::error('CSRF_INVALID', 'Your session has expired. Please refresh and try again.', 419);
        }

        return $next($request);
    }
}
