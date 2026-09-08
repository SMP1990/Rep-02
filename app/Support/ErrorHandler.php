<?php

declare(strict_types=1);

namespace App\Support;

use App\Http\Response;
use ErrorException;
use Throwable;

/**
 * Global error/exception handler (Phase 0 §0.8: no information
 * disclosure). display_errors is always forced off — even in debug mode
 * raw PHP errors are never echoed to the response. In debug mode the JSON
 * error payload includes the real exception message for local
 * troubleshooting; in production it's always a fixed, safe string. Every
 * uncaught throwable is logged in full to the application channel either
 * way.
 */
final class ErrorHandler
{
    public static function register(bool $debug): void
    {
        error_reporting(E_ALL);
        ini_set('display_errors', '0');

        set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
            if (!(error_reporting() & $severity)) {
                return false;
            }

            throw new ErrorException($message, 0, $severity, $file, $line);
        });

        set_exception_handler(static function (Throwable $e) use ($debug): void {
            Logger::channel('application')->critical('Uncaught exception', [
                'exception' => $e::class,
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            if (ob_get_level() > 0) {
                ob_clean();
            }

            $message = $debug ? $e->getMessage() : 'Something went wrong. Please try again.';
            $path = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH) ?: '/';
            $isApiRoute = str_starts_with($path, '/api/') || str_starts_with($path, '/admin/api/');

            if ($isApiRoute) {
                Response::json([
                    'success' => false,
                    'error' => ['code' => 'INTERNAL_ERROR', 'message' => $message],
                ], 500)->send();

                return;
            }

            try {
                Response::html(View::render('errors/500', ['title' => 'Something went wrong']), 500)->send();
            } catch (Throwable) {
                http_response_code(500);
                echo 'Something went wrong. Please try again.';
            }
        });
    }
}
