<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Request;
use App\Http\Response;

/**
 * Unauthenticated liveness check — useful for confirming the front
 * controller, routing, and response pipeline are wired correctly during
 * deployment, independent of any processing provider.
 */
final class HealthController
{
    public function __invoke(Request $request): Response
    {
        return Response::success(['status' => 'ok', 'time' => date('c')]);
    }
}
