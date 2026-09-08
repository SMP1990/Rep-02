<?php

declare(strict_types=1);

namespace App\Support;

use PDO;
use PDOException;
use RuntimeException;

/**
 * Single PDO connection, built from config/database.php. Every query the
 * application ever runs goes through this connection's prepared
 * statements — nothing here or in app/Repositories builds SQL by string
 * concatenation.
 */
final class Database
{
    private static ?PDO $connection = null;

    public static function connection(): PDO
    {
        if (self::$connection instanceof PDO) {
            return self::$connection;
        }

        $config = Config::get('database', []);

        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $config['host'] ?? '127.0.0.1',
            $config['port'] ?? 3306,
            $config['database'] ?? '',
            $config['charset'] ?? 'utf8mb4',
        );

        try {
            self::$connection = new PDO($dsn, $config['username'] ?? '', $config['password'] ?? '', [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (PDOException $e) {
            Logger::channel('application')->critical('Database connection failed', [
                'exception' => $e->getMessage(),
            ]);

            throw new RuntimeException('Database connection failed.', previous: $e);
        }

        return self::$connection;
    }
}
