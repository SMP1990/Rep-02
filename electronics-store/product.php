<?php
/**
 * Product Details Page — loads the real product by ?slug=, its images,
 * specs, and related products from the same category.
 */
require_once __DIR__ . '/includes/bootstrap.php';

$pdo = get_pdo();
$slug = $_GET['slug'] ?? '';

$stmt = $pdo->prepare('
    SELECT p.*, c.name AS category_name, c.slug AS category_slug, b.name AS brand_name
    FROM products p
    JOIN categories c ON c.id = p.category_id
    LEFT JOIN brands b ON b.id = p.brand_id
    WHERE p.slug = ? AND p.status = "active"
');
$stmt->execute([$slug]);
$product = $stmt->fetch();

if (!$product) {
    http_response_code(404);
    $page_title = 'Product Not Found — Voltix Electronics';
    require_once __DIR__ . '/includes/header.php';
    echo '<div class="max-w-3xl mx-auto px-4 py-24 text-center">
            <h1 class="text-3xl font-bold text-ink mb-3">Product Not Found</h1>
            <p class="text-slate-500 mb-6">This product may have been removed or is no longer available.</p>
            <a href="/electronics-store/shop.php" class="text-brand font-semibold hover:underline">← Back to Shop</a>
          </div>';
    require_once __DIR__ . '/includes/footer.php';
    exit;
}

// Record a view (best-effort; not critical if it fails).
$pdo->prepare('UPDATE products SET views = views + 1 WHERE id = ?')->execute([$product['id']]);

$imgStmt = $pdo->prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC');
$imgStmt->execute([$product['id']]);
$images = $imgStmt->fetchAll();

$specStmt = $pdo->prepare('SELECT * FROM product_specifications WHERE product_id = ? ORDER BY sort_order');
$specStmt->execute([$product['id']]);
$specs = $specStmt->fetchAll();

$relStmt = $pdo->prepare('
    SELECT p.*,
           (SELECT pi.image_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1) AS image
    FROM products p
    WHERE p.category_id = ? AND p.id != ? AND p.status = "active"
    ORDER BY RAND()
    LIMIT 4
');
$relStmt->execute([$product['category_id'], $product['id']]);
$related_products = $relStmt->fetchAll();

$page_title = $product['name'] . ' — Voltix Electronics';

require_once __DIR__ . '/includes/header.php';
?>

<div class="max-w-7xl mx-auto px-4 py-8">

  <nav class="text-sm text-slate-500 mb-6">
    <a href="/electronics-store/index.php" class="hover:text-brand">Home</a> /
    <a href="/electronics-store/shop.php" class="hover:text-brand">Shop</a> /
    <a href="/electronics-store/shop.php?category[]=<?= $product['category_id'] ?>" class="hover:text-brand"><?= e($product['category_name']) ?></a> /
    <span class="text-ink"><?= e($product['name']) ?></span>
  </nav>

  <div class="grid lg:grid-cols-2 gap-10">

    <!-- Gallery -->
    <div>
      <?php $primaryImage = $images[0]['image_path'] ?? null; ?>
      <div class="h-96 rounded-xl overflow-hidden bg-slate-50 mb-4">
        <img id="main-image" src="<?= e(product_image_url($primaryImage)) ?>" alt="<?= e($product['name']) ?>" class="h-full w-full object-cover">
      </div>
      <?php if (count($images) > 1): ?>
        <div class="grid grid-cols-4 gap-3">
          <?php foreach ($images as $img): ?>
            <button type="button" onclick="document.getElementById('main-image').src = this.querySelector('img').src"
                    class="h-20 rounded-lg overflow-hidden border border-slate-200 hover:border-brand">
              <img src="<?= e(product_image_url($img['image_path'])) ?>" class="h-full w-full object-cover">
            </button>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
    </div>

    <!-- Details -->
    <div>
      <?php if ($product['brand_name']): ?>
        <p class="text-sm text-brand font-medium mb-1"><?= e($product['brand_name']) ?></p>
      <?php endif; ?>
      <h1 class="text-3xl font-extrabold text-ink mb-2"><?= e($product['name']) ?></h1>
      <p class="text-sm text-slate-400 mb-4">SKU: <?= e($product['sku']) ?></p>

      <div class="flex items-center gap-3 mb-6">
        <?php if ($product['sale_price']): ?>
          <span class="text-3xl font-extrabold text-brand"><?= format_price((float) $product['sale_price']) ?></span>
          <span class="text-lg text-slate-400 line-through"><?= format_price((float) $product['price']) ?></span>
          <span class="bg-accent/20 text-accent text-xs font-bold px-2 py-1 rounded-full">
            Save <?= round((1 - $product['sale_price'] / $product['price']) * 100) ?>%
          </span>
        <?php else: ?>
          <span class="text-3xl font-extrabold text-brand"><?= format_price((float) $product['price']) ?></span>
        <?php endif; ?>
      </div>

      <?php if ($product['short_description']): ?>
        <p class="text-slate-600 leading-relaxed mb-6"><?= e($product['short_description']) ?></p>
      <?php endif; ?>
      <?php if ($product['description']): ?>
        <p class="text-slate-600 leading-relaxed mb-6"><?= nl2br(e($product['description'])) ?></p>
      <?php endif; ?>

      <p class="text-sm mb-6">
        <?php if ($product['stock_status'] === 'in_stock'): ?>
          <span class="inline-flex items-center gap-1.5 text-green-600 font-medium">
            <span class="h-2 w-2 rounded-full bg-green-500"></span> In Stock (<?= (int) $product['stock_quantity'] ?> available)
          </span>
        <?php else: ?>
          <span class="inline-flex items-center gap-1.5 text-red-500 font-medium">
            <span class="h-2 w-2 rounded-full bg-red-500"></span> Out of Stock
          </span>
        <?php endif; ?>
      </p>

      <?php if ($product['stock_status'] === 'in_stock'): ?>
        <form method="post" action="/electronics-store/cart-add.php" class="flex items-center gap-4 mb-8">
          <?= csrf_field() ?>
          <input type="hidden" name="product_id" value="<?= $product['id'] ?>">
          <input type="hidden" name="return_slug" value="<?= e($product['slug']) ?>">
          <div class="flex items-center border border-slate-200 rounded-lg">
            <button type="button" onclick="stepQty(-1)" class="px-3 py-2 text-slate-500 hover:text-ink">−</button>
            <input type="number" name="quantity" id="qty" value="1" min="1" max="<?= (int) $product['stock_quantity'] ?>" class="w-12 text-center border-x border-slate-200 py-2 text-sm">
            <button type="button" onclick="stepQty(1)" class="px-3 py-2 text-slate-500 hover:text-ink">+</button>
          </div>
          <button type="submit" class="flex-1 bg-brand hover:bg-brand-dark text-white font-semibold py-3 rounded-lg">
            Add to Cart
          </button>
        </form>
        <script>
          function stepQty(delta) {
            const input = document.getElementById('qty');
            const next = Math.max(1, Math.min(parseInt(input.max || 99), parseInt(input.value || 1) + delta));
            input.value = next;
          }
        </script>
      <?php endif; ?>

      <?php if ($specs): ?>
        <div class="border-t border-slate-100 pt-6">
          <h2 class="font-semibold text-ink mb-4">Specifications</h2>
          <dl class="grid grid-cols-2 gap-y-3 text-sm">
            <?php foreach ($specs as $spec): ?>
              <dt class="text-slate-400"><?= e($spec['spec_name']) ?></dt>
              <dd class="text-slate-700 font-medium"><?= e($spec['spec_value']) ?></dd>
            <?php endforeach; ?>
          </dl>
        </div>
      <?php endif; ?>
    </div>
  </div>

  <?php if ($related_products): ?>
    <section class="mt-16">
      <h2 class="text-2xl font-bold text-ink mb-6">You May Also Like</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
        <?php foreach ($related_products as $p): ?>
          <?php include __DIR__ . '/includes/product-card.php'; ?>
        <?php endforeach; ?>
      </div>
    </section>
  <?php endif; ?>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
