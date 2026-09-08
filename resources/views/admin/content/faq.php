<?php
$renderFaqFields = static function (array $item): void {
    ?>
    <div class="mb-3">
        <label class="form-label">Question</label>
        <input type="text" class="form-control" name="question" value="<?= e($item['question'] ?? '') ?>" required>
    </div>
    <div class="mb-3">
        <label class="form-label">Answer</label>
        <textarea class="form-control" name="answer" rows="3" required><?= e($item['answer'] ?? '') ?></textarea>
    </div>
    <div class="row g-3">
        <div class="col-md-4">
            <label class="form-label">Sort order</label>
            <input type="number" class="form-control" name="sort_order" value="<?= (int) ($item['sort_order'] ?? 0) ?>">
        </div>
        <div class="col-md-4 d-flex align-items-end">
            <div class="form-check">
                <input type="checkbox" class="form-check-input" name="is_published" value="1"
                       <?= !isset($item['is_published']) || $item['is_published'] ? 'checked' : '' ?>>
                <label class="form-check-label">Published</label>
            </div>
        </div>
    </div>
    <?php
};
?>

<h1 class="h4 mb-4">FAQ</h1>

<?php if (empty($items)): ?>
    <p class="text-body-secondary">No FAQ entries yet — add one below.</p>
<?php endif; ?>

<?php foreach ($items as $item): ?>
    <details class="stat-card mb-3">
        <summary class="fw-semibold" style="cursor: pointer;">
            <?= e($item['question']) ?>
            <?php if (!$item['is_published']): ?><span class="badge text-bg-secondary ms-2">Draft</span><?php endif; ?>
        </summary>

        <form method="post" action="/admin/faq/<?= (int) $item['id'] ?>" class="mt-3">
            <input type="hidden" name="_csrf_token" value="<?= e($csrfToken) ?>">
            <?php $renderFaqFields($item); ?>
            <button type="submit" class="btn btn-primary btn-sm mt-2">Save</button>
        </form>
        <form method="post" action="/admin/faq/<?= (int) $item['id'] ?>/delete" class="mt-2"
              onsubmit="return confirm('Delete this FAQ entry?');">
            <input type="hidden" name="_csrf_token" value="<?= e($csrfToken) ?>">
            <button type="submit" class="btn btn-outline-danger btn-sm">Delete</button>
        </form>
    </details>
<?php endforeach; ?>

<div class="stat-card mt-4">
    <p class="fw-semibold mb-3">Add new FAQ entry</p>
    <form method="post" action="/admin/faq">
        <input type="hidden" name="_csrf_token" value="<?= e($csrfToken) ?>">
        <?php $renderFaqFields([]); ?>
        <button type="submit" class="btn btn-primary mt-2">Create</button>
    </form>
</div>
