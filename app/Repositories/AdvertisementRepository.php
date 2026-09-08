<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Support\Database;

/**
 * `advertisements` (Phase 3 §3.3, FR-16) — network-agnostic ad zone
 * config, editable only by an authenticated admin (Phase 6). Rendering
 * these into the public site's ad zones is out of scope here — that's
 * the SEO/Monetization implementation phase.
 */
final class AdvertisementRepository
{
    public function all(): array
    {
        return Database::connection()
            ->query('SELECT * FROM advertisements ORDER BY zone_key, sort_order, id')
            ->fetchAll();
    }

    public function find(int $id): ?array
    {
        $stmt = Database::connection()->prepare('SELECT * FROM advertisements WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    public function create(array $data): void
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO advertisements (zone_key, name, snippet_html, device_target, is_active, sort_order)
             VALUES (:zone_key, :name, :snippet_html, :device_target, :is_active, :sort_order)',
        );
        $stmt->execute($this->bindable($data));
    }

    public function update(int $id, array $data): void
    {
        $stmt = Database::connection()->prepare(
            'UPDATE advertisements
             SET zone_key = :zone_key, name = :name, snippet_html = :snippet_html,
                 device_target = :device_target, is_active = :is_active, sort_order = :sort_order
             WHERE id = :id',
        );
        $stmt->execute($this->bindable($data) + ['id' => $id]);
    }

    public function delete(int $id): void
    {
        $stmt = Database::connection()->prepare('DELETE FROM advertisements WHERE id = :id');
        $stmt->execute(['id' => $id]);
    }

    private function bindable(array $data): array
    {
        return [
            'zone_key' => $data['zone_key'],
            'name' => $data['name'],
            'snippet_html' => ($data['snippet_html'] ?? '') === '' ? null : $data['snippet_html'],
            'device_target' => in_array($data['device_target'] ?? null, ['all', 'desktop', 'mobile'], true)
                ? $data['device_target']
                : 'all',
            'is_active' => empty($data['is_active']) ? 0 : 1,
            'sort_order' => (int) ($data['sort_order'] ?? 0),
        ];
    }
}
