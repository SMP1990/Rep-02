<?php
/**
 * Admin — Order Management (list). Wireframe stage.
 */
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../includes/functions.php';

$page_title = 'Orders';
$active_nav = 'orders';

$orders = [
    ['id' => 10245, 'number' => 'VLX-10245', 'customer' => 'James Carter', 'items' => 2, 'total' => 249.00,  'payment' => 'Paid',   'status' => 'Delivered',  'date' => '2026-09-04'],
    ['id' => 10244, 'number' => 'VLX-10244', 'customer' => 'Aisha Khan',   'items' => 1, 'total' => 1299.00, 'payment' => 'Paid',   'status' => 'Processing', 'date' => '2026-09-04'],
    ['id' => 10243, 'number' => 'VLX-10243', 'customer' => "Liam O'Neil",  'items' => 1, 'total' => 59.00,   'payment' => 'Unpaid', 'status' => 'Pending',    'date' => '2026-09-03'],
    ['id' => 10242, 'number' => 'VLX-10242', 'customer' => 'Sara Wu',      'items' => 3, 'total' => 349.00,  'payment' => 'Paid',   'status' => 'Shipped',    'date' => '2026-09-03'],
    ['id' => 10241, 'number' => 'VLX-10241', 'customer' => 'Diego Ramos',  'items' => 1, 'total' => 189.00,  'payment' => 'Refunded','status' => 'Cancelled', 'date' => '2026-09-02'],
];

$status_styles = [
    'Delivered'  => 'bg-green-100 text-green-700',
    'Processing' => 'bg-blue-100 text-blue-700',
    'Pending'    => 'bg-amber-100 text-amber-700',
    'Shipped'    => 'bg-indigo-100 text-indigo-700',
    'Cancelled'  => 'bg-red-100 text-red-700',
];

require_once __DIR__ . '/../includes/admin-header.php';
?>

<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
  <div class="flex items-center gap-3">
    <input type="text" placeholder="Search order # or customer..." class="rounded-lg border border-slate-200 px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand">
    <select class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
      <option>All Statuses</option>
      <option>Pending</option>
      <option>Processing</option>
      <option>Shipped</option>
      <option>Delivered</option>
      <option>Cancelled</option>
    </select>
  </div>
</div>

<div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead class="bg-slate-50 text-slate-500 text-left">
        <tr>
          <th class="px-5 py-3 font-medium">Order #</th>
          <th class="px-5 py-3 font-medium">Customer</th>
          <th class="px-5 py-3 font-medium">Items</th>
          <th class="px-5 py-3 font-medium">Total</th>
          <th class="px-5 py-3 font-medium">Payment</th>
          <th class="px-5 py-3 font-medium">Status</th>
          <th class="px-5 py-3 font-medium">Date</th>
          <th class="px-5 py-3 font-medium text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <?php foreach ($orders as $o): ?>
          <tr class="hover:bg-slate-50">
            <td class="px-5 py-3 font-medium text-ink">#<?= htmlspecialchars($o['number']) ?></td>
            <td class="px-5 py-3 text-slate-600"><?= htmlspecialchars($o['customer']) ?></td>
            <td class="px-5 py-3 text-slate-500"><?= $o['items'] ?></td>
            <td class="px-5 py-3 text-slate-700"><?= format_price($o['total']) ?></td>
            <td class="px-5 py-3 text-slate-500"><?= htmlspecialchars($o['payment']) ?></td>
            <td class="px-5 py-3">
              <span class="text-xs font-semibold px-2.5 py-1 rounded-full <?= $status_styles[$o['status']] ?>"><?= $o['status'] ?></span>
            </td>
            <td class="px-5 py-3 text-slate-400"><?= $o['date'] ?></td>
            <td class="px-5 py-3 text-right">
              <a href="/electronics-store/admin/orders/view.php?id=<?= $o['id'] ?>" class="text-brand hover:underline">View</a>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
  <div class="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm text-slate-500">
    <span>Showing 1–5 of 1,284 orders</span>
    <div class="flex gap-2">
      <a href="#" class="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200">‹</a>
      <a href="#" class="h-8 w-8 flex items-center justify-center rounded-lg bg-brand text-white">1</a>
      <a href="#" class="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50">2</a>
      <a href="#" class="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50">›</a>
    </div>
  </div>
</div>

<?php require_once __DIR__ . '/../includes/admin-footer.php'; ?>
