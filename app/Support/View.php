<?php

declare(strict_types=1);

namespace App\Support;

use RuntimeException;

/**
 * Minimal server-rendered PHP template renderer — no templating engine
 * dependency, per the stack (Phase 2 §2.2 resources/views/). A template
 * is a plain .php file that can use $data keys as local variables and the
 * global e() helper for output escaping; render() wraps it in a layout
 * template unless $layout is explicitly null.
 */
final class View
{
    private static string $viewsPath = '';

    public static function boot(string $viewsPath): void
    {
        self::$viewsPath = rtrim($viewsPath, '/');
    }

    public static function render(string $template, array $data = [], ?string $layout = 'layouts/app'): string
    {
        $content = self::renderTemplate($template, $data);

        if ($layout === null) {
            return $content;
        }

        return self::renderTemplate($layout, array_merge($data, ['content' => $content]));
    }

    private static function renderTemplate(string $template, array $data): string
    {
        $path = self::$viewsPath . '/' . $template . '.php';

        if (!is_file($path)) {
            throw new RuntimeException("View not found: {$template}");
        }

        $render = static function (string $__path, array $__data): string {
            extract($__data, EXTR_SKIP);
            ob_start();
            require $__path;

            return (string) ob_get_clean();
        };

        return $render($path, $data);
    }
}
