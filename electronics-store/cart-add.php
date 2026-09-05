<?php
/**
 * Adds one product to the session cart. Session cart shape:
 * $_SESSION['cart'] = [product_id => quantity, ...]
 */
require_once __DIR__ . '/includes/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !verify_csrf($_POST['csrf_token'] ?? null)) {
    redirect('/electronics-store/shop.php');
}

$pdo = get_pdo();
$productId = (int) ($_POST['product_id'] ?? 0);
$quantity  = max(1, (int) ($_POST['quantity'] ?? 1));
$returnSlug = $_POST['return_slug'] ?? '';

$stmt = $pdo->prepare('SELECT id, name, stock_quantity, stock_status FROM products WHERE id = ? AND status = "active"');
$stmt->execute([$productId]);
$product = $stmt->fetch();

$backTo = $returnSlug ? '/electronics-store/product.php?slug=' . urlencode($returnSlug) : '/electronics-store/shop.php';

if (!$product || $product['stock_status'] !== 'in_stock') {
    flash_set('error', 'That product is not available right now.');
    redirect($backTo);
}

$_SESSION['cart'] ??= [];
$currentQty = $_SESSION['cart'][$productId] ?? 0;
$newQty = min((int) $product['stock_quantity'], $currentQty + $quantity);
$_SESSION['cart'][$productId] = $newQty;

flash_set('success', $product['name'] . ' was added to your cart.');
redirect('/electronics-store/cart.php');
