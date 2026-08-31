/**
 * Regression pins for the bugs that were silently breaking the closed loop.
 *
 * The fixes themselves landed in `9c6f89f9`, but two of them had no test behind
 * them: a fix you cannot see regress is a fix that will regress. This file pins
 * the two that were unguarded. The other three are pinned elsewhere:
 *
 *   #1 quotedPrice inversion  -> executionTrustLoop.integration.test.ts
 *      (a faithful fill must come back FAITHFUL, not DEVIATED)
 *   #2 priceDeltaBps as int256 -> same file (a -250bps fill must sign and verify)
 *   #5 chainMatch invariant   -> verifyExecutionPair.test.ts
 *      (cross-chain settlement is legal, so the check is pre-trade subject
 *       chain vs receipt subject chain, never vs settlementChainId)
 */

import {
  EXECUTION_SCHEMA_VERSION,
  EXECUTION_SCHEMA_VERSION_V2,
} from '@/lib/attestations/executionReceipt';
import { ExecutionVerifyBodySchema } from '@/lib/attestations/executionVerifyRequest';
import type {
  RpcClientWithFallback,
  RpcTransactionReceipt,
} from '@/lib/oracles/utils/rpcClientWithFallback';

import { TRANSFER_TOPIC } from '../events';
import { collectExecutionFacts } from '../executionCollector';

const TAKER = '0x1111111111111111111111111111111111111111' as const;
const SRC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as const; // USDC-like, 6dp
const DST = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' as const; // WETH-like, 18dp
const ROUTER = '0x2222222222222222222222222222222222222222' as const;
const THIRD_PARTY = '0x3333333333333333333333333333333333333333' as const;

const endpoints = ['https://example.invalid'];

function transferLog(token: `0x${string}`, from: string, to: string, value: bigint) {
  const padAddr = (a: string) => '0x' + a.slice(2).padStart(64, '0');
  const padUint = (v: bigint) => '0x' + v.toString(16).padStart(64, '0');
  return {
    address: token,
    topics: [TRANSFER_TOPIC, padAddr(from) as `0x${string}`, padAddr(to) as `0x${string}`],
    data: padUint(value) as `0x${string}`,
  };
}

function fakeClient(receipt: RpcTransactionReceipt): RpcClientWithFallback {
  return {
    getTransactionReceipt: jest.fn(async () => receipt),
    getBlockByNumber: jest.fn(async () => ({ timestamp: '0x' + (1_700_000_000).toString(16) })),
    // Real nodes return a padded 32-byte word; parseDecimalsResult rejects short
    // results, so the stub must match the wire format.
    ethCall: jest.fn(async (_k: string, _e: string[], token: `0x${string}`) => {
      const d = token.toLowerCase() === SRC ? 6 : 18;
      return ('0x' + d.toString(16).padStart(64, '0')) as `0x${string}`;
    }),
  } as unknown as RpcClientWithFallback;
}

describe('bug #3 — the verify endpoint must accept both published schema versions', () => {
  const base = {
    uid: '0x' + '11'.repeat(32),
    attester: '0x4444444444444444444444444444444444444444',
    signature: '0x' + '22'.repeat(65),
    data: { executionStatus: 'FAITHFUL' },
  };

  it('accepts a v1 receipt', () => {
    const parsed = ExecutionVerifyBodySchema.safeParse({
      attestation: { ...base, schemaVersion: EXECUTION_SCHEMA_VERSION },
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts a v2 receipt (the version issueExecutionReceipt emits)', () => {
    const parsed = ExecutionVerifyBodySchema.safeParse({
      attestation: { ...base, schemaVersion: EXECUTION_SCHEMA_VERSION_V2 },
    });
    expect(parsed.success).toBe(true);
  });

  it('passes through extra fields such as the informational eip712 block', () => {
    const parsed = ExecutionVerifyBodySchema.safeParse({
      attestation: {
        ...base,
        schemaVersion: EXECUTION_SCHEMA_VERSION_V2,
        eip712: { primaryType: 'ExecutionReceipt' },
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects an unknown schema version', () => {
    const parsed = ExecutionVerifyBodySchema.safeParse({
      attestation: { ...base, schemaVersion: 99 },
    });
    expect(parsed.success).toBe(false);
  });
});

describe('bug #4 — unattributable ERC-20 legs use a real enum member', () => {
  it('reports PRICE_NOT_ATTRIBUTED when no Transfer belongs to the taker', async () => {
    const receipt: RpcTransactionReceipt = {
      transactionHash: '0xdef',
      transactionIndex: '0x0',
      blockHash: '0xblock',
      blockNumber: '0x12',
      from: TAKER,
      to: '0xdead' as `0x${string}`,
      cumulativeGasUsed: '0x1',
      gasUsed: '0x5208',
      effectiveGasPrice: '0x3b9aca00',
      status: '0x1',
      type: '0x2',
      contractAddress: null,
      // Both legs are ERC-20 (so this is not the native-asset case), but every
      // Transfer belongs to someone else — nothing is attributable to the taker.
      logs: [
        transferLog(SRC, ROUTER, THIRD_PARTY, 1000n * 10n ** 6n),
        transferLog(DST, THIRD_PARTY, ROUTER, 4n * 10n ** 17n),
      ],
    };

    const result = await collectExecutionFacts({
      txHash: '0xdef' as `0x${string}`,
      chainId: 1,
      endpoints,
      sourceAssetId: `eip155:1/erc20:${SRC}`,
      destinationAssetId: `eip155:1/erc20:${DST}`,
      taker: TAKER,
      client: fakeClient(receipt),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.facts.sourceAmount).toBeNull();
    expect(result.facts.executedPrice).toBeNull();
    // The misspelled 'AMOUNT_NOT_ATTRIBUTED' used to be assigned here, which is
    // not a member of the union and made the reason meaningless to consumers.
    expect(result.facts.unavailableReason).toBe('PRICE_NOT_ATTRIBUTED');
    expect(['FILL_PRICE_UNAVAILABLE', 'NATIVE_ASSET_LEG', 'PRICE_NOT_ATTRIBUTED']).toContain(
      result.facts.unavailableReason
    );
  });
});
