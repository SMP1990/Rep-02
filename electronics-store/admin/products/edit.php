<?php
/**
 * Admin — Edit Product. Wireframe stage: form pre-filled with a hardcoded
 * placeholder record (id via ?id=). Phase 2 loads the real row via
 * $_GET['id'] and handles the UPDATE.
 */
require_once __DIR__ . '/../../config/config.php';

$page_title = 'Edit Product';
$active_nav = 'products';

$categories = ['Laptops', 'Audio', 'Cameras', 'Wearables', 'Tablets', 'Accessories', 'Chargers'];
$brands     = ['Voltix', 'Nimbus', 'PulseTech', 'OrbitLabs', 'FlowGear'];

$product = [
    'name'              => 'AeroBook Pro 14"',
    'sku'               => 'VLX-AB14-256',
    'slug'              => 'aerobook-pro-14',
    'short_description' => 'Featherlight 14" laptop built for creators.',
    'description'       => "A featherlight 14\" laptop built for creators and professionals. All-day battery, a stunning display, and enough power to handle serious workloads.",
    'price'             => 1299.00,
    'sale_price'        => 1149.00,
    'stock_quantity'    => 14,
    'category'          => 'Laptops',
    'brand'             => 'Voltix',
    'status'            => 'Active',
    'is_featured'       => true,
    'is_top_seller'     => false,
];

require_once __DIR__ . '/../includes/admin-header.php';
?>

<form method="post" action="#" class="grid lg:grid-cols-3 gap-6">

  <div class="lg:col-span-2 space-y-6">
    <div class="bg-white rounded-xl border border-slate-200 p-6">
      <h2 class="font-semibold text-ink mb-4">General Information</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Product Name</label>
          <input type="text" name="name" value="<?= htmlspecialchars($product['name']) ?>" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">SKU</label>
            <input type="text" name="sku" value="<?= htmlspecialchars($product['sku']) ?>" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Slug</label>
            <input type="text" name="slug" value="<?= htmlspecialchars($product['slug']) ?>" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Short Description</label>
          <input type="text" name="short_description" value="<?= htmlspecialchars($product['short_description']) ?>" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Full Description</label>
          <textarea name="description" rows="5" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"><?= htmlspecialchars($product['description']) ?></textarea>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-6">
      <h2 class="font-semibold text-ink mb-4">Pricing & Stock</h2>
      <div class="grid grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Price</label>
          <input type="number" step="0.01" name="price" value="<?= $product['price'] ?>" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Sale Price</label>
          <input type="number" step="0.01" name="sale_price" value="<?= $product['sale_price'] ?>" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Stock Quantity</label>
          <input type="number" name="stock_quantity" value="<?= $product['stock_quantity'] ?>" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-6">
      <h2 class="font-semibold text-ink mb-4">Images</h2>
      <div class="grid grid-cols-4 gap-3 mb-4">
        <?php for ($i = 0; $i < 3; $i++): ?>
          <div class="relative h-24 rounded-lg img-placeholder border border-slate-200">
            🖼️
            <button type="button" class="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-xs">✕</button>
          </div>
        <?php endfor; ?>
      </div>
      <div class="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400">
        <p class="text-sm">Drag & drop to add more images</p>
      </div>
    </div>
  </div>

  <div class="space-y-6">
    <div class="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <h2 class="font-semibold text-ink">Organization</h2>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
        <select name="category_id" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          <?php foreach ($categories as $cat): ?>
            <option <?= $cat === $product['category'] ? 'selected' : '' ?>><?= htmlspecialchars($cat) ?></option>
          <?php endforeach; ?>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Brand</label>
        <select name="brand_id" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          <?php foreach ($brands as $brand): ?>
            <option <?= $brand === $product['brand'] ? 'selected' : '' ?>><?= htmlspecialchars($brand) ?></option>
          <?php endforeach; ?>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
        <select name="status" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          <?php foreach (['Draft', 'Active', 'Inactive'] as $s): ?>
            <option <?= $s === $product['status'] ? 'selected' : '' ?>><?= $s ?></option>
          <?php endforeach; ?>
        </select>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
      <h2 class="font-semibold text-ink mb-1">Visibility</h2>
      <label class="flex items-center justify-between text-sm">
        <span class="text-slate-600">Featured Product</span>
        <input type="checkbox" name="is_featured" <?= $product['is_featured'] ? 'checked' : '' ?> class="rounded border-slate-300 text-brand focus:ring-brand h-4 w-4">
      </label>
      <label class="flex items-center justify-between text-sm">
        <span class="text-slate-600">Top Seller</span>
        <input type="checkbox" name="is_top_seller" <?= $product['is_top_seller'] ? 'checked' : '' ?> class="rounded border-slate-300 text-brand focus:ring-brand h-4 w-4">
      </label>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
      <button type="submit" class="w-full bg-brand hover:bg-brand-dark text-white font-semibold py-2.5 rounded-lg">Update Product</button>
      <a href="/electronics-store/admin/products/index.php" class="block text-center w-full border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold py-2.5 rounded-lg">Cancel</a>
      <button type="button" class="w-full text-red-500 hover:text-red-600 text-sm font-medium py-1">Delete Product</button>
    </div>
  </div>
</form>

<?php require_once __DIR__ . '/../includes/admin-footer.php'; ?>
