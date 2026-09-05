<?php
/**
 * Admin — Add Product. Wireframe stage: form fields only, submits nowhere.
 * Phase 2 wires this to INSERT INTO products (...) plus image upload handling.
 */
require_once __DIR__ . '/../../config/config.php';

$page_title = 'Add Product';
$active_nav = 'products';

$categories = ['Laptops', 'Audio', 'Cameras', 'Wearables', 'Tablets', 'Accessories', 'Chargers'];
$brands     = ['Voltix', 'Nimbus', 'PulseTech', 'OrbitLabs', 'FlowGear'];

require_once __DIR__ . '/../includes/admin-header.php';
?>

<form method="post" action="#" class="grid lg:grid-cols-3 gap-6">

  <!-- Main column -->
  <div class="lg:col-span-2 space-y-6">
    <div class="bg-white rounded-xl border border-slate-200 p-6">
      <h2 class="font-semibold text-ink mb-4">General Information</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Product Name</label>
          <input type="text" name="name" placeholder="e.g. AeroBook Pro 14&quot;" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">SKU</label>
            <input type="text" name="sku" placeholder="VLX-AB14-256" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Slug</label>
            <input type="text" name="slug" placeholder="aerobook-pro-14" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Short Description</label>
          <input type="text" name="short_description" placeholder="One-line summary shown on cards" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Full Description</label>
          <textarea name="description" rows="5" placeholder="Detailed product description..." class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"></textarea>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-6">
      <h2 class="font-semibold text-ink mb-4">Pricing & Stock</h2>
      <div class="grid grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Price</label>
          <input type="number" step="0.01" name="price" placeholder="0.00" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Sale Price</label>
          <input type="number" step="0.01" name="sale_price" placeholder="Optional" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Stock Quantity</label>
          <input type="number" name="stock_quantity" placeholder="0" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-6">
      <h2 class="font-semibold text-ink mb-4">Images</h2>
      <div class="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400">
        <p class="text-3xl mb-2">🖼️</p>
        <p class="text-sm">Drag & drop images here, or click to upload</p>
        <p class="text-xs mt-1">(Upload handling implemented in Phase 2)</p>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-6">
      <h2 class="font-semibold text-ink mb-4">Specifications</h2>
      <div class="space-y-2">
        <div class="grid grid-cols-2 gap-3">
          <input type="text" placeholder="Spec name (e.g. RAM)" class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          <input type="text" placeholder="Value (e.g. 16GB)" class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
        </div>
        <button type="button" class="text-sm text-brand hover:underline">+ Add Specification Row</button>
      </div>
    </div>
  </div>

  <!-- Side column -->
  <div class="space-y-6">
    <div class="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <h2 class="font-semibold text-ink">Organization</h2>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
        <select name="category_id" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          <?php foreach ($categories as $cat): ?><option><?= htmlspecialchars($cat) ?></option><?php endforeach; ?>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Brand</label>
        <select name="brand_id" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          <?php foreach ($brands as $brand): ?><option><?= htmlspecialchars($brand) ?></option><?php endforeach; ?>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
        <select name="status" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          <option>Draft</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
      <h2 class="font-semibold text-ink mb-1">Visibility</h2>
      <label class="flex items-center justify-between text-sm">
        <span class="text-slate-600">Featured Product</span>
        <input type="checkbox" name="is_featured" class="rounded border-slate-300 text-brand focus:ring-brand h-4 w-4">
      </label>
      <label class="flex items-center justify-between text-sm">
        <span class="text-slate-600">Top Seller</span>
        <input type="checkbox" name="is_top_seller" class="rounded border-slate-300 text-brand focus:ring-brand h-4 w-4">
      </label>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
      <button type="submit" class="w-full bg-brand hover:bg-brand-dark text-white font-semibold py-2.5 rounded-lg">Save Product</button>
      <a href="/electronics-store/admin/products/index.php" class="block text-center w-full border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold py-2.5 rounded-lg">Cancel</a>
    </div>
  </div>
</form>

<?php require_once __DIR__ . '/../includes/admin-footer.php'; ?>
