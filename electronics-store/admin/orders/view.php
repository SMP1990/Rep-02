<?php
/**
 * Admin — Order Detail. Loads the real order + items by ?id=, handles
 * the status-update form.
 */
require_once __DIR__ . '/../../includes/bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_admin_login();

$pdo = get_pdo();
$id = (int) ($_GET['id'] ?? 0);

$validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf($_POST['csrf_token'] ?? null)) {
        flash_set('error', 'Your session expired. Please try again.');
    } else {
        $newStatus = $_POST['status'] ?? '';
        if (in_array($newStatus, $validStatuses, true)) {
            $pdo->prepare('UPDATE orders SET status = ? WHERE id = ?')->execute([$newStatus, $id]);
            flash_set('success', 'Order status updated to "' . ucfirst($newStatus) . '".');
        }
    }
    redirect('/electronics-store/admin/orders/view.php?id=' . $id);
}

$stmt = $pdo->prepare('
    SELECT o.*, c.full_name AS customer_name, c.email AS customer_email
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    WHERE o.id = ?
');
$stmt->execute([$id]);
$order = $stmt->fetch();

if (!$order) {
    flash_set('error', 'Order not found.');
    redirect('/electronics-store/admin/orders/index.php');
}

$itemsStmt = $pdo->prepare('SELECT * FROM order_items WHERE order_id = ?');
$itemsStmt->execute([$id]);
$items = $itemsStmt->fetchAll();

$page_title = 'Order #' . $order['order_number'];
$active_nav = 'orders';

$status_styles = [
    'delivered'  => 'bg-green-100 text-green-700',
    'processing' => 'bg-blue-100 text-blue-700',
    'pending'    => 'bg-amber-100 text-amber-700',
    'shipped'    => 'bg-indigo-100 text-indigo-700',
    'cancelled'  => 'bg-red-100 text-red-700',
    'refunded'   => 'bg-slate-200 text-slate-600',
];

require_once __DIR__ . '/../includes/admin-header.php';
?>

<a href="/electronics-store/admin/orders/index.php" class="text-sm text-slate-500 hover:text-brand">← Back to Orders</a>

<div class="grid lg:grid-cols-3 gap-6 mt-4">

  <div class="lg:col-span-2 space-y-6">
    <div class="bg-white rounded-xl border border-slate-200 p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-semibold text-ink">Order Items</h2>
        <span class="text-xs font-semibold px-2.5 py-1 rounded-full <?= $status_styles[$order['status']] ?>"><?= ucfirst($order['status']) ?></span>
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
          <?php foreach ($items as $item): ?>
            <tr>
              <td class="py-3"><?= e($item['product_name']) ?></td>
              <td class="py-3 text-slate-500"><?= e($item['product_sku']) ?></td>
              <td class="py-3 text-slate-500"><?= (int) $item['quantity'] ?></td>
              <td class="py-3 text-right"><?= format_price((float) $item['unit_price']) ?></td>
              <td class="py-3 text-right font-medium"><?= format_price((float) $item['line_total']) ?></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
      <div class="border-t border-slate-100 mt-4 pt-4 space-y-1.5 text-sm ml-auto max-w-xs">
        <div class="flex justify-between text-slate-500"><span>Subtotal</span><span><?= format_price((float) $order['subtotal']) ?></span></div>
        <div class="flex justify-between text-slate-500"><span>Shipping</span><span><?= format_price((float) $order['shipping_fee']) ?></span></div>
        <div class="flex justify-between text-slate-500"><span>Discount</span><span>-<?= format_price((float) $order['discount_amount']) ?></span></div>
        <div class="flex justify-between font-bold text-ink text-base pt-1.5 border-t border-slate-100"><span>Total</span><span><?= format_price((float) $order['total_amount']) ?></span></div>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-6">
      <h2 class="font-semibold text-ink mb-4">Update Status</h2>
      <form method="post" action="" class="flex gap-3">
        <?= csrf_field() ?>
        <select name="status" class="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          <?php foreach ($validStatuses as $s): ?>
            <option value="<?= $s ?>" <?= $s === $order['status'] ? 'selected' : '' ?>><?= ucfirst($s) ?></option>
          <?php endforeach; ?>
        </select>
        <button type="submit" class="bg-brand hover:bg-brand-dark text-white font-semibold px-5 rounded-lg">Update</button>
      </form>
    </div>
  </div>

  <div class="space-y-6">
    <div class="bg-white rounded-xl border border-slate-200 p-6">
      <h2 class="font-semibold text-ink mb-3">Customer</h2>
      <p class="text-sm font-medium text-ink"><?= e($order['customer_name'] ?? $order['shipping_full_name']) ?></p>
      <p class="text-sm text-slate-500"><?= e($order['customer_email'] ?? $order['guest_email'] ?? '') ?></p>
      <p class="text-sm text-slate-500"><?= e($order['shipping_phone']) ?></p>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-6">
      <h2 class="font-semibold text-ink mb-3">Shipping Address</h2>
      <p class="text-sm text-slate-600 leading-relaxed">
        <?= e($order['shipping_address_line1']) ?><?= $order['shipping_address_line2'] ? '<br>' . e($order['shipping_address_line2']) : '' ?><br>
        <?= e($order['shipping_city']) ?>, <?= e($order['shipping_state']) ?> <?= e($order['shipping_postal_code']) ?><br>
        <?= e($order['shipping_country']) ?>
      </p>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-6">
      <h2 class="font-semibold text-ink mb-3">Payment</h2>
      <p class="text-sm text-slate-600"><?= e(ucfirst($order['payment_method'])) ?> — <?= e(ucfirst($order['payment_status'])) ?></p>
      <p class="text-xs text-slate-400 mt-1">Placed on <?= date('M j, Y g:ia', strtotime($order['created_at'])) ?></p>
    </div>
  </div>
</div>

<?php require_once __DIR__ . '/../includes/admin-footer.php'; ?>
