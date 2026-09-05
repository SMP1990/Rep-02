<?php
/**
 * Admin — Customer Management. Real DB-backed list with order count and
 * lifetime spend, search, and pagination.
 */
require_once __DIR__ . '/../../includes/bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_admin_login();

$page_title = 'Customers';
$active_nav = 'customers';

$pdo = get_pdo();

$q       = trim($_GET['q'] ?? '');
$perPage = 10;
$page    = current_page();

$where  = [];
$params = [];
if ($q !== '') {
    $where[] = '(c.full_name LIKE ? OR c.email LIKE ?)';
    $params[] = "%$q%";
    $params[] = "%$q%";
}
$whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

$countStmt = $pdo->prepare("SELECT COUNT(*) FROM customers c $whereSql");
$countStmt->execute($params);
$totalRows = (int) $countStmt->fetchColumn();
$pages     = total_pages($totalRows, $perPage);
$page      = min($page, $pages);
$offset    = ($page - 1) * $perPage;

$sql = "
    SELECT c.*,
           COUNT(o.id) AS order_count,
           COALESCE(SUM(o.total_amount), 0) AS total_spent
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id
    $whereSql
    GROUP BY c.id
    ORDER BY c.created_at DESC
    LIMIT $perPage OFFSET $offset
";
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$customers = $stmt->fetchAll();

require_once __DIR__ . '/../includes/admin-header.php';
?>

<form method="get" class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
  <input type="text" name="q" value="<?= e($q) ?>" placeholder="Search customers..." class="rounded-lg border border-slate-200 px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand">
</form>

<div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead class="bg-slate-50 text-slate-500 text-left">
        <tr>
          <th class="px-5 py-3 font-medium">Customer</th>
          <th class="px-5 py-3 font-medium">Email</th>
          <th class="px-5 py-3 font-medium">Orders</th>
          <th class="px-5 py-3 font-medium">Total Spent</th>
          <th class="px-5 py-3 font-medium">Joined</th>
          <th class="px-5 py-3 font-medium">Status</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <?php if (!$customers): ?>
          <tr><td colspan="6" class="px-5 py-8 text-center text-slate-400">No customers yet.</td></tr>
        <?php endif; ?>
        <?php foreach ($customers as $c): ?>
          <tr class="hover:bg-slate-50">
            <td class="px-5 py-3 flex items-center gap-3">
              <div class="h-9 w-9 rounded-full bg-brand/10 text-brand font-semibold flex items-center justify-center text-sm shrink-0">
                <?= e(strtoupper(substr($c['full_name'], 0, 1))) ?>
              </div>
              <span class="font-medium text-ink"><?= e($c['full_name']) ?></span>
            </td>
            <td class="px-5 py-3 text-slate-500"><?= e($c['email']) ?></td>
            <td class="px-5 py-3 text-slate-600"><?= (int) $c['order_count'] ?></td>
            <td class="px-5 py-3 text-slate-700"><?= format_price((float) $c['total_spent']) ?></td>
            <td class="px-5 py-3 text-slate-400"><?= date('Y-m-d', strtotime($c['created_at'])) ?></td>
            <td class="px-5 py-3">
              <span class="text-xs font-semibold px-2.5 py-1 rounded-full <?= $c['status'] === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600' ?>">
                <?= e(ucfirst($c['status'])) ?>
              </span>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
  <div class="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm text-slate-500">
    <span>Showing <?= $totalRows === 0 ? 0 : $offset + 1 ?>–<?= min($offset + $perPage, $totalRows) ?> of <?= $totalRows ?> customers</span>
    <div class="flex gap-2">
      <?php for ($i = 1; $i <= $pages; $i++): ?>
        <a href="<?= e(page_url($i)) ?>" class="h-8 w-8 flex items-center justify-center rounded-lg <?= $i === $page ? 'bg-brand text-white' : 'border border-slate-200 hover:bg-slate-50' ?>"><?= $i ?></a>
      <?php endfor; ?>
    </div>
  </div>
</div>

<?php require_once __DIR__ . '/../includes/admin-footer.php'; ?>
