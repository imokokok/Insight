import type { OracleProvider } from '@/types/oracle';

import {
  buildProviderConsensusInputs,
  dedupeHourlySnapshotInputs,
  resolveSnapshotSlot,
} from '../snapshotCollector';

import type { HourlySnapshotInput } from '../types';

function input(
  partial: Partial<HourlySnapshotInput> & Pick<HourlySnapshotInput, 'provider' | 'symbol'>
): HourlySnapshotInput {
  return {
    snapshotHour: new Date('2026-08-16T00:00:00.000Z'),
    chainId: 0,
    price: 100,
    consensusPrice: 100,
    deviationPct: null,
    latencyMs: null,
    dataAgeSeconds: null,
    confidence: null,
    isSuccess: true,
    errorMessage: null,
    ...partial,
  };
}

describe('dedupeHourlySnapshotInputs', () => {
  it('collapses two feeds that resolve to the same (provider, symbol, chain_id) into one row', () => {
    // Real-world trigger: RedStone chain-agnostic "ETH" and "ETH/USDC" both
    // collapse to base "ETH" on chain_id 0.
    const inputs = [
      input({ provider: 'redstone' as OracleProvider, symbol: 'ETH', price: 3000 }),
      input({ provider: 'redstone' as OracleProvider, symbol: 'ETH', price: 3001 }),
    ];
    const out = dedupeHourlySnapshotInputs(inputs);
    expect(out).toHaveLength(1);
    expect(out[0].provider).toBe('redstone');
    expect(out[0].symbol).toBe('ETH');
    expect(out[0].chainId).toBe(0);
  });

  it('prefers the successful row when one succeeded and one failed', () => {
    const inputs = [
      input({
        provider: 'redstone' as OracleProvider,
        symbol: 'ETH',
        isSuccess: false,
        price: 0,
        errorMessage: 'boom',
      }),
      input({
        provider: 'redstone' as OracleProvider,
        symbol: 'ETH',
        isSuccess: true,
        price: 3000,
      }),
    ];
    const out = dedupeHourlySnapshotInputs(inputs);
    expect(out).toHaveLength(1);
    expect(out[0].isSuccess).toBe(true);
    expect(out[0].price).toBe(3000);
  });

  it('keeps a failed row when no success exists, so the failure signal is still recorded', () => {
    const inputs = [
      input({
        provider: 'redstone' as OracleProvider,
        symbol: 'ETH',
        isSuccess: false,
        price: 0,
        errorMessage: 'a',
      }),
      input({
        provider: 'redstone' as OracleProvider,
        symbol: 'ETH',
        isSuccess: false,
        price: 0,
        errorMessage: 'b',
      }),
    ];
    const out = dedupeHourlySnapshotInputs(inputs);
    expect(out).toHaveLength(1);
    expect(out[0].isSuccess).toBe(false);
  });

  it('keeps rows that differ only by chain_id (multi-chain providers)', () => {
    const inputs = [
      input({ provider: 'chainlink' as OracleProvider, symbol: 'ETH', chainId: 1, price: 3000 }),
      input({ provider: 'chainlink' as OracleProvider, symbol: 'ETH', chainId: 10, price: 3000 }),
      input({ provider: 'chainlink' as OracleProvider, symbol: 'ETH', chainId: 8453, price: 3000 }),
    ];
    const out = dedupeHourlySnapshotInputs(inputs);
    expect(out).toHaveLength(3);
  });

  it('keeps rows for different providers on the same asset', () => {
    const inputs = [
      input({ provider: 'chainlink' as OracleProvider, symbol: 'ETH', chainId: 1, price: 3000 }),
      input({ provider: 'redstone' as OracleProvider, symbol: 'ETH', chainId: 0, price: 3001 }),
    ];
    const out = dedupeHourlySnapshotInputs(inputs);
    expect(out).toHaveLength(2);
  });

  it('returns a single row unchanged', () => {
    const inputs = [input({ provider: 'redstone' as OracleProvider, symbol: 'ETH', price: 3000 })];
    const out = dedupeHourlySnapshotInputs(inputs);
    expect(out).toHaveLength(1);
    expect(out[0].price).toBe(3000);
  });

  it('is order-stable: first success wins among multiple successes', () => {
    const inputs = [
      input({ provider: 'redstone' as OracleProvider, symbol: 'ETH', price: 3000 }),
      input({ provider: 'redstone' as OracleProvider, symbol: 'ETH', price: 9999 }),
    ];
    const out = dedupeHourlySnapshotInputs(inputs);
    expect(out).toHaveLength(1);
    expect(out[0].price).toBe(3000);
  });
});

describe('resolveSnapshotSlot', () => {
  it('uses the dispatcher slot as a stable 15-minute natural key', () => {
    expect(resolveSnapshotSlot('2026-09-13T12:29:59.999Z')).toEqual(
      new Date('2026-09-13T12:15:00.000Z')
    );
  });

  it('falls back to a bucketed local start time when no valid schedule exists', () => {
    expect(resolveSnapshotSlot('', new Date('2026-09-13T12:44:00.000Z'))).toEqual(
      new Date('2026-09-13T12:30:00.000Z')
    );
  });
});

describe('buildProviderConsensusInputs', () => {
  it('collapses multiple chains from the same provider into one consensus vote', () => {
    const now = Date.now();
    const result = buildProviderConsensusInputs([
      {
        provider: 'chainlink',
        symbol: 'ETH',
        feedChainId: 1,
        price: {
          provider: 'chainlink',
          symbol: 'ETH',
          chain: 'ethereum',
          price: 99,
          timestamp: now - 1_000,
          confidence: 0.9,
        },
        error: null,
        skipped: false,
      },
      {
        provider: 'chainlink',
        symbol: 'ETH',
        feedChainId: 42161,
        price: {
          provider: 'chainlink',
          symbol: 'ETH',
          chain: 'arbitrum',
          price: 101,
          timestamp: now - 2_000,
          confidence: 0.7,
        },
        error: null,
        skipped: false,
      },
      {
        provider: 'chainlink',
        symbol: 'ETH',
        feedChainId: 8453,
        price: {
          provider: 'chainlink',
          symbol: 'ETH',
          chain: 'base',
          price: 100,
          timestamp: now - 3_000,
          confidence: 0.8,
        },
        error: null,
        skipped: false,
      },
      {
        provider: 'redstone',
        symbol: 'ETH',
        feedChainId: 0,
        price: {
          provider: 'redstone',
          symbol: 'ETH',
          chain: 'ethereum',
          price: 102,
          timestamp: now - 500,
          confidence: 0.95,
        },
        error: null,
        skipped: false,
      },
    ]);

    expect(result).toHaveLength(2);
    expect(result.find((input) => input.provider === 'chainlink')).toEqual(
      expect.objectContaining({
        price: 100,
        confidence: 0.7,
        timestamp: now - 3_000,
      })
    );
    expect(result.find((input) => input.provider === 'redstone')).toEqual(
      expect.objectContaining({ price: 102, confidence: 0.95 })
    );
  });
});
