<?php
/**
 * Admin — Order Management (list). Real DB-backed search + status filter
 * + pagination.
 */
require_once __DIR__ . '/../../includes/bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_admin_login();

$page_title = 'Orders';
$active_nav = 'orders';

$pdo = get_pdo();

$q       = trim($_GET['q'] ?? '');
$status  = $_GET['status'] ?? '';
$validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
$perPage = 10;
$page    = current_page();

$where  = [];
$params = [];

if ($q !== '') {
    $where[] = '(o.order_number LIKE ? OR o.shipping_full_name LIKE ? OR o.guest_email LIKE ? OR c.email LIKE ?)';
    array_push($params, "%$q%", "%$q%", "%$q%", "%$q%");
}
if (in_array($status, $validStatuses, true)) {
    $where[] = 'o.status = ?';
    $params[] = $status;
}
$whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

$countStmt = $pdo->prepare("SELECT COUNT(*) FROM orders o LEFT JOIN customers c ON c.id = o.customer_id $whereSql");
$countStmt->execute($params);
$totalRows = (int) $countStmt->fetchColumn();
$pages     = total_pages($totalRows, $perPage);
$page      = min($page, $pages);
$offset    = ($page - 1) * $perPage;

$sql = "
    SELECT o.*, c.full_name AS customer_name, c.email AS customer_email,
           (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    $whereSql
    ORDER BY o.created_at DESC
    LIMIT $perPage OFFSET $offset
";
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$orders = $stmt->fetchAll();

$status_styles = [
    'delivered'  => 'bg-green-100 text-green-700',
    'processing' => 'bg-blue-100 text-blue-700',
    'pending'    => 'bg-amber-100 text-amber-700',
    'shipped'    => 'bg-indigo-100 text-indigo-700',
    'cancelled'  => 'bg-red-100 text-red-700',
    'refunded'   => 'bg-slate-200 text-slate-600',
];

require_once __DIR__ . '/../includes/admin-header.php';
?>

<form method="get" class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
  <div class="flex items-center gap-3">
    <input type="text" name="q" value="<?= e($q) ?>" placeholder="Search order # or customer..." class="rounded-lg border border-slate-200 px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand">
    <select name="status" onchange="this.form.submit()" class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
      <option value="">All Statuses</option>
      <?php foreach ($validStatuses as $s): ?>
        <option value="<?= $s ?>" <?= $status === $s ? 'selected' : '' ?>><?= ucfirst($s) ?></option>
      <?php endforeach; ?>
    </select>
    <button type="submit" class="text-sm text-brand hover:underline">Search</button>
  </div>
</form>

<div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead class="bg-slate-50 text-slate-500 text-left">
        <tr>
          <th class="px-5 py-3 font-medium">Order #</th>
          <th class="px-5 py-3 font-medium">Customer</th>
          <th class="px-5 py-3 font-medium">Items</th>
          <th class="px-5 py-3 font-medium">Total</th>
          <th class="px-5 py-3 font-medium">Payment</th>
          <th class="px-5 py-3 font-medium">Status</th>
          <th class="px-5 py-3 font-medium">Date</th>
          <th class="px-5 py-3 font-medium text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <?php if (!$orders): ?>
          <tr><td colspan="8" class="px-5 py-8 text-center text-slate-400">No orders found.</td></tr>
        <?php endif; ?>
        <?php foreach ($orders as $o): ?>
          <tr class="hover:bg-slate-50">
            <td class="px-5 py-3 font-medium text-ink">#<?= e($o['order_number']) ?></td>
            <td class="px-5 py-3 text-slate-600"><?= e($o['customer_name'] ?? $o['guest_email'] ?? '—') ?></td>
            <td class="px-5 py-3 text-slate-500"><?= (int) $o['item_count'] ?></td>
            <td class="px-5 py-3 text-slate-700"><?= format_price((float) $o['total_amount']) ?></td>
            <td class="px-5 py-3 text-slate-500"><?= e(ucfirst($o['payment_status'])) ?></td>
            <td class="px-5 py-3">
              <span class="text-xs font-semibold px-2.5 py-1 rounded-full <?= $status_styles[$o['status']] ?>"><?= ucfirst($o['status']) ?></span>
            </td>
            <td class="px-5 py-3 text-slate-400"><?= date('Y-m-d', strtotime($o['created_at'])) ?></td>
            <td class="px-5 py-3 text-right">
              <a href="/electronics-store/admin/orders/view.php?id=<?= $o['id'] ?>" class="text-brand hover:underline">View</a>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
  <div class="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm text-slate-500">
    <span>Showing <?= $totalRows === 0 ? 0 : $offset + 1 ?>–<?= min($offset + $perPage, $totalRows) ?> of <?= $totalRows ?> orders</span>
    <div class="flex gap-2">
      <?php for ($i = 1; $i <= $pages; $i++): ?>
        <a href="<?= e(page_url($i)) ?>" class="h-8 w-8 flex items-center justify-center rounded-lg <?= $i === $page ? 'bg-brand text-white' : 'border border-slate-200 hover:bg-slate-50' ?>"><?= $i ?></a>
      <?php endfor; ?>
    </div>
  </div>
</div>

<?php require_once __DIR__ . '/../includes/admin-footer.php'; ?>
