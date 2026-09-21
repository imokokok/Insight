import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { keccak256 } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { rwaV2Fixture } from '../../examples/rwa-v2/fixture.mjs';
import * as sdk from '../dist/index.js';

const registry = JSON.parse(
  readFileSync(new URL('../../protocol/rwa-instrument-registry.v1.json', import.meta.url), 'utf8')
);
const executionRegistry = JSON.parse(
  readFileSync(new URL('../../protocol/rwa-execution-profiles.v1.json', import.meta.url), 'utf8')
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

test('production v2 report signs and independently pins the exact ACTIVE admission snapshot', async () => {
  const activeRegistry = structuredClone(registry);
  activeRegistry.publishedAt = '2026-09-29T00:00:00Z';
  activeRegistry.entries[0].status = 'ACTIVE';
  const entry = activeRegistry.entries[0],
    profile = executionRegistry.profiles[0].profile,
    f = rwaV2Fixture(sdk),
    signer = privateKeyToAccount('0x' + '12'.repeat(32));
  f.input.instrument = structuredClone(entry.instrument);
  f.input.request.instrumentId = entry.instrumentId;
  f.policy.instrumentId = entry.instrumentId;
  f.policy.environment = 'production';
  for (const price of f.input.prices) {
    price.instrumentId = entry.instrumentId;
    price.currency = entry.instrument.currency;
    price.priceBasis = entry.instrument.priceBasis;
    price.corporateActionVersion = entry.instrument.corporateActionVersion;
  }
  f.input.market.instrumentId = entry.instrumentId;
  f.input.market.mic = entry.instrument.venueMic;
  for (const evidence of f.input.evidence) {
    evidence.instrumentId = entry.instrumentId;
    if (evidence.kind !== 'eligibility') evidence.subject = entry.instrumentId;
  }
  f.receiverEvidence.instrumentId = entry.instrumentId;
  f.callProfile = structuredClone(profile);
  f.transaction = sdk.buildRwaSwapRouter02Transaction(profile, {
    from: f.transaction.from,
    nonce: f.transaction.nonce,
    instrument: entry.instrument,
    action: 'buy',
    fee: 500,
    amountIn: f.input.request.amount,
    minimumOutput: '1',
    receiver: f.receiverEvidence.subject,
    deadline: f.now + 120,
  });
  f.input.request.call = {
    chainId: f.transaction.chainId,
    from: f.transaction.from,
    to: f.transaction.to,
    calldataHash: keccak256(f.transaction.data),
    value: f.transaction.value,
    nonce: f.transaction.nonce,
  };
  const report = sdk.buildAdmittedRwaReportV2(activeRegistry, f.input, f.policy, f.now, {
      sequence: '0',
      previousDigest: null,
      transaction: f.transaction,
      callProfile: profile,
      receiverEvidence: f.receiverEvidence,
    }),
    proof = {
      report,
      digest: sdk.rwaV2ReportDigest(report),
      signer: signer.address,
      signature: await signer.signTypedData(sdk.rwaV2SigningData(report)),
    },
    trust = {
      policy: structuredClone(f.policy),
      policyId: sdk.rwaPolicyId(f.policy),
      request: structuredClone(f.input.request),
      environment: f.policy.environment,
      keys: [
        {
          address: signer.address,
          validFrom: f.now - 60,
          validUntil: f.now + 3600,
          revoked: false,
        },
      ],
      callProfile: structuredClone(profile),
      instrumentAdmission: structuredClone(report.instrumentAdmission),
    };
  assert.equal((await sdk.verifyRwaReportV2(proof, trust, f.now)).valid, true);
  const wrongTrust = structuredClone(trust);
  wrongTrust.instrumentAdmission.registryDigest = '0x' + '00'.repeat(32);
  assert.equal((await sdk.verifyRwaReportV2(proof, wrongTrust, f.now)).valid, false);
  assert.throws(
    () =>
      sdk.buildRwaReportV2(f.input, f.policy, f.now, {
        sequence: '0',
        previousDigest: null,
        transaction: f.transaction,
        callProfile: profile,
        receiverEvidence: f.receiverEvidence,
      }),
    /RWA_INSTRUMENT_ADMISSION_REQUIRED/
  );
  assert.throws(
    () => sdk.buildAdmittedRwaReport(activeRegistry, f.input, f.policy, f.now),
    /RWA_ADMISSION_COMMITMENT_REQUIRES_V2/
  );
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
