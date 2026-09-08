<h1 class="h4 mb-4">Site Settings</h1>

<form method="post" action="/admin/settings" class="stat-card" style="max-width: 560px;">
    <input type="hidden" name="_csrf_token" value="<?= e($csrfToken) ?>">

    <div class="mb-3">
        <label for="site_name" class="form-label">Site name</label>
        <input type="text" class="form-control" id="site_name" name="site_name" value="<?= e($values['site_name'] ?? '') ?>">
    </div>

    <div class="mb-3">
        <label for="contact_email" class="form-label">Contact email</label>
        <input type="email" class="form-control" id="contact_email" name="contact_email" value="<?= e($values['contact_email'] ?? '') ?>">
    </div>

    <div class="mb-3 form-check">
        <input type="checkbox" class="form-check-input" id="maintenance_mode" name="maintenance_mode" value="1"
               <?= !empty($values['maintenance_mode']) ? 'checked' : '' ?>>
        <label for="maintenance_mode" class="form-check-label">Maintenance mode</label>
    </div>

    <button type="submit" class="btn btn-primary">Save settings</button>
</form>

<p class="text-body-secondary small mt-3" style="max-width: 560px;">
    These settings are stored and manageable here now. Wiring the public site to read
    them live is part of the SEO/Monetization implementation phase, not this one — see
    the Phase 6 notes in <code>docs/media-platform</code>.
</p>
