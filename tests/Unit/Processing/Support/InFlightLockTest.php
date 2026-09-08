<?php

declare(strict_types=1);

namespace Tests\Unit\Processing\Support;

use App\Processing\Support\InFlightLock;
use PHPUnit\Framework\TestCase;

/**
 * These tests exercise everything InFlightLock does that's observable
 * within a single PHP process (a second, independent file handle on the
 * same lock file behaves correctly per flock()'s own semantics even
 * within one process, since locks are tied to the open file description,
 * not the process). The one thing a single process genuinely cannot
 * prove — a concurrent OS process becoming leader, doing work, and a
 * waiting caller picking up its result — was verified separately via
 * real child processes (see the Phase 8b write-up); that's the part
 * PHPUnit itself can't simulate honestly.
 */
final class InFlightLockTest extends TestCase
{
    private string $lockDir;

    protected function setUp(): void
    {
        $this->lockDir = sys_get_temp_dir() . '/fetchpoint-inflight-lock-test-' . uniqid('', true);
    }

    protected function tearDown(): void
    {
        if (is_dir($this->lockDir)) {
            foreach (glob($this->lockDir . '/*') ?: [] as $file) {
                @unlink($file);
            }
            @rmdir($this->lockDir);
        }
    }

    public function testAcquireSucceedsImmediatelyWhenUncontended(): void
    {
        $lock = new InFlightLock($this->lockDir);

        $handle = $lock->acquire('some-key');

        self::assertNotNull($handle);
        $lock->release($handle);
    }

    public function testTheSameKeyCanBeAcquiredAgainAfterBeingReleased(): void
    {
        $lock = new InFlightLock($this->lockDir);

        $first = $lock->acquire('some-key');
        self::assertNotNull($first);
        $lock->release($first);

        $second = $lock->acquire('some-key');
        self::assertNotNull($second, 'should be able to become leader again once the previous leader released');
        $lock->release($second);
    }

    public function testDifferentKeysDoNotContendWithEachOther(): void
    {
        $lock = new InFlightLock($this->lockDir);

        $handleA = $lock->acquire('key-a');
        $handleB = $lock->acquire('key-b');

        self::assertNotNull($handleA);
        self::assertNotNull($handleB, 'a different key must not be blocked by an unrelated key\'s lock');

        $lock->release($handleA);
        $lock->release($handleB);
    }

    public function testAcquireWaitsBoundedThenGivesUpWhenAnotherHandleHoldsTheLock(): void
    {
        // Simulate an external "leader" holding the lock — a genuinely
        // separate open file description on the same file behaves exactly
        // like a separate OS process would, per flock()'s own semantics.
        if (!is_dir($this->lockDir)) {
            mkdir($this->lockDir, 0755, true);
        }
        $lockPath = $this->lockDir . '/' . hash('sha256', 'contended-key') . '.lock';
        $externalHandle = fopen($lockPath, 'c');
        self::assertNotFalse($externalHandle);
        self::assertTrue(flock($externalHandle, LOCK_EX));

        $lock = new InFlightLock($this->lockDir, waitTimeoutSeconds: 1, pollIntervalMicroseconds: 50_000);

        $start = microtime(true);
        $result = $lock->acquire('contended-key');
        $elapsed = microtime(true) - $start;

        flock($externalHandle, LOCK_UN);
        fclose($externalHandle);

        self::assertNull($result, 'should not become leader while another handle holds the lock');
        self::assertGreaterThanOrEqual(0.9, $elapsed, 'should have waited out roughly the full timeout window');
        self::assertLessThan(2.5, $elapsed, 'should not wait meaningfully longer than its configured timeout');
    }

    public function testReleaseOnANullOrInvalidHandleIsANoOp(): void
    {
        $lock = new InFlightLock($this->lockDir);

        // Must not throw or warn — callers always call release() in a
        // finally block, sometimes with whatever acquire() returned.
        $lock->release(null);
        $lock->release('not-a-resource');

        $this->expectNotToPerformAssertions();
    }
}
