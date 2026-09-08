<?php
$renderAdFields = static function (array $ad): void {
    $zones = ['header', 'in_content', 'results', 'footer', 'mobile'];
    $devices = ['all', 'desktop', 'mobile'];
    ?>
    <div class="row g-3">
        <div class="col-md-6">
            <label class="form-label">Zone</label>
            <select class="form-select" name="zone_key">
                <?php foreach ($zones as $zone): ?>
                    <option value="<?= e($zone) ?>" <?= ($ad['zone_key'] ?? '') === $zone ? 'selected' : '' ?>><?= e($zone) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="col-md-6">
            <label class="form-label">Name</label>
            <input type="text" class="form-control" name="name" value="<?= e($ad['name'] ?? '') ?>" required>
        </div>
        <div class="col-12">
            <label class="form-label">Snippet / HTML</label>
            <textarea class="form-control" name="snippet_html" rows="3"><?= e($ad['snippet_html'] ?? '') ?></textarea>
        </div>
        <div class="col-md-4">
            <label class="form-label">Device</label>
            <select class="form-select" name="device_target">
                <?php foreach ($devices as $device): ?>
                    <option value="<?= e($device) ?>" <?= ($ad['device_target'] ?? 'all') === $device ? 'selected' : '' ?>><?= e($device) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="col-md-4">
            <label class="form-label">Sort order</label>
            <input type="number" class="form-control" name="sort_order" value="<?= (int) ($ad['sort_order'] ?? 0) ?>">
        </div>
        <div class="col-md-4 d-flex align-items-end">
            <div class="form-check">
                <input type="checkbox" class="form-check-input" name="is_active" value="1" <?= !empty($ad['is_active']) ? 'checked' : '' ?>>
                <label class="form-check-label">Active</label>
            </div>
        </div>
    </div>
    <?php
};
?>

<h1 class="h4 mb-4">Advertisements</h1>

<?php if (empty($ads)): ?>
    <p class="text-body-secondary">No ad zones yet — add one below.</p>
<?php endif; ?>

<?php foreach ($ads as $ad): ?>
    <details class="stat-card mb-3">
        <summary class="fw-semibold" style="cursor: pointer;">
            <?= e($ad['name']) ?>
            <span class="badge text-bg-<?= $ad['is_active'] ? 'success' : 'secondary' ?> ms-2">
                <?= $ad['is_active'] ? 'Active' : 'Inactive' ?>
            </span>
            <span class="text-body-secondary small">— zone: <?= e($ad['zone_key']) ?></span>
        </summary>

        <form method="post" action="/admin/ads/<?= (int) $ad['id'] ?>" class="mt-3">
            <input type="hidden" name="_csrf_token" value="<?= e($csrfToken) ?>">
            <?php $renderAdFields($ad); ?>
            <button type="submit" class="btn btn-primary btn-sm mt-3">Save</button>
        </form>
        <form method="post" action="/admin/ads/<?= (int) $ad['id'] ?>/delete" class="mt-2"
              onsubmit="return confirm('Delete this ad zone?');">
            <input type="hidden" name="_csrf_token" value="<?= e($csrfToken) ?>">
            <button type="submit" class="btn btn-outline-danger btn-sm">Delete</button>
        </form>
    </details>
<?php endforeach; ?>

<div class="stat-card mt-4">
    <p class="fw-semibold mb-3">Add new ad zone</p>
    <form method="post" action="/admin/ads">
        <input type="hidden" name="_csrf_token" value="<?= e($csrfToken) ?>">
        <?php $renderAdFields([]); ?>
        <button type="submit" class="btn btn-primary mt-3">Create</button>
    </form>
</div>
