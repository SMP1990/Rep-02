<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Structured, channel-based file logger (Phase 1 §1.6.3: application,
 * processing, security channels). Writes one JSON object per line to
 * storage/logs/{channel}.log. Never throws — a logging failure must not
 * break the request it's trying to describe.
 *
 * Context values under a known-sensitive key are redacted before the line
 * is written, as a mechanical backstop for the "never log credentials"
 * rule (Phase 0 §0.8) — not a substitute for callers being careful about
 * what they pass in.
 */
final class Logger
{
    private const SENSITIVE_KEYS = [
        'password', 'password_hash', 'token', 'csrf_token',
        'session_id', 'authorization', 'cookie',
    ];

    private function __construct(
        private readonly string $channel,
        private readonly string $logDirectory,
    ) {
    }

    public static function channel(string $channel): self
    {
        return new self($channel, dirname(__DIR__, 2) . '/storage/logs');
    }

    public function info(string $message, array $context = []): void
    {
        $this->write('info', $message, $context);
    }

    public function warning(string $message, array $context = []): void
    {
        $this->write('warning', $message, $context);
    }

    public function error(string $message, array $context = []): void
    {
        $this->write('error', $message, $context);
    }

    public function critical(string $message, array $context = []): void
    {
        $this->write('critical', $message, $context);
    }

    private function write(string $level, string $message, array $context): void
    {
        if (!is_dir($this->logDirectory)) {
            @mkdir($this->logDirectory, 0755, true);
        }

        $line = json_encode([
            'timestamp' => date('c'),
            'level' => $level,
            'channel' => $this->channel,
            'message' => $message,
            'context' => $this->redact($context),
        ], JSON_UNESCAPED_SLASHES);

        if ($line === false) {
            return;
        }

        $safeChannel = preg_replace('/[^a-z0-9_-]/i', '_', $this->channel) ?? 'app';
        @file_put_contents($this->logDirectory . '/' . $safeChannel . '.log', $line . PHP_EOL, FILE_APPEND | LOCK_EX);
    }

    private function redact(array $context): array
    {
        foreach ($context as $key => $value) {
            if (is_array($value)) {
                $context[$key] = $this->redact($value);
                continue;
            }
            if (is_string($key) && in_array(strtolower($key), self::SENSITIVE_KEYS, true)) {
                $context[$key] = '[REDACTED]';
            }
        }

        return $context;
    }
}
