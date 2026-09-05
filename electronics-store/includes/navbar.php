<?php
/**
 * Storefront navigation bar. Wireframe: static links, no auth state.
 */
$nav_links = [
    'index.php' => 'Home',
    'shop.php'  => 'Shop',
];
$current = basename($_SERVER['SCRIPT_NAME'] ?? '');
?>
<header class="sticky top-0 z-50 bg-ink text-white shadow-md">
  <div class="hidden sm:block bg-slate-950/60 text-xs text-slate-300">
    <div class="max-w-7xl mx-auto px-4 py-1.5 flex justify-between">
      <span>Free shipping on orders over <?= defined('STORE_CURRENCY_SYMBOL') ? STORE_CURRENCY_SYMBOL : '$' ?>99</span>
      <span>24/7 Support: support@voltix.example</span>
    </div>
  </div>

  <div class="max-w-7xl mx-auto px-4">
    <div class="flex items-center justify-between h-16 gap-6">
      <a href="/electronics-store/index.php" class="flex items-center gap-2 font-extrabold text-xl tracking-tight shrink-0">
        <span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand">⚡</span>
        Voltix
      </a>

      <nav class="hidden md:flex items-center gap-8 text-sm font-medium">
        <?php foreach ($nav_links as $href => $label): ?>
          <a href="/electronics-store/<?= $href ?>"
             class="hover:text-brand-light transition <?= $current === $href ? 'text-brand-light' : 'text-slate-200' ?>">
            <?= $label ?>
          </a>
        <?php endforeach; ?>
      </nav>

      <form action="/electronics-store/shop.php" method="get" class="hidden lg:flex flex-1 max-w-md">
        <div class="relative w-full">
          <input type="text" name="q" placeholder="Search products, brands..."
                 class="w-full rounded-full bg-slate-800/80 border border-slate-700 py-2 pl-4 pr-10 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand">
          <button type="submit" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</button>
        </div>
      </form>

      <div class="flex items-center gap-4 text-slate-200 shrink-0">
        <a href="#" title="Account" class="hover:text-brand-light">👤</a>
        <a href="#" title="Cart" class="relative hover:text-brand-light">
          🛒
          <span class="absolute -top-2 -right-2 bg-accent text-ink text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">0</span>
        </a>
        <button class="md:hidden" title="Menu">☰</button>
      </div>
    </div>
  </div>
</header>
