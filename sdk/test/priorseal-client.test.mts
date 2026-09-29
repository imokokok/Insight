import assert from 'node:assert/strict';
import test from 'node:test';

import { PriorSealBridgeError, PriorSealClient } from '../src/priorseal';

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
