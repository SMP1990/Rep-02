<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Request;
use App\Http\Response;
use App\Repositories\AdvertisementRepository;
use App\Support\Csrf;
use App\Support\Flash;
use App\Support\ValidationException;
use App\Support\Validator;
use App\Support\View;

final class AdvertisementController
{
    public function __construct(private readonly AdvertisementRepository $ads)
    {
    }

    public function index(Request $request): Response
    {
        return Response::html(View::render('admin/ads/index', [
            'title' => 'Advertisements — Admin',
            'activeNav' => 'ads',
            'flash' => Flash::consume(),
            'csrfToken' => Csrf::token(),
            'ads' => $this->ads->all(),
        ], 'admin/layouts/admin'));
    }

    public function store(Request $request): Response
    {
        try {
            $data = $this->validated($request);
        } catch (ValidationException) {
            Flash::set('error', 'Please fill in the required fields.');

            return Response::redirect('/admin/ads');
        }

        $this->ads->create($data);
        Flash::set('success', 'Ad zone created.');

        return Response::redirect('/admin/ads');
    }

    public function update(Request $request, array $params): Response
    {
        try {
            $data = $this->validated($request);
        } catch (ValidationException) {
            Flash::set('error', 'Please fill in the required fields.');

            return Response::redirect('/admin/ads');
        }

        $this->ads->update((int) ($params['id'] ?? 0), $data);
        Flash::set('success', 'Ad zone updated.');

        return Response::redirect('/admin/ads');
    }

    public function destroy(Request $request, array $params): Response
    {
        $this->ads->delete((int) ($params['id'] ?? 0));
        Flash::set('success', 'Ad zone deleted.');

        return Response::redirect('/admin/ads');
    }

    private function validated(Request $request): array
    {
        $data = (new Validator($request->all()))
            ->required('zone_key')->string('zone_key', 50)
            ->required('name')->string('name', 150)
            ->string('snippet_html', 20000)
            ->validate();

        $data['device_target'] = $request->input('device_target');
        $data['is_active'] = $request->input('is_active');
        $data['sort_order'] = $request->input('sort_order', 0);

        return $data;
    }
}
