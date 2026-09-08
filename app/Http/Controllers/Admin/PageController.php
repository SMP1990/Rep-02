<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Request;
use App\Http\Response;
use App\Repositories\PageRepository;
use App\Support\Csrf;
use App\Support\Flash;
use App\Support\ValidationException;
use App\Support\Validator;
use App\Support\View;

final class PageController
{
    public function __construct(private readonly PageRepository $pages)
    {
    }

    public function index(Request $request): Response
    {
        return Response::html(View::render('admin/content/pages', [
            'title' => 'Pages — Admin',
            'activeNav' => 'pages',
            'flash' => Flash::consume(),
            'csrfToken' => Csrf::token(),
            'items' => $this->pages->all(),
        ], 'admin/layouts/admin'));
    }

    public function store(Request $request): Response
    {
        try {
            $data = $this->validated($request);
        } catch (ValidationException) {
            Flash::set('error', 'A slug, title, and content are required.');

            return Response::redirect('/admin/pages');
        }

        $this->pages->create($data);
        Flash::set('success', 'Page created.');

        return Response::redirect('/admin/pages');
    }

    public function update(Request $request, array $params): Response
    {
        try {
            $data = $this->validated($request);
        } catch (ValidationException) {
            Flash::set('error', 'A slug, title, and content are required.');

            return Response::redirect('/admin/pages');
        }

        $this->pages->update((int) ($params['id'] ?? 0), $data);
        Flash::set('success', 'Page updated.');

        return Response::redirect('/admin/pages');
    }

    public function destroy(Request $request, array $params): Response
    {
        $this->pages->delete((int) ($params['id'] ?? 0));
        Flash::set('success', 'Page deleted.');

        return Response::redirect('/admin/pages');
    }

    private function validated(Request $request): array
    {
        $data = (new Validator($request->all()))
            ->required('slug')->string('slug', 190)
            ->required('title')->string('title', 255)
            ->required('content')->string('content', 100000)
            ->string('meta_title', 255)
            ->string('meta_description', 320)
            ->validate();

        $data['noindex'] = $request->input('noindex');
        $data['is_published'] = $request->input('is_published');

        return $data;
    }
}
