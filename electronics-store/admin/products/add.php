<?php
/**
 * Admin — Add Product. Inserts into products (+ product_images,
 * product_specifications) inside a transaction.
 */
require_once __DIR__ . '/../../includes/bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_admin_login();

$page_title = 'Add Product';
$active_nav = 'products';

$pdo = get_pdo();
$categories = $pdo->query('SELECT id, name FROM categories ORDER BY name')->fetchAll();
$brands     = $pdo->query('SELECT id, name FROM brands ORDER BY name')->fetchAll();

$errors = [];
$form = [
    'name' => '', 'sku' => '', 'slug' => '', 'short_description' => '', 'description' => '',
    'price' => '', 'sale_price' => '', 'stock_quantity' => '', 'category_id' => '', 'brand_id' => '',
    'status' => 'draft', 'is_featured' => false, 'is_top_seller' => false,
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf($_POST['csrf_token'] ?? null)) {
        $errors[] = 'Your session expired. Please try again.';
    }

    $form['name']              = trim($_POST['name'] ?? '');
    $form['sku']                = trim($_POST['sku'] ?? '');
    $form['slug']                = trim($_POST['slug'] ?? '') ?: $form['name'];
    $form['short_description']  = trim($_POST['short_description'] ?? '');
    $form['description']        = trim($_POST['description'] ?? '');
    $form['price']               = $_POST['price'] ?? '';
    $form['sale_price']          = trim($_POST['sale_price'] ?? '') !== '' ? $_POST['sale_price'] : null;
    $form['stock_quantity']      = $_POST['stock_quantity'] ?? '0';
    $form['category_id']        = (int) ($_POST['category_id'] ?? 0);
    $form['brand_id']            = (int) ($_POST['brand_id'] ?? 0) ?: null;
    $form['status']              = in_array($_POST['status'] ?? '', ['draft', 'active', 'inactive'], true) ? $_POST['status'] : 'draft';
    $form['is_featured']         = !empty($_POST['is_featured']);
    $form['is_top_seller']       = !empty($_POST['is_top_seller']);

    if ($form['name'] === '') $errors[] = 'Product name is required.';
    if ($form['sku'] === '') $errors[] = 'SKU is required.';
    if (!is_numeric($form['price']) || (float) $form['price'] < 0) $errors[] = 'Price must be a valid amount.';
    if ($form['sale_price'] !== null && (!is_numeric($form['sale_price']) || (float) $form['sale_price'] < 0)) $errors[] = 'Sale price must be a valid amount.';
    if (!ctype_digit((string) $form['stock_quantity'])) $errors[] = 'Stock quantity must be a whole number.';
    if ($form['category_id'] <= 0) $errors[] = 'Please choose a category.';

    if (!$errors) {
        $stockStatus = ((int) $form['stock_quantity'] > 0) ? 'in_stock' : 'out_of_stock';
        $slug = unique_slug($pdo, 'products', 'slug', slugify($form['slug']));

        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare('
                INSERT INTO products
                    (category_id, brand_id, name, slug, sku, short_description, description,
                     price, sale_price, stock_quantity, stock_status, is_featured, is_top_seller, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $stmt->execute([
                $form['category_id'], $form['brand_id'], $form['name'], $slug, $form['sku'],
                $form['short_description'] ?: null, $form['description'] ?: null,
                $form['price'], $form['sale_price'], $form['stock_quantity'], $stockStatus,
                $form['is_featured'] ? 1 : 0, $form['is_top_seller'] ? 1 : 0, $form['status'],
            ]);
            $productId = (int) $pdo->lastInsertId();

            $uploaded = normalize_files_array($_FILES['images'] ?? ['name' => [], 'type' => [], 'tmp_name' => [], 'error' => [], 'size' => []]);
            $imgStmt = $pdo->prepare('INSERT INTO product_images (product_id, image_path, is_primary, sort_order) VALUES (?, ?, ?, ?)');
            foreach ($uploaded as $i => $file) {
                $path = handle_image_upload($file, 'products');
                if ($path) {
                    $imgStmt->execute([$productId, $path, $i === 0 ? 1 : 0, $i]);
                }
            }

            $specNames  = $_POST['spec_name'] ?? [];
            $specValues = $_POST['spec_value'] ?? [];
            $specStmt = $pdo->prepare('INSERT INTO product_specifications (product_id, spec_name, spec_value, sort_order) VALUES (?, ?, ?, ?)');
            $order = 0;
            foreach ($specNames as $i => $name) {
                $name = trim($name);
                $value = trim($specValues[$i] ?? '');
                if ($name !== '' && $value !== '') {
                    $specStmt->execute([$productId, $name, $value, $order++]);
                }
            }

            $pdo->commit();
            flash_set('success', 'Product "' . $form['name'] . '" was created.');
            redirect('/electronics-store/admin/products/index.php');
        } catch (Throwable $e) {
            $pdo->rollBack();
            $errors[] = 'Could not save the product: ' . $e->getMessage();
        }
    }
}

require_once __DIR__ . '/../includes/admin-header.php';
?>

<?php if ($errors): ?>
  <div class="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
    <ul class="list-disc list-inside space-y-0.5">
      <?php foreach ($errors as $err): ?><li><?= e($err) ?></li><?php endforeach; ?>
    </ul>
  </div>
<?php endif; ?>

<form method="post" action="" enctype="multipart/form-data" class="grid lg:grid-cols-3 gap-6">
  <?= csrf_field() ?>

  <div class="lg:col-span-2 space-y-6">
    <div class="bg-white rounded-xl border border-slate-200 p-6">
      <h2 class="font-semibold text-ink mb-4">General Information</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Product Name</label>
          <input type="text" name="name" value="<?= e($form['name']) ?>" placeholder="e.g. AeroBook Pro 14&quot;" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">SKU</label>
            <input type="text" name="sku" value="<?= e($form['sku']) ?>" placeholder="VLX-AB14-256" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Slug (optional)</label>
            <input type="text" name="slug" value="<?= e($form['slug']) ?>" placeholder="Auto-generated from name if left blank" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Short Description</label>
          <input type="text" name="short_description" value="<?= e($form['short_description']) ?>" placeholder="One-line summary shown on cards" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Full Description</label>
          <textarea name="description" rows="5" placeholder="Detailed product description..." class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"><?= e($form['description']) ?></textarea>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-6">
      <h2 class="font-semibold text-ink mb-4">Pricing & Stock</h2>
      <div class="grid grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Price</label>
          <input type="number" step="0.01" min="0" name="price" value="<?= e((string) $form['price']) ?>" placeholder="0.00" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Sale Price</label>
          <input type="number" step="0.01" min="0" name="sale_price" value="<?= e((string) ($form['sale_price'] ?? '')) ?>" placeholder="Optional" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Stock Quantity</label>
          <input type="number" min="0" name="stock_quantity" value="<?= e((string) $form['stock_quantity']) ?>" placeholder="0" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-6">
      <h2 class="font-semibold text-ink mb-4">Images</h2>
      <label class="block border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 cursor-pointer hover:border-brand hover:text-brand transition">
        <input type="file" name="images[]" multiple accept="image/png,image/jpeg,image/webp" class="hidden" onchange="this.nextElementSibling.textContent = this.files.length + ' file(s) selected'">
        <p class="text-3xl mb-2">🖼️</p>
        <p class="text-sm">Click to choose images (JPG, PNG, WEBP — up to 5MB each)</p>
        <p class="text-xs mt-1 text-slate-400">No files selected</p>
      </label>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-6">
      <h2 class="font-semibold text-ink mb-4">Specifications</h2>
      <div id="spec-rows" class="space-y-2">
        <div class="grid grid-cols-2 gap-3">
          <input type="text" name="spec_name[]" placeholder="Spec name (e.g. RAM)" class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          <input type="text" name="spec_value[]" placeholder="Value (e.g. 16GB)" class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
        </div>
      </div>
      <button type="button" onclick="addSpecRow()" class="mt-2 text-sm text-brand hover:underline">+ Add Specification Row</button>
    </div>
  </div>

  <div class="space-y-6">
    <div class="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <h2 class="font-semibold text-ink">Organization</h2>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
        <select name="category_id" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          <option value="">Select a category</option>
          <?php foreach ($categories as $cat): ?>
            <option value="<?= $cat['id'] ?>" <?= $form['category_id'] === (int) $cat['id'] ? 'selected' : '' ?>><?= e($cat['name']) ?></option>
          <?php endforeach; ?>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Brand</label>
        <select name="brand_id" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          <option value="">None</option>
          <?php foreach ($brands as $brand): ?>
            <option value="<?= $brand['id'] ?>" <?= $form['brand_id'] === (int) $brand['id'] ? 'selected' : '' ?>><?= e($brand['name']) ?></option>
          <?php endforeach; ?>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
        <select name="status" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          <?php foreach (['draft' => 'Draft', 'active' => 'Active', 'inactive' => 'Inactive'] as $val => $label): ?>
            <option value="<?= $val ?>" <?= $form['status'] === $val ? 'selected' : '' ?>><?= $label ?></option>
          <?php endforeach; ?>
        </select>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
      <h2 class="font-semibold text-ink mb-1">Visibility</h2>
      <label class="flex items-center justify-between text-sm">
        <span class="text-slate-600">Featured Product</span>
        <input type="checkbox" name="is_featured" <?= $form['is_featured'] ? 'checked' : '' ?> class="rounded border-slate-300 text-brand focus:ring-brand h-4 w-4">
      </label>
      <label class="flex items-center justify-between text-sm">
        <span class="text-slate-600">Top Seller</span>
        <input type="checkbox" name="is_top_seller" <?= $form['is_top_seller'] ? 'checked' : '' ?> class="rounded border-slate-300 text-brand focus:ring-brand h-4 w-4">
      </label>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
      <button type="submit" class="w-full bg-brand hover:bg-brand-dark text-white font-semibold py-2.5 rounded-lg">Save Product</button>
      <a href="/electronics-store/admin/products/index.php" class="block text-center w-full border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold py-2.5 rounded-lg">Cancel</a>
    </div>
  </div>
</form>

<script>
function addSpecRow() {
  const rows = document.getElementById('spec-rows');
  const row = document.createElement('div');
  row.className = 'grid grid-cols-2 gap-3 mt-2';
  row.innerHTML = `
    <input type="text" name="spec_name[]" placeholder="Spec name" class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
    <input type="text" name="spec_value[]" placeholder="Value" class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
  `;
  rows.appendChild(row);
}
</script>

<?php require_once __DIR__ . '/../includes/admin-footer.php'; ?>
