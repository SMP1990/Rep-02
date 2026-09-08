<?php

declare(strict_types=1);

namespace App\Http;

/**
 * Every response the app sends uses one of these factory methods, which
 * guarantees the { success, data } / { success, error: { code, message } }
 * envelope (Phase 1 §1.3) is applied consistently. Security headers are
 * set here as defense-in-depth alongside public/.htaccess.
 */
final class Response
{
    private function __construct(
        private readonly int $status,
        private readonly array $headers,
        private readonly string $body,
    ) {
    }

    public static function json(array $payload, int $status = 200, array $headers = []): self
    {
        $headers['Content-Type'] = 'application/json; charset=utf-8';
        $encoded = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        return new self($status, $headers, $encoded === false ? '{}' : $encoded);
    }

    public static function success(array $data = [], int $status = 200): self
    {
        return self::json(['success' => true, 'data' => $data], $status);
    }

    public static function error(string $code, string $message, int $status = 400): self
    {
        return self::json([
            'success' => false,
            'error' => ['code' => $code, 'message' => $message],
        ], $status);
    }

    public static function html(string $body, int $status = 200): self
    {
        return new self($status, ['Content-Type' => 'text/html; charset=utf-8'], $body);
    }

    /**
     * 303 (not 302) so a redirect after a POST always becomes a GET on the
     * client — the standard Post/Redirect/Get pattern the admin dashboard's
     * plain HTML forms rely on to avoid a resubmission prompt on refresh.
     */
    public static function redirect(string $location, int $status = 303): self
    {
        return new self($status, ['Location' => $location], '');
    }

    public function status(): int
    {
        return $this->status;
    }

    public function send(): void
    {
        if (!headers_sent()) {
            http_response_code($this->status);

            foreach ($this->securityHeaders() as $name => $value) {
                header("{$name}: {$value}");
            }

            foreach ($this->headers as $name => $value) {
                header("{$name}: {$value}");
            }
        }

        echo $this->body;
    }

    private function securityHeaders(): array
    {
        return [
            'X-Content-Type-Options' => 'nosniff',
            'X-Frame-Options' => 'DENY',
            'Referrer-Policy' => 'strict-origin-when-cross-origin',
        ];
    }
}
