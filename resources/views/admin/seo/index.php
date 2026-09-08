<h1 class="h4 mb-4">SEO Settings</h1>

<?php foreach ($rows as $key => $row): ?>
    <form method="post" action="/admin/seo/<?= e($key) ?>" class="stat-card mb-3">
        <input type="hidden" name="_csrf_token" value="<?= e($csrfToken) ?>">
        <p class="fw-semibold mb-3"><?= e($key) ?></p>

        <div class="mb-3">
            <label class="form-label">Meta title</label>
            <input type="text" class="form-control" name="meta_title" value="<?= e($row['meta_title'] ?? '') ?>">
        </div>
        <div class="mb-3">
            <label class="form-label">Meta description</label>
            <textarea class="form-control" name="meta_description" rows="2"><?= e($row['meta_description'] ?? '') ?></textarea>
        </div>
        <div class="mb-3">
            <label class="form-label">Canonical override</label>
            <input type="text" class="form-control" name="canonical_override" value="<?= e($row['canonical_override'] ?? '') ?>">
        </div>
        <div class="mb-3 form-check">
            <input type="checkbox" class="form-check-input" name="noindex" value="1" <?= !empty($row['noindex']) ? 'checked' : '' ?>>
            <label class="form-check-label">Noindex</label>
        </div>

        <button type="submit" class="btn btn-primary btn-sm">Save</button>
    </form>
<?php endforeach; ?>
