import assert from 'node:assert/strict';
import test from 'node:test';

import {
  encodeFunctionData,
  encodeFunctionResult,
  hashTypedData,
  keccak256,
  toBytes,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { verifyDecisionInputAssessment, verifyDecisionInputPair } from '../src/decision-input';
import { exportReviewAttachments, InsightGuard } from '../src/guard';
import { V3_SINGLE_SWAP_ABI, type SwapRiskReader } from '../src/swap-transaction-risk';

import type {
  DecisionInputAssessment,
  DecisionInputTrust,
  PreTradeRequest,
  PreTradeResult,
} from '../src/types.ts';

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

async function signedPreTrade(
  source: boolean,
  now: number,
  tradeAmountUsd = 100
): Promise<PreTradeResult> {
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
    tradeAmountUsd: BigInt(tradeAmountUsd),
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
  const attestation = {
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
  };
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
    attestation,
  } as unknown as PreTradeResult;
}

async function signedDecisionInput(
  asset: 'AAA' | 'BBB',
  linkedPreTradeUid: string,
  now: number,
  tradeAmountUsd = 100,
  staging = false
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
    tradeAmountUsd,
    evaluatedAt: new Date((now - 5) * 1000).toISOString(),
    operationRouteQuote: null,
    quoteInputHash: `0x${'4'.repeat(64)}`,
    ...(staging ? { evidenceUse: 'staging' as const } : {}),
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
  const verifyUrl = 'https://oracleinsight.xyz/api/v1/safety/decision-input/verify?uid=test';
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

function preTradeRequest(
  asset: 'AAA' | 'BBB',
  now: number,
  tradeAmountUsd = 100
): PreTradeRequest & { decisionInput: NonNullable<PreTradeRequest['decisionInput']> } {
  return {
    asset,
    destinationAsset: asset === 'AAA' ? 'BBB' : 'AAA',
    chainId: 1,
    action: 'swap',
    tradeAmountUsd,
    decisionInput: {
      decisionPriceUsd: 1,
      quotePriceUsd: 1.0001,
      quoteObservedAt: new Date((now - 10) * 1000).toISOString(),
      maxReferenceDeviationBps: policy.maxReferenceDeviationBps,
      maxSlippageBps: policy.maxSlippageBps,
      maxQuoteAgeSeconds: policy.maxQuoteAgeSeconds,
    },
  };
}

test('verifies signed Decision Input pair against trusted policy, assets and signed pre-trade scopes', async () => {
  const now = Math.floor(Date.now() / 1000);
  const sourceRequest = preTradeRequest('AAA', now);
  const destinationRequest = preTradeRequest('BBB', now);
  const sourcePreTrade = await signedPreTrade(true, now);
  const destinationPreTrade = await signedPreTrade(false, now);
  sourcePreTrade.decisionInputAssessment = await signedDecisionInput(
    'AAA',
    sourcePreTrade.attestation!.uid,
    now
  );
  destinationPreTrade.decisionInputAssessment = await signedDecisionInput(
    'BBB',
    destinationPreTrade.attestation!.uid,
    now
  );

  const result = await verifyDecisionInputPair(
    sourcePreTrade,
    sourceRequest,
    destinationPreTrade,
    destinationRequest,
    trust,
    { now }
  );
  assert.equal(result.commitment.namespace, 'insight.decision-input-pair.v1');
  assert.match(result.commitment.digest, /^0x[0-9a-f]{64}$/);
});

test('rejects Decision Input tampering, mismatched request scope and stale signed evidence', async () => {
  const now = Math.floor(Date.now() / 1000);
  const sourceRequest = preTradeRequest('AAA', now);
  const destinationRequest = preTradeRequest('BBB', now);
  const sourcePreTrade = await signedPreTrade(true, now);
  const destinationPreTrade = await signedPreTrade(false, now);
  sourcePreTrade.decisionInputAssessment = await signedDecisionInput(
    'AAA',
    sourcePreTrade.attestation!.uid,
    now
  );
  destinationPreTrade.decisionInputAssessment = await signedDecisionInput(
    'BBB',
    destinationPreTrade.attestation!.uid,
    now
  );

  const tampered = structuredClone(sourcePreTrade);
  tampered.decisionInputAssessment!.prices.quotePriceUsd = 0.9;
  await assert.rejects(() =>
    verifyDecisionInputPair(
      tampered,
      sourceRequest,
      destinationPreTrade,
      destinationRequest,
      trust,
      { now }
    )
  );
  await assert.rejects(() =>
    verifyDecisionInputPair(
      sourcePreTrade,
      { ...sourceRequest, asset: 'BBB' },
      destinationPreTrade,
      destinationRequest,
      trust,
      { now }
    )
  );
  const expired = await verifyDecisionInputAssessment(
    sourcePreTrade.decisionInputAssessment,
    trust,
    { now: now + 298 }
  );
  assert.equal(expired.valid, false);
  assert.ok(['expired', 'quote_stale'].includes(expired.reason));
});

test('requires an explicit verifier opt-in for a correctly signed staging assessment', async () => {
  const now = Math.floor(Date.now() / 1000);
  const preTrade = await signedPreTrade(true, now);
  const stagingAssessment = await signedDecisionInput(
    'AAA',
    preTrade.attestation!.uid,
    now,
    100,
    true
  );

  const productionResult = await verifyDecisionInputAssessment(stagingAssessment, trust, { now });
  assert.equal(productionResult.valid, false);
  assert.equal(productionResult.reason, 'malformed');

  const stagingResult = await verifyDecisionInputAssessment(stagingAssessment, trust, {
    now,
    allowStagingEvidence: true,
  });
  assert.equal(stagingResult.valid, true);
  assert.equal(stagingResult.reason, 'verified');
});

test('strict V3 authorization binds signed inputs, exact calldata, pinned simulation and PriorSeal expiry', async (t) => {
  const now = Math.floor(Date.now() / 1000);
  t.mock.method(Date, 'now', () => now * 1000);
  const amount = 1_000_000;
  const source = preTradeRequest('AAA', now, amount);
  const destination = preTradeRequest('BBB', now, amount);
  const sourceResult = await signedPreTrade(true, now, amount);
  const destinationResult = await signedPreTrade(false, now, amount);
  sourceResult.decisionInputAssessment = await signedDecisionInput(
    'AAA',
    sourceResult.attestation!.uid,
    now,
    amount
  );
  destinationResult.decisionInputAssessment = await signedDecisionInput(
    'BBB',
    destinationResult.attestation!.uid,
    now,
    amount
  );
  const apiCalls: string[] = [];
  const guard = new InsightGuard({
    apiKey: 'test-key',
    fetch: async (input) => {
      const url = String(input);
      apiCalls.push(url);
      const asset = new URL(url).searchParams.get('asset');
      const data = asset === 'AAA' ? sourceResult : destinationResult;
      return new Response(
        JSON.stringify({ success: true, data, meta: { requestId: 'strict-v3-test' } }),
        {
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });
  const from = '0x3333333333333333333333333333333333333333' as Hex;
  const router = '0x4444444444444444444444444444444444444444' as Hex;
  const tokenOut = tokenB as Hex;
  const recipient = '0x6666666666666666666666666666666666666666' as Hex;
  const routerCode = '0x6001600155' as Hex;
  const routerCodeHash = keccak256(routerCode);
  const transaction = {
    chainId: 1,
    from,
    to: router,
    data: encodeFunctionData({
      abi: V3_SINGLE_SWAP_ABI,
      functionName: 'exactInputSingle',
      args: [
        {
          tokenIn: tokenA as Hex,
          tokenOut,
          fee: 500,
          recipient,
          deadline: BigInt(now + 120),
          amountIn: 1_000_000n,
          amountOutMinimum: 995_000n,
          sqrtPriceLimitX96: 0n,
        },
      ],
    }),
    nonce: 7n,
    value: 0n,
    sourceAmount: 1_000_000n,
  };
  const reader: SwapRiskReader = {
    getBlock: async () => ({
      number: 10n,
      timestamp: BigInt(now - 1),
      hash: `0x${'d'.repeat(64)}` as Hex,
    }),
    getBytecode: async () => routerCode,
    readContract: async () => 6,
    call: async () => ({
      data: encodeFunctionResult({
        abi: V3_SINGLE_SWAP_ABI,
        functionName: 'exactInputSingle',
        result: 997_000n,
      }),
    }),
  };
  let prepared: Record<string, unknown> | undefined;
  const priorSeal = {
    client: {
      prepareAuthorization: async (input: Record<string, unknown>) => {
        prepared = input;
        return {
          authorization: {
            ...input,
            schema: 'priorseal.authorization.v2',
            domain: 'priorseal/authorization/v2',
            authorizationId: 'strict-v3-auth',
            intentHash: `0x${'1'.repeat(64)}`,
            policyHash: `0x${'2'.repeat(64)}`,
          },
          typedData: {},
        };
      },
      acceptAuthorization: async (authorization: Record<string, unknown>) => ({
        authorization,
        acceptance: { status: 'ACCEPTED' },
      }),
    },
    principal: { type: 'user' as const, id: 'strict-v3-user', account: from },
    agentId: 'strict-v3-agent',
    authorizationNonce: `0x${'3'.repeat(64)}` as Hex,
    signAuthorization: async () => '0xabcd',
  };

  const result = await guard.authorizeTrustedV3Swap({
    source,
    destination,
    receipt: { settlementChainId: 1, maxSlippageBps: 50 },
    transaction,
    routerAddress: router,
    routerCodeHash,
    reader,
    priorSeal: priorSeal as never,
    decisionInputTrust: trust,
  });

  assert.equal(result.transactionRisk.status, 'ACCEPTABLE');
  assert.equal(result.transactionRisk.transaction?.calldata, transaction.data);
  assert.ok(result.transactionRisk.evidence?.decisionInputPair);
  assert.equal(
    result.priorSealAuthorization.authorization.expiresAt,
    result.transactionRisk.validUntil
  );
  assert.equal(apiCalls.length, 2);
  const commitments = (prepared?.intent as { contextCommitments: { namespace: string }[] })
    .contextCommitments;
  assert.deepEqual(
    commitments.map((commitment) => commitment.namespace),
    [
      'insight.decision-input-pair.v1',
      'insight.pretrade-pair.v1',
      'insight.swap-transaction-risk.v1',
    ]
  );

  const exported = exportReviewAttachments({
    assessment: { sourcePreTrade: sourceResult, destinationPreTrade: destinationResult },
    insightReceipt: { attestation: { schemaVersion: 5, uid: `0x${'5'.repeat(64)}` } },
    transactionRisk: result.transactionRisk,
  } as never);
  assert.deepEqual(
    exported.map(({ role, profile }) => [role, profile]),
    [
      ['insight.source', 'insight.pretrade.v3'],
      ['insight.destination', 'insight.pretrade.v3'],
      ['insight.execution', 'insight.execution.v5'],
      ['insight.decision-input.source', 'insight.decision-input.v1'],
      ['insight.decision-input.destination', 'insight.decision-input.v1'],
      ['insight.swap-transaction-risk', 'insight.swap-transaction-risk.v1'],
    ]
  );
  assert.deepEqual(JSON.parse(exported.at(-1)!.rawJson), result.transactionRisk);
});
