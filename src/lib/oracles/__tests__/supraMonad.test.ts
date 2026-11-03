import { SupraClient } from '@/lib/oracles/clients/supra';
import {
  SUPRA_MONAD_PUSHED_FEEDS,
  SUPRA_MONAD_RPC_ENDPOINTS,
  SUPRA_MONAD_SVALUE_FEED_ADDRESS,
  resolveSupraMonadFeed,
} from '@/lib/oracles/constants/supraMonad';
import {
  SupraMonadOnChainService,
  scaleSupraValue,
  supraMonadOnChainService,
} from '@/lib/oracles/services/supraMonadOnChainService';
import { type RpcClientWithFallback } from '@/lib/oracles/utils/rpcClientWithFallback';
import { Blockchain, OracleProvider } from '@/types/oracle';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));

function toWord(value: bigint): string {
  return value.toString(16).padStart(64, '0');
}

function supraResponse(
  round: bigint,
  decimals: bigint,
  timestampMs: bigint,
  price: bigint
): `0x${string}` {
  return `0x${toWord(round)}${toWord(decimals)}${toWord(timestampMs)}${toWord(price)}`;
}

function rpcReturning(result: `0x${string}`): RpcClientWithFallback {
  return { ethCall: jest.fn().mockResolvedValue(result) } as unknown as RpcClientWithFallback;
}

describe('Supra Monad DORA Push registry', () => {
  it('keeps the reviewed Monad pair catalog and source denominations explicit', () => {
    expect(SUPRA_MONAD_PUSHED_FEEDS).toHaveLength(39);
    expect(new Set(SUPRA_MONAD_PUSHED_FEEDS.map((feed) => feed.pairIndex)).size).toBe(39);
    expect(resolveSupraMonadFeed('SUI')?.alias).toBe('SUI/USDT');
    expect(resolveSupraMonadFeed('USDC/USD')?.pairIndex).toBe(89);
    expect(resolveSupraMonadFeed('SBTC/BTC.RR')?.quoteType).toBe('reference-rate');
    expect(resolveSupraMonadFeed('NOT_A_FEED')).toBeNull();
  });
});

describe('SupraMonadOnChainService', () => {
  const sui = resolveSupraMonadFeed('SUI');

  beforeAll(() => {
    if (!sui) throw new Error('SUI must be present in the Supra Monad registry');
  });

  it('decodes DORA price feeds with their millisecond source timestamp', async () => {
    const timestampMs = Date.now() - 15_000;
    const rpc = rpcReturning(
      supraResponse(1_792_790_843_000n, 18n, BigInt(timestampMs), 2_345_678_900_000_000_000n)
    );
    const service = new SupraMonadOnChainService(rpc);

    const result = await service.getPrice(sui!);

    expect(result).toMatchObject({
      symbol: 'SUI/USDT',
      pairIndex: 90,
      price: 2.3456789,
      decimals: 18,
      sourceTimestampMs: timestampMs,
      sourceTimestamp: Math.floor(timestampMs / 1000),
      timestamp: timestampMs,
      rawValue: 2_345_678_900_000_000_000n,
    });
    expect(rpc.ethCall).toHaveBeenCalledWith(
      '143',
      expect.arrayContaining(SUPRA_MONAD_RPC_ENDPOINTS),
      SUPRA_MONAD_SVALUE_FEED_ADDRESS,
      expect.stringMatching(/^0x89b94ea2/),
      undefined
    );
  });

  it('rejects stale, future-dated, non-positive, and wrong-unit observations', async () => {
    const stale = new SupraMonadOnChainService(
      rpcReturning(
        supraResponse(1n, 18n, BigInt(Date.now() - 1_801_000), 1_000_000_000_000_000_000n)
      )
    );
    await expect(stale.getPrice(sui!)).rejects.toThrow('stale or future-dated');

    const future = new SupraMonadOnChainService(
      rpcReturning(supraResponse(1n, 18n, BigInt(Date.now() + 301_000), 1_000_000_000_000_000_000n))
    );
    await expect(future.getPrice(sui!)).rejects.toThrow('stale or future-dated');

    const nonPositive = new SupraMonadOnChainService(
      rpcReturning(supraResponse(1n, 18n, BigInt(Date.now()), 0n))
    );
    await expect(nonPositive.getPrice(sui!)).rejects.toThrow('Invalid non-positive Supra price');

    const secondsNotMilliseconds = new SupraMonadOnChainService(
      rpcReturning(
        supraResponse(1n, 18n, BigInt(Math.floor(Date.now() / 1000)), 1_000_000_000_000_000_000n)
      )
    );
    await expect(secondsNotMilliseconds.getPrice(sui!)).rejects.toThrow(
      'Invalid Supra millisecond source timestamp'
    );
  });

  it('does not widen raw fixed-point values before applying the provider scale', () => {
    expect(scaleSupraValue(2_345_678_900_000_000_000n, 18)).toBe(2.3456789);
    expect(() => scaleSupraValue(10n ** 400n, 18)).toThrow('Supra scaled value is not finite');
    expect(() => scaleSupraValue(1n, 37)).toThrow('Invalid Supra decimals');
  });
});

describe('SupraClient on Monad', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns directly verified Push data but remains shadow-only', async () => {
    const timestampMs = Date.now() - 10_000;
    jest.spyOn(supraMonadOnChainService, 'getPrice').mockResolvedValue({
      symbol: 'SUI/USDT',
      pairIndex: 90,
      price: 2.3456789,
      decimals: 18,
      sourceTimestampMs: timestampMs,
      sourceTimestamp: Math.floor(timestampMs / 1000),
      timestamp: timestampMs,
      round: 1_792_790_843_000n,
      rawValue: 2_345_678_900_000_000_000n,
      maxAgeSeconds: 1800,
    });
    const client = new SupraClient();

    const result = await client.getPrice('SUI', Blockchain.MONAD);

    expect(result).toMatchObject({
      provider: OracleProvider.SUPRA,
      chain: Blockchain.MONAD,
      symbol: 'SUI/USDT',
      price: 2.3456789,
      decimals: 18,
      pairIndex: 90,
      countsTowardOracleQuorum: false,
      verification: {
        contractAddress: SUPRA_MONAD_SVALUE_FEED_ADDRESS,
        chainId: 143,
        rawValue: '2345678900000000000',
        sourceTimestamp: Math.floor(timestampMs / 1000),
        valueExponent: -18,
      },
    });
    expect(result.verification?.method).toContain('getSvalue');
  });

  it('recognizes Monad pairs without making reference rates into bare USD quotes', () => {
    const client = new SupraClient();
    expect(client.isSymbolSupported('SUI', Blockchain.MONAD)).toBe(true);
    expect(client.isSymbolSupported('SUI/USDT', Blockchain.MONAD)).toBe(true);
    expect(client.isSymbolSupported('SBTC', Blockchain.MONAD)).toBe(false);
    expect(client.isSymbolSupported('SBTC/BTC.RR', Blockchain.MONAD)).toBe(true);
    expect(client.isSymbolSupported('SUI/USDT', Blockchain.BASE)).toBe(false);
  });

  it('uses the verified Push reading for Monad statistics instead of the DORA HTTP API', async () => {
    const timestampMs = Date.now() - 8_000;
    jest.spyOn(supraMonadOnChainService, 'getPrice').mockResolvedValue({
      symbol: 'SUI/USDT',
      pairIndex: 90,
      price: 2.3456789,
      decimals: 18,
      sourceTimestampMs: timestampMs,
      sourceTimestamp: Math.floor(timestampMs / 1000),
      timestamp: timestampMs,
      round: 1_792_790_843_000n,
      rawValue: 2_345_678_900_000_000_000n,
      maxAgeSeconds: 1800,
    });
    const client = new SupraClient();

    const result = await client.getTokenOnChainData('SUI', Blockchain.MONAD);

    expect(result).toMatchObject({
      symbol: 'SUI/USDT',
      pairName: 'SUI/USDT',
      pairIndex: 90,
      price: 2.3456789,
      decimals: 18,
      supportedChainsCount: 1,
      updateIntervalMinutes: 30,
      lastUpdated: timestampMs,
      source: 'Supra DORA Push on Monad (getSvalue)',
    });
  });

  it('does not present DORA HTTP candles as Monad Push history', async () => {
    const client = new SupraClient();

    await expect(client.getHistoricalPrices('SUI', Blockchain.MONAD)).resolves.toEqual([]);
  });
});
