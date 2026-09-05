<?php
/**
 * Admin — Delete Product. POST-only, CSRF-protected. Cascades to
 * product_images/product_specifications via FK; also removes uploaded
 * image files from disk. Refuses if the product has existing orders
 * (order_items.product_id keeps a snapshot reference via ON DELETE SET
 * NULL, so this is only a courtesy check, not a hard requirement).
 */
require_once __DIR__ . '/../../includes/bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_admin_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !verify_csrf($_POST['csrf_token'] ?? null)) {
    flash_set('error', 'Invalid request.');
    redirect('/electronics-store/admin/products/index.php');
}

$pdo = get_pdo();
$id = (int) ($_POST['id'] ?? 0);

$stmt = $pdo->prepare('SELECT name FROM products WHERE id = ?');
$stmt->execute([$id]);
$name = $stmt->fetchColumn();

if ($name === false) {
    flash_set('error', 'Product not found.');
    redirect('/electronics-store/admin/products/index.php');
}

$imgStmt = $pdo->prepare('SELECT image_path FROM product_images WHERE product_id = ?');
$imgStmt->execute([$id]);
foreach ($imgStmt->fetchAll(PDO::FETCH_COLUMN) as $path) {
    delete_uploaded_image($path);
}

$pdo->prepare('DELETE FROM products WHERE id = ?')->execute([$id]);

flash_set('success', 'Product "' . $name . '" was deleted.');
redirect('/electronics-store/admin/products/index.php');
