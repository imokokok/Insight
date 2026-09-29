import assert from 'node:assert/strict';
import test from 'node:test';

import { hashTypedData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import {
  reportVerification,
  resolveKeyStatus,
  toV1Message,
  verifyExecutionReceipt,
  verifyReceipt,
  V1_DOMAIN,
  V1_PRIMARY_TYPE,
  V1_TYPES,
} from '../dist/index.js';

const account = privateKeyToAccount(
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
);

test('a genuinely signed v1 receipt at Unix epoch is expired', async () => {
  const data = {
    verdict: 'PASS',
    asset: 'ETH',
    chainId: 1,
    action: 'swap',
    tradeAmountUsd: 1_000_000,
    consensusPrice: 200_000_000_000,
    maxDeviationBps: 15,
    manipulationRiskBps: 100,
    participantCount: 4,
    checkedAt: 0,
    schemaVersion: 1,
  };
  const args = {
    domain: V1_DOMAIN,
    types: V1_TYPES,
    primaryType: V1_PRIMARY_TYPE,
    message: toV1Message(data),
  };
  const result = await verifyReceipt({
    uid: hashTypedData(args),
    schemaVersion: 1,
    attester: account.address,
    signature: await account.signTypedData(args),
    data,
  });

  assert.equal(result.code, 'expired');
  assert.equal(result.valid, false);
  assert.equal(result.validUntil, 600);
  assert.ok(result.ageSeconds > 600);
});

test('registry trust cannot be granted with invalid time or malformed registry data', () => {
  const registry = {
    keys: [
      {
        key_id: 'key_1',
        public_key: account.address,
        validFrom: '2020-01-01T00:00:00.000Z',
        validUntil: null,
        revoked: false,
      },
    ],
  };

  assert.equal(resolveKeyStatus(account.address, 1_800_000_000, registry), 'valid');
  const end = Date.parse('2027-01-01T00:00:00.000Z') / 1000;
  const bounded = { keys: [{ ...registry.keys[0], validUntil: '2027-01-01T00:00:00.000Z' }] };
  assert.equal(resolveKeyStatus(account.address, end - 1, bounded), 'valid');
  assert.equal(resolveKeyStatus(account.address, end, bounded), 'outside_window');
  assert.equal(resolveKeyStatus(account.address, Number.NaN, registry), 'outside_window');
  assert.equal(resolveKeyStatus(account.address, Infinity, registry), 'outside_window');
  assert.equal(resolveKeyStatus(account.address, 1_800_000_000, { keys: {} }), 'unknown_key');
  assert.equal(
    resolveKeyStatus(account.address, 1_800_000_000, {
      keys: [registry.keys[0], { ...registry.keys[0], key_id: 'duplicate' }],
    }),
    'unknown_key'
  );
  assert.equal(
    resolveKeyStatus(account.address, 1_800_000_000, { ...registry, revoked: {} }),
    'unknown_key'
  );
  assert.equal(
    resolveKeyStatus(account.address, 1_800_000_000, { ...registry, revoked: [{}] }),
    'unknown_key'
  );
  assert.equal(
    resolveKeyStatus(account.address, 1_800_000_000, {
      keys: [{ ...registry.keys[0], validFrom: 'invalid-date' }],
    }),
    'outside_window'
  );
});

test('execution verifier returns a failure for malformed directly supplied trust', async () => {
  const result = await verifyExecutionReceipt(
    { uid: `0x${'0'.repeat(64)}`, schemaVersion: 5, attester: account.address, data: {} },
    { keyRegistry: { keys: {} } }
  );

  assert.equal(result.valid, false);
  assert.equal(result.keyStatus, 'unknown_key');
  assert.equal(result.code, 'signature_missing');
});

test('optional telemetry rejects invalid timeouts without issuing a request', async () => {
  let requests = 0;
  const sent = await reportVerification(
    { schemaVersion: 1, kind: 'check', code: 'ok', keyStatus: 'not_checked', uid: null },
    {
      endpoint: 'https://example.test/report',
      timeoutMs: -1,
      fetchImpl: async () => {
        requests += 1;
        return new Response(null, { status: 204 });
      },
    }
  );

  assert.equal(sent, false);
  assert.equal(requests, 0);
});
