<?php
/**
 * Admin — Product List. Real DB-backed search, category filter and
 * pagination.
 */
require_once __DIR__ . '/../../includes/bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_admin_login();

$page_title = 'Products';
$active_nav = 'products';

$pdo = get_pdo();

$q          = trim($_GET['q'] ?? '');
$categoryId = (int) ($_GET['category_id'] ?? 0);
$perPage    = 10;
$page       = current_page();

$where  = [];
$params = [];

if ($q !== '') {
    $where[] = '(p.name LIKE ? OR p.sku LIKE ?)';
    $params[] = "%$q%";
    $params[] = "%$q%";
}
if ($categoryId > 0) {
    $where[] = 'p.category_id = ?';
    $params[] = $categoryId;
}
$whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

$countStmt = $pdo->prepare("SELECT COUNT(*) FROM products p $whereSql");
$countStmt->execute($params);
$totalRows = (int) $countStmt->fetchColumn();
$pages     = total_pages($totalRows, $perPage);
$page      = min($page, $pages);
$offset    = ($page - 1) * $perPage;

$sql = "
    SELECT p.*, c.name AS category_name,
           (SELECT pi.image_path FROM product_images pi
             WHERE pi.product_id = p.id
             ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1) AS image
    FROM products p
    JOIN categories c ON c.id = p.category_id
    $whereSql
    ORDER BY p.created_at DESC
    LIMIT $perPage OFFSET $offset
";
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$products = $stmt->fetchAll();

$categories = $pdo->query('SELECT id, name FROM categories ORDER BY name')->fetchAll();

require_once __DIR__ . '/../includes/admin-header.php';
?>

<form method="get" class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
  <div class="flex items-center gap-3">
    <input type="text" name="q" value="<?= e($q) ?>" placeholder="Search name or SKU..." class="rounded-lg border border-slate-200 px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand">
    <select name="category_id" onchange="this.form.submit()" class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
      <option value="0">All Categories</option>
      <?php foreach ($categories as $c): ?>
        <option value="<?= $c['id'] ?>" <?= $categoryId === (int) $c['id'] ? 'selected' : '' ?>><?= e($c['name']) ?></option>
      <?php endforeach; ?>
    </select>
    <button type="submit" class="text-sm text-brand hover:underline">Search</button>
  </div>
  <a href="/electronics-store/admin/products/add.php" class="bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-4 py-2.5 rounded-lg">
    + Add Product
  </a>
</form>

<div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead class="bg-slate-50 text-slate-500 text-left">
        <tr>
          <th class="px-5 py-3 font-medium">Product</th>
          <th class="px-5 py-3 font-medium">SKU</th>
          <th class="px-5 py-3 font-medium">Category</th>
          <th class="px-5 py-3 font-medium">Price</th>
          <th class="px-5 py-3 font-medium">Stock</th>
          <th class="px-5 py-3 font-medium">Flags</th>
          <th class="px-5 py-3 font-medium">Status</th>
          <th class="px-5 py-3 font-medium text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <?php if (!$products): ?>
          <tr><td colspan="8" class="px-5 py-8 text-center text-slate-400">No products found.</td></tr>
        <?php endif; ?>
        <?php foreach ($products as $p): ?>
          <tr class="hover:bg-slate-50">
            <td class="px-5 py-3 flex items-center gap-3">
              <img src="<?= e(product_image_url($p['image'])) ?>" alt="" class="h-10 w-10 rounded-lg object-cover border border-slate-100 shrink-0">
              <span class="font-medium text-ink"><?= e($p['name']) ?></span>
            </td>
            <td class="px-5 py-3 text-slate-500"><?= e($p['sku']) ?></td>
            <td class="px-5 py-3 text-slate-500"><?= e($p['category_name']) ?></td>
            <td class="px-5 py-3 text-slate-700"><?= format_price((float) $p['price']) ?></td>
            <td class="px-5 py-3">
              <?php if ((int) $p['stock_quantity'] > 0): ?>
                <span class="text-slate-700"><?= (int) $p['stock_quantity'] ?></span>
              <?php else: ?>
                <span class="text-red-500 font-medium">Out of stock</span>
              <?php endif; ?>
            </td>
            <td class="px-5 py-3 space-x-1">
              <?php if ($p['is_featured']): ?><span class="text-[11px] font-semibold bg-brand/10 text-brand px-2 py-0.5 rounded-full">Featured</span><?php endif; ?>
              <?php if ($p['is_top_seller']): ?><span class="text-[11px] font-semibold bg-accent/20 text-accent px-2 py-0.5 rounded-full">Top Seller</span><?php endif; ?>
            </td>
            <td class="px-5 py-3">
              <span class="text-xs font-semibold px-2.5 py-1 rounded-full <?= $p['status'] === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600' ?>">
                <?= e(ucfirst($p['status'])) ?>
              </span>
            </td>
            <td class="px-5 py-3 text-right space-x-2 whitespace-nowrap">
              <a href="/electronics-store/admin/products/edit.php?id=<?= $p['id'] ?>" class="text-brand hover:underline">Edit</a>
              <form method="post" action="/electronics-store/admin/products/delete.php" class="inline" onsubmit="return confirm('Delete this product? This cannot be undone.');">
                <?= csrf_field() ?>
                <input type="hidden" name="id" value="<?= $p['id'] ?>">
                <button type="submit" class="text-red-500 hover:underline">Delete</button>
              </form>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
  <div class="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm text-slate-500">
    <span>Showing <?= $totalRows === 0 ? 0 : $offset + 1 ?>–<?= min($offset + $perPage, $totalRows) ?> of <?= $totalRows ?> products</span>
    <div class="flex gap-2">
      <?php for ($i = 1; $i <= $pages; $i++): ?>
        <a href="<?= e(page_url($i)) ?>" class="h-8 w-8 flex items-center justify-center rounded-lg <?= $i === $page ? 'bg-brand text-white' : 'border border-slate-200 hover:bg-slate-50' ?>"><?= $i ?></a>
      <?php endfor; ?>
    </div>
  </div>
</div>

<?php require_once __DIR__ . '/../includes/admin-footer.php'; ?>
