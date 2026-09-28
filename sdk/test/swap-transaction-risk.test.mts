import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createPublicClient,
  encodeFunctionData,
  encodeFunctionResult,
  http,
  keccak256,
  type Hex,
} from 'viem';

import { InsightGuard } from '../dist/guard.js';
import {
  V3_SINGLE_SWAP_ABI,
  assessV3SwapTransaction,
  v3SwapRiskCommitment,
  type SwapRiskReader,
} from '../dist/swap-transaction-risk.js';

import type { PriorSealFlowOptions, SwapAssessment } from '../src/types.ts';

const now = 1_800_000_000;
const from = '0x1111111111111111111111111111111111111111';
const router = '0x2222222222222222222222222222222222222222';
const tokenIn = '0x3333333333333333333333333333333333333333';
const tokenOut = '0x4444444444444444444444444444444444444444';
const recipient = '0x5555555555555555555555555555555555555555';
const routerCode = '0x6001600155' as Hex;
const routerCodeHash = keccak256(routerCode);
const call = (minOut = 995_000n, receiving: Hex = recipient) =>
  encodeFunctionData({
    abi: V3_SINGLE_SWAP_ABI,
    functionName: 'exactInputSingle',
    args: [
      {
        tokenIn,
        tokenOut,
        fee: 500,
        recipient: receiving,
        deadline: BigInt(now + 120),
        amountIn: 1_000_000n,
        amountOutMinimum: minOut,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });
const transaction = {
  chainId: 1,
  from,
  to: router,
  data: call(),
  nonce: 3n,
  value: 0n,
  sourceAmount: 1_000_000n,
};
const assessment = {
  schema: 'insight.swap-assessment.v1',
  recommendation: 'RECOMMENDED',
  reasonCodes: [],
  sourcePreTrade: {
    attestation: {
      schemaVersion: 3,
      uid: `0x${'a'.repeat(64)}`,
      signature: '0xabcd',
      data: {
        sourceAssetId: `eip155:1/erc20:${tokenIn}`,
        destinationAssetId: `eip155:1/erc20:${tokenOut}`,
        consensusPrice: 100_000_000,
      },
    },
  },
  destinationPreTrade: {
    attestation: {
      schemaVersion: 3,
      uid: `0x${'b'.repeat(64)}`,
      signature: '0xabcd',
      data: {
        sourceAssetId: `eip155:1/erc20:${tokenOut}`,
        destinationAssetId: `eip155:1/erc20:${tokenIn}`,
        consensusPrice: 100_000_000,
      },
    },
  },
  contextCommitment: {
    namespace: 'insight.pretrade-pair.v1',
    algorithm: 'keccak256',
    digest: `0x${'c'.repeat(64)}`,
  },
  constraints: { maxSlippageBps: 50, recommendedMaxPositionUsd: 1_000_000, validUntil: now + 90 },
} as unknown as SwapAssessment;

function reader(output = 997_000n, overrides: Partial<SwapRiskReader> = {}): SwapRiskReader {
  return {
    getBlock: async () => ({
      number: 10n,
      timestamp: BigInt(now - 1),
      hash: `0x${'d'.repeat(64)}`,
    }),
    getBytecode: async () => routerCode,
    readContract: async () => 6,
    call: async () => ({
      data: encodeFunctionResult({
        abi: V3_SINGLE_SWAP_ABI,
        functionName: 'exactInputSingle',
        result: output,
      }),
    }),
    ...overrides,
  } as SwapRiskReader;
}
const request = (overrides: Record<string, unknown> = {}) => ({
  assessment,
  transaction,
  routerCodeHash,
  reader: reader(),
  now: () => now,
  ...overrides,
});

test('the reader contract accepts a regular viem PublicClient', () => {
  const publicClient: SwapRiskReader = createPublicClient({
    transport: http('http://127.0.0.1:8545'),
  });
  assert.equal(typeof publicClient.call, 'function');
});

test('assesses exact swap amount, route, oracle price and simulated output at a pinned block', async () => {
  const result = await assessV3SwapTransaction(request());
  assert.equal(result.status, 'ACCEPTABLE');
  assert.equal(result.evidence?.oracleExpectedAmountOut, '1000000');
  assert.equal(result.evidence?.simulatedAmountOut, '997000');
  assert.equal(result.transaction?.recipient, recipient);
  assert.equal(result.validUntil, now + 90);
  assert.match(v3SwapRiskCommitment(result).digest, /^0x[0-9a-f]{64}$/);
});

test('rejects an adverse quote, loose minimum output and changed receiver', async () => {
  const adverse = await assessV3SwapTransaction(request({ reader: reader(970_000n) }));
  assert.equal(adverse.status, 'RISK_REJECTED');
  assert.ok(adverse.reasonCodes.includes('QUOTE_ORACLE_DEVIATION_EXCEEDED'));
  const loose = await assessV3SwapTransaction(
    request({ transaction: { ...transaction, data: call(900_000n) } })
  );
  assert.equal(loose.status, 'RISK_REJECTED');
  assert.ok(loose.reasonCodes.includes('MINIMUM_OUTPUT_TOO_LOW'));
  const changed = await assessV3SwapTransaction(
    request({ transaction: { ...transaction, data: call(995_000n, from) } })
  );
  assert.equal(changed.status, 'ACCEPTABLE');
  assert.notEqual(changed.transaction?.recipient, recipient);
  assert.notEqual(
    v3SwapRiskCommitment(changed).digest,
    v3SwapRiskCommitment(await assessV3SwapTransaction(request())).digest
  );
});

test('reports missing or stale evidence without treating it as safe', async () => {
  const missing = await assessV3SwapTransaction(
    request({
      reader: reader(997_000n, {
        call: async () => {
          throw new Error('RPC unavailable');
        },
      }),
    })
  );
  assert.equal(missing.status, 'UNASSESSABLE');
  assert.deepEqual(missing.reasonCodes, ['SIMULATION_UNAVAILABLE']);
  const code = await assessV3SwapTransaction(
    request({ reader: reader(997_000n, { getBytecode: async () => '0x1234' }) })
  );
  assert.deepEqual(code.reasonCodes, ['ROUTER_CODE_UNVERIFIED']);
  const stale = await assessV3SwapTransaction(
    request({
      reader: reader(997_000n, {
        getBlock: async () => ({
          number: 10n,
          timestamp: BigInt(now - 60),
          hash: `0x${'d'.repeat(64)}` as Hex,
        }),
      }),
    })
  );
  assert.deepEqual(stale.reasonCodes, ['BLOCK_STALE']);
  const expired = await assessV3SwapTransaction(request({ now: () => now + 91 }));
  assert.deepEqual(expired.reasonCodes, ['QUOTE_OR_ASSESSMENT_EXPIRED']);
  assert.throws(() => v3SwapRiskCommitment(missing), /NOT_ACCEPTABLE/);
});

test('requires both oracle legs to bind the actual on-chain assets', async () => {
  const wrong = structuredClone(assessment);
  wrong.sourcePreTrade!.attestation!.data.sourceAssetId = `eip155:1/erc20:${recipient}`;
  const report = await assessV3SwapTransaction(request({ assessment: wrong }));
  assert.equal(report.status, 'UNASSESSABLE');
  assert.deepEqual(report.reasonCodes, ['ORACLE_PAIR_SCOPE_UNAVAILABLE']);
});

test('Guard fetches both oracle legs, simulates the call and binds risk review into PriorSeal authorization', async (t) => {
  t.mock.method(Date, 'now', () => now * 1000);
  const apiCalls: string[] = [];
  const attestation = (source: boolean) => ({
    uid: `0x${(source ? 'a' : 'b').repeat(64)}`,
    schemaVersion: 3,
    signature: '0xabcd',
    attester: '0x0000000000000000000000000000000000000003',
    data: {
      verdict: 'PASS',
      sourceAssetId: `eip155:1/erc20:${source ? tokenIn : tokenOut}`,
      destinationAssetId: `eip155:1/erc20:${source ? tokenOut : tokenIn}`,
      subjectChainId: 1,
      action: 'swap',
      tradeAmountUsd: 100_000_000,
      participantCount: 3,
      sourceGroupCount: 2,
      requestHash: `0x${'a'.repeat(64)}`,
      consensusPrice: 100_000_000,
      checkedAt: now - 1,
      validUntil: now + 90,
      maxDataAgeSeconds: 20,
    },
  });
  const guard = new InsightGuard({
    apiKey: 'test',
    fetch: async (url) => {
      apiCalls.push(String(url));
      const source = new URL(String(url)).searchParams.get('asset') === 'AAA';
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            verdict: 'PASS',
            consensusPrice: 1,
            maxDeviationPct: 0.1,
            crossProviderAgreement: 0.99,
            recommendedMaxPositionUsd: 100_000,
            participantCount: 3,
            warnings: [],
            contributingFactors: [],
            evaluatedAt: new Date(now * 1000).toISOString(),
            attestation: attestation(source),
          },
          meta: { requestId: 'risk-test' },
        }),
        { headers: { 'content-type': 'application/json' } }
      );
    },
  });
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
            authorizationId: 'auth-1',
            intentHash: `0x${'1'.repeat(64)}`,
            policyHash: `0x${'0'.repeat(64)}`,
          },
          typedData: {},
        };
      },
      acceptAuthorization: async (authorization: Record<string, unknown>) => ({
        authorization,
        acceptance: { status: 'ACCEPTED' },
      }),
    },
    principal: { type: 'user' as const, id: 'user-1', account: from },
    agentId: 'agent-1',
    authorizationNonce: `0x${'2'.repeat(64)}` as Hex,
    signAuthorization: async () => '0xabcd',
  };
  const workflow = {
    source: {
      asset: 'AAA',
      destinationAsset: 'BBB',
      chainId: 1,
      action: 'swap' as const,
      tradeAmountUsd: 1,
    },
    destination: {
      asset: 'BBB',
      destinationAsset: 'AAA',
      chainId: 1,
      action: 'swap' as const,
      tradeAmountUsd: 1,
    },
    receipt: { settlementChainId: 1 },
    transaction,
    routerCodeHash,
    reader: reader(),
    priorSeal: priorSeal as unknown as PriorSealFlowOptions,
  };
  const result = await guard.authorizeAssessedV3Swap(workflow);
  assert.equal(result.transactionRisk.status, 'ACCEPTABLE');
  assert.equal(apiCalls.length, 2);
  const contexts = (prepared?.intent as { contextCommitments: { namespace: string }[] })
    .contextCommitments;
  assert.deepEqual(
    contexts.map((c) => c.namespace),
    ['insight.pretrade-pair.v1', 'insight.swap-transaction-risk.v1']
  );
});
