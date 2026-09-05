<?php
/**
 * Admin — Customer Management. Wireframe stage.
 */
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../includes/functions.php';

$page_title = 'Customers';
$active_nav = 'customers';

$customers = [
    ['id' => 1, 'name' => 'James Carter', 'email' => 'james.carter@example.com', 'orders' => 6,  'spent' => 1842.00, 'joined' => '2025-11-02', 'status' => 'Active'],
    ['id' => 2, 'name' => 'Aisha Khan',   'email' => 'aisha.khan@example.com',   'orders' => 3,  'spent' => 2648.00, 'joined' => '2025-12-14', 'status' => 'Active'],
    ['id' => 3, 'name' => "Liam O'Neil",  'email' => 'liam.oneil@example.com',   'orders' => 1,  'spent' => 59.00,   'joined' => '2026-02-20', 'status' => 'Active'],
    ['id' => 4, 'name' => 'Sara Wu',      'email' => 'sara.wu@example.com',      'orders' => 9,  'spent' => 3120.00, 'joined' => '2025-08-09', 'status' => 'Active'],
    ['id' => 5, 'name' => 'Diego Ramos',  'email' => 'diego.ramos@example.com',  'orders' => 2,  'spent' => 378.00,  'joined' => '2026-04-30', 'status' => 'Inactive'],
];

require_once __DIR__ . '/../includes/admin-header.php';
?>

<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
  <input type="text" placeholder="Search customers..." class="rounded-lg border border-slate-200 px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand">
</div>

<div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead class="bg-slate-50 text-slate-500 text-left">
        <tr>
          <th class="px-5 py-3 font-medium">Customer</th>
          <th class="px-5 py-3 font-medium">Email</th>
          <th class="px-5 py-3 font-medium">Orders</th>
          <th class="px-5 py-3 font-medium">Total Spent</th>
          <th class="px-5 py-3 font-medium">Joined</th>
          <th class="px-5 py-3 font-medium">Status</th>
          <th class="px-5 py-3 font-medium text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <?php foreach ($customers as $c): ?>
          <tr class="hover:bg-slate-50">
            <td class="px-5 py-3 flex items-center gap-3">
              <div class="h-9 w-9 rounded-full bg-brand/10 text-brand font-semibold flex items-center justify-center text-sm shrink-0">
                <?= strtoupper(substr($c['name'], 0, 1)) ?>
              </div>
              <span class="font-medium text-ink"><?= htmlspecialchars($c['name']) ?></span>
            </td>
            <td class="px-5 py-3 text-slate-500"><?= htmlspecialchars($c['email']) ?></td>
            <td class="px-5 py-3 text-slate-600"><?= $c['orders'] ?></td>
            <td class="px-5 py-3 text-slate-700"><?= format_price($c['spent']) ?></td>
            <td class="px-5 py-3 text-slate-400"><?= $c['joined'] ?></td>
            <td class="px-5 py-3">
              <span class="text-xs font-semibold px-2.5 py-1 rounded-full <?= $c['status'] === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600' ?>">
                <?= $c['status'] ?>
              </span>
            </td>
            <td class="px-5 py-3 text-right">
              <a href="#" class="text-brand hover:underline">View</a>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
  <div class="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm text-slate-500">
    <span>Showing 1–5 of 3,942 customers</span>
    <div class="flex gap-2">
      <a href="#" class="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200">‹</a>
      <a href="#" class="h-8 w-8 flex items-center justify-center rounded-lg bg-brand text-white">1</a>
      <a href="#" class="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50">2</a>
      <a href="#" class="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50">›</a>
    </div>
  </div>
</div>

<?php require_once __DIR__ . '/../includes/admin-footer.php'; ?>
