<?php
/**
 * Landing Page — hero (static), carousel/featured/top-seller sections
 * pulled live from the database, CTA (static).
 */
require_once __DIR__ . '/includes/bootstrap.php';

$page_title = 'Voltix Electronics — Premium Tech, Delivered Fast';

$pdo = get_pdo();

$imageSubquery = "(SELECT pi.image_path FROM product_images pi
                    WHERE pi.product_id = p.id
                    ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1) AS image";

$carousel_products = $pdo->query("
    SELECT p.*, $imageSubquery
    FROM products p
    WHERE p.status = 'active'
    ORDER BY p.created_at DESC
    LIMIT 8
")->fetchAll();

$featured_products = $pdo->query("
    SELECT p.*, c.name AS category_name, $imageSubquery
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE p.status = 'active' AND p.is_featured = 1
    ORDER BY p.created_at DESC
    LIMIT 4
")->fetchAll();

$top_sellers = $pdo->query("
    SELECT p.*, c.name AS category_name, $imageSubquery,
           COALESCE((SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.product_id = p.id), 0) AS sold
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE p.status = 'active' AND p.is_top_seller = 1
    ORDER BY sold DESC
    LIMIT 4
")->fetchAll();

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
        <a href="/electronics-store/shop.php?featured=1" class="border border-white/30 hover:border-white transition px-6 py-3 rounded-lg font-semibold">
          View Featured
        </a>
      </div>
    </div>
    <div class="h-64 sm:h-80 lg:h-96 rounded-2xl overflow-hidden bg-slate-800/60">
      <img src="/electronics-store/assets/images/placeholder-product.svg" alt="" class="h-full w-full object-cover">
    </div>
  </div>
</section>

<!-- Product Carousel -->
<?php if ($carousel_products): ?>
<section class="max-w-7xl mx-auto px-4 py-14">
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-2xl font-bold text-ink">New Arrivals</h2>
  </div>
  <div class="flex gap-5 overflow-x-auto pb-2 snap-x">
    <?php foreach ($carousel_products as $p): ?>
      <div class="snap-start shrink-0 w-56">
        <?php include __DIR__ . '/includes/product-card.php'; ?>
      </div>
    <?php endforeach; ?>
  </div>
</section>
<?php endif; ?>

<!-- Featured Products -->
<?php if ($featured_products): ?>
<section class="bg-white border-y border-slate-100">
  <div class="max-w-7xl mx-auto px-4 py-14">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-ink">Featured Products</h2>
      <a href="/electronics-store/shop.php?featured=1" class="text-brand font-medium text-sm hover:underline">View all →</a>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
      <?php foreach ($featured_products as $p): ?>
        <?php include __DIR__ . '/includes/product-card.php'; ?>
      <?php endforeach; ?>
    </div>
  </div>
</section>
<?php endif; ?>

<!-- Top Selling Products -->
<?php if ($top_sellers): ?>
<section class="max-w-7xl mx-auto px-4 py-14">
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-2xl font-bold text-ink">Top Selling</h2>
    <a href="/electronics-store/shop.php?top_sellers=1" class="text-brand font-medium text-sm hover:underline">View all →</a>
  </div>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
    <?php foreach ($top_sellers as $p): ?>
      <?php include __DIR__ . '/includes/product-card.php'; ?>
    <?php endforeach; ?>
  </div>
</section>
<?php endif; ?>

<!-- Call To Action -->
<section class="bg-ink text-white">
  <div class="max-w-7xl mx-auto px-4 py-16 text-center">
    <h2 class="text-3xl font-extrabold mb-3">Upgrade Your Setup Today</h2>
    <p class="text-slate-300 max-w-xl mx-auto mb-8">
      Join thousands of customers who trust Voltix for genuine, warrantied electronics with fast nationwide delivery.
    </p>
    <a href="/electronics-store/shop.php" class="inline-block bg-brand hover:bg-brand-dark transition px-8 py-3 rounded-lg font-semibold">
      Browse All Products
    </a>
  </div>
</section>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
