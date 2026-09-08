<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Auth\AdminAuthenticator;
use App\Http\Request;
use App\Http\Response;
use App\Support\Csrf;
use App\Support\ValidationException;
use App\Support\Validator;

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
}
