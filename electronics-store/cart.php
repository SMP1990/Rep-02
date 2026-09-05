<?php
/**
 * Shopping Cart — reads/writes $_SESSION['cart'], always re-pricing and
 * re-validating stock against the live products table.
 */
require_once __DIR__ . '/includes/bootstrap.php';

$pdo = get_pdo();
$_SESSION['cart'] ??= [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf($_POST['csrf_token'] ?? null)) {
        flash_set('error', 'Your session expired. Please try again.');
        redirect('/electronics-store/cart.php');
    }

    $action = $_POST['action'] ?? '';

    if ($action === 'remove') {
        $id = (int) ($_POST['product_id'] ?? 0);
        unset($_SESSION['cart'][$id]);
        flash_set('success', 'Item removed from cart.');
    } elseif ($action === 'update') {
        foreach ((array) ($_POST['quantity'] ?? []) as $id => $qty) {
            $id = (int) $id;
            $qty = (int) $qty;
            if ($qty <= 0) {
                unset($_SESSION['cart'][$id]);
            } elseif (isset($_SESSION['cart'][$id])) {
                $_SESSION['cart'][$id] = $qty;
            }
        }
        flash_set('success', 'Cart updated.');
    }

    redirect('/electronics-store/cart.php');
}

$page_title = 'Your Cart — Voltix Electronics';

$items = [];
$subtotal = 0.0;

if ($_SESSION['cart']) {
    $ids = array_keys($_SESSION['cart']);
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare("
        SELECT p.*,
               (SELECT pi.image_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1) AS image
        FROM products p
        WHERE p.id IN ($placeholders) AND p.status = 'active'
    ");
    $stmt->execute($ids);
    $products = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $products[$row['id']] = $row;
    }

    foreach ($_SESSION['cart'] as $id => $qty) {
        if (!isset($products[$id]) || $products[$id]['stock_status'] !== 'in_stock') {
            unset($_SESSION['cart'][$id]);
            continue;
        }
        $product = $products[$id];
        $qty = min($qty, (int) $product['stock_quantity']);
        $_SESSION['cart'][$id] = $qty;

        $unitPrice = (float) ($product['sale_price'] ?? $product['price']);
        $lineTotal = $unitPrice * $qty;
        $subtotal += $lineTotal;

        $items[] = [
            'product'    => $product,
            'quantity'   => $qty,
            'unit_price' => $unitPrice,
            'line_total' => $lineTotal,
        ];
    }
}

$freeShippingThreshold = (float) get_setting($pdo, 'free_shipping_threshold', '99.00');

require_once __DIR__ . '/includes/header.php';
?>

<div class="max-w-5xl mx-auto px-4 py-8">
  <h1 class="text-2xl font-bold text-ink mb-6">Your Cart</h1>

  <?php if (!$items): ?>
    <div class="bg-white border border-slate-100 rounded-xl p-12 text-center text-slate-400">
      <p class="mb-4">Your cart is empty.</p>
      <a href="/electronics-store/shop.php" class="text-brand font-semibold hover:underline">Continue Shopping →</a>
    </div>
  <?php else: ?>
    <!-- Quantity inputs below use form="cart-update-form" (HTML5) so they can
         submit together without nesting a <form> inside each table row. -->
    <form method="post" action="" id="cart-update-form">
      <?= csrf_field() ?>
      <input type="hidden" name="action" value="update">
    </form>

    <div class="bg-white border border-slate-100 rounded-xl overflow-hidden mb-6">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-left">
          <tr>
            <th class="px-5 py-3 font-medium">Product</th>
            <th class="px-5 py-3 font-medium">Price</th>
            <th class="px-5 py-3 font-medium">Quantity</th>
            <th class="px-5 py-3 font-medium text-right">Total</th>
            <th class="px-5 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <?php foreach ($items as $item): $p = $item['product']; ?>
            <tr>
              <td class="px-5 py-4 flex items-center gap-3">
                <img src="<?= e(product_image_url($p['image'])) ?>" class="h-14 w-14 rounded-lg object-cover border border-slate-100">
                <a href="/electronics-store/product.php?slug=<?= urlencode($p['slug']) ?>" class="font-medium text-ink hover:text-brand"><?= e($p['name']) ?></a>
              </td>
              <td class="px-5 py-4 text-slate-600"><?= format_price($item['unit_price']) ?></td>
              <td class="px-5 py-4">
                <input type="number" form="cart-update-form" name="quantity[<?= $p['id'] ?>]" value="<?= $item['quantity'] ?>" min="1" max="<?= (int) $p['stock_quantity'] ?>"
                       class="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm">
              </td>
              <td class="px-5 py-4 text-right font-medium"><?= format_price($item['line_total']) ?></td>
              <td class="px-5 py-4 text-right">
                <form method="post" action="">
                  <?= csrf_field() ?>
                  <input type="hidden" name="action" value="remove">
                  <input type="hidden" name="product_id" value="<?= $p['id'] ?>">
                  <button type="submit" class="text-red-500 hover:underline text-sm">Remove</button>
                </form>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>

    <div class="flex justify-end mb-8">
      <button type="submit" form="cart-update-form" class="text-sm text-brand hover:underline">Update Cart</button>
    </div>

    <div class="bg-white border border-slate-100 rounded-xl p-6 max-w-sm ml-auto space-y-2 text-sm">
      <div class="flex justify-between text-slate-500"><span>Subtotal</span><span><?= format_price($subtotal) ?></span></div>
      <div class="flex justify-between text-slate-500">
        <span>Shipping</span>
        <span><?= $subtotal >= $freeShippingThreshold ? 'Free' : format_price(9.99) ?></span>
      </div>
      <div class="flex justify-between font-bold text-ink text-base pt-2 border-t border-slate-100">
        <span>Total</span>
        <span><?= format_price($subtotal >= $freeShippingThreshold ? $subtotal : $subtotal + 9.99) ?></span>
      </div>
      <?php if ($subtotal < $freeShippingThreshold): ?>
        <p class="text-xs text-slate-400 pt-1">Add <?= format_price($freeShippingThreshold - $subtotal) ?> more for free shipping.</p>
      <?php endif; ?>
      <a href="/electronics-store/checkout.php" class="block text-center w-full bg-brand hover:bg-brand-dark text-white font-semibold py-2.5 rounded-lg mt-4">
        Proceed to Checkout
      </a>
    </div>
  <?php endif; ?>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
