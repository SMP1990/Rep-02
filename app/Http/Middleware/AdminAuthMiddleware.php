<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Http\Request;
use App\Http\Response;

/**
 * Guards every admin route except login/csrf-token (Phase 1 §1.4). Checks
 * server-side session state only — never a client-supplied flag.
 */
final class AdminAuthMiddleware implements Middleware
{
    public function handle(Request $request, callable $next): Response
    {
        if (empty($_SESSION['admin_id'])) {
            return Response::error('UNAUTHENTICATED', 'Admin authentication is required.', 401);
        }

        return $next($request);
    }
}
