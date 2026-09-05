<?php
/**
 * Admin — Categories. Wireframe stage: list + inline "add" panel, no
 * persistence wired up yet.
 */
require_once __DIR__ . '/../../config/config.php';

$page_title = 'Categories';
$active_nav = 'categories';

$categories = [
    ['id' => 1, 'name' => 'Laptops',     'slug' => 'laptops',     'products' => 42, 'status' => 'Active'],
    ['id' => 2, 'name' => 'Audio',       'slug' => 'audio',       'products' => 37, 'status' => 'Active'],
    ['id' => 3, 'name' => 'Cameras',     'slug' => 'cameras',     'products' => 19, 'status' => 'Active'],
    ['id' => 4, 'name' => 'Wearables',   'slug' => 'wearables',   'products' => 24, 'status' => 'Active'],
    ['id' => 5, 'name' => 'Tablets',     'slug' => 'tablets',     'products' => 15, 'status' => 'Active'],
    ['id' => 6, 'name' => 'Accessories', 'slug' => 'accessories', 'products' => 61, 'status' => 'Active'],
    ['id' => 7, 'name' => 'Chargers',    'slug' => 'chargers',    'products' => 20, 'status' => 'Inactive'],
];

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
          <?php foreach ($categories as $c): ?>
            <tr class="hover:bg-slate-50">
              <td class="px-5 py-3 flex items-center gap-3">
                <div class="h-9 w-9 rounded-lg img-placeholder text-sm shrink-0">🗂️</div>
                <span class="font-medium text-ink"><?= htmlspecialchars($c['name']) ?></span>
              </td>
              <td class="px-5 py-3 text-slate-500">/<?= htmlspecialchars($c['slug']) ?></td>
              <td class="px-5 py-3 text-slate-600"><?= $c['products'] ?></td>
              <td class="px-5 py-3">
                <span class="text-xs font-semibold px-2.5 py-1 rounded-full <?= $c['status'] === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600' ?>">
                  <?= $c['status'] ?>
                </span>
              </td>
              <td class="px-5 py-3 text-right space-x-2 whitespace-nowrap">
                <a href="#" class="text-brand hover:underline">Edit</a>
                <a href="#" class="text-red-500 hover:underline">Delete</a>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>

  <div class="bg-white rounded-xl border border-slate-200 p-6 h-fit">
    <h2 class="font-semibold text-ink mb-4">Add Category</h2>
    <form method="post" action="#" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
        <input type="text" name="name" placeholder="e.g. Smart Home" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Parent Category</label>
        <select class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
          <option value="">None (top-level)</option>
          <?php foreach ($categories as $c): ?><option><?= htmlspecialchars($c['name']) ?></option><?php endforeach; ?>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Image</label>
        <div class="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 text-sm">Click to upload</div>
      </div>
      <button type="submit" class="w-full bg-brand hover:bg-brand-dark text-white font-semibold py-2.5 rounded-lg">Save Category</button>
    </form>
  </div>
</div>

<?php require_once __DIR__ . '/../includes/admin-footer.php'; ?>
