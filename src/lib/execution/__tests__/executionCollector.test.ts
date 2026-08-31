/**
 * Tests for the execution collector. The collector is the honesty-critical half
 * of the feature: it turns raw chain evidence into the facts a receipt asserts,
 * and its rules (revert is a real outcome, native legs are unavailable, missing
 * decimals are never 18) are exactly where a confident-but-wrong receipt would
 * be born. These tests pin those rules.
 */

import type {
  RpcClientWithFallback,
  RpcTransactionReceipt,
} from '@/lib/oracles/utils/rpcClientWithFallback';

import { TRANSFER_TOPIC } from '../events';
import { collectExecutionFacts } from '../executionCollector';

const TAKER = '0x1111111111111111111111111111111111111111' as const;
const SRC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as const; // USDC-like (6dp)
const DST = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' as const; // WETH-like (18dp)
// Valid hex router/aggregator address. viem refuses to decode an indexed address
// topic containing non-hex characters, so a "readable" fake like 0xrouter… would
// make decodeEventLog throw in the test — real chain logs are always valid hex.
const ROUTER = '0x2222222222222222222222222222222222222222' as const;

function transferLog(token: `0x${string}`, from: string, to: string, value: bigint) {
  // Build the Transfer log by hand (viem's encodeEventLog is ESM-unfriendly under
  // jest). The collector still decodes it with the real decodeEventLog path.
  const padAddr = (a: string) => '0x' + a.slice(2).padStart(64, '0');
  const padUint = (v: bigint) => '0x' + v.toString(16).padStart(64, '0');
  return {
    address: token,
    topics: [TRANSFER_TOPIC, padAddr(from) as `0x${string}`, padAddr(to) as `0x${string}`],
    data: padUint(value) as `0x${string}`,
  };
}

function fakeClient(handlers: {
  receipt?: RpcTransactionReceipt | null;
  block?: { timestamp: string } | null;
  decimals?: string;
  throwReceipt?: boolean;
}): RpcClientWithFallback {
  return {
    getTransactionReceipt: jest.fn(async () => {
      if (handlers.throwReceipt) throw new Error('boom');
      return handlers.receipt ?? null;
    }),
    getBlockByNumber: jest.fn(async () => handlers.block ?? null),
    ethCall: jest.fn(async () => handlers.decimals ?? '0x12'),
  } as unknown as RpcClientWithFallback;
}

const endpoints = ['https://example.invalid'];

describe('collectExecutionFacts', () => {
  it('attributes a two-leg ERC-20 swap and computes the executed price', async () => {
    const receipt: RpcTransactionReceipt = {
      transactionHash: '0xabc',
      transactionIndex: '0x0',
      blockHash: '0xblock',
      blockNumber: '0x10',
      from: TAKER,
      to: '0xdead' as `0x${string}`,
      cumulativeGasUsed: '0x1',
      gasUsed: '0x5208',
      effectiveGasPrice: '0x3b9aca00',
      status: '0x1',
      type: '0x2',
      contractAddress: null,
      logs: [
        // 1000 USDC leaves the taker
        transferLog(SRC, TAKER, ROUTER, 1000n * 10n ** 6n),
        // 0.4 WETH arrives to the taker
        transferLog(DST, ROUTER, TAKER, 4n * 10n ** 17n),
      ],
    };

    const client = fakeClient({
      receipt,
      block: { timestamp: '0x' + (1_700_000_000).toString(16) },
      // src=6dp, dst=18dp
      decimals: '0x06',
    });
    // Force the destination decimals by stubbing per-call: src=6dp, dst=18dp.
    // decimals() returns a 32-byte word, so the stub must too — parseDecimalsResult
    // rejects short results (a real node never returns '0x06', only '0x0000…0006').
    (client.ethCall as jest.Mock).mockImplementation(async (_k, _e, token) => {
      const d = token.toLowerCase() === SRC ? 6 : 18;
      return ('0x' + d.toString(16).padStart(64, '0')) as `0x${string}`;
    });

    const result = await collectExecutionFacts({
      txHash: '0xabc' as `0x${string}`,
      chainId: 1,
      endpoints,
      sourceAssetId: `eip155:1/erc20:${SRC}`,
      destinationAssetId: `eip155:1/erc20:${DST}`,
      taker: TAKER,
      client,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.facts.fillStatus).toBe('FULL');
    expect(result.facts.sourceAmount).toBeCloseTo(1000, 6);
    expect(result.facts.destinationAmount).toBeCloseTo(0.4, 9);
    // 0.4 / 1000 = 0.0004 WETH per USDC
    expect(result.facts.executedPrice).toBeCloseTo(0.0004, 10);
    expect(result.facts.unavailableReason).toBeNull();
  });

  it('treats a reverted transaction as a real NOT_EXECUTED outcome, not a failure', async () => {
    const receipt: RpcTransactionReceipt = {
      transactionHash: '0xrev',
      transactionIndex: '0x0',
      blockHash: '0xblock',
      blockNumber: '0x11',
      from: TAKER,
      to: '0xdead' as `0x${string}`,
      cumulativeGasUsed: '0x1',
      gasUsed: '0x5208',
      effectiveGasPrice: '0x3b9aca00',
      status: '0x0',
      type: '0x2',
      contractAddress: null,
      logs: [],
    };

    const result = await collectExecutionFacts({
      txHash: '0xrev' as `0x${string}`,
      chainId: 1,
      endpoints,
      sourceAssetId: `eip155:1/erc20:${SRC}`,
      destinationAssetId: `eip155:1/erc20:${DST}`,
      taker: TAKER,
      client: fakeClient({ receipt, block: { timestamp: '0x1' } }),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.facts.fillStatus).toBe('REVERTED');
    expect(result.facts.executedPrice).toBeNull();
    expect(result.facts.unavailableReason).toBe('FILL_PRICE_UNAVAILABLE');
  });

  it('reports a native DESTINATION leg as unavailable (bought native is unobservable)', async () => {
    const receipt: RpcTransactionReceipt = {
      transactionHash: '0xnative',
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
      logs: [],
    };

    const result = await collectExecutionFacts({
      txHash: '0xnative' as `0x${string}`,
      chainId: 1,
      endpoints,
      // Selling an ERC-20 for ETH: the bought native leg is not in any Transfer
      // log nor in tx.value, so the price must stay unavailable.
      sourceAssetId: `eip155:1/erc20:${SRC}`,
      destinationAssetId: 'eip155:1/slip44:60',
      taker: TAKER,
      client: fakeClient({ receipt, block: { timestamp: '0x1' } }),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.facts.executedPrice).toBeNull();
    expect(result.facts.unavailableReason).toBe('NATIVE_ASSET_LEG');
  });

  it('reads a native SOURCE leg (sold native) from tx.value and computes the price', async () => {
    const receipt: RpcTransactionReceipt = {
      transactionHash: '0xsellnative',
      transactionIndex: '0x0',
      blockHash: '0xblock',
      blockNumber: '0x13',
      // The native leg leaves the taker's balance directly, so from === taker.
      from: TAKER,
      to: '0xdead' as `0x${string}`,
      cumulativeGasUsed: '0x1',
      gasUsed: '0x5208',
      effectiveGasPrice: '0x3b9aca00',
      status: '0x1',
      type: '0x2',
      contractAddress: null,
      logs: [
        // 0.4 WETH arrives to the taker (destination is an ERC-20).
        transferLog(DST, ROUTER, TAKER, 4n * 10n ** 17n),
      ],
    };

    const client = fakeClient({
      receipt,
      block: { timestamp: '0x1' },
      decimals: '0x12',
    });
    // The sold native amount lives in the transaction's value, not a Transfer.
    (client as unknown as { getTransactionByHash: jest.Mock }).getTransactionByHash = jest.fn(
      async () => ({ value: '0x' + (2n * 10n ** 18n).toString(16), from: TAKER })
    );
    (client.ethCall as jest.Mock).mockImplementation(async (_k, _e, token) => {
      const d = token.toLowerCase() === SRC ? 6 : 18;
      return ('0x' + d.toString(16).padStart(64, '0')) as `0x${string}`;
    });

    const result = await collectExecutionFacts({
      txHash: '0xsellnative' as `0x${string}`,
      chainId: 1,
      endpoints,
      // Selling 2 ETH for WETH.
      sourceAssetId: 'eip155:1/slip44:60',
      destinationAssetId: `eip155:1/erc20:${DST}`,
      taker: TAKER,
      client,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.facts.sourceAmount).toBeCloseTo(2, 9);
    expect(result.facts.destinationAmount).toBeCloseTo(0.4, 9);
    // 0.4 / 2 = 0.2 WETH per ETH.
    expect(result.facts.executedPrice).toBeCloseTo(0.2, 10);
    expect(result.facts.unavailableReason).toBeNull();
  });

  it('returns NOT_FOUND (not an error) when the node has never seen the tx', async () => {
    const result = await collectExecutionFacts({
      txHash: '0xpending' as `0x${string}`,
      chainId: 1,
      endpoints,
      sourceAssetId: `eip155:1/erc20:${SRC}`,
      destinationAssetId: `eip155:1/erc20:${DST}`,
      client: fakeClient({ receipt: null }),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NOT_FOUND');
  });

  it('returns RPC_ERROR when the node is unreachable', async () => {
    const result = await collectExecutionFacts({
      txHash: '0xerr' as `0x${string}`,
      chainId: 1,
      endpoints,
      sourceAssetId: `eip155:1/erc20:${SRC}`,
      destinationAssetId: `eip155:1/erc20:${DST}`,
      client: fakeClient({ throwReceipt: true }),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('RPC_ERROR');
  });
});
