<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Request;
use App\Http\Response;
use App\Repositories\ProcessingLogRepository;
use App\Repositories\VisitorStatsRepository;
use App\Support\Csrf;
use App\Support\Flash;
use App\Support\View;

final class DashboardController
{
    public function __construct(
        private readonly ProcessingLogRepository $processingLog,
        private readonly VisitorStatsRepository $visitorStats,
    ) {
    }

    public function index(Request $request): Response
    {
        return Response::html(View::render('admin/dashboard/index', [
            'title' => 'Dashboard — Admin',
            'activeNav' => 'dashboard',
            'flash' => Flash::consume(),
            'csrfToken' => Csrf::token(),
            'totals' => $this->processingLog->totals(),
            'today' => $this->processingLog->totalsSince(date('Y-m-d 00:00:00')),
            'week' => $this->processingLog->totalsSince(date('Y-m-d 00:00:00', strtotime('-6 days'))),
            'month' => $this->processingLog->totalsSince(date('Y-m-d 00:00:00', strtotime('-29 days'))),
            'dailyStats' => $this->visitorStats->dailyStats(14),
        ], 'admin/layouts/admin'));
    }
}
