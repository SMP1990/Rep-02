<?php
/**
 * Shared <head> + opening <body> for every storefront page.
 * Wireframe stage: markup/styling only, no dynamic data.
 *
 * Expects (optional) $page_title to be set before include.
 */
$page_title = $page_title ?? 'Voltix Electronics';
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= htmlspecialchars($page_title, ENT_QUOTES, 'UTF-8') ?></title>
<meta name="description" content="Premium electronics, laptops, audio and smart gadgets at Voltix Electronics.">

<!-- Tailwind (CDN for wireframe stage — swap for a compiled build in Phase 2 production) -->
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          ink: '#0b1220',
          brand: {
            DEFAULT: '#2563eb',
            dark: '#1d4ed8',
            light: '#60a5fa',
          },
          accent: '#f59e0b',
        },
        fontFamily: {
          sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        },
      },
    },
  };
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/electronics-store/assets/css/style.css">
</head>
<body class="bg-slate-50 text-slate-800 font-sans antialiased">

<?php include __DIR__ . '/navbar.php'; ?>
