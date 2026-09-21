import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import * as sdk from '../dist/index.js';

const registry = JSON.parse(
  readFileSync(new URL('../../protocol/rwa-instrument-registry.v1.json', import.meta.url), 'utf8')
);

function contextFor(entry) {
  const deployment = {
    contractAddress: entry.issuerBinding.tokenAddress,
    chainId: entry.issuerBinding.chainId,
  };
  return {
    schema: sdk.ROBINHOOD_RWA_CONTEXT_SCHEMA,
    source: {
      id: sdk.ROBINHOOD_RWA_SOURCE_ID,
      type: 'issuer-first-party',
      independent: false,
      countsTowardOracleQuorum: false,
      issuer: 'Robinhood Assets (Jersey) Limited',
    },
    retrievedAt: 1_800_000_000,
    asset: {
      id: entry.issuerBinding.nativeAssetId,
      tokenSymbol: entry.issuerBinding.symbol,
      tokenName: `${entry.issuerBinding.symbol} token`,
      deployments: [deployment],
      deployment,
      currentMultiplier: '1',
      pendingMultiplier: null,
      status: 'ASSET_STATUS_ACTIVE',
      isin: entry.issuerBinding.isin,
    },
    integrity: { status: 'CLEAR', reasonCodes: [], mayAuthorizeExecution: false },
  };
}

test('validates the committed MIC/FIGI registry and binds FIGI to underlyingId', () => {
  const validated = sdk.validateRwaInstrumentRegistry(registry);
  assert.equal(validated.entries.length, 3);
  for (const entry of validated.entries) {
    assert.equal(
      entry.instrument.underlyingId,
      sdk.rwaShareClassFigiUnderlyingId(entry.figi.shareClassFigi)
    );
    assert.equal(entry.instrumentId, sdk.rwaInstrumentId(entry.instrument));
    assert.equal(entry.instrument.venueMic, entry.mic.mic);
  }
});

test('cross-checks issuer UID, ISIN and deployment while keeping shadow entries non-authorizing', () => {
  const entry = registry.entries[0];
  const admission = sdk.evaluateRobinhoodInstrumentAdmission(
    registry,
    contextFor(entry),
    1_800_000_001
  );
  assert.equal(admission.evaluation.identityStatus, 'MATCH');
  assert.deepEqual(admission.evaluation.reasonCodes, ['REGISTRY_ENTRY_NOT_ACTIVE']);
  assert.equal(admission.evaluation.productionIdentityAdmitted, false);
  assert.equal(admission.evaluation.countsTowardOracleQuorum, false);
  assert.equal(admission.evaluation.mayAuthorizeExecution, false);
});

test('fails the identity cross-check on an issuer ISIN or deployment mismatch', () => {
  const entry = registry.entries[0];
  const context = contextFor(entry);
  context.asset.isin = 'US67066G1040';
  context.asset.deployment = {
    ...context.asset.deployment,
    contractAddress: `0x${'99'.repeat(20)}`,
  };
  const admission = sdk.evaluateRobinhoodInstrumentAdmission(registry, context);
  assert.equal(admission.evaluation.identityStatus, 'MISMATCH');
  assert.ok(admission.evaluation.reasonCodes.includes('REGISTRY_ISIN_MISMATCH'));
  assert.ok(admission.evaluation.reasonCodes.includes('REGISTRY_DEPLOYMENT_MISMATCH'));
});

test('requires an explicit ACTIVE promotion before production identity admission', () => {
  const prematureRegistry = structuredClone(registry);
  prematureRegistry.entries[0].status = 'ACTIVE';
  assert.throws(
    () => sdk.validateRwaInstrumentRegistry(prematureRegistry),
    /RWA_REGISTRY_MIC_SOURCE_NOT_EFFECTIVE/
  );

  const activeRegistry = structuredClone(registry);
  activeRegistry.publishedAt = '2026-09-29T00:00:00Z';
  activeRegistry.entries[0].status = 'ACTIVE';
  const entry = sdk.assertRwaInstrumentAdmitted(
    activeRegistry,
    activeRegistry.entries[0].instrument
  );
  assert.equal(entry.status, 'ACTIVE');
  const admission = sdk.evaluateRobinhoodInstrumentAdmission(activeRegistry, contextFor(entry));
  assert.equal(admission.evaluation.productionIdentityAdmitted, true);
  assert.deepEqual(admission.evaluation.reasonCodes, []);
  assert.equal(admission.evaluation.mayAuthorizeExecution, false);
});

test('admitted report builders stop at the registry gate before evaluating untrusted input', () => {
  const entry = registry.entries[0];
  assert.throws(
    () => sdk.buildAdmittedRwaReport(registry, { instrument: entry.instrument }, {}, 1_800_000_000),
    /RWA_REGISTRY_ENTRY_NOT_ACTIVE/
  );
  assert.throws(
    () =>
      sdk.buildAdmittedRwaReportV2(
        registry,
        { instrument: entry.instrument },
        {},
        1_800_000_000,
        {}
      ),
    /RWA_REGISTRY_ENTRY_NOT_ACTIVE/
  );
});

test('rejects registry drift when a committed instrument no longer hashes to instrumentId', () => {
  const changed = structuredClone(registry);
  changed.entries[0].instrument.venueMic = 'XNYS';
  assert.throws(
    () => sdk.validateRwaInstrumentRegistry(changed),
    /RWA_REGISTRY_INSTRUMENT_ID_MISMATCH/
  );
});

test('typed client exposes the non-quorum instrument admission endpoint', async () => {
  let requestedUrl = '';
  const expected = { schema: sdk.RWA_INSTRUMENT_ADMISSION_SCHEMA };
  const client = new sdk.InsightClient({
    apiKey: 'test-key',
    baseUrl: 'https://insight.test',
    fetch: async (url) => {
      requestedUrl = String(url);
      return new Response(JSON.stringify({ success: true, data: expected }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });

  assert.deepEqual(await client.robinhoodRwaInstrument('SPY', { verifyOnchain: false }), expected);
  assert.equal(
    requestedUrl,
    'https://insight.test/api/v1/rwa/robinhood/instrument?symbol=SPY&verifyOnchain=false'
  );
});
