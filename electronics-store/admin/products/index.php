<?php
/**
 * Admin — Product List. Wireframe stage: hardcoded rows, no CRUD wired up.
 */
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../includes/functions.php';

$page_title = 'Products';
$active_nav = 'products';

$products = [
    ['id' => 1, 'name' => 'AeroBook Pro 14"',        'sku' => 'VLX-AB14-256', 'category' => 'Laptops',     'price' => 1299.00, 'stock' => 14, 'featured' => true,  'top_seller' => false, 'status' => 'Active'],
    ['id' => 2, 'name' => 'Nimbus Wireless Earbuds', 'sku' => 'NMB-EB-01',    'category' => 'Audio',       'price' => 129.00,  'stock' => 58, 'featured' => true,  'top_seller' => true,  'status' => 'Active'],
    ['id' => 3, 'name' => 'PulseCam 4K Action Cam',  'sku' => 'PLT-CAM4K',    'category' => 'Cameras',     'price' => 249.00,  'stock' => 21, 'featured' => false, 'top_seller' => false, 'status' => 'Active'],
    ['id' => 4, 'name' => 'OrbitWatch SE',           'sku' => 'ORB-WSE',      'category' => 'Wearables',   'price' => 199.00,  'stock' => 0,  'featured' => true,  'top_seller' => false, 'status' => 'Inactive'],
    ['id' => 5, 'name' => 'FlowMouse Ergo',          'sku' => 'FLW-MSE-01',   'category' => 'Accessories', 'price' => 59.00,   'stock' => 132,'featured' => false, 'top_seller' => true,  'status' => 'Active'],
];

require_once __DIR__ . '/../includes/admin-header.php';
?>

<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
  <div class="flex items-center gap-3">
    <input type="text" placeholder="Search products..." class="rounded-lg border border-slate-200 px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand">
    <select class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
      <option>All Categories</option>
      <option>Laptops</option>
      <option>Audio</option>
      <option>Cameras</option>
    </select>
  </div>
  <a href="/electronics-store/admin/products/add.php" class="bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-4 py-2.5 rounded-lg">
    + Add Product
  </a>
</div>

<div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead class="bg-slate-50 text-slate-500 text-left">
        <tr>
          <th class="px-5 py-3 font-medium"><input type="checkbox" class="rounded border-slate-300"></th>
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
        <?php foreach ($products as $p): ?>
          <tr class="hover:bg-slate-50">
            <td class="px-5 py-3"><input type="checkbox" class="rounded border-slate-300"></td>
            <td class="px-5 py-3 flex items-center gap-3">
              <div class="h-10 w-10 rounded-lg img-placeholder text-base shrink-0">📦</div>
              <span class="font-medium text-ink"><?= htmlspecialchars($p['name']) ?></span>
            </td>
            <td class="px-5 py-3 text-slate-500"><?= htmlspecialchars($p['sku']) ?></td>
            <td class="px-5 py-3 text-slate-500"><?= htmlspecialchars($p['category']) ?></td>
            <td class="px-5 py-3 text-slate-700"><?= format_price($p['price']) ?></td>
            <td class="px-5 py-3">
              <?php if ($p['stock'] > 0): ?>
                <span class="text-slate-700"><?= $p['stock'] ?></span>
              <?php else: ?>
                <span class="text-red-500 font-medium">Out of stock</span>
              <?php endif; ?>
            </td>
            <td class="px-5 py-3 space-x-1">
              <?php if ($p['featured']): ?><span class="text-[11px] font-semibold bg-brand/10 text-brand px-2 py-0.5 rounded-full">Featured</span><?php endif; ?>
              <?php if ($p['top_seller']): ?><span class="text-[11px] font-semibold bg-accent/20 text-accent px-2 py-0.5 rounded-full">Top Seller</span><?php endif; ?>
            </td>
            <td class="px-5 py-3">
              <span class="text-xs font-semibold px-2.5 py-1 rounded-full <?= $p['status'] === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600' ?>">
                <?= $p['status'] ?>
              </span>
            </td>
            <td class="px-5 py-3 text-right space-x-2 whitespace-nowrap">
              <a href="/electronics-store/admin/products/edit.php?id=<?= $p['id'] ?>" class="text-brand hover:underline">Edit</a>
              <a href="#" class="text-red-500 hover:underline">Delete</a>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
  <div class="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm text-slate-500">
    <span>Showing 1–5 of 218 products</span>
    <div class="flex gap-2">
      <a href="#" class="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200">‹</a>
      <a href="#" class="h-8 w-8 flex items-center justify-center rounded-lg bg-brand text-white">1</a>
      <a href="#" class="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50">2</a>
      <a href="#" class="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50">›</a>
    </div>
  </div>
</div>

<?php require_once __DIR__ . '/../includes/admin-footer.php'; ?>
