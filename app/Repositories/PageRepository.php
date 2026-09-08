<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Support\Database;

/**
 * `pages` (Phase 3 §3.3, FR-18) — admin-managed static content. The
 * public About/Terms/Privacy/Copyright/Contact routes (Phase 5) still
 * render hard-coded templates; wiring them to this repository is a
 * follow-up, not part of this phase (see Phase 6 docs).
 */
final class PageRepository
{
    public function all(): array
    {
        return Database::connection()
            ->query('SELECT * FROM pages ORDER BY title')
            ->fetchAll();
    }

    public function find(int $id): ?array
    {
        $stmt = Database::connection()->prepare('SELECT * FROM pages WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    public function create(array $data): void
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO pages (slug, language_code, title, content, meta_title, meta_description, noindex, is_published)
             VALUES (:slug, :language_code, :title, :content, :meta_title, :meta_description, :noindex, :is_published)',
        );
        $stmt->execute($this->bindable($data));
    }

    public function update(int $id, array $data): void
    {
        $stmt = Database::connection()->prepare(
            'UPDATE pages
             SET slug = :slug, language_code = :language_code, title = :title, content = :content,
                 meta_title = :meta_title, meta_description = :meta_description,
                 noindex = :noindex, is_published = :is_published
             WHERE id = :id',
        );
        $stmt->execute($this->bindable($data) + ['id' => $id]);
    }

    public function delete(int $id): void
    {
        $stmt = Database::connection()->prepare('DELETE FROM pages WHERE id = :id');
        $stmt->execute(['id' => $id]);
    }

    private function bindable(array $data): array
    {
        return [
            'slug' => $data['slug'],
            'language_code' => $data['language_code'] ?? 'en',
            'title' => $data['title'],
            'content' => $data['content'],
            'meta_title' => ($data['meta_title'] ?? '') === '' ? null : $data['meta_title'],
            'meta_description' => ($data['meta_description'] ?? '') === '' ? null : $data['meta_description'],
            'noindex' => empty($data['noindex']) ? 0 : 1,
            'is_published' => empty($data['is_published']) ? 0 : 1,
        ];
    }
}
