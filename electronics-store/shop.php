<?php
/**
 * Shop Page — real search, category/brand/price/stock filters, sorting
 * and pagination against the products table.
 */
require_once __DIR__ . '/includes/bootstrap.php';

$page_title = 'Shop All Products — Voltix Electronics';

$pdo = get_pdo();

$q           = trim($_GET['q'] ?? '');
$categoryIds = array_map('intval', (array) ($_GET['category'] ?? []));
$brandIds    = array_map('intval', (array) ($_GET['brand'] ?? []));
$minPrice    = $_GET['min_price'] ?? '';
$maxPrice    = $_GET['max_price'] ?? '';
$inStockOnly = !empty($_GET['in_stock']);
$featured    = !empty($_GET['featured']);
$topSellers  = !empty($_GET['top_sellers']);
$sort        = $_GET['sort'] ?? 'newest';
$perPage     = 9;
$page        = current_page();

$where  = ["p.status = 'active'"];
$params = [];

if ($q !== '') {
    $where[] = '(p.name LIKE ? OR p.short_description LIKE ?)';
    $params[] = "%$q%";
    $params[] = "%$q%";
}
if ($categoryIds) {
    $where[] = 'p.category_id IN (' . implode(',', array_fill(0, count($categoryIds), '?')) . ')';
    array_push($params, ...$categoryIds);
}
if ($brandIds) {
    $where[] = 'p.brand_id IN (' . implode(',', array_fill(0, count($brandIds), '?')) . ')';
    array_push($params, ...$brandIds);
}
if (is_numeric($minPrice)) {
    $where[] = 'COALESCE(p.sale_price, p.price) >= ?';
    $params[] = $minPrice;
}
if (is_numeric($maxPrice)) {
    $where[] = 'COALESCE(p.sale_price, p.price) <= ?';
    $params[] = $maxPrice;
}
if ($inStockOnly) {
    $where[] = "p.stock_status = 'in_stock'";
}
if ($featured) {
    $where[] = 'p.is_featured = 1';
}
if ($topSellers) {
    $where[] = 'p.is_top_seller = 1';
}
$whereSql = 'WHERE ' . implode(' AND ', $where);

$sortMap = [
    'newest'       => 'p.created_at DESC',
    'price_asc'    => 'COALESCE(p.sale_price, p.price) ASC',
    'price_desc'   => 'COALESCE(p.sale_price, p.price) DESC',
    'name_asc'     => 'p.name ASC',
    'best_selling' => 'sold DESC',
];
$orderBy = $sortMap[$sort] ?? $sortMap['newest'];

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
             ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1) AS image,
           COALESCE((SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.product_id = p.id), 0) AS sold
    FROM products p
    JOIN categories c ON c.id = p.category_id
    $whereSql
    ORDER BY $orderBy
    LIMIT $perPage OFFSET $offset
";
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$products = $stmt->fetchAll();

$categories = $pdo->query('SELECT id, name FROM categories WHERE status = "active" ORDER BY name')->fetchAll();
$brands     = $pdo->query('SELECT id, name FROM brands WHERE status = "active" ORDER BY name')->fetchAll();

require_once __DIR__ . '/includes/header.php';
?>

<div class="max-w-7xl mx-auto px-4 py-8">

  <nav class="text-sm text-slate-500 mb-6">
    <a href="/electronics-store/index.php" class="hover:text-brand">Home</a> / <span class="text-ink">Shop</span>
  </nav>

  <div class="grid lg:grid-cols-4 gap-8">

    <!-- Filters Sidebar -->
    <aside class="lg:col-span-1">
      <form method="get" class="space-y-6">
        <?php if ($sort !== 'newest'): ?><input type="hidden" name="sort" value="<?= e($sort) ?>"><?php endif; ?>

        <div class="bg-white border border-slate-100 rounded-xl p-5">
          <h3 class="font-semibold text-ink mb-3">Search</h3>
          <input type="text" name="q" value="<?= e($q) ?>" placeholder="Search products..." class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
        </div>

        <div class="bg-white border border-slate-100 rounded-xl p-5">
          <h3 class="font-semibold text-ink mb-3">Category</h3>
          <ul class="space-y-2 text-sm">
            <?php foreach ($categories as $cat): ?>
              <li class="flex items-center gap-2">
                <input type="checkbox" name="category[]" value="<?= $cat['id'] ?>" id="cat-<?= $cat['id'] ?>"
                       <?= in_array((int) $cat['id'], $categoryIds, true) ? 'checked' : '' ?>
                       class="rounded border-slate-300 text-brand focus:ring-brand">
                <label for="cat-<?= $cat['id'] ?>" class="text-slate-600"><?= e($cat['name']) ?></label>
              </li>
            <?php endforeach; ?>
          </ul>
        </div>

        <div class="bg-white border border-slate-100 rounded-xl p-5">
          <h3 class="font-semibold text-ink mb-3">Brand</h3>
          <ul class="space-y-2 text-sm">
            <?php foreach ($brands as $brand): ?>
              <li class="flex items-center gap-2">
                <input type="checkbox" name="brand[]" value="<?= $brand['id'] ?>" id="brand-<?= $brand['id'] ?>"
                       <?= in_array((int) $brand['id'], $brandIds, true) ? 'checked' : '' ?>
                       class="rounded border-slate-300 text-brand focus:ring-brand">
                <label for="brand-<?= $brand['id'] ?>" class="text-slate-600"><?= e($brand['name']) ?></label>
              </li>
            <?php endforeach; ?>
          </ul>
        </div>

        <div class="bg-white border border-slate-100 rounded-xl p-5">
          <h3 class="font-semibold text-ink mb-3">Price Range</h3>
          <div class="flex items-center gap-2 text-sm">
            <input type="number" name="min_price" value="<?= e($minPrice) ?>" placeholder="Min" class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand">
            <span class="text-slate-400">–</span>
            <input type="number" name="max_price" value="<?= e($maxPrice) ?>" placeholder="Max" class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand">
          </div>
        </div>

        <div class="bg-white border border-slate-100 rounded-xl p-5">
          <h3 class="font-semibold text-ink mb-3">Availability</h3>
          <label class="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="in_stock" value="1" <?= $inStockOnly ? 'checked' : '' ?> class="rounded border-slate-300 text-brand focus:ring-brand"> In Stock Only
          </label>
        </div>

        <button type="submit" class="w-full bg-brand hover:bg-brand-dark text-white font-semibold py-2.5 rounded-lg">Apply Filters</button>
        <?php if ($q || $categoryIds || $brandIds || $minPrice !== '' || $maxPrice !== '' || $inStockOnly || $featured || $topSellers): ?>
          <a href="/electronics-store/shop.php" class="block text-center text-sm text-slate-500 hover:text-brand">Clear all filters</a>
        <?php endif; ?>
      </form>
    </aside>

    <!-- Product Grid -->
    <div class="lg:col-span-3">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <p class="text-sm text-slate-500"><?= $totalRows ?> product<?= $totalRows === 1 ? '' : 's' ?> found</p>
        <form method="get" id="sort-form">
          <?php foreach ($_GET as $key => $value) : if ($key === 'sort' || $key === 'page') continue; ?>
            <?php foreach ((array) $value as $v): ?>
              <input type="hidden" name="<?= e($key) ?><?= is_array($value) ? '[]' : '' ?>" value="<?= e($v) ?>">
            <?php endforeach; ?>
          <?php endforeach; ?>
          <div class="flex items-center gap-2 text-sm">
            <label for="sort" class="text-slate-500">Sort by:</label>
            <select id="sort" name="sort" onchange="document.getElementById('sort-form').submit()" class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
              <option value="newest" <?= $sort === 'newest' ? 'selected' : '' ?>>Newest</option>
              <option value="price_asc" <?= $sort === 'price_asc' ? 'selected' : '' ?>>Price: Low to High</option>
              <option value="price_desc" <?= $sort === 'price_desc' ? 'selected' : '' ?>>Price: High to Low</option>
              <option value="best_selling" <?= $sort === 'best_selling' ? 'selected' : '' ?>>Best Selling</option>
              <option value="name_asc" <?= $sort === 'name_asc' ? 'selected' : '' ?>>Name: A–Z</option>
            </select>
          </div>
        </form>
      </div>

      <?php if (!$products): ?>
        <div class="bg-white border border-slate-100 rounded-xl p-12 text-center text-slate-400">
          No products match your filters.
        </div>
      <?php else: ?>
        <div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
          <?php foreach ($products as $p): ?>
            <?php include __DIR__ . '/includes/product-card.php'; ?>
          <?php endforeach; ?>
        </div>

        <!-- Pagination -->
        <?php if ($pages > 1): ?>
          <div class="flex items-center justify-center gap-2 mt-10">
            <?php for ($i = 1; $i <= $pages; $i++): ?>
              <a href="<?= e(page_url($i)) ?>" class="h-9 w-9 flex items-center justify-center rounded-lg <?= $i === $page ? 'bg-brand text-white' : 'border border-slate-200 hover:bg-slate-50' ?>"><?= $i ?></a>
            <?php endfor; ?>
          </div>
        <?php endif; ?>
      <?php endif; ?>
    </div>
  </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
