<?php

declare(strict_types=1);

// This file is documentation, not live configuration — ProviderManager
// takes ProcessingProvider *instances*, so registration actually happens
// in public/index.php, constructed explicitly alongside everything else
// the front controller wires up (same style as every other dependency in
// that file). An earlier version of this file was read via
// Config::get('providers.providers') as if it were a list of resolvable
// class names; ProviderManager never accepted strings, so that would
// have fatal-errored the moment anything was actually listed here — a
// latent bug caught and fixed while wiring the first real provider
// (Phase 7c) rather than left for later.
//
// Currently registered, in priority order (see public/index.php):
//   1. App\Processing\Providers\FacebookProvider — public Facebook
//      video/Reel URLs only. See docs/media-platform/phase-7b-facebook-
//      provider-research.md and phase-7c-facebook-provider-implementation.md
//      for what it does and does not do, and its known limitations.
return [];
