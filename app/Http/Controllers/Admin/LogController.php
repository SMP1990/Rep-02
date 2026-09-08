<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Request;
use App\Http\Response;
use App\Repositories\ErrorLogRepository;
use App\Repositories\ProcessingLogRepository;
use App\Support\Csrf;
use App\Support\View;

final class LogController
{
    private const PER_PAGE = 25;

    public function __construct(
        private readonly ProcessingLogRepository $processingLog,
        private readonly ErrorLogRepository $errorLogs,
    ) {
    }

    public function processing(Request $request): Response
    {
        $page = max(1, (int) $request->input('page', 1));
        $statusInput = $request->input('status');
        $status = in_array($statusInput, ['success', 'failure'], true) ? $statusInput : null;

        $result = $this->processingLog->paginate($page, self::PER_PAGE, $status);

        return Response::html(View::render('admin/logs/processing', [
            'title' => 'Processing Logs — Admin',
            'activeNav' => 'logs-processing',
            'csrfToken' => Csrf::token(),
            'rows' => $result['rows'],
            'total' => $result['total'],
            'page' => $page,
            'perPage' => self::PER_PAGE,
            'status' => $status,
        ], 'admin/layouts/admin'));
    }

    public function errors(Request $request): Response
    {
        $page = max(1, (int) $request->input('page', 1));
        $result = $this->errorLogs->paginate($page, self::PER_PAGE);

        return Response::html(View::render('admin/logs/errors', [
            'title' => 'Error Logs — Admin',
            'activeNav' => 'logs-errors',
            'csrfToken' => Csrf::token(),
            'rows' => $result['rows'],
            'total' => $result['total'],
            'page' => $page,
            'perPage' => self::PER_PAGE,
        ], 'admin/layouts/admin'));
    }
}
