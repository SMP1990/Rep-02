<?php $totalPages = max(1, (int) ceil($total / $perPage)); ?>

<h1 class="h4 mb-4">Processing Logs</h1>

<div class="mb-3 btn-group" role="group">
    <a href="/admin/logs/processing" class="btn btn-sm btn-outline-secondary <?= $status === null ? 'active' : '' ?>">All</a>
    <a href="/admin/logs/processing?status=success" class="btn btn-sm btn-outline-success <?= $status === 'success' ? 'active' : '' ?>">Success</a>
    <a href="/admin/logs/processing?status=failure" class="btn btn-sm btn-outline-danger <?= $status === 'failure' ? 'active' : '' ?>">Failure</a>
</div>

<div class="table-responsive stat-card">
    <table class="table table-sm align-middle mb-0">
        <thead>
            <tr>
                <th>Time</th>
                <th>Type</th>
                <th>Source</th>
                <th>Provider</th>
                <th>Status</th>
                <th>Error</th>
                <th>Duration</th>
            </tr>
        </thead>
        <tbody>
            <?php if (empty($rows)): ?>
                <tr>
                    <td colspan="7" class="text-body-secondary text-center py-4">No processing requests recorded yet.</td>
                </tr>
            <?php endif; ?>
            <?php foreach ($rows as $row): ?>
                <tr>
                    <td class="text-nowrap"><?= e($row['created_at']) ?></td>
                    <td><?= e($row['request_type']) ?></td>
                    <td><?= e($row['source_platform'] ?? '—') ?></td>
                    <td><?= e($row['provider_name'] ?? '—') ?></td>
                    <td>
                        <span class="badge text-bg-<?= $row['status'] === 'success' ? 'success' : 'danger' ?>">
                            <?= e($row['status']) ?>
                        </span>
                    </td>
                    <td><?= e($row['error_code'] ?? '—') ?></td>
                    <td><?= $row['duration_ms'] !== null ? (int) $row['duration_ms'] . ' ms' : '—' ?></td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
</div>

<?php if ($totalPages > 1): ?>
    <nav class="mt-3">
        <ul class="pagination pagination-sm">
            <?php for ($p = 1; $p <= $totalPages; $p++): ?>
                <li class="page-item <?= $p === $page ? 'active' : '' ?>">
                    <a class="page-link" href="?page=<?= $p ?><?= $status ? '&status=' . e($status) : '' ?>"><?= $p ?></a>
                </li>
            <?php endfor; ?>
        </ul>
    </nav>
<?php endif; ?>
