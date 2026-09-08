<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Support\Database;

/**
 * `faq` (Phase 3 §3.3, FR-17). The public FAQ pages (Phase 5) still read
 * from a hard-coded array in PageController — wiring them to this
 * repository is a follow-up, not part of this phase (see Phase 6 docs).
 */
final class FaqRepository
{
    public function all(): array
    {
        return Database::connection()
            ->query('SELECT * FROM faq ORDER BY sort_order, id')
            ->fetchAll();
    }

    public function find(int $id): ?array
    {
        $stmt = Database::connection()->prepare('SELECT * FROM faq WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    public function create(array $data): void
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO faq (language_code, question, answer, sort_order, is_published)
             VALUES (:language_code, :question, :answer, :sort_order, :is_published)',
        );
        $stmt->execute($this->bindable($data));
    }

    public function update(int $id, array $data): void
    {
        $stmt = Database::connection()->prepare(
            'UPDATE faq
             SET language_code = :language_code, question = :question, answer = :answer,
                 sort_order = :sort_order, is_published = :is_published
             WHERE id = :id',
        );
        $stmt->execute($this->bindable($data) + ['id' => $id]);
    }

    public function delete(int $id): void
    {
        $stmt = Database::connection()->prepare('DELETE FROM faq WHERE id = :id');
        $stmt->execute(['id' => $id]);
    }

    private function bindable(array $data): array
    {
        return [
            'language_code' => $data['language_code'] ?? 'en',
            'question' => $data['question'],
            'answer' => $data['answer'],
            'sort_order' => (int) ($data['sort_order'] ?? 0),
            'is_published' => empty($data['is_published']) ? 0 : 1,
        ];
    }
}
