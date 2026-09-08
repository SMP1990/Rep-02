<?php $totalPages = max(1, (int) ceil($total / $perPage)); ?>

<h1 class="h4 mb-4">Error Logs</h1>

<p class="text-body-secondary small">
    Uncaught application errors only — the full raw diagnostic trail (every
    channel, more detail) lives in <code>storage/logs/*.log</code> on the server.
</p>

<div class="table-responsive stat-card">
    <table class="table table-sm align-middle mb-0">
        <thead>
            <tr>
                <th>Time</th>
                <th>Channel</th>
                <th>Level</th>
                <th>Message</th>
            </tr>
        </thead>
        <tbody>
            <?php if (empty($rows)): ?>
                <tr>
                    <td colspan="4" class="text-body-secondary text-center py-4">No errors recorded — good sign.</td>
                </tr>
            <?php endif; ?>
            <?php foreach ($rows as $row): ?>
                <tr>
                    <td class="text-nowrap"><?= e($row['created_at']) ?></td>
                    <td><?= e($row['channel']) ?></td>
                    <td>
                        <span class="badge text-bg-<?= $row['level'] === 'critical' ? 'danger' : 'warning' ?>">
                            <?= e($row['level']) ?>
                        </span>
                    </td>
                    <td><?= e($row['message']) ?></td>
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
                    <a class="page-link" href="?page=<?= $p ?>"><?= $p ?></a>
                </li>
            <?php endfor; ?>
        </ul>
    </nav>
<?php endif; ?>
