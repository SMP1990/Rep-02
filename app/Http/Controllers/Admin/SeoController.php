<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Request;
use App\Http\Response;
use App\Repositories\SeoSettingsRepository;
use App\Support\Csrf;
use App\Support\Flash;
use App\Support\View;

final class SeoController
{
    /** Non-CMS routes this dashboard manages meta for, plus the sitewide fallback. */
    private const ROUTE_KEYS = ['global', 'home', 'faq_index'];

    public function __construct(private readonly SeoSettingsRepository $seo)
    {
    }

    public function index(Request $request): Response
    {
        $rows = [];
        foreach (self::ROUTE_KEYS as $key) {
            $rows[$key] = $this->seo->findByRouteKey($key) ?? [
                'route_key' => $key,
                'meta_title' => null,
                'meta_description' => null,
                'canonical_override' => null,
                'noindex' => 0,
            ];
        }

        return Response::html(View::render('admin/seo/index', [
            'title' => 'SEO Settings — Admin',
            'activeNav' => 'seo',
            'flash' => Flash::consume(),
            'csrfToken' => Csrf::token(),
            'rows' => $rows,
        ], 'admin/layouts/admin'));
    }

    public function update(Request $request, array $params): Response
    {
        $routeKey = $params['routeKey'] ?? '';

        if (!in_array($routeKey, self::ROUTE_KEYS, true)) {
            Flash::set('error', 'Unknown SEO route.');

            return Response::redirect('/admin/seo');
        }

        $this->seo->upsert($routeKey, [
            'meta_title' => $request->input('meta_title'),
            'meta_description' => $request->input('meta_description'),
            'canonical_override' => $request->input('canonical_override'),
            'noindex' => $request->input('noindex'),
        ]);

        Flash::set('success', 'SEO settings saved.');

        return Response::redirect('/admin/seo');
    }
}
