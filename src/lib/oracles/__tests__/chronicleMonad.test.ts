import { ChronicleMonadClient } from '@/lib/oracles/clients/chronicleMonad';
import {
  CHRONICLE_MONAD_PRICE_FEEDS,
  CHRONICLE_MONAD_RPC_ENDPOINTS,
  resolveChronicleMonadFeed,
} from '@/lib/oracles/constants/chronicleMonad';
import {
  ChronicleMonadOnChainService,
  chronicleMonadOnChainService,
  scaleChronicleValue,
} from '@/lib/oracles/services/chronicleMonadOnChainService';
import { type RpcClientWithFallback } from '@/lib/oracles/utils/rpcClientWithFallback';
import { Blockchain, OracleProvider } from '@/types/oracle';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));

function toWord(value: bigint): string {
  return value.toString(16).padStart(64, '0');
}

function chronicleResponse(value: bigint, sourceTimestamp: bigint): `0x${string}` {
  return `0x${toWord(value)}${toWord(sourceTimestamp)}`;
}

function rpcReturning(result: `0x${string}`): RpcClientWithFallback {
  return { ethCall: jest.fn().mockResolvedValue(result) } as unknown as RpcClientWithFallback;
}

describe('Chronicle Monad price-feed registry', () => {
  it('contains only reviewed directly-readable USD contracts with unique addresses', () => {
    expect(CHRONICLE_MONAD_PRICE_FEEDS).toHaveLength(22);
    expect(
      new Set(CHRONICLE_MONAD_PRICE_FEEDS.map((feed) => feed.address.toLowerCase())).size
    ).toBe(CHRONICLE_MONAD_PRICE_FEEDS.length);
    expect(CHRONICLE_MONAD_PRICE_FEEDS.every((feed) => feed.alias.endsWith('/USD'))).toBe(true);
    expect(resolveChronicleMonadFeed('MON')?.feedName).toBe('Chronicle_MON_USD_1');
    expect(resolveChronicleMonadFeed('USDC/USD')?.feedName).toBe('Chronicle_USDC_USD_1');
    expect(resolveChronicleMonadFeed('ETHX')).toBeNull();
    expect(resolveChronicleMonadFeed('NOT_A_FEED')).toBeNull();
  });
});

describe('ChronicleMonadOnChainService', () => {
  const btc = resolveChronicleMonadFeed('BTC');

  beforeAll(() => {
    if (!btc) throw new Error('BTC must be present in the Chronicle Monad registry');
  });

  it('decodes the 18-decimal value and source timestamp from readWithAge()', async () => {
    const sourceTimestamp = Math.floor(Date.now() / 1000) - 15;
    const rpc = rpcReturning(
      chronicleResponse(81_265_292_110_690_000_000_000n, BigInt(sourceTimestamp))
    );
    const service = new ChronicleMonadOnChainService(rpc);

    const result = await service.getPrice(btc!);

    expect(result).toMatchObject({
      symbol: 'BTC/USD',
      feedName: 'Chronicle_BTC_USD_1',
      price: 81265.29211069,
      decimals: 18,
      sourceTimestamp,
      timestamp: sourceTimestamp * 1000,
    });
    expect(rpc.ethCall).toHaveBeenCalledWith(
      '143',
      expect.arrayContaining(CHRONICLE_MONAD_RPC_ENDPOINTS),
      btc!.address,
      expect.stringMatching(/^0x393e5ede/),
      undefined
    );
  });

  it('rejects stale, future-dated, and non-positive values before they can become prices', async () => {
    const stale = new ChronicleMonadOnChainService(
      rpcReturning(
        chronicleResponse(
          100_000_000_000_000_000_000n,
          BigInt(Math.floor(Date.now() / 1000) - 1801)
        )
      )
    );
    await expect(stale.getPrice(btc!)).rejects.toThrow('stale or future-dated');

    // The service permits a small amount of clock skew. Keep this comfortably
    // beyond that window so crossing a second boundary cannot make it valid.
    const futureTimestamp = BigInt(Math.floor(Date.now() / 1000) + 600);
    const future = new ChronicleMonadOnChainService(
      rpcReturning(chronicleResponse(100_000_000_000_000_000_000n, futureTimestamp))
    );
    await expect(future.getPrice(btc!)).rejects.toThrow('stale or future-dated');

    const nonPositive = new ChronicleMonadOnChainService(
      rpcReturning(chronicleResponse(0n, BigInt(Math.floor(Date.now() / 1000))))
    );
    await expect(nonPositive.getPrice(btc!)).rejects.toThrow(
      'Invalid non-positive Chronicle price'
    );
  });

  it('does not widen raw fixed-point values before scaling them', () => {
    expect(scaleChronicleValue(81_265_292_110_690_000_000_000n)).toBe(81265.29211069);
    expect(() => scaleChronicleValue(10n ** 400n)).toThrow('Chronicle scaled value is not finite');
  });
});

describe('ChronicleMonadClient', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns contract-backed evidence but remains out of strict quorum during review', async () => {
    const sourceTimestamp = Math.floor(Date.now() / 1000) - 10;
    jest.spyOn(chronicleMonadOnChainService, 'getPrice').mockResolvedValue({
      symbol: 'MON/USD',
      feedName: 'Chronicle_MON_USD_1',
      feedAddress: resolveChronicleMonadFeed('MON')!.address,
      price: 0.02166161,
      decimals: 18,
      sourceTimestamp,
      timestamp: sourceTimestamp * 1000,
      rawValue: 21_661_610_000_000_000n,
      maxAgeSeconds: 1800,
      priceDeviationPercent: 0.15,
    });
    const client = new ChronicleMonadClient();

    const result = await client.getPrice('MON', Blockchain.MONAD);

    expect(result).toMatchObject({
      provider: OracleProvider.CHRONICLE,
      chain: Blockchain.MONAD,
      symbol: 'MON/USD',
      price: 0.02166161,
      decimals: 18,
      countsTowardOracleQuorum: false,
      verification: {
        contractAddress: resolveChronicleMonadFeed('MON')!.address,
        chainId: 143,
        rawValue: '21661610000000000',
        sourceTimestamp,
        valueExponent: -18,
        assetId: 'Chronicle_MON_USD_1',
      },
    });
    expect(result.verification?.method).toContain('readWithAge');
  });

  it('is Monad-only and recognizes bare symbols plus canonical pairs', () => {
    const client = new ChronicleMonadClient();
    expect(client.isSymbolSupported('BTC', Blockchain.MONAD)).toBe(true);
    expect(client.isSymbolSupported('BTC/USD', Blockchain.MONAD)).toBe(true);
    expect(client.isSymbolSupported('BTC', Blockchain.BASE)).toBe(false);
    expect(client.getSupportedChainsForSymbol('MON')).toEqual([Blockchain.MONAD]);
  });
});
