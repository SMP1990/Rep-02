<?php

declare(strict_types=1);

// Registered ProcessingProvider classes, in the order ProviderManager
// should prefer them (highest getPriority() wins when more than one
// supports() a given URL — see app/Processing/ProviderManager.php).
//
// Intentionally empty. No concrete provider has been chosen or approved
// yet — see docs/media-platform/phase-1-technical-architecture.md and the
// dedicated Processing Provider discussion still to come. Until a class
// is registered here, every /api/v1/metadata and /api/v1/process call
// will resolve to UnsupportedSourceException, which is the correct,
// honest behavior for this phase (no extraction logic exists yet).
return [
    'providers' => [
        // \App\Processing\Providers\ExampleProvider::class,
    ],
];
