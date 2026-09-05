<?php
/**
 * Admin — Order Detail. Wireframe stage: hardcoded sample order.
 * Phase 2 loads the order + order_items by $_GET['id'] and wires up the
 * status-update action.
 */
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../includes/functions.php';

$page_title = 'Order #VLX-10245';
$active_nav = 'orders';

$order = [
    'number'   => 'VLX-10245',
    'status'   => 'Delivered',
    'payment'  => 'Paid (Card)',
    'date'     => '2026-09-04 14:32',
    'customer' => ['name' => 'James Carter', 'email' => 'james.carter@example.com', 'phone' => '+1 555-0134'],
    'address'  => ['line1' => '482 Maple Street', 'city' => 'Austin', 'state' => 'TX', 'zip' => '73301', 'country' => 'USA'],
    'items'    => [
        ['name' => 'PulseCam 4K Action Cam', 'sku' => 'PLT-CAM4K', 'qty' => 1, 'price' => 249.00],
    ],
    'subtotal' => 249.00,
    'shipping' => 0.00,
    'discount' => 0.00,
    'tax'      => 0.00,
    'total'    => 249.00,
];

require_once __DIR__ . '/../includes/admin-header.php';
?>

<a href="/electronics-store/admin/orders/index.php" class="text-sm text-slate-500 hover:text-brand">← Back to Orders</a>

<div class="grid lg:grid-cols-3 gap-6 mt-4">

  <div class="lg:col-span-2 space-y-6">
    <div class="bg-white rounded-xl border border-slate-200 p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-semibold text-ink">Order Items</h2>
        <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700"><?= htmlspecialchars($order['status']) ?></span>
      </div>
      <table class="w-full text-sm">
        <thead class="text-slate-500 text-left border-b border-slate-100">
          <tr>
            <th class="py-2 font-medium">Product</th>
            <th class="py-2 font-medium">SKU</th>
            <th class="py-2 font-medium">Qty</th>
            <th class="py-2 font-medium text-right">Price</th>
            <th class="py-2 font-medium text-right">Total</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <?php foreach ($order['items'] as $item): ?>
            <tr>
              <td class="py-3 flex items-center gap-3">
                <div class="h-9 w-9 rounded-lg img-placeholder text-sm shrink-0">📦</div>
                <?= htmlspecialchars($item['name']) ?>
              </td>
              <td class="py-3 text-slate-500"><?= htmlspecialchars($item['sku']) ?></td>
              <td class="py-3 text-slate-500"><?= $item['qty'] ?></td>
              <td class="py-3 text-right"><?= format_price($item['price']) ?></td>
              <td class="py-3 text-right font-medium"><?= format_price($item['price'] * $item['qty']) ?></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
      <div class="border-t border-slate-100 mt-4 pt-4 space-y-1.5 text-sm ml-auto max-w-xs">
        <div class="flex justify-between text-slate-500"><span>Subtotal</span><span><?= format_price($order['subtotal']) ?></span></div>
        <div class="flex justify-between text-slate-500"><span>Shipping</span><span><?= format_price($order['shipping']) ?></span></div>
        <div class="flex justify-between text-slate-500"><span>Discount</span><span>-<?= format_price($order['discount']) ?></span></div>
        <div class="flex justify-between font-bold text-ink text-base pt-1.5 border-t border-slate-100"><span>Total</span><span><?= format_price($order['total']) ?></span></div>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-6">
      <h2 class="font-semibold text-ink mb-4">Update Status</h2>
      <div class="flex gap-3">
        <select class="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          <?php foreach (['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'] as $s): ?>
            <option <?= $s === $order['status'] ? 'selected' : '' ?>><?= $s ?></option>
          <?php endforeach; ?>
        </select>
        <button class="bg-brand hover:bg-brand-dark text-white font-semibold px-5 rounded-lg">Update</button>
      </div>
    </div>
  </div>

  <div class="space-y-6">
    <div class="bg-white rounded-xl border border-slate-200 p-6">
      <h2 class="font-semibold text-ink mb-3">Customer</h2>
      <p class="text-sm font-medium text-ink"><?= htmlspecialchars($order['customer']['name']) ?></p>
      <p class="text-sm text-slate-500"><?= htmlspecialchars($order['customer']['email']) ?></p>
      <p class="text-sm text-slate-500"><?= htmlspecialchars($order['customer']['phone']) ?></p>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-6">
      <h2 class="font-semibold text-ink mb-3">Shipping Address</h2>
      <p class="text-sm text-slate-600 leading-relaxed">
        <?= htmlspecialchars($order['address']['line1']) ?><br>
        <?= htmlspecialchars($order['address']['city']) ?>, <?= htmlspecialchars($order['address']['state']) ?> <?= htmlspecialchars($order['address']['zip']) ?><br>
        <?= htmlspecialchars($order['address']['country']) ?>
      </p>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-6">
      <h2 class="font-semibold text-ink mb-3">Payment</h2>
      <p class="text-sm text-slate-600"><?= htmlspecialchars($order['payment']) ?></p>
      <p class="text-xs text-slate-400 mt-1">Placed on <?= htmlspecialchars($order['date']) ?></p>
    </div>
  </div>
</div>

<?php require_once __DIR__ . '/../includes/admin-footer.php'; ?>
