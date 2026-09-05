<?php
/**
 * Shop Page — wireframe stage.
 * Filters/search/sort/pagination controls are rendered but not wired to
 * real queries yet; $products is a hardcoded placeholder list.
 */
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/includes/functions.php';

$page_title = 'Shop All Products — Voltix Electronics';

$categories = ['Laptops', 'Audio', 'Cameras', 'Wearables', 'Tablets', 'Accessories', 'Chargers'];
$brands     = ['Voltix', 'Nimbus', 'PulseTech', 'OrbitLabs', 'FlowGear'];

$products = [
    ['name' => 'AeroBook Pro 14"',        'category' => 'Laptops',     'brand' => 'Voltix',    'price' => 1299.00, 'sale_price' => null,   'stock' => true],
    ['name' => 'Nimbus Wireless Earbuds', 'category' => 'Audio',       'brand' => 'Nimbus',    'price' => 129.00,  'sale_price' => 99.00,  'stock' => true],
    ['name' => 'PulseCam 4K Action Cam',  'category' => 'Cameras',     'brand' => 'PulseTech', 'price' => 249.00,  'sale_price' => null,   'stock' => true],
    ['name' => 'OrbitWatch SE',           'category' => 'Wearables',   'brand' => 'OrbitLabs', 'price' => 199.00,  'sale_price' => 169.00, 'stock' => true],
    ['name' => 'FlowMouse Ergo',          'category' => 'Accessories', 'brand' => 'FlowGear',  'price' => 59.00,   'sale_price' => null,   'stock' => true],
    ['name' => 'VoltCharge 65W GaN',      'category' => 'Chargers',    'brand' => 'Voltix',    'price' => 39.00,   'sale_price' => null,   'stock' => true],
    ['name' => 'EchoBar Soundbar',        'category' => 'Audio',       'brand' => 'Nimbus',    'price' => 189.00,  'sale_price' => null,   'stock' => false],
    ['name' => 'GridPad 11 Tablet',       'category' => 'Tablets',     'brand' => 'OrbitLabs', 'price' => 349.00,  'sale_price' => 299.00, 'stock' => true],
    ['name' => 'AeroBook Air 13"',        'category' => 'Laptops',     'brand' => 'Voltix',    'price' => 999.00,  'sale_price' => null,   'stock' => true],
];

require_once __DIR__ . '/includes/header.php';
?>

<div class="max-w-7xl mx-auto px-4 py-8">

  <!-- Breadcrumb -->
  <nav class="text-sm text-slate-500 mb-6">
    <a href="/electronics-store/index.php" class="hover:text-brand">Home</a> / <span class="text-ink">Shop</span>
  </nav>

  <div class="grid lg:grid-cols-4 gap-8">

    <!-- Filters Sidebar -->
    <aside class="lg:col-span-1 space-y-6">
      <div class="bg-white border border-slate-100 rounded-xl p-5">
        <h3 class="font-semibold text-ink mb-3">Search</h3>
        <input type="text" placeholder="Search products..." class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
      </div>

      <div class="bg-white border border-slate-100 rounded-xl p-5">
        <h3 class="font-semibold text-ink mb-3">Category</h3>
        <ul class="space-y-2 text-sm">
          <?php foreach ($categories as $cat): ?>
            <li class="flex items-center gap-2">
              <input type="checkbox" id="cat-<?= strtolower($cat) ?>" class="rounded border-slate-300 text-brand focus:ring-brand">
              <label for="cat-<?= strtolower($cat) ?>" class="text-slate-600"><?= htmlspecialchars($cat) ?></label>
            </li>
          <?php endforeach; ?>
        </ul>
      </div>

      <div class="bg-white border border-slate-100 rounded-xl p-5">
        <h3 class="font-semibold text-ink mb-3">Brand</h3>
        <ul class="space-y-2 text-sm">
          <?php foreach ($brands as $brand): ?>
            <li class="flex items-center gap-2">
              <input type="checkbox" id="brand-<?= strtolower($brand) ?>" class="rounded border-slate-300 text-brand focus:ring-brand">
              <label for="brand-<?= strtolower($brand) ?>" class="text-slate-600"><?= htmlspecialchars($brand) ?></label>
            </li>
          <?php endforeach; ?>
        </ul>
      </div>

      <div class="bg-white border border-slate-100 rounded-xl p-5">
        <h3 class="font-semibold text-ink mb-3">Price Range</h3>
        <div class="flex items-center gap-2 text-sm">
          <input type="number" placeholder="Min" class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand">
          <span class="text-slate-400">–</span>
          <input type="number" placeholder="Max" class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand">
        </div>
      </div>

      <div class="bg-white border border-slate-100 rounded-xl p-5">
        <h3 class="font-semibold text-ink mb-3">Availability</h3>
        <label class="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" class="rounded border-slate-300 text-brand focus:ring-brand"> In Stock Only
        </label>
      </div>

      <button class="w-full bg-brand hover:bg-brand-dark text-white font-semibold py-2.5 rounded-lg">Apply Filters</button>
    </aside>

    <!-- Product Grid -->
    <div class="lg:col-span-3">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <p class="text-sm text-slate-500"><?= count($products) ?> products found</p>
        <div class="flex items-center gap-2 text-sm">
          <label for="sort" class="text-slate-500">Sort by:</label>
          <select id="sort" class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
            <option>Newest</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
            <option>Best Selling</option>
            <option>Name: A–Z</option>
          </select>
        </div>
      </div>

      <div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
        <?php foreach ($products as $p): ?>
          <a href="/electronics-store/product.php" class="group bg-white rounded-xl border border-slate-100 overflow-hidden hover:shadow-md transition">
            <div class="relative h-44 img-placeholder">
              📦
              <?php if (!$p['stock']): ?>
                <span class="absolute top-2 left-2 bg-slate-700 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">Out of Stock</span>
              <?php elseif ($p['sale_price']): ?>
                <span class="absolute top-2 left-2 bg-accent text-ink text-[11px] font-bold px-2 py-0.5 rounded-full">Sale</span>
              <?php endif; ?>
            </div>
            <div class="p-4">
              <p class="text-xs text-slate-400 mb-1"><?= htmlspecialchars($p['category']) ?> · <?= htmlspecialchars($p['brand']) ?></p>
              <h3 class="font-semibold text-sm text-ink line-clamp-2 mb-2 group-hover:text-brand"><?= htmlspecialchars($p['name']) ?></h3>
              <div class="flex items-center gap-2">
                <?php if ($p['sale_price']): ?>
                  <span class="text-brand font-bold"><?= format_price($p['sale_price']) ?></span>
                  <span class="text-slate-400 text-sm line-through"><?= format_price($p['price']) ?></span>
                <?php else: ?>
                  <span class="text-brand font-bold"><?= format_price($p['price']) ?></span>
                <?php endif; ?>
              </div>
            </div>
          </a>
        <?php endforeach; ?>
      </div>

      <!-- Pagination -->
      <div class="flex items-center justify-center gap-2 mt-10">
        <a href="#" class="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400">‹</a>
        <a href="#" class="h-9 w-9 flex items-center justify-center rounded-lg bg-brand text-white font-medium">1</a>
        <a href="#" class="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50">2</a>
        <a href="#" class="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50">3</a>
        <span class="px-1 text-slate-400">…</span>
        <a href="#" class="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50">8</a>
        <a href="#" class="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50">›</a>
      </div>
    </div>
  </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
