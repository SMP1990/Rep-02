<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Support\Database;

/**
 * Key/value site settings (Phase 3 §3.3 `settings` table, FR-14). A
 * generic store rather than fixed columns, so adding a new
 * admin-configurable setting later never needs a migration.
 */
final class SettingsRepository
{
    /** @return array<string, mixed> keyed by setting_key, cast per its stored type */
    public function all(): array
    {
        $stmt = Database::connection()->query('SELECT setting_key, setting_value, setting_type FROM settings');

        $result = [];
        foreach ($stmt->fetchAll() as $row) {
            $result[$row['setting_key']] = $this->cast($row['setting_value'], $row['setting_type']);
        }

        return $result;
    }

    public function set(string $key, string $value, string $type = 'string'): void
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO settings (setting_key, setting_value, setting_type)
             VALUES (:key, :value, :type)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), setting_type = VALUES(setting_type)',
        );
        $stmt->execute(['key' => $key, 'value' => $value, 'type' => $type]);
    }

    private function cast(?string $value, string $type): mixed
    {
        return match ($type) {
            'bool' => $value === '1' || $value === 'true',
            'int' => (int) $value,
            'json' => json_decode((string) $value, true),
            default => $value,
        };
    }
}
