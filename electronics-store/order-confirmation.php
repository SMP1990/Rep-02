<?php
/**
 * Order Confirmation — looks up an order by its order_number (passed in
 * the URL right after checkout). Not authenticated: the order number is
 * an unguessable random token, which is an acceptable trade-off for a
 * guest checkout of this scope.
 */
require_once __DIR__ . '/includes/bootstrap.php';

$pdo = get_pdo();
$orderNumber = $_GET['order'] ?? '';

$stmt = $pdo->prepare('SELECT * FROM orders WHERE order_number = ?');
$stmt->execute([$orderNumber]);
$order = $stmt->fetch();

$page_title = 'Order Confirmed — Voltix Electronics';
require_once __DIR__ . '/includes/header.php';

if (!$order) {
    echo '<div class="max-w-2xl mx-auto px-4 py-24 text-center">
            <h1 class="text-2xl font-bold text-ink mb-3">Order Not Found</h1>
            <a href="/electronics-store/index.php" class="text-brand font-semibold hover:underline">← Back to Home</a>
          </div>';
    require_once __DIR__ . '/includes/footer.php';
    exit;
}

$itemsStmt = $pdo->prepare('SELECT * FROM order_items WHERE order_id = ?');
$itemsStmt->execute([$order['id']]);
$items = $itemsStmt->fetchAll();
?>

<div class="max-w-3xl mx-auto px-4 py-16">
  <div class="text-center mb-10">
    <div class="h-16 w-16 rounded-full bg-green-100 text-green-600 text-3xl flex items-center justify-center mx-auto mb-4">✓</div>
    <h1 class="text-3xl font-extrabold text-ink mb-2">Thank you for your order!</h1>
    <p class="text-slate-500">Order <span class="font-semibold text-ink">#<?= e($order['order_number']) ?></span> has been placed.</p>
  </div>

  <div class="bg-white border border-slate-100 rounded-xl overflow-hidden mb-6">
    <table class="w-full text-sm">
      <thead class="bg-slate-50 text-slate-500 text-left">
        <tr>
          <th class="px-5 py-3 font-medium">Product</th>
          <th class="px-5 py-3 font-medium">Qty</th>
          <th class="px-5 py-3 font-medium text-right">Total</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <?php foreach ($items as $item): ?>
          <tr>
            <td class="px-5 py-3"><?= e($item['product_name']) ?></td>
            <td class="px-5 py-3 text-slate-500"><?= (int) $item['quantity'] ?></td>
            <td class="px-5 py-3 text-right font-medium"><?= format_price((float) $item['line_total']) ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
    <div class="p-5 border-t border-slate-100 space-y-1.5 text-sm ml-auto max-w-xs">
      <div class="flex justify-between text-slate-500"><span>Subtotal</span><span><?= format_price((float) $order['subtotal']) ?></span></div>
      <div class="flex justify-between text-slate-500"><span>Shipping</span><span><?= format_price((float) $order['shipping_fee']) ?></span></div>
      <div class="flex justify-between font-bold text-ink text-base pt-1.5 border-t border-slate-100"><span>Total</span><span><?= format_price((float) $order['total_amount']) ?></span></div>
    </div>
  </div>

  <div class="grid sm:grid-cols-2 gap-6 mb-10">
    <div class="bg-white border border-slate-100 rounded-xl p-6">
      <h2 class="font-semibold text-ink mb-2">Shipping To</h2>
      <p class="text-sm text-slate-600 leading-relaxed">
        <?= e($order['shipping_full_name']) ?><br>
        <?= e($order['shipping_address_line1']) ?><?= $order['shipping_address_line2'] ? '<br>' . e($order['shipping_address_line2']) : '' ?><br>
        <?= e($order['shipping_city']) ?>, <?= e($order['shipping_state']) ?> <?= e($order['shipping_postal_code']) ?><br>
        <?= e($order['shipping_country']) ?>
      </p>
    </div>
    <div class="bg-white border border-slate-100 rounded-xl p-6">
      <h2 class="font-semibold text-ink mb-2">Payment</h2>
      <p class="text-sm text-slate-600"><?= e(ucfirst(str_replace('_', ' ', $order['payment_method']))) ?></p>
      <p class="text-sm text-slate-500 mt-1">Status: <?= e(ucfirst($order['payment_status'])) ?></p>
    </div>
  </div>

  <div class="text-center">
    <a href="/electronics-store/shop.php" class="text-brand font-semibold hover:underline">Continue Shopping →</a>
  </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
