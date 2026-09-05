<?php
/**
 * Landing Page — wireframe stage.
 * Product arrays below are hardcoded placeholders for layout purposes only;
 * Phase 2 replaces them with real queries via includes/functions.php.
 */
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/includes/functions.php';

$page_title = 'Voltix Electronics — Premium Tech, Delivered Fast';

$carousel_products = [
    ['name' => 'AeroBook Pro 14"',        'price' => 1299.00, 'tag' => 'New'],
    ['name' => 'Nimbus Wireless Earbuds', 'price' => 129.00,  'tag' => 'Hot'],
    ['name' => 'PulseCam 4K Action Cam',  'price' => 249.00,  'tag' => ''],
    ['name' => 'OrbitWatch SE',           'price' => 199.00,  'tag' => 'New'],
    ['name' => 'FlowMouse Ergo',          'price' => 59.00,   'tag' => ''],
];

$featured_products = [
    ['name' => 'AeroBook Pro 14"',        'category' => 'Laptops',    'price' => 1299.00, 'sale_price' => null],
    ['name' => 'Nimbus Wireless Earbuds', 'category' => 'Audio',      'price' => 129.00,  'sale_price' => 99.00],
    ['name' => 'PulseCam 4K Action Cam',  'category' => 'Cameras',    'price' => 249.00,  'sale_price' => null],
    ['name' => 'OrbitWatch SE',           'category' => 'Wearables',  'price' => 199.00,  'sale_price' => 169.00],
];

$top_sellers = [
    ['name' => 'FlowMouse Ergo',        'category' => 'Accessories', 'price' => 59.00,  'sold' => 2140],
    ['name' => 'VoltCharge 65W GaN',    'category' => 'Chargers',    'price' => 39.00,  'sold' => 1875],
    ['name' => 'EchoBar Soundbar',      'category' => 'Audio',       'price' => 189.00, 'sold' => 1520],
    ['name' => 'GridPad 11 Tablet',     'category' => 'Tablets',     'price' => 349.00, 'sold' => 1310],
];

require_once __DIR__ . '/includes/header.php';
?>

<!-- Hero Banner -->
<section class="relative overflow-hidden bg-gradient-to-br from-ink via-slate-900 to-brand-dark text-white">
  <div class="max-w-7xl mx-auto px-4 py-20 lg:py-28 grid lg:grid-cols-2 gap-10 items-center">
    <div>
      <span class="inline-block bg-accent/20 text-accent text-xs font-semibold px-3 py-1 rounded-full mb-4">
        Fall Tech Sale — Up to 40% Off
      </span>
      <h1 class="text-4xl sm:text-5xl font-extrabold leading-tight mb-5">
        Next-Gen Electronics for Every Day.
      </h1>
      <p class="text-slate-300 text-lg mb-8 max-w-lg">
        Laptops, audio, wearables and smart accessories — hand-picked for performance, backed by real warranty support.
      </p>
      <div class="flex flex-wrap gap-4">
        <a href="/electronics-store/shop.php" class="bg-brand hover:bg-brand-dark transition px-6 py-3 rounded-lg font-semibold">
          Shop Now
        </a>
        <a href="/electronics-store/shop.php?filter=featured" class="border border-white/30 hover:border-white transition px-6 py-3 rounded-lg font-semibold">
          View Featured
        </a>
      </div>
    </div>
    <div class="h-64 sm:h-80 lg:h-96 rounded-2xl img-placeholder bg-slate-800/60">Hero Product Shot</div>
  </div>
</section>

<!-- Product Carousel -->
<section class="max-w-7xl mx-auto px-4 py-14">
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-2xl font-bold text-ink">New Arrivals</h2>
    <div class="flex gap-2">
      <button class="h-9 w-9 rounded-full border border-slate-300 hover:bg-slate-100">‹</button>
      <button class="h-9 w-9 rounded-full border border-slate-300 hover:bg-slate-100">›</button>
    </div>
  </div>
  <div class="flex gap-5 overflow-x-auto pb-2 snap-x">
    <?php foreach ($carousel_products as $p): ?>
      <div class="snap-start shrink-0 w-56 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition">
        <div class="h-36 img-placeholder">📦</div>
        <div class="p-4">
          <?php if ($p['tag']): ?>
            <span class="text-[11px] font-semibold text-brand bg-brand/10 px-2 py-0.5 rounded-full"><?= htmlspecialchars($p['tag']) ?></span>
          <?php endif; ?>
          <h3 class="mt-2 font-semibold text-sm text-ink line-clamp-2"><?= htmlspecialchars($p['name']) ?></h3>
          <p class="mt-1 text-brand font-bold"><?= format_price($p['price']) ?></p>
        </div>
      </div>
    <?php endforeach; ?>
  </div>
</section>

<!-- Featured Products -->
<section class="bg-white border-y border-slate-100">
  <div class="max-w-7xl mx-auto px-4 py-14">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-ink">Featured Products</h2>
      <a href="/electronics-store/shop.php?filter=featured" class="text-brand font-medium text-sm hover:underline">View all →</a>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
      <?php foreach ($featured_products as $p): ?>
        <div class="group bg-slate-50 rounded-xl border border-slate-100 overflow-hidden hover:shadow-md transition">
          <div class="h-40 img-placeholder">📦</div>
          <div class="p-4">
            <p class="text-xs text-slate-400 mb-1"><?= htmlspecialchars($p['category']) ?></p>
            <h3 class="font-semibold text-sm text-ink line-clamp-2 mb-2"><?= htmlspecialchars($p['name']) ?></h3>
            <div class="flex items-center gap-2">
              <?php if ($p['sale_price']): ?>
                <span class="text-brand font-bold"><?= format_price($p['sale_price']) ?></span>
                <span class="text-slate-400 text-sm line-through"><?= format_price($p['price']) ?></span>
              <?php else: ?>
                <span class="text-brand font-bold"><?= format_price($p['price']) ?></span>
              <?php endif; ?>
            </div>
          </div>
        </div>
      <?php endforeach; ?>
    </div>
  </div>
</section>

<!-- Top Selling Products -->
<section class="max-w-7xl mx-auto px-4 py-14">
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-2xl font-bold text-ink">Top Selling</h2>
    <a href="/electronics-store/shop.php?filter=top-sellers" class="text-brand font-medium text-sm hover:underline">View all →</a>
  </div>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
    <?php foreach ($top_sellers as $p): ?>
      <div class="relative bg-white rounded-xl border border-slate-100 overflow-hidden hover:shadow-md transition">
        <span class="absolute top-2 left-2 z-10 bg-accent text-ink text-[11px] font-bold px-2 py-0.5 rounded-full">🔥 Best Seller</span>
        <div class="h-40 img-placeholder">📦</div>
        <div class="p-4">
          <p class="text-xs text-slate-400 mb-1"><?= htmlspecialchars($p['category']) ?></p>
          <h3 class="font-semibold text-sm text-ink line-clamp-2 mb-2"><?= htmlspecialchars($p['name']) ?></h3>
          <div class="flex items-center justify-between">
            <span class="text-brand font-bold"><?= format_price($p['price']) ?></span>
            <span class="text-[11px] text-slate-400"><?= number_format($p['sold']) ?> sold</span>
          </div>
        </div>
      </div>
    <?php endforeach; ?>
  </div>
</section>

<!-- Call To Action -->
<section class="bg-ink text-white">
  <div class="max-w-7xl mx-auto px-4 py-16 text-center">
    <h2 class="text-3xl font-extrabold mb-3">Upgrade Your Setup Today</h2>
    <p class="text-slate-300 max-w-xl mx-auto mb-8">
      Join 50,000+ customers who trust Voltix for genuine, warrantied electronics with fast nationwide delivery.
    </p>
    <a href="/electronics-store/shop.php" class="inline-block bg-brand hover:bg-brand-dark transition px-8 py-3 rounded-lg font-semibold">
      Browse All Products
    </a>
  </div>
</section>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
