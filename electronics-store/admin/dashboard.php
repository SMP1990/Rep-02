<?php
/**
 * Admin Dashboard — analytics overview. Wireframe stage: hardcoded
 * placeholder numbers; Phase 2 replaces with real aggregate queries.
 */
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../includes/functions.php';

$page_title = 'Dashboard';
$active_nav = 'dashboard';

$stats = [
    ['label' => 'Total Sales',    'value' => format_price(84250.00), 'delta' => '+12.4%', 'up' => true,  'icon' => '💰'],
    ['label' => 'Orders',         'value' => '1,284',                'delta' => '+8.1%',  'up' => true,  'icon' => '🧾'],
    ['label' => 'Customers',      'value' => '3,942',                'delta' => '+3.6%',  'up' => true,  'icon' => '👥'],
    ['label' => 'Products',       'value' => '218',                  'delta' => '-1.2%',  'up' => false, 'icon' => '📦'],
];

$recent_orders = [
    ['id' => '#VLX-10245', 'customer' => 'James Carter',  'total' => 249.00,  'status' => 'Delivered',  'date' => '2026-09-04'],
    ['id' => '#VLX-10244', 'customer' => 'Aisha Khan',    'total' => 1299.00, 'status' => 'Processing', 'date' => '2026-09-04'],
    ['id' => '#VLX-10243', 'customer' => 'Liam O\'Neil',  'total' => 59.00,   'status' => 'Pending',    'date' => '2026-09-03'],
    ['id' => '#VLX-10242', 'customer' => 'Sara Wu',       'total' => 349.00,  'status' => 'Shipped',    'date' => '2026-09-03'],
    ['id' => '#VLX-10241', 'customer' => 'Diego Ramos',   'total' => 189.00,  'status' => 'Cancelled',  'date' => '2026-09-02'],
];

$status_styles = [
    'Delivered'  => 'bg-green-100 text-green-700',
    'Processing' => 'bg-blue-100 text-blue-700',
    'Pending'    => 'bg-amber-100 text-amber-700',
    'Shipped'    => 'bg-indigo-100 text-indigo-700',
    'Cancelled'  => 'bg-red-100 text-red-700',
];

require_once __DIR__ . '/includes/admin-header.php';
?>

<!-- Stat Cards -->
<div class="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
  <?php foreach ($stats as $s): ?>
    <div class="bg-white rounded-xl border border-slate-200 p-5">
      <div class="flex items-center justify-between mb-3">
        <span class="text-2xl"><?= $s['icon'] ?></span>
        <span class="text-xs font-semibold <?= $s['up'] ? 'text-green-600' : 'text-red-500' ?>">
          <?= $s['up'] ? '▲' : '▼' ?> <?= $s['delta'] ?>
        </span>
      </div>
      <p class="text-2xl font-extrabold text-ink"><?= $s['value'] ?></p>
      <p class="text-sm text-slate-500"><?= $s['label'] ?></p>
    </div>
  <?php endforeach; ?>
</div>

<!-- Charts (placeholders) -->
<div class="grid lg:grid-cols-3 gap-5 mb-8">
  <div class="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
    <h2 class="font-semibold text-ink mb-4">Sales Overview</h2>
    <div class="h-64 rounded-lg img-placeholder">📈 Chart Placeholder</div>
  </div>
  <div class="bg-white rounded-xl border border-slate-200 p-5">
    <h2 class="font-semibold text-ink mb-4">Top Categories</h2>
    <div class="h-64 rounded-lg img-placeholder">🥧 Chart Placeholder</div>
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
        <?php foreach ($recent_orders as $o): ?>
          <tr class="hover:bg-slate-50">
            <td class="px-5 py-3 font-medium text-ink"><?= htmlspecialchars($o['id']) ?></td>
            <td class="px-5 py-3 text-slate-600"><?= htmlspecialchars($o['customer']) ?></td>
            <td class="px-5 py-3 text-slate-600"><?= format_price($o['total']) ?></td>
            <td class="px-5 py-3">
              <span class="text-xs font-semibold px-2.5 py-1 rounded-full <?= $status_styles[$o['status']] ?>"><?= $o['status'] ?></span>
            </td>
            <td class="px-5 py-3 text-slate-400"><?= $o['date'] ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>

<?php require_once __DIR__ . '/includes/admin-footer.php'; ?>
