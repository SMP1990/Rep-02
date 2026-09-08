<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Request;
use App\Http\Response;
use App\Repositories\FaqRepository;
use App\Support\Csrf;
use App\Support\Flash;
use App\Support\ValidationException;
use App\Support\Validator;
use App\Support\View;

final class FaqController
{
    public function __construct(private readonly FaqRepository $faqs)
    {
    }

    public function index(Request $request): Response
    {
        return Response::html(View::render('admin/content/faq', [
            'title' => 'FAQ — Admin',
            'activeNav' => 'faq',
            'flash' => Flash::consume(),
            'csrfToken' => Csrf::token(),
            'items' => $this->faqs->all(),
        ], 'admin/layouts/admin'));
    }

    public function store(Request $request): Response
    {
        try {
            $data = $this->validated($request);
        } catch (ValidationException) {
            Flash::set('error', 'A question and answer are required.');

            return Response::redirect('/admin/faq');
        }

        $this->faqs->create($data);
        Flash::set('success', 'FAQ entry created.');

        return Response::redirect('/admin/faq');
    }

    public function update(Request $request, array $params): Response
    {
        try {
            $data = $this->validated($request);
        } catch (ValidationException) {
            Flash::set('error', 'A question and answer are required.');

            return Response::redirect('/admin/faq');
        }

        $this->faqs->update((int) ($params['id'] ?? 0), $data);
        Flash::set('success', 'FAQ entry updated.');

        return Response::redirect('/admin/faq');
    }

    public function destroy(Request $request, array $params): Response
    {
        $this->faqs->delete((int) ($params['id'] ?? 0));
        Flash::set('success', 'FAQ entry deleted.');

        return Response::redirect('/admin/faq');
    }

    private function validated(Request $request): array
    {
        $data = (new Validator($request->all()))
            ->required('question')->string('question', 500)
            ->required('answer')->string('answer', 20000)
            ->validate();

        $data['sort_order'] = $request->input('sort_order', 0);
        $data['is_published'] = $request->input('is_published');

        return $data;
    }
}
