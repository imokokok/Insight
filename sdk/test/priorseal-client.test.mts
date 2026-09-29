import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PriorSealBridgeError,
  PriorSealClient,
  buildPriorSealExactCallIntent,
} from '../src/priorseal';

const observationInput = {
  authorizationId: 'auth_test',
  chainId: 8453,
  txHash: `0x${'a'.repeat(64)}`,
};

function clientReturning(value: unknown): PriorSealClient {
  return new PriorSealClient({
    baseUrl: 'https://priorseal.test',
    fetch: async () =>
      new Response(JSON.stringify(value), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  });
}

function invalidResponse(error: unknown): boolean {
  return error instanceof PriorSealBridgeError && error.options.code === 'INVALID_API_RESPONSE';
}

test('PriorSeal client rejects a successful non-object response', async () => {
  await assert.rejects(clientReturning([]).observeExecution(observationInput), invalidResponse);
});

test('PriorSeal client preserves caller-provided request headers', async () => {
  let sentHeaders: Headers | undefined;
  const client = new PriorSealClient({
    baseUrl: 'https://priorseal.test',
    headers: { 'Idempotency-Key': 'caller-key', 'Content-Type': 'application/vnd.example+json' },
    fetch: async (_url, init) => {
      sentHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify({ observation: { status: 'PENDING' } }), { status: 200 });
    },
  });

  await client.observeExecution(observationInput);
  assert.equal(sentHeaders?.get('Idempotency-Key'), 'caller-key');
  assert.equal(sentHeaders?.get('Content-Type'), 'application/vnd.example+json');
});

test('PriorSeal client rejects unknown observation states before polling', async () => {
  await assert.rejects(
    clientReturning({ jobId: 'job_1', state: 'WAIT_FOREVER', attempts: 0 }).waitForObservationJob(
      'job_1',
      { timeoutMs: 100 }
    ),
    invalidResponse
  );
});

test('PriorSeal client rejects a mismatched observation job identity', async () => {
  await assert.rejects(
    clientReturning({ jobId: 'job_other', state: 'COMPLETED', attempts: 1 }).getObservationJob(
      'job_1'
    ),
    invalidResponse
  );
});

test('PriorSeal client rejects a malformed completed observation result', async () => {
  await assert.rejects(
    clientReturning({
      jobId: 'job_1',
      state: 'COMPLETED',
      attempts: 1,
      result: { observation: { status: 'CONFIRMED' }, receipt: {} },
    }).waitForObservationJob('job_1'),
    invalidResponse
  );
});

test('PriorSeal bridge follows a retry-wait job schedule', async () => {
  let calls = 0;
  const dueAt = Date.now() + 90;
  const client = new PriorSealClient({
    baseUrl: 'https://priorseal.test',
    fetch: async () => {
      calls++;
      return new Response(
        JSON.stringify(
          calls === 1
            ? { jobId: 'job_1', state: 'RETRY_WAIT', attempts: 1, nextAttemptAt: dueAt }
            : { jobId: 'job_1', state: 'COMPLETED', attempts: 2 }
        ),
        { status: 200 }
      );
    },
  });
  const startedAt = Date.now();
  const result = await client.waitForObservationJob('job_1', {
    pollIntervalMs: 10,
    timeoutMs: 500,
  });
  assert.equal(result.state, 'COMPLETED');
  assert.equal(calls, 2);
  assert.ok(Date.now() - startedAt >= 60, 'must not poll immediately during retry wait');
});

test('PriorSeal exact-call bridge normalizes commitments like the canonical SDK', () => {
  // Fixture semantics follow PriorSeal sdk/src/exact-call.ts at c0372ad41a0d.
  const transaction = {
    chainId: 8453,
    from: `0x${'A'.repeat(40)}`,
    to: `0x${'B'.repeat(40)}`,
    data: '0x1234' as const,
    nonce: '7',
    sourceAmount: '1000000',
  };
  const commitments = [
    {
      namespace: 'z.test',
      algorithm: 'keccak256' as const,
      digest: `0x${'A'.repeat(64)}` as const,
    },
    { namespace: 'a.test', algorithm: 'sha256' as const, digest: `0x${'b'.repeat(64)}` as const },
  ];
  const intent = buildPriorSealExactCallIntent({
    transaction,
    intentId: 'test-intent',
    sourceAssetId: 'eip155:8453/native',
    validUntil: 1_900_000_000,
    contextCommitments: commitments,
  });
  assert.deepEqual(intent.contextCommitments, [
    { namespace: 'a.test', algorithm: 'sha256', digest: `0x${'b'.repeat(64)}` },
    { namespace: 'z.test', algorithm: 'keccak256', digest: `0x${'a'.repeat(64)}` },
  ]);
  assert.equal(commitments[0].digest, `0x${'A'.repeat(64)}`, 'input must remain unchanged');
  assert.throws(
    () =>
      buildPriorSealExactCallIntent({
        transaction,
        intentId: 'test-intent',
        sourceAssetId: 'eip155:8453/native',
        validUntil: 1_900_000_000,
        contextCommitments: [commitments[0], commitments[0]],
      }),
    /must not contain duplicates/
  );
});
