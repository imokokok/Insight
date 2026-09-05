/**
 * Tests for the Execution Receipt issuer. The service is the bridge between a
 * pre-trade attestation and a signed execution receipt: it resolves RPC, collects
 * on-chain facts, and signs. These tests pin the orchestration's honest paths —
 * unsupported chains are errors (never guessed endpoints), collection failures
 * propagate unchanged, and a faithful fill signs FAITHFUL while a drifted one
 * signs DEVIATED.
 */

import type {
  RpcClientWithFallback,
  RpcTransactionReceipt,
} from '@/lib/oracles/utils/rpcClientWithFallback';

import { TRANSFER_TOPIC } from '../events';
import { issueExecutionReceipt } from '../executionReceiptService';

// Isolate signing from the ambient attester key. The receipt unit tests delete
// ATTESTATION_SIGNER_PRIVATE_KEY in a shared jest worker, which poisons the
// cached getAttesterAccount for the process; mocking signExecutionReceipt (and
// keeping the REAL buildExecutionMessage, so the verdict is still derived from
// the evidence) keeps this suite hermetic. The derivation logic itself is
// covered end-to-end by executionReceipt.test.ts.
// Mock only the signing step, keeping the REAL buildExecutionMessage so the
// verdict is still derived from the evidence. A plain async function (not
// jest.fn) is used on purpose: the project's jest config sets `resetMocks:
// true`, which would otherwise wipe a jest.fn implementation between tests and
// make signExecutionReceipt return undefined → SIGNING_UNAVAILABLE. The real
// signing path is already covered by executionReceipt.test.ts.
jest.mock('@/lib/attestations/executionReceipt', () => {
  const actual = jest.requireActual('@/lib/attestations/executionReceipt');
  return {
    ...actual,
    signExecutionReceipt: async (input: unknown) => {
      const message = await actual.buildExecutionMessage(input);
      return {
        uid: '0xtest',
        schemaVersion: 1,
        attester: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        attesterLabel: 'test',
        signedAt: new Date().toISOString(),
        validForSeconds: 600,
        validUntil: message.validUntil,
        signature: '0x' + 'ab'.repeat(65),
        verifyUrl: 'http://localhost:3000',
        data: message,
        eip712: {
          domain: actual.EXECUTION_DOMAIN,
          types: actual.EXECUTION_TYPES,
          primaryType: actual.EXECUTION_PRIMARY_TYPE,
        },
      };
    },
  };
});

// The binding resolver is exercised with real signatures in its own suite.
// Here it is stubbed to a VERIFIED binding that echoes the caller's values, so
// these tests stay focused on the orchestration: RPC resolution, on-chain
// collection, and the verdict the evidence produces.
jest.mock('../preTradeBinding', () => {
  const actual = jest.requireActual('../preTradeBinding');
  return {
    ...actual,
    resolvePreTradeBinding: async (params: {
      selfReported: Record<string, unknown>;
    }): Promise<unknown> => ({
      ok: true,
      binding: {
        ...params.selfReported,
        action: params.selfReported.action ?? 'SWAP',
        bindingMode: 'VERIFIED',
        preTradeExpired: false,
      },
    }),
  };
});

const TAKER = '0x1111111111111111111111111111111111111111' as const;
const SRC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as const;
const DST = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' as const;
// Valid hex router/aggregator address — viem refuses to decode an indexed
// address topic with non-hex chars, so 0xrouter… must not be used in fixtures.
const ROUTER = '0x2222222222222222222222222222222222222222' as const;

function transferLog(token: `0x${string}`, from: string, to: string, value: bigint) {
  // Build the Transfer log by hand (viem's encodeEventLog is ESM-unfriendly
  // under jest). The collector still decodes it with the real decodeEventLog.
  const padAddr = (a: string) => '0x' + a.slice(2).padStart(64, '0');
  const padUint = (v: bigint) => '0x' + v.toString(16).padStart(64, '0');
  return {
    address: token,
    topics: [TRANSFER_TOPIC, padAddr(from) as `0x${string}`, padAddr(to) as `0x${string}`],
    data: padUint(value) as `0x${string}`,
  };
}

function swapReceipt(
  srcValue: bigint,
  dstValue: bigint,
  status: '0x1' | '0x0' = '0x1'
): RpcTransactionReceipt {
  return {
    transactionHash: '0xabc',
    transactionIndex: '0x0',
    blockHash: '0xblock',
    blockNumber: '0x10',
    from: TAKER,
    to: '0xdead' as `0x${string}`,
    cumulativeGasUsed: '0x1',
    gasUsed: '0x5208',
    effectiveGasPrice: '0x3b9aca00',
    status,
    type: '0x2',
    contractAddress: null,
    logs: [transferLog(SRC, TAKER, ROUTER, srcValue), transferLog(DST, ROUTER, TAKER, dstValue)],
  };
}

function fakeClient(
  receipt: RpcTransactionReceipt | null,
  block = { timestamp: '0x' + (1_700_000_000).toString(16) }
): RpcClientWithFallback {
  return {
    getTransactionReceipt: jest.fn(async () => receipt),
    getBlockByNumber: jest.fn(async () => block),
    // decimals() returns a 32-byte word; stub it as such (parseDecimalsResult
    // rejects short results). src=6dp, dst=18dp.
    ethCall: jest.fn(async (_k, _e, token) => {
      const d = token.toLowerCase() === SRC ? 6 : 18;
      return ('0x' + d.toString(16).padStart(64, '0')) as `0x${string}`;
    }),
  } as unknown as RpcClientWithFallback;
}

const baseArgs = {
  preTradeUid: ('0x' + '11'.repeat(32)) as `0x${string}`,
  requestHash: ('0x' + '22'.repeat(32)) as `0x${string}`,
  sourceAssetId: `eip155:1/erc20:${SRC}`,
  destinationAssetId: `eip155:1/erc20:${DST}`,
  subjectChainId: 1,
  settlementChainId: 1,
  participantCount: 4,
  sourceGroupCount: 3,
  preTradeSignedAt: 1_700_000_000,
  quotedPrice: 0.0004,
  txHash: '0xabc' as `0x${string}`,
  taker: TAKER,
};

describe('issueExecutionReceipt', () => {
  it('fails closed when subject and settlement chains differ', async () => {
    const result = await issueExecutionReceipt({
      ...baseArgs,
      settlementChainId: 42161,
      client: fakeClient(null),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('UNSUPPORTED_CROSS_CHAIN');
  });

  it('rejects a post-settlement custom policy on a VERIFIED binding', async () => {
    const result = await issueExecutionReceipt({
      ...baseArgs,
      maxSlippageBps: 500,
      client: fakeClient(swapReceipt(1000n * 10n ** 6n, 4n * 10n ** 17n)),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('UNCOMMITTED_EXECUTION_POLICY');
  });

  it('rejects an unsupported chain with a clean error, never a guessed endpoint', async () => {
    const result = await issueExecutionReceipt({
      ...baseArgs,
      subjectChainId: 999999,
      settlementChainId: 999999,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('UNSUPPORTED_CHAIN');
  });

  it('propagates NOT_FOUND when the transaction is unknown to the node', async () => {
    const result = await issueExecutionReceipt({ ...baseArgs, client: fakeClient(null) });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NOT_FOUND');
  });

  it('signs FAITHFUL when the fill lands inside the signed slippage bound', async () => {
    // 1000 USDC -> 0.4 WETH => executed price 0.0004, equals quoted => 0 bps drift.
    const result = await issueExecutionReceipt({
      ...baseArgs,
      client: fakeClient(swapReceipt(1000n * 10n ** 6n, 4n * 10n ** 17n)),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.receipt.data.priceExecutionStatus).toBe('FAITHFUL');
    expect(result.receipt.data.preTradeUid).toBe(baseArgs.preTradeUid);
    expect(result.receipt.data.slippageSatisfied).toBe(true);
  });

  it('signs DEVIATED when the fill drifts past the quoted price', async () => {
    // Same 1000 USDC in, but only 0.39 WETH out => executed 0.00039 vs quoted 0.0004
    // => -2.5% drift = -250 bps, well outside the 50 bps bound.
    const result = await issueExecutionReceipt({
      ...baseArgs,
      maxSlippageBps: 50,
      client: fakeClient(swapReceipt(1000n * 10n ** 6n, 39n * 10n ** 16n)),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.receipt.data.priceExecutionStatus).toBe('DEVIATED');
    expect(result.receipt.data.priceDeltaBps).toBeLessThan(0);
  });

  it('signs NOT_EXECUTED for a reverted transaction', async () => {
    const result = await issueExecutionReceipt({
      ...baseArgs,
      client: fakeClient(swapReceipt(0n, 0n, '0x0')),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.receipt.data.priceExecutionStatus).toBe('NOT_EXECUTED');
  });

  it('refuses FAITHFUL when the pre-trade gate post-dates the fill', async () => {
    // The post-hoc selection hole: execute first, then obtain a gate that
    // flatters the fill. The gate timestamp is signed into the receipt, so the
    // ordering violation stays visible to any holder.
    const result = await issueExecutionReceipt({
      ...baseArgs,
      preTradeSignedAt: 1_700_000_600, // 600s AFTER the block timestamp
      client: fakeClient(swapReceipt(1000n * 10n ** 6n, 4n * 10n ** 17n)),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // The fill itself was clean — it just cannot be graded against a gate that
    // did not exist yet.
    expect(result.receipt.data.slippageSatisfied).toBe(true);
    expect(result.receipt.data.preTradeSignedAt).toBe(1_700_000_600);
    expect(result.receipt.data.priceExecutionStatus).toBe('UNDETERMINED');
  });
});
