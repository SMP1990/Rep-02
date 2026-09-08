<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Request;
use App\Http\Response;
use App\Repositories\SettingsRepository;
use App\Support\Csrf;
use App\Support\Flash;
use App\Support\View;

final class SettingsController
{
    /** @var array<string, string> setting_key => setting_type */
    private const FIELDS = [
        'site_name' => 'string',
        'contact_email' => 'string',
        'maintenance_mode' => 'bool',
    ];

    public function __construct(private readonly SettingsRepository $settings)
    {
    }

    public function edit(Request $request): Response
    {
        return Response::html(View::render('admin/settings/index', [
            'title' => 'Site Settings — Admin',
            'activeNav' => 'settings',
            'flash' => Flash::consume(),
            'csrfToken' => Csrf::token(),
            'values' => $this->settings->all(),
        ], 'admin/layouts/admin'));
    }

    public function update(Request $request): Response
    {
        foreach (self::FIELDS as $key => $type) {
            $raw = $request->input($key);
            $value = $type === 'bool' ? ($raw ? '1' : '0') : (string) ($raw ?? '');
            $this->settings->set($key, $value, $type);
        }

        Flash::set('success', 'Settings saved.');

        return Response::redirect('/admin/settings');
    }
}
