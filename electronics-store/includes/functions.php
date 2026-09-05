<?php
/**
 * Shared helper functions used by both the storefront and the admin
 * dashboard.
 */

function format_price(float $amount): string
{
    return STORE_CURRENCY_SYMBOL . number_format($amount, 2);
}

function e(?string $value): string
{
    return htmlspecialchars($value ?? '', ENT_QUOTES, 'UTF-8');
}

function redirect(string $url): never
{
    header('Location: ' . $url);
    exit;
}

function slugify(string $text): string
{
    $text = strtolower(trim($text));
    $text = preg_replace('/[^a-z0-9]+/', '-', $text);
    return trim($text, '-');
}

/**
 * Appends a short random suffix until $slug is unique in $table.$column,
 * optionally excluding $excludeId (used when editing an existing row).
 */
function unique_slug(PDO $pdo, string $table, string $column, string $slug, ?int $excludeId = null): string
{
    $base = $slug !== '' ? $slug : 'item';
    $candidate = $base;
    $attempt = 0;

    while (true) {
        $sql = "SELECT COUNT(*) FROM `$table` WHERE `$column` = ?" . ($excludeId ? ' AND id != ?' : '');
        $params = $excludeId ? [$candidate, $excludeId] : [$candidate];
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        if ((int) $stmt->fetchColumn() === 0) {
            return $candidate;
        }

        $attempt++;
        $candidate = $base . '-' . $attempt;
    }
}

function product_image_url(?string $path): string
{
    return $path ?: '/electronics-store/assets/images/placeholder-product.svg';
}

// --- Flash messages (one-time, shown after a redirect) ---------------------

function flash_set(string $type, string $message): void
{
    $_SESSION['flash'][] = ['type' => $type, 'message' => $message];
}

function flash_all(): array
{
    $messages = $_SESSION['flash'] ?? [];
    unset($_SESSION['flash']);
    return $messages;
}

// --- CSRF --------------------------------------------------------------

function csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function csrf_field(): string
{
    return '<input type="hidden" name="csrf_token" value="' . e(csrf_token()) . '">';
}

function verify_csrf(?string $token): bool
{
    return is_string($token) && hash_equals($_SESSION['csrf_token'] ?? '', $token);
}

// --- Image upload --------------------------------------------------------

const ALLOWED_IMAGE_TYPES = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
];

/**
 * Validates and moves an uploaded image into /assets/uploads/{$subdir}.
 * Returns the web-relative path to store in the DB, or null if $file is
 * empty (no file selected — not an error). Throws RuntimeException on an
 * invalid or failed upload.
 */
function handle_image_upload(array $file, string $subdir): ?string
{
    if (!isset($file['error']) || $file['error'] === UPLOAD_ERR_NO_FILE) {
        return null;
    }

    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new RuntimeException('Image upload failed (error code ' . $file['error'] . ').');
    }

    if ($file['size'] > 5 * 1024 * 1024) {
        throw new RuntimeException('Image is larger than the 5MB limit.');
    }

    $mime = mime_content_type($file['tmp_name']);
    if (!isset(ALLOWED_IMAGE_TYPES[$mime])) {
        throw new RuntimeException('Only JPG, PNG, or WEBP images are allowed.');
    }

    $extension = ALLOWED_IMAGE_TYPES[$mime];
    $filename = bin2hex(random_bytes(16)) . '.' . $extension;
    $destDir = __DIR__ . '/../assets/uploads/' . $subdir;

    if (!is_dir($destDir) && !mkdir($destDir, 0755, true) && !is_dir($destDir)) {
        throw new RuntimeException('Could not create upload directory.');
    }

    if (!move_uploaded_file($file['tmp_name'], $destDir . '/' . $filename)) {
        throw new RuntimeException('Could not save the uploaded image.');
    }

    return '/electronics-store/assets/uploads/' . $subdir . '/' . $filename;
}

/**
 * Normalizes a multi-file $_FILES['field'] entry (parallel arrays) into a
 * list of individual file arrays, so each can be passed to
 * handle_image_upload().
 */
function normalize_files_array(array $filesField): array
{
    $count = count($filesField['name']);
    $files = [];

    for ($i = 0; $i < $count; $i++) {
        if (($filesField['error'][$i] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            continue;
        }
        $files[] = [
            'name'     => $filesField['name'][$i],
            'type'     => $filesField['type'][$i],
            'tmp_name' => $filesField['tmp_name'][$i],
            'error'    => $filesField['error'][$i],
            'size'     => $filesField['size'][$i],
        ];
    }

    return $files;
}

function delete_uploaded_image(?string $webPath): void
{
    if (!$webPath || !str_starts_with($webPath, '/electronics-store/assets/uploads/')) {
        return;
    }

    $fsPath = __DIR__ . '/../' . substr($webPath, strlen('/electronics-store/'));
    if (is_file($fsPath)) {
        @unlink($fsPath);
    }
}

// --- Settings --------------------------------------------------------------

function get_setting(PDO $pdo, string $key, ?string $default = null): ?string
{
    $stmt = $pdo->prepare('SELECT setting_value FROM settings WHERE setting_key = ?');
    $stmt->execute([$key]);
    $value = $stmt->fetchColumn();
    return $value !== false ? $value : $default;
}

// --- Orders --------------------------------------------------------------

function generate_order_number(PDO $pdo): string
{
    do {
        $candidate = 'VLX-' . strtoupper(bin2hex(random_bytes(4)));
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM orders WHERE order_number = ?');
        $stmt->execute([$candidate]);
    } while ((int) $stmt->fetchColumn() > 0);

    return $candidate;
}

// --- Pagination --------------------------------------------------------

function current_page(): int
{
    $page = (int) ($_GET['page'] ?? 1);
    return $page > 0 ? $page : 1;
}

function total_pages(int $totalRows, int $perPage): int
{
    return max(1, (int) ceil($totalRows / $perPage));
}

/**
 * Rebuilds the current query string with $page substituted for the page
 * param, so pagination links keep active filters.
 */
function page_url(int $page): string
{
    $params = $_GET;
    $params['page'] = $page;
    return '?' . http_build_query($params);
}
