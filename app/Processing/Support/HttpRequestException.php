<?php

declare(strict_types=1);

namespace App\Processing\Support;

use RuntimeException;

/**
 * Thrown by HttpClient after exhausting retries on a transient failure
 * (connection error or 5xx). A concrete ProcessingProvider is expected to
 * catch this and translate it into the appropriate ProcessingException
 * subtype (e.g. ProviderUnavailableException) — HttpClient itself has no
 * knowledge of that vocabulary, since it's not part of the Processing
 * abstraction, just infrastructure providers use.
 */
final class HttpRequestException extends RuntimeException
{
}
