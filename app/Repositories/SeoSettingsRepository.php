<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Support\Database;

/**
 * `seo_settings` (Phase 3 §3.3) — meta overrides for non-CMS routes plus
 * the sitewide `global` fallback row. `pages` carries its own SEO columns
 * inline and isn't covered here.
 */
final class SeoSettingsRepository
{
    public function findByRouteKey(string $routeKey): ?array
    {
        $stmt = Database::connection()->prepare('SELECT * FROM seo_settings WHERE route_key = :route_key LIMIT 1');
        $stmt->execute(['route_key' => $routeKey]);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    public function upsert(string $routeKey, array $data): void
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO seo_settings (route_key, meta_title, meta_description, og_image_path, canonical_override, noindex)
             VALUES (:route_key, :meta_title, :meta_description, :og_image_path, :canonical_override, :noindex)
             ON DUPLICATE KEY UPDATE
                meta_title = VALUES(meta_title),
                meta_description = VALUES(meta_description),
                og_image_path = VALUES(og_image_path),
                canonical_override = VALUES(canonical_override),
                noindex = VALUES(noindex)',
        );
        $stmt->execute([
            'route_key' => $routeKey,
            'meta_title' => $this->nullIfEmpty($data['meta_title'] ?? null),
            'meta_description' => $this->nullIfEmpty($data['meta_description'] ?? null),
            'og_image_path' => $this->nullIfEmpty($data['og_image_path'] ?? null),
            'canonical_override' => $this->nullIfEmpty($data['canonical_override'] ?? null),
            'noindex' => empty($data['noindex']) ? 0 : 1,
        ]);
    }

    private function nullIfEmpty(mixed $value): ?string
    {
        $value = is_string($value) ? trim($value) : $value;

        return ($value === null || $value === '') ? null : (string) $value;
    }
}
