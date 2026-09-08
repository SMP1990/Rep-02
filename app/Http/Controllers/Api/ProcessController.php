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
 * POST /api/v1/process — Phase 1 §1.3 step 2 of the two-step contract.
 * Same "no provider registered yet" behavior as MetadataController.
 */
final class ProcessController
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
                ->required('url')->string('url', 2048)->url('url')
                ->required('option_id')->string('option_id', 100)
                ->validate();
        } catch (ValidationException) {
            return Response::error('INVALID_INPUT', 'A valid URL and option are required.', 422);
        }

        $startedAt = microtime(true);

        try {
            $result = $this->providerManager->process($data['url'], $data['option_id']);
        } catch (ProcessingException $e) {
            $this->recorder->record(
                requestType: 'process',
                url: $data['url'],
                sourcePlatform: null,
                providerName: null,
                optionId: $data['option_id'],
                success: false,
                errorCode: $e->getErrorCode(),
                durationMs: $this->elapsedMs($startedAt),
                ip: $request->ip(),
                userAgent: $request->userAgent(),
            );

            return Response::error($e->getErrorCode(), $e->getUserMessage(), MetadataController::statusFor($e));
        }

        $this->recorder->record(
            requestType: 'process',
            url: $data['url'],
            sourcePlatform: $result->sourcePlatform,
            providerName: $result->providerName,
            optionId: $data['option_id'],
            success: true,
            errorCode: null,
            durationMs: $this->elapsedMs($startedAt),
            ip: $request->ip(),
            userAgent: $request->userAgent(),
        );

        return Response::success([
            'source_platform' => $result->sourcePlatform,
            'title' => $result->title,
            'output' => $result->output === null ? null : [
                'delivery_method' => $result->output->deliveryMethod,
                'url' => $result->output->url,
                'filename' => $result->output->filename,
                'mime_type' => $result->output->mimeType,
            ],
        ]);
    }

    private function elapsedMs(float $startedAt): int
    {
        return (int) ((microtime(true) - $startedAt) * 1000);
    }
}
