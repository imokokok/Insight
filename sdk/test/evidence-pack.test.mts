import assert from 'node:assert/strict';
import test from 'node:test';

import { hashTypedData, keccak256, toBytes } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import {
  EVIDENCE_PACK_SCHEMA_VERSION,
  computeEvidencePackManifest,
  verifyEvidencePack,
  withEvidencePackClientArtifacts,
} from '../src/evidence-pack';

import type { DecisionEvidencePack } from '../src/evidence-pack';
import type { DecisionInputAssessment, DecisionInputTrust, PreTradeResult } from '../src/types.ts';

const signer = privateKeyToAccount(`0x${'11'.repeat(32)}`);
const tokenA = '0x1111111111111111111111111111111111111111';
const tokenB = '0x2222222222222222222222222222222222222222';
const idA = `eip155:1/erc20:${tokenA}`;
const idB = `eip155:1/erc20:${tokenB}`;
const oracleDomain = { name: 'Insight Oracle Safety', version: '3', chainId: 1 } as const;
const oracleTypes = {
  OracleSafetyCheck: [
    { name: 'verdict', type: 'string' },
    { name: 'sourceAssetId', type: 'string' },
    { name: 'destinationAssetId', type: 'string' },
    { name: 'subjectChainId', type: 'uint256' },
    { name: 'action', type: 'string' },
    { name: 'tradeAmountUsd', type: 'uint256' },
    { name: 'consensusPrice', type: 'uint256' },
    { name: 'maxDeviationBps', type: 'uint256' },
    { name: 'manipulationRiskBps', type: 'uint256' },
    { name: 'participantCount', type: 'uint256' },
    { name: 'requiredParticipantCount', type: 'uint256' },
    { name: 'coverageStatus', type: 'string' },
    { name: 'independenceStatus', type: 'string' },
    { name: 'sourceGroupCount', type: 'uint256' },
    { name: 'crossProviderAgreementBps', type: 'uint256' },
    { name: 'maxStablecoinDepegBps', type: 'uint256' },
    { name: 'maxDataAgeSeconds', type: 'uint256' },
    { name: 'recommendedMaxPositionUsd', type: 'uint256' },
    { name: 'reasonCodesHash', type: 'bytes32' },
    { name: 'requestHash', type: 'bytes32' },
    { name: 'evaluationScope', type: 'string' },
    { name: 'evaluatedAssetIdsHash', type: 'bytes32' },
    { name: 'providerObservationsHash', type: 'bytes32' },
    { name: 'validUntil', type: 'uint256' },
    { name: 'checkedAt', type: 'uint256' },
    { name: 'schemaVersion', type: 'uint256' },
    { name: 'requiredSourceGroupCount', type: 'uint256' },
  ],
} as const;
const decisionDomain = {
  name: 'Insight Decision Input Assessment',
  version: '1',
  chainId: 1,
} as const;
const decisionTypes = {
  DecisionInputAssessment: [
    { name: 'assessmentHash', type: 'bytes32' },
    { name: 'linkedPreTradeUid', type: 'bytes32' },
    { name: 'verifyUrlHash', type: 'bytes32' },
    { name: 'issuedAt', type: 'uint256' },
    { name: 'validUntil', type: 'uint256' },
    { name: 'schemaVersion', type: 'uint256' },
  ],
} as const;

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(',')}}`;
}

const policy = {
  policyId: 'consumer-swap-policy',
  version: '1',
  assetIds: { AAA: idA, BBB: idB },
  maxReferenceDeviationBps: 100,
  maxSlippageBps: 50,
  maxQuoteAgeSeconds: 90,
};
const trust: DecisionInputTrust = {
  policy,
  keyRegistry: {
    public_keys: [
      {
        key_id: 'decision-input-test-key',
        public_key: signer.address,
        revoked: false,
        role: 'attester',
        validFrom: new Date(0).toISOString(),
        validUntil: null,
      },
    ],
  },
};

async function signedPreTrade(source: boolean, now: number): Promise<PreTradeResult> {
  const sourceAssetId = source ? idA : idB;
  const destinationAssetId = source ? idB : idA;
  const checkedAt = now - 5;
  const validUntil = checkedAt + 900;
  const message = {
    verdict: 'PASS',
    sourceAssetId,
    destinationAssetId,
    subjectChainId: 1n,
    action: 'swap',
    tradeAmountUsd: 100n,
    consensusPrice: 100_000_000n,
    maxDeviationBps: 100n,
    manipulationRiskBps: 0n,
    participantCount: 3n,
    requiredParticipantCount: 3n,
    coverageStatus: 'SUFFICIENT',
    independenceStatus: 'ASSESSED',
    sourceGroupCount: 2n,
    crossProviderAgreementBps: 9_900n,
    maxStablecoinDepegBps: 0n,
    maxDataAgeSeconds: 20n,
    recommendedMaxPositionUsd: 1_000_000n,
    reasonCodesHash: `0x${'1'.repeat(64)}` as `0x${string}`,
    requestHash: `0x${source ? 'a' : 'b'}${'1'.repeat(63)}` as `0x${string}`,
    evaluationScope: 'SOURCE_ASSET_ONLY',
    evaluatedAssetIdsHash: `0x${'2'.repeat(64)}` as `0x${string}`,
    providerObservationsHash: `0x${'3'.repeat(64)}` as `0x${string}`,
    validUntil: BigInt(validUntil),
    checkedAt: BigInt(checkedAt),
    schemaVersion: 3n,
    requiredSourceGroupCount: 2n,
  };
  const typedData = {
    domain: oracleDomain,
    types: oracleTypes,
    primaryType: 'OracleSafetyCheck' as const,
    message,
  };
  const uid = hashTypedData(typedData);
  const signature = await signer.signTypedData(typedData);
  const data = Object.fromEntries(
    Object.entries(message).map(([key, value]) => [
      key,
      typeof value === 'bigint' ? Number(value) : value,
    ])
  );
  return {
    verdict: 'PASS',
    consensusPrice: 1,
    maxDeviationPct: 1,
    crossProviderAgreement: 0.99,
    recommendedMaxPositionUsd: 1_000_000,
    participantCount: 3,
    warnings: [],
    contributingFactors: [],
    evaluatedAt: new Date(checkedAt * 1000).toISOString(),
    attestation: {
      uid,
      schemaVersion: 3,
      attester: signer.address,
      signature,
      signedAt: new Date(checkedAt * 1000).toISOString(),
      validUntil,
      validForSeconds: validUntil - checkedAt,
      verifyUrl: 'https://oracleinsight.xyz/api/v1/safety/attestation/verify',
      eip712: { domain: oracleDomain, types: oracleTypes, primaryType: 'OracleSafetyCheck' },
      data,
    },
  } as unknown as PreTradeResult;
}

async function signedDecisionInput(
  asset: 'AAA' | 'BBB',
  linkedPreTradeUid: string,
  now: number
): Promise<DecisionInputAssessment> {
  const issuedAt = now - 2;
  const validUntil = issuedAt + 300;
  const quoteObservedAt = new Date((now - 10) * 1000).toISOString();
  const unsigned = {
    schemaVersion: 1 as const,
    status: 'SUFFICIENT' as const,
    eligibleToProceed: true,
    asset,
    chainId: 1,
    action: 'swap' as const,
    tradeAmountUsd: 100,
    evaluatedAt: new Date((now - 5) * 1000).toISOString(),
    operationRouteQuote: null,
    quoteInputHash: `0x${'4'.repeat(64)}`,
    policy: {
      maxReferenceDeviationBps: policy.maxReferenceDeviationBps,
      maxSlippageBps: policy.maxSlippageBps,
      maxQuoteAgeSeconds: policy.maxQuoteAgeSeconds,
    },
    prices: {
      decisionPriceUsd: 1,
      quotePriceUsd: 1.0001,
      quoteObservedAt,
      quoteAgeSeconds: 5,
      quoteDeviationBps: 1,
    },
    evidence: { source: 'signed-test-fixture' },
    reasons: [],
    caveats: [],
  };
  const assessmentHash = keccak256(toBytes(canonicalJson(unsigned)));
  const verifyUrl = 'https://oracleinsight.xyz/api/v1/safety/decision-input/verify';
  const verifyUrlHash = keccak256(toBytes(verifyUrl));
  const message = {
    assessmentHash,
    linkedPreTradeUid: linkedPreTradeUid as `0x${string}`,
    verifyUrlHash,
    issuedAt: BigInt(issuedAt),
    validUntil: BigInt(validUntil),
    schemaVersion: 1n,
  };
  const typedData = {
    domain: decisionDomain,
    types: decisionTypes,
    primaryType: 'DecisionInputAssessment' as const,
    message,
  };
  const proof = {
    type: 'DecisionInputAssessment' as const,
    schemaVersion: 1 as const,
    uid: hashTypedData(typedData),
    attester: signer.address,
    attesterLabel: 'Insight Decision Input Assessment attester',
    signedAt: new Date(issuedAt * 1000).toISOString(),
    validForSeconds: 300 as const,
    signature: await signer.signTypedData(typedData),
    verifyUrl,
    data: { ...message, issuedAt, validUntil, schemaVersion: 1 },
    eip712: {
      domain: decisionDomain,
      types: decisionTypes,
      primaryType: 'DecisionInputAssessment',
    },
  };
  return { ...unsigned, attestation: proof } as DecisionInputAssessment;
}

const GATE = {
  schemaVersion: 1,
  status: 'SUFFICIENT',
  evaluatedAt: '2026-10-16T12:00:00Z',
  sourceAssessmentStatus: 'SUFFICIENT',
  destinationAssessmentStatus: 'SUFFICIENT',
  routeQuote: {
    price: 1.0002,
    observedAt: '2026-10-16T12:00:00Z',
    ageSeconds: 3,
    oracleCrossRate: 1.00019,
    deviationBps: 0.1,
    callerReportedPrice: 1.0001,
    callerReportedAt: '2026-10-16T11:59:57Z',
    callerDeviationBps: 0.5,
    maxDeviationBps: 50,
    source: 'uniswap-v3-quoter-v2',
    blockNumber: '23000000',
    blockHash: `0x${'aa'.repeat(32)}`,
  },
} as const;

interface Fixtures {
  now: number;
  sourceUid: string;
  destinationUid: string;
  sourceEnvelope: unknown;
  destinationEnvelope: unknown;
  pack: DecisionEvidencePack;
}

async function buildFixtures(): Promise<Fixtures> {
  const now = Math.floor(Date.now() / 1000);
  const source = await signedPreTrade(true, now);
  const destination = await signedPreTrade(false, now);
  const sourceUid = source.attestation!.uid;
  const destinationUid = destination.attestation!.uid;
  const sourceAssessment = await signedDecisionInput('AAA', sourceUid, now);
  const destinationAssessment = await signedDecisionInput('BBB', destinationUid, now);

  const preTrade = [
    {
      role: 'source' as const,
      attestationUid: sourceUid,
      attester: signer.address,
      signed: true,
      verdict: 'PASS',
      asset: 'AAA',
      chainId: 1,
      action: 'swap',
      tradeAmountUsd: 100,
      createdAt: new Date((now - 6) * 1000).toISOString(),
      assessment: sourceAssessment as unknown as Record<string, unknown>,
    },
    {
      role: 'destination' as const,
      attestationUid: destinationUid,
      attester: signer.address,
      signed: true,
      verdict: 'PASS',
      asset: 'BBB',
      chainId: 1,
      action: 'swap',
      tradeAmountUsd: 100,
      createdAt: new Date((now - 4) * 1000).toISOString(),
      assessment: destinationAssessment as unknown as Record<string, unknown>,
    },
  ];
  const executionReceipt = {
    receiptUid: `0x${'cc'.repeat(32)}`,
    attested: true,
    attester: signer.address,
    executionStatus: 'FAITHFUL',
    fillStatus: 'FULL',
    txHash: `0x${'dd'.repeat(32)}`,
    blockNumber: 23000001,
    executedAt: new Date((now - 1) * 1000).toISOString(),
    source: 'mcp',
    environment: 'production',
    createdAt: new Date((now - 1) * 1000).toISOString(),
    payload: {
      data: {
        preTradeUid: sourceUid,
        destinationPreTradeUid: destinationUid,
      },
    },
  };

  const base = {
    preTrade,
    inputGate: GATE,
    inputGateConsistent: true,
    executionReceipt,
    clientArtifacts: {},
  };
  const manifest = computeEvidencePackManifest({ ...base, generatedAt: '2026-10-16T12:00:05Z' });
  const pack: DecisionEvidencePack = { ...base, manifest };

  return {
    now,
    sourceUid,
    destinationUid,
    sourceEnvelope: source.attestation,
    destinationEnvelope: destination.attestation,
    pack,
  };
}

test('verifies a server-assembled pack without client artifacts', async () => {
  const { pack, now } = await buildFixtures();
  const result = await verifyEvidencePack(pack, trust, { now });
  assert.equal(result.manifestValid, true);
  assert.equal(result.integrityValid, true);
  assert.equal(result.reason, 'verified');
  assert.equal(result.completeness.preTradeEntries, 2);
  assert.equal(result.completeness.signedAssessments, 2);
  assert.equal(result.completeness.hasSignedReceiptPayload, true);
  assert.equal(result.linkage.receiptMatchesAnchors, true);
  for (const check of result.assessments) {
    assert.equal(check.signatureValid, true, check.reason);
    assert.equal(check.linkedPreTradeUidMatchesRow, true);
  }
});

test('verifies client envelopes merged through withEvidencePackClientArtifacts', async () => {
  const { pack, now, sourceEnvelope, destinationEnvelope } = await buildFixtures();
  const merged = withEvidencePackClientArtifacts(pack, {
    preTradeAttestations: { source: sourceEnvelope, destination: destinationEnvelope },
    priorSeal: { authorizationId: 'ps-auth-1', status: 'observed' },
  });
  assert.notEqual(merged.manifest.packHash, pack.manifest.packHash);

  const result = await verifyEvidencePack(merged, trust, { now });
  assert.equal(result.manifestValid, true);
  assert.equal(result.integrityValid, true);
  assert.equal(result.completeness.hasClientEnvelopes, true);
  assert.equal(result.completeness.hasPriorSeal, true);
  assert.equal(result.clientPreTradeEnvelopes?.length, 2);
  for (const envelope of result.clientPreTradeEnvelopes ?? []) {
    assert.equal(envelope.valid, true, envelope.reason ?? 'envelope invalid');
    assert.equal(envelope.uidMatchesAnchor, true);
  }
  assert.equal(result.linkage.clientEnvelopeUidsMatchAnchors, true);

  // The original (un-merged) manifest no longer matches the merged sections.
  const stale = await verifyEvidencePack({ ...merged, manifest: pack.manifest }, trust, { now });
  assert.equal(stale.manifestValid, false);
  assert.equal(stale.reason, 'manifest_mismatch');
});

test('detects assessment tampering that was re-committed into the manifest', async () => {
  const { pack, now } = await buildFixtures();
  const tampered = structuredClone(pack);
  const assessment = tampered.preTrade[0].assessment as Record<string, unknown>;
  // Tamper a field the envelope and price-math checks do not re-derive, so the
  // failure surfaces as a digest mismatch (the signed bytes changed).
  const evidence = structuredClone(assessment.evidence) as Record<string, unknown>;
  evidence.source = 'tampered-fixture';
  assessment.evidence = evidence;
  tampered.manifest = computeEvidencePackManifest({
    ...tampered,
    generatedAt: pack.manifest.generatedAt,
  });

  const result = await verifyEvidencePack(tampered, trust, { now });
  assert.equal(result.manifestValid, true, 'a re-signed manifest is internally consistent');
  assert.equal(result.integrityValid, false);
  const source = result.assessments.find((entry) => entry.role === 'source');
  assert.equal(source?.signatureValid, false);
  assert.equal(source?.reason, 'digest_mismatch');
});

test('rejects a pack whose manifest was not recomputed after tampering', async () => {
  const { pack, now } = await buildFixtures();
  const tampered = structuredClone(pack);
  (tampered.executionReceipt!.payload!.data as Record<string, unknown>).preTradeUid =
    `0x${'ef'.repeat(32)}`;

  const result = await verifyEvidencePack(tampered, trust, { now });
  assert.equal(result.manifestValid, false);
  assert.equal(result.integrityValid, false);
  assert.equal(result.reason, 'manifest_mismatch');
});

test('reports schema and pack-type guards', async () => {
  const { pack, now } = await buildFixtures();
  const wrongVersion = structuredClone(pack) as DecisionEvidencePack;
  wrongVersion.manifest.schemaVersion = 99;
  const result = await verifyEvidencePack(wrongVersion, trust, { now });
  assert.equal(result.manifestValid, false);
  assert.equal(EVIDENCE_PACK_SCHEMA_VERSION, 1);
});
