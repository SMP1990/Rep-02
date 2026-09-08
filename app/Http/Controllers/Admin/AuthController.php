<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Auth\AdminAuthenticator;
use App\Http\Request;
use App\Http\Response;
use App\Support\Csrf;
use App\Support\Flash;
use App\Support\ValidationException;
use App\Support\Validator;
use App\Support\View;

/**
 * Two parallel login surfaces, both calling the same AdminAuthenticator
 * so there's exactly one place authentication logic lives:
 *  - login()/logout()/csrfToken(): JSON, from Phase 4 — unchanged, kept
 *    for any future JS/SPA/mobile consumer.
 *  - loginPage()/loginSubmit()/logoutSubmit(): plain HTML form +
 *    Post/Redirect/Get, used by the server-rendered admin dashboard
 *    (Phase 6) so the whole admin UI works with no client-side JS.
 */
final class AuthController
{
    public function __construct(private readonly AdminAuthenticator $authenticator)
    {
    }

    public function csrfToken(Request $request): Response
    {
        return Response::success(['csrf_token' => Csrf::token()]);
    }

    public function login(Request $request): Response
    {
        try {
            $data = (new Validator($request->all()))
                ->required('username')->string('username', 64)
                ->required('password')->string('password', 255)
                ->validate();
        } catch (ValidationException) {
            return Response::error('INVALID_INPUT', 'Username and password are required.', 422);
        }

        if (!$this->authenticator->attempt($data['username'], $data['password'])) {
            return Response::error('INVALID_CREDENTIALS', 'Incorrect username or password.', 401);
        }

        return Response::success(['csrf_token' => Csrf::token()]);
    }

    public function logout(Request $request): Response
    {
        $this->authenticator->logout();

        return Response::success([]);
    }

    public function loginPage(Request $request): Response
    {
        if (!empty($_SESSION['admin_id'])) {
            return Response::redirect('/admin');
        }

        return Response::html(View::render('admin/login', [
            'title' => 'Admin Login — Fetchpoint',
            'flash' => Flash::consume(),
            'csrfToken' => Csrf::token(),
        ], null));
    }

    public function loginSubmit(Request $request): Response
    {
        $username = (string) $request->input('username', '');
        $password = (string) $request->input('password', '');

        if ($username === '' || $password === '' || !$this->authenticator->attempt($username, $password)) {
            Flash::set('error', 'Incorrect username or password.');

            return Response::redirect('/admin/login');
        }

        return Response::redirect('/admin');
    }

    public function logoutSubmit(Request $request): Response
    {
        $this->authenticator->logout();
        Flash::set('success', 'You have been logged out.');

        return Response::redirect('/admin/login');
    }
}
