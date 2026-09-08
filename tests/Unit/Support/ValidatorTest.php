<?php

declare(strict_types=1);

namespace Tests\Unit\Support;

use App\Support\ValidationException;
use App\Support\Validator;
use PHPUnit\Framework\TestCase;

final class ValidatorTest extends TestCase
{
    public function testValidHttpsUrlPasses(): void
    {
        $data = (new Validator(['url' => 'https://example.com/watch?v=123']))
            ->required('url')->url('url')->validate();

        self::assertSame('https://example.com/watch?v=123', $data['url']);
    }

    public function testMissingUrlFails(): void
    {
        $this->expectException(ValidationException::class);

        (new Validator([]))->required('url')->validate();
    }

    /** @dataProvider disallowedSchemes */
    public function testNonHttpSchemeIsRejected(string $url): void
    {
        $validator = (new Validator(['url' => $url]))->required('url')->url('url');

        self::assertFalse($validator->passes());
    }

    public static function disallowedSchemes(): array
    {
        return [
            'javascript scheme' => ['javascript:alert(1)'],
            'file scheme' => ['file:///etc/passwd'],
            'data scheme' => ['data:text/html,<script>alert(1)</script>'],
        ];
    }

    public function testStringLengthLimitIsEnforced(): void
    {
        $validator = (new Validator(['name' => str_repeat('a', 10)]))->string('name', 5);

        self::assertFalse($validator->passes());
    }
}
