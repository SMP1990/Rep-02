<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Minimal fluent request validator (Phase 0 §0.8: request validation,
 * input sanitization). Deliberately generic — nothing here is aware of
 * any specific media platform; that's for the Processing Provider phase.
 */
final class Validator
{
    /** @var array<string, string[]> */
    private array $errors = [];

    public function __construct(private readonly array $data)
    {
    }

    public function required(string $field): self
    {
        $value = $this->data[$field] ?? null;

        if ($value === null || $value === '') {
            $this->errors[$field][] = "The {$field} field is required.";
        }

        return $this;
    }

    public function string(string $field, int $maxLength = 2048): self
    {
        if (!array_key_exists($field, $this->data) || $this->data[$field] === null) {
            return $this;
        }

        if (!is_string($this->data[$field])) {
            $this->errors[$field][] = "The {$field} field must be a string.";
            return $this;
        }

        if (mb_strlen($this->data[$field]) > $maxLength) {
            $this->errors[$field][] = "The {$field} field must not exceed {$maxLength} characters.";
        }

        return $this;
    }

    /**
     * Validates the field is a syntactically valid URL restricted to
     * http/https — rejects javascript:, file:, data:, and any other
     * scheme outright. This is a deliberate defensive baseline that
     * exists before any processing provider does, not something deferred
     * to that phase.
     */
    public function url(string $field): self
    {
        $value = $this->data[$field] ?? null;

        if ($value === null) {
            return $this;
        }

        if (!is_string($value) || filter_var($value, FILTER_VALIDATE_URL) === false) {
            $this->errors[$field][] = "The {$field} field must be a valid URL.";
            return $this;
        }

        $scheme = parse_url($value, PHP_URL_SCHEME);

        if (!in_array($scheme, ['http', 'https'], true)) {
            $this->errors[$field][] = "The {$field} field must use http or https.";
        }

        return $this;
    }

    public function passes(): bool
    {
        return $this->errors === [];
    }

    /** @return array<string, string[]> */
    public function errors(): array
    {
        return $this->errors;
    }

    /**
     * @throws ValidationException
     */
    public function validate(): array
    {
        if (!$this->passes()) {
            throw new ValidationException($this->errors);
        }

        return $this->data;
    }
}
