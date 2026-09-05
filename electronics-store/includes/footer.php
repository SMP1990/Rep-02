<footer class="bg-ink text-slate-300 mt-16">
  <div class="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
    <div>
      <div class="flex items-center gap-2 font-extrabold text-xl text-white mb-3">
        <span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand">⚡</span>
        Voltix
      </div>
      <p class="text-sm text-slate-400">Premium electronics, laptops, audio and smart gadgets — curated and shipped fast.</p>
    </div>
    <div>
      <h4 class="text-white font-semibold mb-3">Shop</h4>
      <ul class="space-y-2 text-sm text-slate-400">
        <li><a href="/electronics-store/shop.php" class="hover:text-brand-light">All Products</a></li>
        <li><a href="/electronics-store/shop.php?filter=featured" class="hover:text-brand-light">Featured</a></li>
        <li><a href="/electronics-store/shop.php?filter=top-sellers" class="hover:text-brand-light">Top Sellers</a></li>
      </ul>
    </div>
    <div>
      <h4 class="text-white font-semibold mb-3">Support</h4>
      <ul class="space-y-2 text-sm text-slate-400">
        <li><a href="#" class="hover:text-brand-light">Shipping & Returns</a></li>
        <li><a href="#" class="hover:text-brand-light">Warranty</a></li>
        <li><a href="#" class="hover:text-brand-light">Contact Us</a></li>
      </ul>
    </div>
    <div>
      <h4 class="text-white font-semibold mb-3">Newsletter</h4>
      <p class="text-sm text-slate-400 mb-3">Get deals on new arrivals.</p>
      <form class="flex gap-2">
        <input type="email" placeholder="you@example.com" class="flex-1 min-w-0 rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand">
        <button type="submit" class="rounded-md bg-brand hover:bg-brand-dark px-4 py-2 text-sm font-semibold text-white">Join</button>
      </form>
    </div>
  </div>
  <div class="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
    &copy; <?= date('Y') ?> Voltix Electronics. All rights reserved.
  </div>
</footer>

<script src="/electronics-store/assets/js/main.js"></script>
</body>
</html>
