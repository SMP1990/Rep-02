<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Support\View;

/**
 * Server-rendered public pages (Phase 5). FAQ content is a small static
 * array for now, not the `faq` DB table — Phase 6 (admin dashboard) adds
 * a FaqRepository and this becomes DB-backed without changing the view.
 * Same story for About/Terms/Privacy/Copyright: static original copy
 * here, admin-editable via the `pages` table once Phase 6 exists. Legal
 * pages are placeholder boilerplate and need real legal review before
 * launch — flagged in docs/media-platform/phase-5-frontend.md, not
 * presented as reviewed legal text.
 */
final class PageController
{
    public function home(Request $request): Response
    {
        return Response::html(View::render('home/index', [
            'title' => 'Fetchpoint — Save media from a link',
            'metaDescription' => 'Paste a link, choose your format, and get your file — fast, private, and free.',
            'faqTeaser' => array_slice($this->faqEntries(), 0, 4),
        ]));
    }

    public function faq(Request $request): Response
    {
        return Response::html(View::render('faq/index', [
            'title' => 'FAQ — Fetchpoint',
            'metaDescription' => 'Answers to common questions about using Fetchpoint.',
            'faqEntries' => $this->faqEntries(),
        ]));
    }

    public function about(Request $request): Response
    {
        return Response::html(View::render('pages/about', [
            'title' => 'About — Fetchpoint',
        ]));
    }

    public function contact(Request $request): Response
    {
        return Response::html(View::render('pages/contact', [
            'title' => 'Contact — Fetchpoint',
        ]));
    }

    public function terms(Request $request): Response
    {
        return Response::html(View::render('pages/terms', [
            'title' => 'Terms of Service — Fetchpoint',
        ]));
    }

    public function privacy(Request $request): Response
    {
        return Response::html(View::render('pages/privacy', [
            'title' => 'Privacy Policy — Fetchpoint',
        ]));
    }

    public function copyright(Request $request): Response
    {
        return Response::html(View::render('pages/copyright', [
            'title' => 'Copyright / DMCA — Fetchpoint',
        ]));
    }

    /** @return array<int, array{question: string, answer: string}> */
    private function faqEntries(): array
    {
        return [
            [
                'question' => 'What sources are supported?',
                'answer' => "Support is being rolled out one source at a time. We'll list every supported source here as it becomes available.",
            ],
            [
                'question' => 'Is Fetchpoint free to use?',
                'answer' => 'Yes. There is no account, no subscription, and no hidden fee to use Fetchpoint.',
            ],
            [
                'question' => 'Do you store the links I submit?',
                'answer' => "No. Links are processed and then discarded — we don't keep a record of which links you personally submitted.",
            ],
            [
                'question' => 'Is it legal to use Fetchpoint?',
                'answer' => "You're responsible for making sure you have the right to download any content you fetch. Fetchpoint is a tool, not a rights holder — it doesn't host or redistribute content itself.",
            ],
            [
                'question' => 'Why did my link fail?',
                'answer' => "A link can fail if it's from an unsupported source, the content has been made private or removed, or the source is temporarily unavailable. The error message on the page tells you which of these applies.",
            ],
            [
                'question' => 'Do I need to create an account?',
                'answer' => "No. Fetchpoint works anonymously — paste a link and go.",
            ],
        ];
    }
}
