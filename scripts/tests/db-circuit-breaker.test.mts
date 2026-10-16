/**
 * DB circuit breaker + RequestQueue gate integration test (node:test).
 * Runs under `npm run test:reliability` and exercises the real modules —
 * no jest/PGlite needed.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

// Threshold/cooldown are read at module-load time — set before importing.
process.env.DB_BREAKER_THRESHOLD = '3';
process.env.DB_BREAKER_COOLDOWN_MS = '400';

const { RequestQueue } = await import('../../src/lib/utils/requestQueue.ts');
const { dbCircuitBreaker, DatabaseUnavailableError } =
  await import('../../src/lib/utils/dbCircuitBreaker.ts');

function unavailableError() {
  return new DOMException('Request timeout', 'TimeoutError');
}

function makeGatedQueue() {
  return new RequestQueue({
    maxConcurrency: 4,
    defaultTimeout: 100,
    gate: {
      shouldReject: () => !dbCircuitBreaker.claimProbe(),
      rejection: () => new DatabaseUnavailableError(),
      onSettled: (ok, error) =>
        ok ? dbCircuitBreaker.recordSuccess() : dbCircuitBreaker.recordFailure(error),
    },
  });
}

test('db circuit breaker: trip, fail-fast, half-open probe, recovery', async () => {
  // 1. Business errors (4xx-ish) do NOT trip the breaker — 8 straight
  //    failures and the breaker must stay closed.
  const q0 = makeGatedQueue();
  for (let i = 0; i < 8; i++) {
    await assert.rejects(
      q0.add(async () => {
        throw new Error('duplicate key value violates unique constraint');
      }),
      /duplicate key/
    );
  }
  assert.equal(dbCircuitBreaker.state, 'closed', 'business errors must not open the breaker');

  // 2. Threshold availability failures open the breaker.
  const queue = makeGatedQueue();
  for (let i = 0; i < 3; i++) {
    await assert.rejects(
      queue.add(async () => {
        throw unavailableError();
      }),
      (err: unknown) => err instanceof Error && err.name === 'TimeoutError'
    );
  }
  assert.equal(dbCircuitBreaker.state, 'open', 'breaker should be open after 3 timeout failures');

  // 3. While open, requests fail FAST (no 100ms hang) with
  //    DatabaseUnavailableError.
  const t0 = Date.now();
  await assert.rejects(
    queue.add(async () => 'never'),
    (err: unknown) => err instanceof DatabaseUnavailableError
  );
  assert.ok(Date.now() - t0 < 20, `gate must reject immediately, took ${Date.now() - t0}ms`);

  // 4. Half-open after cooldown: exactly one probe passes; success closes.
  await new Promise((resolve) => setTimeout(resolve, 500));
  assert.equal(dbCircuitBreaker.state, 'half-open', 'should be half-open after cooldown');

  const probe = queue.add(async () => 'probe-ok');
  const blocked = queue.add(async () => 'blocked');
  await assert.rejects(blocked, (err: unknown) => err instanceof DatabaseUnavailableError);
  assert.equal(await probe, 'probe-ok', 'single half-open probe must pass');
  assert.equal(dbCircuitBreaker.state, 'closed', 'probe success must close the breaker');

  // 5. After close, normal operation resumes.
  assert.equal(await queue.add(async () => 'work'), 'work');
});
