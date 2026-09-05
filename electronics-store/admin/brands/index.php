<?php
/**
 * Admin — Brands. Full CRUD on one page: list + add panel; ?edit=ID
 * switches the panel into edit mode.
 */
require_once __DIR__ . '/../../includes/bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_admin_login();

$page_title = 'Brands';
$active_nav = 'brands';

$pdo = get_pdo();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf($_POST['csrf_token'] ?? null)) {
        flash_set('error', 'Your session expired. Please try again.');
        redirect('/electronics-store/admin/brands/index.php');
    }

    $action = $_POST['action'] ?? '';

    if ($action === 'delete') {
        $id = (int) ($_POST['id'] ?? 0);
        $stmt = $pdo->prepare('SELECT logo FROM brands WHERE id = ?');
        $stmt->execute([$id]);
        $logo = $stmt->fetchColumn();

        $pdo->prepare('DELETE FROM brands WHERE id = ?')->execute([$id]);
        delete_uploaded_image($logo ?: null);
        flash_set('success', 'Brand deleted. Its products now show no brand.');
        redirect('/electronics-store/admin/brands/index.php');
    }

    $id   = (int) ($_POST['id'] ?? 0);
    $name = trim($_POST['name'] ?? '');

    if ($name === '') {
        flash_set('error', 'Brand name is required.');
        redirect('/electronics-store/admin/brands/index.php' . ($id ? "?edit=$id" : ''));
    }

    try {
        $logoPath = null;
        if (!empty($_FILES['logo']['name'])) {
            $logoPath = handle_image_upload($_FILES['logo'], 'brands');
        }

        if ($action === 'update' && $id) {
            $slug = unique_slug($pdo, 'brands', 'slug', slugify($name), $id);
            if ($logoPath) {
                $old = $pdo->prepare('SELECT logo FROM brands WHERE id = ?');
                $old->execute([$id]);
                delete_uploaded_image($old->fetchColumn() ?: null);
                $pdo->prepare('UPDATE brands SET name=?, slug=?, logo=? WHERE id=?')->execute([$name, $slug, $logoPath, $id]);
            } else {
                $pdo->prepare('UPDATE brands SET name=?, slug=? WHERE id=?')->execute([$name, $slug, $id]);
            }
            flash_set('success', 'Brand updated.');
        } else {
            $slug = unique_slug($pdo, 'brands', 'slug', slugify($name));
            $pdo->prepare('INSERT INTO brands (name, slug, logo, status) VALUES (?, ?, ?, "active")')->execute([$name, $slug, $logoPath]);
            flash_set('success', 'Brand created.');
        }
    } catch (Throwable $e) {
        flash_set('error', 'Could not save the brand: ' . $e->getMessage());
    }

    redirect('/electronics-store/admin/brands/index.php');
}

$brands = $pdo->query('
    SELECT b.*, COUNT(p.id) AS product_count
    FROM brands b
    LEFT JOIN products p ON p.brand_id = b.id
    GROUP BY b.id
    ORDER BY b.name
')->fetchAll();

$editing = null;
if (!empty($_GET['edit'])) {
    $stmt = $pdo->prepare('SELECT * FROM brands WHERE id = ?');
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
            <th class="px-5 py-3 font-medium">Brand</th>
            <th class="px-5 py-3 font-medium">Slug</th>
            <th class="px-5 py-3 font-medium">Products</th>
            <th class="px-5 py-3 font-medium">Status</th>
            <th class="px-5 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <?php if (!$brands): ?>
            <tr><td colspan="5" class="px-5 py-8 text-center text-slate-400">No brands yet.</td></tr>
          <?php endif; ?>
          <?php foreach ($brands as $b): ?>
            <tr class="hover:bg-slate-50">
              <td class="px-5 py-3 flex items-center gap-3">
                <img src="<?= e(product_image_url($b['logo'])) ?>" alt="" class="h-9 w-9 rounded-lg object-cover border border-slate-100 shrink-0">
                <span class="font-medium text-ink"><?= e($b['name']) ?></span>
              </td>
              <td class="px-5 py-3 text-slate-500">/<?= e($b['slug']) ?></td>
              <td class="px-5 py-3 text-slate-600"><?= (int) $b['product_count'] ?></td>
              <td class="px-5 py-3">
                <span class="text-xs font-semibold px-2.5 py-1 rounded-full <?= $b['status'] === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600' ?>">
                  <?= e(ucfirst($b['status'])) ?>
                </span>
              </td>
              <td class="px-5 py-3 text-right space-x-2 whitespace-nowrap">
                <a href="?edit=<?= $b['id'] ?>" class="text-brand hover:underline">Edit</a>
                <form method="post" action="" class="inline" onsubmit="return confirm('Delete this brand?');">
                  <?= csrf_field() ?>
                  <input type="hidden" name="action" value="delete">
                  <input type="hidden" name="id" value="<?= $b['id'] ?>">
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
    <h2 class="font-semibold text-ink mb-4"><?= $editing ? 'Edit Brand' : 'Add Brand' ?></h2>
    <form method="post" action="" enctype="multipart/form-data" class="space-y-4">
      <?= csrf_field() ?>
      <input type="hidden" name="action" value="<?= $editing ? 'update' : 'create' ?>">
      <?php if ($editing): ?><input type="hidden" name="id" value="<?= $editing['id'] ?>"><?php endif; ?>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
        <input type="text" name="name" value="<?= e($editing['name'] ?? '') ?>" placeholder="e.g. Nimbus" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Logo</label>
        <?php if ($editing && $editing['logo']): ?>
          <img src="<?= e(product_image_url($editing['logo'])) ?>" class="h-16 w-16 rounded-lg object-cover border border-slate-200 mb-2">
        <?php endif; ?>
        <label class="block border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 text-sm cursor-pointer hover:border-brand hover:text-brand transition">
          <input type="file" name="logo" accept="image/png,image/jpeg,image/webp" class="hidden" onchange="this.nextElementSibling.textContent = this.files[0]?.name ?? 'Click to upload'">
          <span>Click to upload</span>
        </label>
      </div>
      <button type="submit" class="w-full bg-brand hover:bg-brand-dark text-white font-semibold py-2.5 rounded-lg"><?= $editing ? 'Update Brand' : 'Save Brand' ?></button>
      <?php if ($editing): ?>
        <a href="/electronics-store/admin/brands/index.php" class="block text-center w-full border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold py-2 rounded-lg text-sm">Cancel</a>
      <?php endif; ?>
    </form>
  </div>
</div>

<?php require_once __DIR__ . '/../includes/admin-footer.php'; ?>
