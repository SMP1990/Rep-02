<?php
/**
 * Admin — Edit Product. Loads the real row by ?id=, handles updates,
 * additional image uploads, existing-image removal, and spec replacement.
 */
require_once __DIR__ . '/../../includes/bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_admin_login();

$pdo = get_pdo();

$id = (int) ($_GET['id'] ?? 0);
$stmt = $pdo->prepare('SELECT * FROM products WHERE id = ?');
$stmt->execute([$id]);
$product = $stmt->fetch();

if (!$product) {
    flash_set('error', 'Product not found.');
    redirect('/electronics-store/admin/products/index.php');
}

$page_title = 'Edit Product';
$active_nav = 'products';

$categories = $pdo->query('SELECT id, name FROM categories ORDER BY name')->fetchAll();
$brands     = $pdo->query('SELECT id, name FROM brands ORDER BY name')->fetchAll();

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf($_POST['csrf_token'] ?? null)) {
        $errors[] = 'Your session expired. Please try again.';
    }

    $name              = trim($_POST['name'] ?? '');
    $sku                = trim($_POST['sku'] ?? '');
    $slugInput          = trim($_POST['slug'] ?? '') ?: $name;
    $shortDescription    = trim($_POST['short_description'] ?? '');
    $description         = trim($_POST['description'] ?? '');
    $price               = $_POST['price'] ?? '';
    $salePrice           = trim($_POST['sale_price'] ?? '') !== '' ? $_POST['sale_price'] : null;
    $stockQuantity       = $_POST['stock_quantity'] ?? '0';
    $categoryId         = (int) ($_POST['category_id'] ?? 0);
    $brandId             = (int) ($_POST['brand_id'] ?? 0) ?: null;
    $status              = in_array($_POST['status'] ?? '', ['draft', 'active', 'inactive'], true) ? $_POST['status'] : 'draft';
    $isFeatured          = !empty($_POST['is_featured']);
    $isTopSeller         = !empty($_POST['is_top_seller']);
    $removeImageIds      = array_map('intval', $_POST['remove_images'] ?? []);

    if ($name === '') $errors[] = 'Product name is required.';
    if ($sku === '') $errors[] = 'SKU is required.';
    if (!is_numeric($price) || (float) $price < 0) $errors[] = 'Price must be a valid amount.';
    if ($salePrice !== null && (!is_numeric($salePrice) || (float) $salePrice < 0)) $errors[] = 'Sale price must be a valid amount.';
    if (!ctype_digit((string) $stockQuantity)) $errors[] = 'Stock quantity must be a whole number.';
    if ($categoryId <= 0) $errors[] = 'Please choose a category.';

    if (!$errors) {
        $stockStatus = ((int) $stockQuantity > 0) ? 'in_stock' : 'out_of_stock';
        $slug = unique_slug($pdo, 'products', 'slug', slugify($slugInput), $id);

        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare('
                UPDATE products SET
                    category_id = ?, brand_id = ?, name = ?, slug = ?, sku = ?,
                    short_description = ?, description = ?, price = ?, sale_price = ?,
                    stock_quantity = ?, stock_status = ?, is_featured = ?, is_top_seller = ?, status = ?
                WHERE id = ?
            ');
            $stmt->execute([
                $categoryId, $brandId, $name, $slug, $sku,
                $shortDescription ?: null, $description ?: null, $price, $salePrice,
                $stockQuantity, $stockStatus, $isFeatured ? 1 : 0, $isTopSeller ? 1 : 0, $status,
                $id,
            ]);

            if ($removeImageIds) {
                $inPlaceholders = implode(',', array_fill(0, count($removeImageIds), '?'));
                $imgStmt = $pdo->prepare("SELECT image_path FROM product_images WHERE id IN ($inPlaceholders) AND product_id = ?");
                $imgStmt->execute([...$removeImageIds, $id]);
                foreach ($imgStmt->fetchAll(PDO::FETCH_COLUMN) as $path) {
                    delete_uploaded_image($path);
                }
                $delStmt = $pdo->prepare("DELETE FROM product_images WHERE id IN ($inPlaceholders) AND product_id = ?");
                $delStmt->execute([...$removeImageIds, $id]);
            }

            $countStmt = $pdo->prepare('SELECT COUNT(*) FROM product_images WHERE product_id = ?');
            $countStmt->execute([$id]);
            $existingCount = (int) $countStmt->fetchColumn();

            $uploaded = normalize_files_array($_FILES['images'] ?? ['name' => [], 'type' => [], 'tmp_name' => [], 'error' => [], 'size' => []]);
            $imgInsert = $pdo->prepare('INSERT INTO product_images (product_id, image_path, is_primary, sort_order) VALUES (?, ?, ?, ?)');
            foreach ($uploaded as $i => $file) {
                $path = handle_image_upload($file, 'products');
                if ($path) {
                    $imgInsert->execute([$id, $path, $existingCount === 0 && $i === 0 ? 1 : 0, $existingCount + $i]);
                }
            }

            // Ensure exactly one primary image remains, if any exist.
            $primaryCheck = $pdo->prepare('SELECT COUNT(*) FROM product_images WHERE product_id = ? AND is_primary = 1');
            $primaryCheck->execute([$id]);
            if ((int) $primaryCheck->fetchColumn() === 0) {
                $pdo->prepare('UPDATE product_images SET is_primary = 1 WHERE id = (SELECT id FROM (SELECT id FROM product_images WHERE product_id = ? ORDER BY sort_order LIMIT 1) t)')
                    ->execute([$id]);
            }

            $pdo->prepare('DELETE FROM product_specifications WHERE product_id = ?')->execute([$id]);
            $specNames  = $_POST['spec_name'] ?? [];
            $specValues = $_POST['spec_value'] ?? [];
            $specStmt = $pdo->prepare('INSERT INTO product_specifications (product_id, spec_name, spec_value, sort_order) VALUES (?, ?, ?, ?)');
            $order = 0;
            foreach ($specNames as $i => $sname) {
                $sname = trim($sname);
                $svalue = trim($specValues[$i] ?? '');
                if ($sname !== '' && $svalue !== '') {
                    $specStmt->execute([$id, $sname, $svalue, $order++]);
                }
            }

            $pdo->commit();
            flash_set('success', 'Product "' . $name . '" was updated.');
            redirect('/electronics-store/admin/products/edit.php?id=' . $id);
        } catch (Throwable $e) {
            $pdo->rollBack();
            $errors[] = 'Could not update the product: ' . $e->getMessage();
        }
    }

    // Re-render with submitted values on validation failure.
    $product = array_merge($product, [
        'category_id' => $categoryId, 'brand_id' => $brandId, 'name' => $name, 'slug' => $slugInput,
        'sku' => $sku, 'short_description' => $shortDescription, 'description' => $description,
        'price' => $price, 'sale_price' => $salePrice, 'stock_quantity' => $stockQuantity,
        'status' => $status, 'is_featured' => $isFeatured, 'is_top_seller' => $isTopSeller,
    ]);
}

$imgStmt = $pdo->prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC');
$imgStmt->execute([$id]);
$images = $imgStmt->fetchAll();

$specStmt = $pdo->prepare('SELECT * FROM product_specifications WHERE product_id = ? ORDER BY sort_order');
$specStmt->execute([$id]);
$specs = $specStmt->fetchAll();

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
          <input type="text" name="name" value="<?= e($product['name']) ?>" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">SKU</label>
            <input type="text" name="sku" value="<?= e($product['sku']) ?>" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Slug</label>
            <input type="text" name="slug" value="<?= e($product['slug']) ?>" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Short Description</label>
          <input type="text" name="short_description" value="<?= e($product['short_description'] ?? '') ?>" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Full Description</label>
          <textarea name="description" rows="5" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"><?= e($product['description'] ?? '') ?></textarea>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-6">
      <h2 class="font-semibold text-ink mb-4">Pricing & Stock</h2>
      <div class="grid grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Price</label>
          <input type="number" step="0.01" min="0" name="price" value="<?= e((string) $product['price']) ?>" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Sale Price</label>
          <input type="number" step="0.01" min="0" name="sale_price" value="<?= e((string) ($product['sale_price'] ?? '')) ?>" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Stock Quantity</label>
          <input type="number" min="0" name="stock_quantity" value="<?= e((string) $product['stock_quantity']) ?>" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-6">
      <h2 class="font-semibold text-ink mb-4">Images</h2>
      <?php if ($images): ?>
        <div class="grid grid-cols-4 gap-3 mb-4">
          <?php foreach ($images as $img): ?>
            <label class="relative block cursor-pointer group">
              <img src="<?= e(product_image_url($img['image_path'])) ?>" class="h-24 w-full object-cover rounded-lg border border-slate-200">
              <input type="checkbox" name="remove_images[]" value="<?= $img['id'] ?>" class="absolute top-1.5 right-1.5 h-4 w-4">
              <?php if ($img['is_primary']): ?>
                <span class="absolute bottom-1.5 left-1.5 text-[10px] font-semibold bg-brand text-white px-1.5 py-0.5 rounded">Primary</span>
              <?php endif; ?>
              <span class="absolute inset-0 bg-red-500/0 group-has-[:checked]:bg-red-500/40 rounded-lg transition"></span>
            </label>
          <?php endforeach; ?>
        </div>
        <p class="text-xs text-slate-400 mb-4">Check an image and save to remove it.</p>
      <?php endif; ?>
      <label class="block border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 cursor-pointer hover:border-brand hover:text-brand transition">
        <input type="file" name="images[]" multiple accept="image/png,image/jpeg,image/webp" class="hidden" onchange="this.nextElementSibling.textContent = this.files.length + ' file(s) selected'">
        <p class="text-sm">Click to add more images</p>
        <p class="text-xs mt-1 text-slate-400">No files selected</p>
      </label>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-6">
      <h2 class="font-semibold text-ink mb-4">Specifications</h2>
      <div id="spec-rows" class="space-y-2">
        <?php if (!$specs): $specs = [['spec_name' => '', 'spec_value' => '']]; endif; ?>
        <?php foreach ($specs as $spec): ?>
          <div class="grid grid-cols-2 gap-3">
            <input type="text" name="spec_name[]" value="<?= e($spec['spec_name']) ?>" placeholder="Spec name" class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
            <input type="text" name="spec_value[]" value="<?= e($spec['spec_value']) ?>" placeholder="Value" class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          </div>
        <?php endforeach; ?>
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
          <?php foreach ($categories as $cat): ?>
            <option value="<?= $cat['id'] ?>" <?= (int) $product['category_id'] === (int) $cat['id'] ? 'selected' : '' ?>><?= e($cat['name']) ?></option>
          <?php endforeach; ?>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Brand</label>
        <select name="brand_id" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          <option value="">None</option>
          <?php foreach ($brands as $brand): ?>
            <option value="<?= $brand['id'] ?>" <?= (int) ($product['brand_id'] ?? 0) === (int) $brand['id'] ? 'selected' : '' ?>><?= e($brand['name']) ?></option>
          <?php endforeach; ?>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
        <select name="status" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          <?php foreach (['draft' => 'Draft', 'active' => 'Active', 'inactive' => 'Inactive'] as $val => $label): ?>
            <option value="<?= $val ?>" <?= $product['status'] === $val ? 'selected' : '' ?>><?= $label ?></option>
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
    </div>
  </div>
</form>

<script>
function addSpecRow() {
  const rows = document.getElementById('spec-rows');
  const row = document.createElement('div');
  row.className = 'grid grid-cols-2 gap-3';
  row.innerHTML = `
    <input type="text" name="spec_name[]" placeholder="Spec name" class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
    <input type="text" name="spec_value[]" placeholder="Value" class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
  `;
  rows.appendChild(row);
}
</script>

<?php require_once __DIR__ . '/../includes/admin-footer.php'; ?>
