<?php
/**
 * Reusable product card. Expects $p with at least:
 *   slug, name, price, sale_price, image, stock_status
 * Optional: category_name, sold (renders a "Best Seller" ribbon + count).
 */
?>
<a href="/electronics-store/product.php?slug=<?= urlencode($p['slug']) ?>"
   class="group relative bg-white rounded-xl border border-slate-100 overflow-hidden hover:shadow-md transition">
  <?php if (isset($p['sold'])): ?>
    <span class="absolute top-2 left-2 z-10 bg-accent text-ink text-[11px] font-bold px-2 py-0.5 rounded-full">🔥 Best Seller</span>
  <?php endif; ?>
  <div class="relative h-44 bg-slate-50">
    <img src="<?= e(product_image_url($p['image'] ?? null)) ?>" alt="<?= e($p['name']) ?>" class="h-full w-full object-cover">
    <?php if (($p['stock_status'] ?? '') === 'out_of_stock' || ($p['stock_status'] ?? '') === 'backorder'): ?>
      <span class="absolute top-2 right-2 bg-slate-700 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">Out of Stock</span>
    <?php elseif (!empty($p['sale_price'])): ?>
      <span class="absolute top-2 right-2 bg-accent text-ink text-[11px] font-bold px-2 py-0.5 rounded-full">Sale</span>
    <?php endif; ?>
  </div>
  <div class="p-4">
    <?php if (!empty($p['category_name'])): ?>
      <p class="text-xs text-slate-400 mb-1"><?= e($p['category_name']) ?></p>
    <?php endif; ?>
    <h3 class="font-semibold text-sm text-ink line-clamp-2 mb-2 group-hover:text-brand"><?= e($p['name']) ?></h3>
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <?php if (!empty($p['sale_price'])): ?>
          <span class="text-brand font-bold"><?= format_price((float) $p['sale_price']) ?></span>
          <span class="text-slate-400 text-sm line-through"><?= format_price((float) $p['price']) ?></span>
        <?php else: ?>
          <span class="text-brand font-bold"><?= format_price((float) $p['price']) ?></span>
        <?php endif; ?>
      </div>
      <?php if (isset($p['sold'])): ?>
        <span class="text-[11px] text-slate-400"><?= number_format((int) $p['sold']) ?> sold</span>
      <?php endif; ?>
    </div>
  </div>
</a>
