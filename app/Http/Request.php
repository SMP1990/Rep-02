<?php

declare(strict_types=1);

namespace App\Http;

/**
 * Immutable wrapper around the incoming request. Reads $_GET/$_POST or a
 * JSON body depending on Content-Type, and normalizes headers into one
 * dash-separated, uppercase map.
 */
final class Request
{
    private function __construct(
        private readonly array $query,
        private readonly array $body,
        private readonly array $server,
        private readonly array $headers,
    ) {
    }

    public static function fromGlobals(): self
    {
        $server = $_SERVER;
        $headers = self::extractHeaders($server);
        $body = $_POST;

        $contentType = $headers['CONTENT-TYPE'] ?? '';
        if (str_contains($contentType, 'application/json')) {
            $raw = file_get_contents('php://input') ?: '';
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $body = $decoded;
            }
        }

        return new self($_GET, $body, $server, $headers);
    }

    private static function extractHeaders(array $server): array
    {
        $headers = [];

        foreach ($server as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $name = str_replace('_', '-', substr($key, 5));
                $headers[$name] = $value;
            }
        }

        foreach (['CONTENT_TYPE' => 'CONTENT-TYPE', 'CONTENT_LENGTH' => 'CONTENT-LENGTH'] as $src => $dst) {
            if (isset($server[$src])) {
                $headers[$dst] = $server[$src];
            }
        }

        return $headers;
    }

    public function method(): string
    {
        return strtoupper((string) ($this->server['REQUEST_METHOD'] ?? 'GET'));
    }

    public function path(): string
    {
        $uri = (string) ($this->server['REQUEST_URI'] ?? '/');
        $path = parse_url($uri, PHP_URL_PATH);
        $path = is_string($path) && $path !== '' ? $path : '/';

        return $path === '/' ? '/' : rtrim($path, '/');
    }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $this->query[$key] ?? $default;
    }

    public function all(): array
    {
        return array_merge($this->query, $this->body);
    }

    public function header(string $name, ?string $default = null): ?string
    {
        return $this->headers[strtoupper($name)] ?? $default;
    }

    public function ip(): string
    {
        // Shared hosting: trust REMOTE_ADDR only. If a reverse proxy/CDN
        // is ever placed in front of this app, X-Forwarded-For must only
        // be trusted via an explicit, configured proxy allowlist — never
        // taken at face value, since it's trivially spoofable otherwise.
        return (string) ($this->server['REMOTE_ADDR'] ?? '0.0.0.0');
    }

    public function userAgent(): ?string
    {
        return $this->header('User-Agent');
    }
}
