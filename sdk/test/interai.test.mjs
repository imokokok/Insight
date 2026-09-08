import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildInterAIExternalEvidenceRequestV0,
  buildInterAIExternalEvidenceV0,
  INTERAI_EXTERNAL_EVIDENCE_REVISION,
} from '../dist/index.js';

const frozenAttestation = {
  uid: '0xf5e77166bf8e61ec278bb06b02497c23b0ab9b9f69072644ffe0fb955a433685',
  schemaVersion: 2,
  attester: '0xa268676C85b927D64a4e2384636874f76D69e419',
  signature:
    '0xfb934d1ff157d0bec419acfa967743eb1674386d85104c3fece56bb2af4ae14e3fb9dfb519f21e7365b1d8616b47c394e0c79d63b8731c977f097248481e0fd31c',
  data: {
    verdict: 'CAUTION',
    sourceAssetId: 'eip155:1/erc20:0x6982508145454Ce325dDbE47a25d4ec3d2311933',
    destinationAssetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    subjectChainId: 1,
    action: 'swap',
    tradeAmountUsd: 10000000000,
    consensusPrice: 409,
    maxDeviationBps: 104,
    manipulationRiskBps: 2689,
    participantCount: 3,
    requiredParticipantCount: 3,
    coverageStatus: 'SUFFICIENT',
    independenceStatus: 'ASSESSED',
    sourceGroupCount: 3,
    crossProviderAgreementBps: 9361,
    maxStablecoinDepegBps: 0,
    maxDataAgeSeconds: 9727,
    recommendedMaxPositionUsd: 657000000000,
    reasonCodesHash: '0x794a0b7577ad30592c2de2d795dbf67e487d397e61b46900e9faf38774062010',
    requestHash: '0x89672662a1271f7c95ca4ca5d73b7ee11f45bc37d9ecf99ea9e3a9550d43864d',
    evaluationScope: 'SOURCE_ASSET_ONLY',
    evaluatedAssetIdsHash: '0xd743daaf9d09493ea6b481d5ccb16e46b63ecaf81cedac33fcc1167ba5723e1f',
    providerObservationsHash: '0xa59fab8ff2a07295435cb491a564d3e2067060379588621b0fd5effd3d48e8a5',
    validUntil: 1787651329,
    checkedAt: 1787650729,
    schemaVersion: 2,
  },
};

test('maps the frozen rev6 signed assertion to the exact inline evidence profile', async () => {
  const evidence = await buildInterAIExternalEvidenceV0(frozenAttestation);

  assert.equal(INTERAI_EXTERNAL_EVIDENCE_REVISION, 'rev6');
  assert.equal(evidence.evidence_id, frozenAttestation.uid);
  assert.deepEqual(evidence.provider, {
    namespace: 'insight.oracle-safety-check',
    assertion_version: 'v2',
    key_id: 'insight-oracle-safety-v2',
  });
  assert.deepEqual(evidence.assertion, {
    kind: 'assessment',
    verdict: 'CAUTION',
    verdict_space: 'insight.pre-trade/v2',
    observations: {
      coverage_status: 'SUFFICIENT',
      participant_count: 3,
      required_participant_count: 3,
      cross_provider_deviation_bps: 104,
      cross_provider_agreement_bps: 9361,
      independence_status: 'ASSESSED',
      max_data_age_seconds: 9727,
    },
  });
  assert.deepEqual(evidence.validity, {
    evaluated_at: frozenAttestation.data.checkedAt,
    valid_until: frozenAttestation.data.validUntil,
  });
  assert.deepEqual(evidence.binding, {
    scope: 'action',
    binding_mode: 'exact_action',
    action_commitment: {
      scheme: 'insight.canonical-pre-trade-request/v1',
      type: 'eip712',
      commitment: frozenAttestation.data.requestHash,
      committed_fields: [
        'subjectChainId',
        'sourceAssetId',
        'destinationAssetId',
        'action',
        'tradeAmountUsd',
      ],
    },
  });
  assert.deepEqual(evidence.verification.inline_payload, frozenAttestation.data);
  assert.equal(evidence.verification.mode, 'inline');
  assert.equal(evidence.verification.inline_signature, frozenAttestation.signature);
});

test('wraps the item in InterAI optional top-level external_evidence collection', async () => {
  const request = await buildInterAIExternalEvidenceRequestV0(frozenAttestation);
  assert.deepEqual(Object.keys(request), ['external_evidence']);
  assert.equal(request.external_evidence.length, 1);
  assert.equal(request.external_evidence[0].evidence_id, frozenAttestation.uid);
});

test('keeps expired signed evidence representable without assigning authority or a decision', async () => {
  const evidence = await buildInterAIExternalEvidenceV0(frozenAttestation);
  assert.equal(evidence.validity.valid_until, 1787651329);
  assert.equal('authority' in evidence, false);
  assert.equal('contribution' in evidence, false);
  assert.equal('affects_decision' in evidence, false);
  assert.equal('verify_endpoint' in evidence.verification, false);
  assert.equal('key_registry' in evidence.provider, false);
});

test('rejects non-v2 and non-pinned signed profiles', async () => {
  await assert.rejects(
    buildInterAIExternalEvidenceV0({ ...frozenAttestation, schemaVersion: 3 }),
    /requires an Insight v2 attestation/
  );
  await assert.rejects(
    buildInterAIExternalEvidenceV0({
      ...frozenAttestation,
      data: { ...frozenAttestation.data, evaluationScope: 'FULL_TRADE' },
    }),
    /pins evaluationScope/
  );
});

test('rejects payload drift, unsafe JSON numbers and carrier tampering', async () => {
  await assert.rejects(
    buildInterAIExternalEvidenceV0({
      ...frozenAttestation,
      data: { ...frozenAttestation.data, unexpected: true },
    }),
    /exactly the frozen 26 fields/
  );
  await assert.rejects(
    buildInterAIExternalEvidenceV0({
      ...frozenAttestation,
      data: { ...frozenAttestation.data, tradeAmountUsd: Number.MAX_SAFE_INTEGER + 1 },
    }),
    /non-negative safe integer/
  );
  await assert.rejects(
    buildInterAIExternalEvidenceV0({
      ...frozenAttestation,
      data: { ...frozenAttestation.data, verdict: 'BLOCK' },
    }),
    /UID does not match/
  );
  await assert.rejects(
    buildInterAIExternalEvidenceV0({
      ...frozenAttestation,
      signature: `0x${'00'.repeat(65)}`,
    }),
    /signature is invalid/
  );
});
