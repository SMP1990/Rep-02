<?php
/**
 * Admin Dashboard — real aggregate queries against orders/customers/products.
 */
require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/auth.php';
require_admin_login();

$page_title = 'Dashboard';
$active_nav = 'dashboard';

$pdo = get_pdo();

/**
 * Sums/counts $expr from $table over the last 30 days vs the 30 days
 * before that, returning ['value' => current, 'delta' => pct|null].
 * $delta is null when there's no prior-period baseline to compare against.
 */
function period_stat(PDO $pdo, string $table, string $expr, string $dateCol, string $extraWhere = ''): array
{
    $sql = "SELECT
        COALESCE(SUM(CASE WHEN $dateCol >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN $expr ELSE 0 END), 0) AS current_val,
        COALESCE(SUM(CASE WHEN $dateCol >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND $dateCol < DATE_SUB(NOW(), INTERVAL 30 DAY) THEN $expr ELSE 0 END), 0) AS previous_val
        FROM $table $extraWhere";
    $row = $pdo->query($sql)->fetch();

    $current = (float) $row['current_val'];
    $previous = (float) $row['previous_val'];
    $delta = $previous > 0 ? (($current - $previous) / $previous) * 100 : null;

    return ['current' => $current, 'previous' => $previous, 'delta' => $delta];
}

$salesStat     = period_stat($pdo, 'orders', 'total_amount', 'created_at', "WHERE status != 'cancelled'");
$ordersStat    = period_stat($pdo, 'orders', '1', 'created_at');
$customersStat = period_stat($pdo, 'customers', '1', 'created_at');
$productsStat  = period_stat($pdo, 'products', '1', 'created_at');

$totalSales     = (float) $pdo->query("SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status != 'cancelled'")->fetchColumn();
$totalOrders    = (int) $pdo->query('SELECT COUNT(*) FROM orders')->fetchColumn();
$totalCustomers = (int) $pdo->query('SELECT COUNT(*) FROM customers')->fetchColumn();
$totalProducts  = (int) $pdo->query('SELECT COUNT(*) FROM products')->fetchColumn();

$stats = [
    ['label' => 'Total Sales', 'value' => format_price($totalSales),        'delta' => $salesStat['delta'],     'icon' => '💰'],
    ['label' => 'Orders',      'value' => number_format($totalOrders),      'delta' => $ordersStat['delta'],    'icon' => '🧾'],
    ['label' => 'Customers',   'value' => number_format($totalCustomers),   'delta' => $customersStat['delta'], 'icon' => '👥'],
    ['label' => 'Products',    'value' => number_format($totalProducts),    'delta' => $productsStat['delta'],  'icon' => '📦'],
];

// Last 7 days of sales, including days with zero orders.
$dailySales = $pdo->query("
    WITH RECURSIVE days AS (
        SELECT CURDATE() - INTERVAL 6 DAY AS d
        UNION ALL
        SELECT d + INTERVAL 1 DAY FROM days WHERE d < CURDATE()
    )
    SELECT days.d AS day, COALESCE(SUM(o.total_amount), 0) AS total
    FROM days
    LEFT JOIN orders o ON DATE(o.created_at) = days.d AND o.status != 'cancelled'
    GROUP BY days.d
    ORDER BY days.d
")->fetchAll();
$maxDaily = max(1, ...array_map(fn ($r) => (float) $r['total'], $dailySales));

$topCategories = $pdo->query('
    SELECT c.name, COUNT(p.id) AS product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id
    ORDER BY product_count DESC
    LIMIT 5
')->fetchAll();
$maxCategoryCount = max(1, ...array_map(fn ($r) => (int) $r['product_count'], $topCategories ?: [['product_count' => 0]]));

$recentOrders = $pdo->query('
    SELECT o.*, c.full_name AS customer_name
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    ORDER BY o.created_at DESC
    LIMIT 5
')->fetchAll();

$status_styles = [
    'delivered'  => 'bg-green-100 text-green-700',
    'processing' => 'bg-blue-100 text-blue-700',
    'pending'    => 'bg-amber-100 text-amber-700',
    'shipped'    => 'bg-indigo-100 text-indigo-700',
    'cancelled'  => 'bg-red-100 text-red-700',
    'refunded'   => 'bg-slate-200 text-slate-600',
];

require_once __DIR__ . '/includes/admin-header.php';
?>

<!-- Stat Cards -->
<div class="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
  <?php foreach ($stats as $s): ?>
    <div class="bg-white rounded-xl border border-slate-200 p-5">
      <div class="flex items-center justify-between mb-3">
        <span class="text-2xl"><?= $s['icon'] ?></span>
        <?php if ($s['delta'] === null): ?>
          <span class="text-xs font-semibold text-slate-400">New</span>
        <?php else: ?>
          <span class="text-xs font-semibold <?= $s['delta'] >= 0 ? 'text-green-600' : 'text-red-500' ?>">
            <?= $s['delta'] >= 0 ? '▲' : '▼' ?> <?= number_format(abs($s['delta']), 1) ?>%
          </span>
        <?php endif; ?>
      </div>
      <p class="text-2xl font-extrabold text-ink"><?= $s['value'] ?></p>
      <p class="text-sm text-slate-500"><?= $s['label'] ?> <span class="text-slate-300">· last 30 days vs prior 30</span></p>
    </div>
  <?php endforeach; ?>
</div>

<!-- Charts -->
<div class="grid lg:grid-cols-3 gap-5 mb-8">
  <div class="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
    <h2 class="font-semibold text-ink mb-4">Sales — Last 7 Days</h2>
    <div class="h-64 flex items-end gap-3">
      <?php foreach ($dailySales as $row): ?>
        <div class="flex-1 flex flex-col items-center gap-2">
          <div class="w-full bg-brand/15 rounded-t-md relative" style="height: <?= max(4, round(($row['total'] / $maxDaily) * 200)) ?>px">
            <div class="absolute inset-x-0 bottom-0 bg-brand rounded-t-md" style="height: 100%"></div>
          </div>
          <span class="text-[11px] text-slate-400"><?= date('D', strtotime($row['day'])) ?></span>
        </div>
      <?php endforeach; ?>
    </div>
  </div>
  <div class="bg-white rounded-xl border border-slate-200 p-5">
    <h2 class="font-semibold text-ink mb-4">Top Categories</h2>
    <div class="space-y-3">
      <?php foreach ($topCategories as $cat): ?>
        <div>
          <div class="flex justify-between text-xs text-slate-500 mb-1">
            <span><?= e($cat['name']) ?></span>
            <span><?= (int) $cat['product_count'] ?></span>
          </div>
          <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div class="h-full bg-brand rounded-full" style="width: <?= round(((int) $cat['product_count'] / $maxCategoryCount) * 100) ?>%"></div>
          </div>
        </div>
      <?php endforeach; ?>
    </div>
  </div>
</div>

<!-- Recent Orders -->
<div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
  <div class="flex items-center justify-between p-5 border-b border-slate-100">
    <h2 class="font-semibold text-ink">Recent Orders</h2>
    <a href="/electronics-store/admin/orders/index.php" class="text-sm text-brand hover:underline">View all →</a>
  </div>
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead class="bg-slate-50 text-slate-500 text-left">
        <tr>
          <th class="px-5 py-3 font-medium">Order</th>
          <th class="px-5 py-3 font-medium">Customer</th>
          <th class="px-5 py-3 font-medium">Total</th>
          <th class="px-5 py-3 font-medium">Status</th>
          <th class="px-5 py-3 font-medium">Date</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <?php if (!$recentOrders): ?>
          <tr><td colspan="5" class="px-5 py-8 text-center text-slate-400">No orders yet.</td></tr>
        <?php endif; ?>
        <?php foreach ($recentOrders as $o): ?>
          <tr class="hover:bg-slate-50">
            <td class="px-5 py-3 font-medium text-ink">#<?= e($o['order_number']) ?></td>
            <td class="px-5 py-3 text-slate-600"><?= e($o['customer_name'] ?? $o['guest_email'] ?? '—') ?></td>
            <td class="px-5 py-3 text-slate-600"><?= format_price((float) $o['total_amount']) ?></td>
            <td class="px-5 py-3">
              <span class="text-xs font-semibold px-2.5 py-1 rounded-full <?= $status_styles[$o['status']] ?>"><?= ucfirst($o['status']) ?></span>
            </td>
            <td class="px-5 py-3 text-slate-400"><?= date('Y-m-d', strtotime($o['created_at'])) ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>

<?php require_once __DIR__ . '/includes/admin-footer.php'; ?>
