<?php
/**
 * Admin — Categories. Full CRUD on one page: list + add panel; ?edit=ID
 * switches the panel into edit mode.
 */
require_once __DIR__ . '/../../includes/bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_admin_login();

$page_title = 'Categories';
$active_nav = 'categories';

$pdo = get_pdo();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf($_POST['csrf_token'] ?? null)) {
        flash_set('error', 'Your session expired. Please try again.');
        redirect('/electronics-store/admin/categories/index.php');
    }

    $action = $_POST['action'] ?? '';

    if ($action === 'delete') {
        $id = (int) ($_POST['id'] ?? 0);
        try {
            $stmt = $pdo->prepare('SELECT image FROM categories WHERE id = ?');
            $stmt->execute([$id]);
            $image = $stmt->fetchColumn();

            $pdo->prepare('DELETE FROM categories WHERE id = ?')->execute([$id]);
            delete_uploaded_image($image ?: null);
            flash_set('success', 'Category deleted.');
        } catch (PDOException $e) {
            flash_set('error', 'Cannot delete a category that still has products in it. Move or delete those products first.');
        }
        redirect('/electronics-store/admin/categories/index.php');
    }

    // action === 'create' or 'update'
    $id       = (int) ($_POST['id'] ?? 0);
    $name     = trim($_POST['name'] ?? '');
    $parentId = (int) ($_POST['parent_id'] ?? 0) ?: null;

    if ($name === '') {
        flash_set('error', 'Category name is required.');
        redirect('/electronics-store/admin/categories/index.php' . ($id ? "?edit=$id" : ''));
    }
    if ($parentId === $id && $id) {
        flash_set('error', 'A category cannot be its own parent.');
        redirect("/electronics-store/admin/categories/index.php?edit=$id");
    }

    try {
        $imagePath = null;
        if (!empty($_FILES['image']['name'])) {
            $imagePath = handle_image_upload($_FILES['image'], 'categories');
        }

        if ($action === 'update' && $id) {
            $slug = unique_slug($pdo, 'categories', 'slug', slugify($name), $id);
            if ($imagePath) {
                $old = $pdo->prepare('SELECT image FROM categories WHERE id = ?');
                $old->execute([$id]);
                delete_uploaded_image($old->fetchColumn() ?: null);
                $pdo->prepare('UPDATE categories SET name=?, slug=?, parent_id=?, image=? WHERE id=?')
                    ->execute([$name, $slug, $parentId, $imagePath, $id]);
            } else {
                $pdo->prepare('UPDATE categories SET name=?, slug=?, parent_id=? WHERE id=?')
                    ->execute([$name, $slug, $parentId, $id]);
            }
            flash_set('success', 'Category updated.');
        } else {
            $slug = unique_slug($pdo, 'categories', 'slug', slugify($name));
            $pdo->prepare('INSERT INTO categories (name, slug, parent_id, image, status) VALUES (?, ?, ?, ?, "active")')
                ->execute([$name, $slug, $parentId, $imagePath]);
            flash_set('success', 'Category created.');
        }
    } catch (Throwable $e) {
        flash_set('error', 'Could not save the category: ' . $e->getMessage());
    }

    redirect('/electronics-store/admin/categories/index.php');
}

$categories = $pdo->query('
    SELECT c.*, COUNT(p.id) AS product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id
    ORDER BY c.sort_order, c.name
')->fetchAll();

$editing = null;
if (!empty($_GET['edit'])) {
    $stmt = $pdo->prepare('SELECT * FROM categories WHERE id = ?');
    $stmt->execute([(int) $_GET['edit']]);
    $editing = $stmt->fetch() ?: null;
}

require_once __DIR__ . '/../includes/admin-header.php';
?>

<div class="grid lg:grid-cols-3 gap-6">

  <div class="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-left">
          <tr>
            <th class="px-5 py-3 font-medium">Category</th>
            <th class="px-5 py-3 font-medium">Slug</th>
            <th class="px-5 py-3 font-medium">Products</th>
            <th class="px-5 py-3 font-medium">Status</th>
            <th class="px-5 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <?php if (!$categories): ?>
            <tr><td colspan="5" class="px-5 py-8 text-center text-slate-400">No categories yet.</td></tr>
          <?php endif; ?>
          <?php foreach ($categories as $c): ?>
            <tr class="hover:bg-slate-50">
              <td class="px-5 py-3 flex items-center gap-3">
                <img src="<?= e(product_image_url($c['image'])) ?>" alt="" class="h-9 w-9 rounded-lg object-cover border border-slate-100 shrink-0">
                <span class="font-medium text-ink"><?= e($c['name']) ?></span>
              </td>
              <td class="px-5 py-3 text-slate-500">/<?= e($c['slug']) ?></td>
              <td class="px-5 py-3 text-slate-600"><?= (int) $c['product_count'] ?></td>
              <td class="px-5 py-3">
                <span class="text-xs font-semibold px-2.5 py-1 rounded-full <?= $c['status'] === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600' ?>">
                  <?= e(ucfirst($c['status'])) ?>
                </span>
              </td>
              <td class="px-5 py-3 text-right space-x-2 whitespace-nowrap">
                <a href="?edit=<?= $c['id'] ?>" class="text-brand hover:underline">Edit</a>
                <form method="post" action="" class="inline" onsubmit="return confirm('Delete this category?');">
                  <?= csrf_field() ?>
                  <input type="hidden" name="action" value="delete">
                  <input type="hidden" name="id" value="<?= $c['id'] ?>">
                  <button type="submit" class="text-red-500 hover:underline">Delete</button>
                </form>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>

  <div class="bg-white rounded-xl border border-slate-200 p-6 h-fit">
    <h2 class="font-semibold text-ink mb-4"><?= $editing ? 'Edit Category' : 'Add Category' ?></h2>
    <form method="post" action="" enctype="multipart/form-data" class="space-y-4">
      <?= csrf_field() ?>
      <input type="hidden" name="action" value="<?= $editing ? 'update' : 'create' ?>">
      <?php if ($editing): ?><input type="hidden" name="id" value="<?= $editing['id'] ?>"><?php endif; ?>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
        <input type="text" name="name" value="<?= e($editing['name'] ?? '') ?>" placeholder="e.g. Smart Home" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Parent Category</label>
        <select name="parent_id" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          <option value="">None (top-level)</option>
          <?php foreach ($categories as $c): ?>
            <?php if (!$editing || (int) $c['id'] !== (int) $editing['id']): ?>
              <option value="<?= $c['id'] ?>" <?= (int) ($editing['parent_id'] ?? 0) === (int) $c['id'] ? 'selected' : '' ?>><?= e($c['name']) ?></option>
            <?php endif; ?>
          <?php endforeach; ?>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Image</label>
        <?php if ($editing && $editing['image']): ?>
          <img src="<?= e(product_image_url($editing['image'])) ?>" class="h-16 w-16 rounded-lg object-cover border border-slate-200 mb-2">
        <?php endif; ?>
        <label class="block border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 text-sm cursor-pointer hover:border-brand hover:text-brand transition">
          <input type="file" name="image" accept="image/png,image/jpeg,image/webp" class="hidden" onchange="this.nextElementSibling.textContent = this.files[0]?.name ?? 'Click to upload'">
          <span>Click to upload</span>
        </label>
      </div>
      <button type="submit" class="w-full bg-brand hover:bg-brand-dark text-white font-semibold py-2.5 rounded-lg"><?= $editing ? 'Update Category' : 'Save Category' ?></button>
      <?php if ($editing): ?>
        <a href="/electronics-store/admin/categories/index.php" class="block text-center w-full border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold py-2 rounded-lg text-sm">Cancel</a>
      <?php endif; ?>
    </form>
  </div>
</div>

<?php require_once __DIR__ . '/../includes/admin-footer.php'; ?>
