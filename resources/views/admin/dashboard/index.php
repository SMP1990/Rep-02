<h1 class="h4 mb-4">Dashboard</h1>

<div class="row g-3 mb-4">
    <div class="col-sm-6 col-lg-3">
        <div class="stat-card">
            <p class="text-body-secondary small mb-1">Total requests</p>
            <p class="stat-value mb-0"><?= number_format($totals['total']) ?></p>
        </div>
    </div>
    <div class="col-sm-6 col-lg-3">
        <div class="stat-card">
            <p class="text-body-secondary small mb-1">Successful</p>
            <p class="stat-value mb-0 text-success"><?= number_format($totals['success']) ?></p>
        </div>
    </div>
    <div class="col-sm-6 col-lg-3">
        <div class="stat-card">
            <p class="text-body-secondary small mb-1">Failed</p>
            <p class="stat-value mb-0 text-danger"><?= number_format($totals['failure']) ?></p>
        </div>
    </div>
    <div class="col-sm-6 col-lg-3">
        <div class="stat-card">
            <p class="text-body-secondary small mb-1">Unique visitors (14d)</p>
            <p class="stat-value mb-0"><?= number_format(array_sum(array_column($dailyStats, 'unique_visitors'))) ?></p>
        </div>
    </div>
</div>

<div class="row g-3 mb-4">
    <div class="col-md-4">
        <div class="stat-card">
            <p class="fw-semibold mb-2">Today</p>
            <p class="mb-0 small text-body-secondary">
                Requests: <?= number_format($today['total']) ?>
                · Success: <?= number_format($today['success']) ?>
                · Failed: <?= number_format($today['failure']) ?>
            </p>
        </div>
    </div>
    <div class="col-md-4">
        <div class="stat-card">
            <p class="fw-semibold mb-2">Last 7 days</p>
            <p class="mb-0 small text-body-secondary">
                Requests: <?= number_format($week['total']) ?>
                · Success: <?= number_format($week['success']) ?>
                · Failed: <?= number_format($week['failure']) ?>
            </p>
        </div>
    </div>
    <div class="col-md-4">
        <div class="stat-card">
            <p class="fw-semibold mb-2">Last 30 days</p>
            <p class="mb-0 small text-body-secondary">
                Requests: <?= number_format($month['total']) ?>
                · Success: <?= number_format($month['success']) ?>
                · Failed: <?= number_format($month['failure']) ?>
            </p>
        </div>
    </div>
</div>

<div class="stat-card">
    <p class="fw-semibold mb-3">Daily activity (last 14 days)</p>
    <?php if (empty($dailyStats)): ?>
        <p class="text-body-secondary small mb-0">No activity recorded yet.</p>
    <?php else: ?>
        <?php $maxRequests = max(array_column($dailyStats, 'total_requests')) ?: 1; ?>
        <div class="d-flex flex-column gap-2">
            <?php foreach (array_reverse($dailyStats) as $day): ?>
                <div class="d-flex align-items-center gap-2">
                    <span class="text-body-secondary small" style="width: 90px;"><?= e($day['stat_date']) ?></span>
                    <div class="flex-grow-1 bg-body-tertiary rounded" style="height: 10px;">
                        <div class="bg-primary rounded" style="height: 10px; width: <?= (int) round(($day['total_requests'] / $maxRequests) * 100) ?>%;"></div>
                    </div>
                    <span class="small text-end" style="width: 40px;"><?= (int) $day['total_requests'] ?></span>
                </div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</div>
