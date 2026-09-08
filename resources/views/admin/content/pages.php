<?php
$renderPageFields = static function (array $item): void {
    ?>
    <div class="row g-3">
        <div class="col-md-6">
            <label class="form-label">Slug</label>
            <input type="text" class="form-control" name="slug" value="<?= e($item['slug'] ?? '') ?>" required>
        </div>
        <div class="col-md-6">
            <label class="form-label">Title</label>
            <input type="text" class="form-control" name="title" value="<?= e($item['title'] ?? '') ?>" required>
        </div>
        <div class="col-12">
            <label class="form-label">Content (HTML)</label>
            <textarea class="form-control" name="content" rows="6" required><?= e($item['content'] ?? '') ?></textarea>
        </div>
        <div class="col-md-6">
            <label class="form-label">Meta title</label>
            <input type="text" class="form-control" name="meta_title" value="<?= e($item['meta_title'] ?? '') ?>">
        </div>
        <div class="col-md-6">
            <label class="form-label">Meta description</label>
            <input type="text" class="form-control" name="meta_description" value="<?= e($item['meta_description'] ?? '') ?>">
        </div>
        <div class="col-md-4 d-flex align-items-end">
            <div class="form-check">
                <input type="checkbox" class="form-check-input" name="is_published" value="1"
                       <?= !isset($item['is_published']) || $item['is_published'] ? 'checked' : '' ?>>
                <label class="form-check-label">Published</label>
            </div>
        </div>
        <div class="col-md-4 d-flex align-items-end">
            <div class="form-check">
                <input type="checkbox" class="form-check-input" name="noindex" value="1" <?= !empty($item['noindex']) ? 'checked' : '' ?>>
                <label class="form-check-label">Noindex</label>
            </div>
        </div>
    </div>
    <?php
};
?>

<h1 class="h4 mb-4">Pages</h1>

<p class="text-body-secondary small">
    These pages are managed here for future use. The public About/Terms/Privacy/
    Copyright/Contact routes currently render fixed templates from the Frontend
    phase — pointing them at this table is a follow-up, not part of this phase.
</p>

<?php if (empty($items)): ?>
    <p class="text-body-secondary">No pages yet — add one below.</p>
<?php endif; ?>

<?php foreach ($items as $item): ?>
    <details class="stat-card mb-3">
        <summary class="fw-semibold" style="cursor: pointer;">
            <?= e($item['title']) ?>
            <span class="text-body-secondary small">— /<?= e($item['slug']) ?></span>
            <?php if (!$item['is_published']): ?><span class="badge text-bg-secondary ms-2">Draft</span><?php endif; ?>
        </summary>

        <form method="post" action="/admin/pages/<?= (int) $item['id'] ?>" class="mt-3">
            <input type="hidden" name="_csrf_token" value="<?= e($csrfToken) ?>">
            <?php $renderPageFields($item); ?>
            <button type="submit" class="btn btn-primary btn-sm mt-3">Save</button>
        </form>
        <form method="post" action="/admin/pages/<?= (int) $item['id'] ?>/delete" class="mt-2"
              onsubmit="return confirm('Delete this page?');">
            <input type="hidden" name="_csrf_token" value="<?= e($csrfToken) ?>">
            <button type="submit" class="btn btn-outline-danger btn-sm">Delete</button>
        </form>
    </details>
<?php endforeach; ?>

<div class="stat-card mt-4">
    <p class="fw-semibold mb-3">Add new page</p>
    <form method="post" action="/admin/pages">
        <input type="hidden" name="_csrf_token" value="<?= e($csrfToken) ?>">
        <?php $renderPageFields([]); ?>
        <button type="submit" class="btn btn-primary mt-3">Create</button>
    </form>
</div>
