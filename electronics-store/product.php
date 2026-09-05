<?php
/**
 * Product Details Page — wireframe stage.
 * All data below is a hardcoded placeholder for a single sample product;
 * Phase 2 will look this up by slug/id from the `products` table.
 */
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/includes/functions.php';

$page_title = 'AeroBook Pro 14" — Voltix Electronics';

$product = [
    'name'        => 'AeroBook Pro 14"',
    'category'    => 'Laptops',
    'brand'       => 'Voltix',
    'sku'         => 'VLX-AB14-256',
    'price'       => 1299.00,
    'sale_price'  => 1149.00,
    'stock'       => 14,
    'description' => 'A featherlight 14" laptop built for creators and professionals. All-day battery, a stunning display, and enough power to handle serious workloads without the fan noise.',
    'specs' => [
        'Processor'  => '12-core ARM, 3.5GHz',
        'RAM'        => '16GB Unified Memory',
        'Storage'    => '512GB NVMe SSD',
        'Display'    => '14" Liquid Retina, 120Hz',
        'Battery'    => 'Up to 18 hours',
        'Weight'     => '1.4 kg',
        'Warranty'   => '2-Year Limited Warranty',
    ],
];

$related_products = [
    ['name' => 'AeroBook Air 13"',   'price' => 999.00],
    ['name' => 'VoltCharge 65W GaN', 'price' => 39.00],
    ['name' => 'FlowMouse Ergo',     'price' => 59.00],
    ['name' => 'GridPad 11 Tablet',  'price' => 349.00],
];

require_once __DIR__ . '/includes/header.php';
?>

<div class="max-w-7xl mx-auto px-4 py-8">

  <!-- Breadcrumb -->
  <nav class="text-sm text-slate-500 mb-6">
    <a href="/electronics-store/index.php" class="hover:text-brand">Home</a> /
    <a href="/electronics-store/shop.php" class="hover:text-brand">Shop</a> /
    <a href="/electronics-store/shop.php" class="hover:text-brand"><?= htmlspecialchars($product['category']) ?></a> /
    <span class="text-ink"><?= htmlspecialchars($product['name']) ?></span>
  </nav>

  <div class="grid lg:grid-cols-2 gap-10">

    <!-- Gallery -->
    <div>
      <div class="h-96 rounded-xl img-placeholder text-5xl mb-4">📦</div>
      <div class="grid grid-cols-4 gap-3">
        <?php for ($i = 0; $i < 4; $i++): ?>
          <div class="h-20 rounded-lg img-placeholder border border-slate-200 cursor-pointer hover:border-brand">🖼️</div>
        <?php endfor; ?>
      </div>
    </div>

    <!-- Details -->
    <div>
      <p class="text-sm text-brand font-medium mb-1"><?= htmlspecialchars($product['brand']) ?></p>
      <h1 class="text-3xl font-extrabold text-ink mb-2"><?= htmlspecialchars($product['name']) ?></h1>
      <p class="text-sm text-slate-400 mb-4">SKU: <?= htmlspecialchars($product['sku']) ?></p>

      <div class="flex items-center gap-3 mb-6">
        <?php if ($product['sale_price']): ?>
          <span class="text-3xl font-extrabold text-brand"><?= format_price($product['sale_price']) ?></span>
          <span class="text-lg text-slate-400 line-through"><?= format_price($product['price']) ?></span>
          <span class="bg-accent/20 text-accent text-xs font-bold px-2 py-1 rounded-full">
            Save <?= round((1 - $product['sale_price'] / $product['price']) * 100) ?>%
          </span>
        <?php else: ?>
          <span class="text-3xl font-extrabold text-brand"><?= format_price($product['price']) ?></span>
        <?php endif; ?>
      </div>

      <p class="text-slate-600 leading-relaxed mb-6"><?= htmlspecialchars($product['description']) ?></p>

      <p class="text-sm mb-6">
        <?php if ($product['stock'] > 0): ?>
          <span class="inline-flex items-center gap-1.5 text-green-600 font-medium">
            <span class="h-2 w-2 rounded-full bg-green-500"></span> In Stock (<?= $product['stock'] ?> available)
          </span>
        <?php else: ?>
          <span class="inline-flex items-center gap-1.5 text-red-500 font-medium">
            <span class="h-2 w-2 rounded-full bg-red-500"></span> Out of Stock
          </span>
        <?php endif; ?>
      </p>

      <div class="flex items-center gap-4 mb-8">
        <div class="flex items-center border border-slate-200 rounded-lg">
          <button class="px-3 py-2 text-slate-500 hover:text-ink">−</button>
          <input type="text" value="1" class="w-12 text-center border-x border-slate-200 py-2 text-sm" readonly>
          <button class="px-3 py-2 text-slate-500 hover:text-ink">+</button>
        </div>
        <button class="flex-1 bg-brand hover:bg-brand-dark text-white font-semibold py-3 rounded-lg">
          Add to Cart
        </button>
        <button class="h-11 w-11 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50" title="Add to Wishlist">♡</button>
      </div>

      <!-- Specifications -->
      <div class="border-t border-slate-100 pt-6">
        <h2 class="font-semibold text-ink mb-4">Specifications</h2>
        <dl class="grid grid-cols-2 gap-y-3 text-sm">
          <?php foreach ($product['specs'] as $label => $value): ?>
            <dt class="text-slate-400"><?= htmlspecialchars($label) ?></dt>
            <dd class="text-slate-700 font-medium"><?= htmlspecialchars($value) ?></dd>
          <?php endforeach; ?>
        </dl>
      </div>
    </div>
  </div>

  <!-- Related Products -->
  <section class="mt-16">
    <h2 class="text-2xl font-bold text-ink mb-6">You May Also Like</h2>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
      <?php foreach ($related_products as $p): ?>
        <div class="bg-white rounded-xl border border-slate-100 overflow-hidden hover:shadow-md transition">
          <div class="h-36 img-placeholder">📦</div>
          <div class="p-4">
            <h3 class="font-semibold text-sm text-ink line-clamp-2 mb-2"><?= htmlspecialchars($p['name']) ?></h3>
            <span class="text-brand font-bold"><?= format_price($p['price']) ?></span>
          </div>
        </div>
      <?php endforeach; ?>
    </div>
  </section>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
