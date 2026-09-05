<?php
/**
 * Admin sidebar navigation. Wireframe: static links, highlight via
 * $active_nav set by the including page.
 */
$nav = [
    'dashboard'  => ['label' => 'Dashboard',  'icon' => '📊', 'href' => '/electronics-store/admin/dashboard.php'],
    'products'   => ['label' => 'Products',   'icon' => '📦', 'href' => '/electronics-store/admin/products/index.php'],
    'categories' => ['label' => 'Categories', 'icon' => '🗂️', 'href' => '/electronics-store/admin/categories/index.php'],
    'brands'     => ['label' => 'Brands',     'icon' => '🏷️', 'href' => '/electronics-store/admin/brands/index.php'],
    'orders'     => ['label' => 'Orders',     'icon' => '🧾', 'href' => '/electronics-store/admin/orders/index.php'],
    'customers'  => ['label' => 'Customers',  'icon' => '👥', 'href' => '/electronics-store/admin/customers/index.php'],
];
?>
<aside class="w-64 shrink-0 bg-ink text-slate-300 flex flex-col">
  <div class="h-16 flex items-center gap-2 px-6 font-extrabold text-lg text-white border-b border-white/10">
    <span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand">⚡</span>
    Voltix Admin
  </div>
  <nav class="flex-1 py-4 space-y-1">
    <?php foreach ($nav as $key => $item): ?>
      <a href="<?= $item['href'] ?>"
         class="flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition
                <?= $active_nav === $key ? 'bg-brand/20 text-white border-r-4 border-brand' : 'hover:bg-white/5 hover:text-white' ?>">
        <span><?= $item['icon'] ?></span> <?= $item['label'] ?>
      </a>
    <?php endforeach; ?>
  </nav>
  <div class="px-6 py-4 border-t border-white/10 text-xs text-slate-500">
    Voltix Electronics &copy; <?= date('Y') ?>
  </div>
</aside>
