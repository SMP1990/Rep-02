<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Http\Request;
use App\Http\Response;

/**
 * Guards every admin route except login/csrf-token (Phase 1 §1.4). Checks
 * server-side session state only — never a client-supplied flag.
 *
 * The unauthenticated response shape depends on which admin surface was
 * hit: a JSON API route (/admin/api/...) gets the JSON error envelope, but
 * a plain dashboard page route redirects to the login page — a raw JSON
 * 401 in a browser tab would be a broken-looking dead end (Phase 6).
 */
final class AdminAuthMiddleware implements Middleware
{
    public function handle(Request $request, callable $next): Response
    {
        if (empty($_SESSION['admin_id'])) {
            if (str_starts_with($request->path(), '/admin/api/')) {
                return Response::error('UNAUTHENTICATED', 'Admin authentication is required.', 401);
            }

            return Response::redirect('/admin/login');
        }

        return $next($request);
    }
}
