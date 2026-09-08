<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Loads config/.env (if present) into the process environment, then loads
 * every config/*.php file into a dot-addressable store. Real environment
 * variables set by the hosting platform always win over config/.env — the
 * file is a local-development/deploy-time convenience, never an override
 * of the host's own configuration.
 */
final class Config
{
    private static array $items = [];
    private static bool $booted = false;

    public static function boot(string $configPath, string $envFile): void
    {
        if (self::$booted) {
            return;
        }

        self::loadEnvFile($envFile);
        self::loadConfigFiles(rtrim($configPath, '/'));
        self::$booted = true;
    }

    private static function loadEnvFile(string $envFile): void
    {
        if (!is_file($envFile) || !is_readable($envFile)) {
            return;
        }

        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
                continue;
            }

            [$key, $value] = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);

            if ($key === '' || array_key_exists($key, $_ENV) || getenv($key) !== false) {
                continue;
            }

            if (strlen($value) >= 2) {
                $first = $value[0];
                $last = $value[strlen($value) - 1];
                if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                    $value = substr($value, 1, -1);
                }
            }

            $_ENV[$key] = $value;
            putenv("{$key}={$value}");
        }
    }

    private static function loadConfigFiles(string $configPath): void
    {
        foreach (glob($configPath . '/*.php') ?: [] as $file) {
            self::$items[basename($file, '.php')] = require $file;
        }
    }

    /**
     * Read a raw environment value, with basic scalar coercion for the
     * literal strings "true"/"false"/"null" so config/*.php files don't
     * each need their own casting logic.
     */
    public static function env(string $key, mixed $default = null): mixed
    {
        $value = $_ENV[$key] ?? getenv($key);

        if ($value === false || $value === null) {
            return $default;
        }

        return match (strtolower((string) $value)) {
            'true' => true,
            'false' => false,
            'null' => null,
            default => $value,
        };
    }

    /**
     * Read a config value by dot path, e.g. Config::get('security.rate_limit.processing').
     */
    public static function get(string $dotKey, mixed $default = null): mixed
    {
        $value = self::$items;

        foreach (explode('.', $dotKey) as $segment) {
            if (!is_array($value) || !array_key_exists($segment, $value)) {
                return $default;
            }
            $value = $value[$segment];
        }

        return $value;
    }
}
