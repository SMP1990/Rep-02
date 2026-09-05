<?php
/**
 * Checkout — guest checkout. Re-validates stock and prices from the DB,
 * decrements stock and creates the order inside a transaction, and
 * finds-or-creates a customer record by email so Admin → Customers has
 * real data without a separate account/login system.
 */
require_once __DIR__ . '/includes/bootstrap.php';

$pdo = get_pdo();
$_SESSION['cart'] ??= [];

if (!$_SESSION['cart']) {
    flash_set('error', 'Your cart is empty.');
    redirect('/electronics-store/cart.php');
}

function load_cart_items(PDO $pdo, array $cart): array
{
    $ids = array_keys($cart);
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare("SELECT * FROM products WHERE id IN ($placeholders) AND status = 'active'");
    $stmt->execute($ids);
    $products = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $products[$row['id']] = $row;
    }

    $items = [];
    foreach ($cart as $id => $qty) {
        if (!isset($products[$id]) || $products[$id]['stock_status'] !== 'in_stock') {
            continue;
        }
        $product = $products[$id];
        $qty = min($qty, (int) $product['stock_quantity']);
        $unitPrice = (float) ($product['sale_price'] ?? $product['price']);
        $items[] = ['product' => $product, 'quantity' => $qty, 'unit_price' => $unitPrice, 'line_total' => $unitPrice * $qty];
    }
    return $items;
}

$items = load_cart_items($pdo, $_SESSION['cart']);
$subtotal = array_sum(array_column($items, 'line_total'));
$freeShippingThreshold = (float) get_setting($pdo, 'free_shipping_threshold', '99.00');
$shippingFee = $subtotal >= $freeShippingThreshold ? 0.0 : 9.99;
$total = $subtotal + $shippingFee;

$errors = [];
$form = [
    'full_name' => '', 'email' => '', 'phone' => '', 'address_line1' => '', 'address_line2' => '',
    'city' => '', 'state' => '', 'postal_code' => '', 'country' => '', 'payment_method' => 'cod',
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf($_POST['csrf_token'] ?? null)) {
        $errors[] = 'Your session expired. Please try again.';
    }

    foreach (array_keys($form) as $field) {
        $form[$field] = trim($_POST[$field] ?? '');
    }
    if (!in_array($form['payment_method'], ['cod', 'card', 'bank_transfer'], true)) {
        $form['payment_method'] = 'cod';
    }

    $required = ['full_name', 'email', 'phone', 'address_line1', 'city', 'state', 'postal_code', 'country'];
    foreach ($required as $field) {
        if ($form[$field] === '') {
            $errors[] = 'Please fill in all required shipping fields.';
            break;
        }
    }
    if (!filter_var($form['email'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Please enter a valid email address.';
    }

    // Re-check stock right before committing, in case it changed since the cart was viewed.
    $items = load_cart_items($pdo, $_SESSION['cart']);
    if (!$items) {
        $errors[] = 'Your cart is empty or its items are no longer available.';
    }
    $foundIds = array_column(array_column($items, 'product'), 'id');
    foreach ($_SESSION['cart'] as $cartProductId => $cartQty) {
        if (!in_array($cartProductId, $foundIds, true)) {
            $errors[] = 'One of the items in your cart is no longer available and was removed.';
            unset($_SESSION['cart'][$cartProductId]);
        }
    }
    foreach ($items as $item) {
        if ($item['quantity'] < ($_SESSION['cart'][$item['product']['id']] ?? 0)) {
            $errors[] = $item['product']['name'] . ' only has ' . $item['quantity'] . ' left in stock.';
        }
    }

    if (!$errors) {
        $subtotal = array_sum(array_column($items, 'line_total'));
        $shippingFee = $subtotal >= $freeShippingThreshold ? 0.0 : 9.99;
        $total = $subtotal + $shippingFee;

        try {
            $pdo->beginTransaction();

            foreach ($items as $item) {
                $stmt = $pdo->prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?');
                $stmt->execute([$item['quantity'], $item['product']['id'], $item['quantity']]);
                if ($stmt->rowCount() === 0) {
                    throw new RuntimeException($item['product']['name'] . ' just sold out. Please update your cart.');
                }
                $pdo->prepare("UPDATE products SET stock_status = CASE WHEN stock_quantity <= 0 THEN 'out_of_stock' ELSE stock_status END WHERE id = ?")
                    ->execute([$item['product']['id']]);
            }

            $custStmt = $pdo->prepare('SELECT id FROM customers WHERE email = ?');
            $custStmt->execute([$form['email']]);
            $customerId = $custStmt->fetchColumn();

            if ($customerId) {
                $pdo->prepare('UPDATE customers SET full_name = ?, phone = ? WHERE id = ?')
                    ->execute([$form['full_name'], $form['phone'], $customerId]);
            } else {
                $randomPassword = password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT);
                $pdo->prepare('INSERT INTO customers (full_name, email, phone, password_hash) VALUES (?, ?, ?, ?)')
                    ->execute([$form['full_name'], $form['email'], $form['phone'], $randomPassword]);
                $customerId = (int) $pdo->lastInsertId();
            }

            $orderNumber = generate_order_number($pdo);
            $pdo->prepare('
                INSERT INTO orders
                    (order_number, customer_id, status, payment_method, payment_status,
                     subtotal, discount_amount, shipping_fee, tax_amount, total_amount,
                     shipping_full_name, shipping_phone, shipping_address_line1, shipping_address_line2,
                     shipping_city, shipping_state, shipping_postal_code, shipping_country)
                VALUES (?, ?, "pending", ?, "unpaid", ?, 0, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ')->execute([
                $orderNumber, $customerId, $form['payment_method'],
                $subtotal, $shippingFee, $total,
                $form['full_name'], $form['phone'], $form['address_line1'], $form['address_line2'] ?: null,
                $form['city'], $form['state'], $form['postal_code'], $form['country'],
            ]);
            $orderId = (int) $pdo->lastInsertId();

            $itemStmt = $pdo->prepare('INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_price, quantity, line_total) VALUES (?, ?, ?, ?, ?, ?, ?)');
            foreach ($items as $item) {
                $itemStmt->execute([
                    $orderId, $item['product']['id'], $item['product']['name'], $item['product']['sku'],
                    $item['unit_price'], $item['quantity'], $item['line_total'],
                ]);
            }

            $pdo->commit();
            $_SESSION['cart'] = [];
            redirect('/electronics-store/order-confirmation.php?order=' . urlencode($orderNumber));
        } catch (Throwable $e) {
            $pdo->rollBack();
            $errors[] = $e instanceof RuntimeException ? $e->getMessage() : 'Could not place your order. Please try again.';
        }
    }
}

$page_title = 'Checkout — Voltix Electronics';
require_once __DIR__ . '/includes/header.php';
?>

<div class="max-w-5xl mx-auto px-4 py-8">
  <h1 class="text-2xl font-bold text-ink mb-6">Checkout</h1>

  <?php if ($errors): ?>
    <div class="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
      <ul class="list-disc list-inside space-y-0.5">
        <?php foreach ($errors as $err): ?><li><?= e($err) ?></li><?php endforeach; ?>
      </ul>
    </div>
  <?php endif; ?>

  <div class="grid lg:grid-cols-3 gap-8">
    <form method="post" action="" class="lg:col-span-2 space-y-6">
      <?= csrf_field() ?>

      <div class="bg-white border border-slate-100 rounded-xl p-6">
        <h2 class="font-semibold text-ink mb-4">Contact & Shipping</h2>
        <div class="grid sm:grid-cols-2 gap-4">
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
            <input type="text" name="full_name" value="<?= e($form['full_name']) ?>" required class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input type="email" name="email" value="<?= e($form['email']) ?>" required class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
            <input type="text" name="phone" value="<?= e($form['phone']) ?>" required class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          </div>
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Address Line 1</label>
            <input type="text" name="address_line1" value="<?= e($form['address_line1']) ?>" required class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          </div>
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Address Line 2 (optional)</label>
            <input type="text" name="address_line2" value="<?= e($form['address_line2']) ?>" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">City</label>
            <input type="text" name="city" value="<?= e($form['city']) ?>" required class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">State / Province</label>
            <input type="text" name="state" value="<?= e($form['state']) ?>" required class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Postal Code</label>
            <input type="text" name="postal_code" value="<?= e($form['postal_code']) ?>" required class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Country</label>
            <input type="text" name="country" value="<?= e($form['country']) ?>" required class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          </div>
        </div>
      </div>

      <div class="bg-white border border-slate-100 rounded-xl p-6">
        <h2 class="font-semibold text-ink mb-4">Payment Method</h2>
        <div class="space-y-2">
          <?php foreach (['cod' => 'Cash on Delivery', 'card' => 'Credit / Debit Card', 'bank_transfer' => 'Bank Transfer'] as $val => $label): ?>
            <label class="flex items-center gap-3 border border-slate-200 rounded-lg px-4 py-3 text-sm cursor-pointer has-[:checked]:border-brand has-[:checked]:bg-brand/5">
              <input type="radio" name="payment_method" value="<?= $val ?>" <?= $form['payment_method'] === $val ? 'checked' : '' ?> class="text-brand focus:ring-brand">
              <?= $label ?>
            </label>
          <?php endforeach; ?>
        </div>
        <p class="text-xs text-slate-400 mt-3">This is a demo checkout — no payment is actually processed.</p>
      </div>

      <button type="submit" class="w-full bg-brand hover:bg-brand-dark text-white font-semibold py-3 rounded-lg">
        Place Order — <?= format_price($total) ?>
      </button>
    </form>

    <div class="bg-white border border-slate-100 rounded-xl p-6 h-fit space-y-4">
      <h2 class="font-semibold text-ink">Order Summary</h2>
      <div class="space-y-3 max-h-64 overflow-y-auto">
        <?php foreach ($items as $item): $p = $item['product']; ?>
          <div class="flex justify-between text-sm">
            <span class="text-slate-600"><?= e($p['name']) ?> × <?= $item['quantity'] ?></span>
            <span class="font-medium text-ink"><?= format_price($item['line_total']) ?></span>
          </div>
        <?php endforeach; ?>
      </div>
      <div class="border-t border-slate-100 pt-3 space-y-1.5 text-sm">
        <div class="flex justify-between text-slate-500"><span>Subtotal</span><span><?= format_price($subtotal) ?></span></div>
        <div class="flex justify-between text-slate-500"><span>Shipping</span><span><?= $shippingFee > 0 ? format_price($shippingFee) : 'Free' ?></span></div>
        <div class="flex justify-between font-bold text-ink text-base pt-1.5 border-t border-slate-100"><span>Total</span><span><?= format_price($total) ?></span></div>
      </div>
    </div>
  </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
