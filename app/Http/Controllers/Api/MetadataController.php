<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Analytics\RequestRecorder;
use App\Http\Request;
use App\Http\Response;
use App\Processing\Exceptions\ProcessingException;
use App\Processing\ProviderManager;
use App\Support\ValidationException;
use App\Support\Validator;

/**
 * POST /api/v1/metadata — Phase 1 §1.3 step 1 of the two-step contract.
 * With no provider registered yet (config/providers.php is empty), every
 * valid URL correctly resolves to an UNSUPPORTED_SOURCE error — this
 * controller exercises the full pipeline (validation → rate limit →
 * ProviderManager → exception mapping → response envelope) without any
 * platform-specific extraction logic existing yet.
 */
final class MetadataController
{
    public function __construct(
        private readonly ProviderManager $providerManager,
        private readonly RequestRecorder $recorder,
    ) {
    }

    public function __invoke(Request $request): Response
    {
        try {
            $data = (new Validator($request->all()))
                ->required('url')
                ->string('url', 2048)
                ->url('url')
                ->validate();
        } catch (ValidationException) {
            return Response::error('INVALID_URL', 'Please provide a valid http(s) URL.', 422);
        }

        $startedAt = microtime(true);

        try {
            $result = $this->providerManager->fetchMetadata($data['url']);
        } catch (ProcessingException $e) {
            $this->recorder->record(
                requestType: 'metadata',
                url: $data['url'],
                sourcePlatform: null,
                providerName: null,
                optionId: null,
                success: false,
                errorCode: $e->getErrorCode(),
                durationMs: $this->elapsedMs($startedAt),
                ip: $request->ip(),
                userAgent: $request->userAgent(),
            );

            return Response::error($e->getErrorCode(), $e->getUserMessage(), self::statusFor($e));
        }

        $this->recorder->record(
            requestType: 'metadata',
            url: $data['url'],
            sourcePlatform: $result->sourcePlatform,
            providerName: $result->providerName,
            optionId: null,
            success: true,
            errorCode: null,
            durationMs: $this->elapsedMs($startedAt),
            ip: $request->ip(),
            userAgent: $request->userAgent(),
        );

        return Response::success([
            'source_platform' => $result->sourcePlatform,
            'title' => $result->title,
            'thumbnail_url' => $result->thumbnailUrl,
            'duration_seconds' => $result->durationSeconds,
            'options' => array_map(
                static fn ($option) => [
                    'id' => $option->id,
                    'label' => $option->label,
                    'format' => $option->format,
                ],
                $result->options,
            ),
        ]);
    }

    public static function statusFor(ProcessingException $e): int
    {
        return match ($e->getErrorCode()) {
            'INVALID_URL', 'UNSUPPORTED_SOURCE' => 422,
            'RATE_LIMITED' => 429,
            'PROVIDER_TIMEOUT' => 504,
            'PROVIDER_UNAVAILABLE' => 503,
            'UPSTREAM_REJECTED' => 422,
            default => 502,
        };
    }

    private function elapsedMs(float $startedAt): int
    {
        return (int) ((microtime(true) - $startedAt) * 1000);
    }
}
