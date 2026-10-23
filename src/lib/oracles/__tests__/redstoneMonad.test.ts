import { RedStoneClient } from '@/lib/oracles/clients/redstone';
import {
  REDSTONE_MONAD_PRICE_FEEDS,
  REDSTONE_MONAD_RPC_ENDPOINTS,
  resolveRedStoneMonadFeed,
} from '@/lib/oracles/constants/redstoneMonad';
import {
  RedStoneMonadOnChainService,
  redStoneMonadOnChainService,
  scaleRedStoneValue,
} from '@/lib/oracles/services/redstoneMonadOnChainService';
import { type RpcClientWithFallback } from '@/lib/oracles/utils/rpcClientWithFallback';
import { Blockchain, OracleProvider } from '@/types/oracle';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));

function toWord(value: bigint): string {
  const normalized = value < 0n ? (1n << 256n) + value : value;
  return normalized.toString(16).padStart(64, '0');
}

function roundResponse(
  roundId: bigint,
  answer: bigint,
  startedAt: bigint,
  updatedAt: bigint,
  answeredInRound: bigint
): `0x${string}` {
  return `0x${toWord(roundId)}${toWord(answer)}${toWord(startedAt)}${toWord(updatedAt)}${toWord(answeredInRound)}`;
}

function decimalsResponse(decimals: bigint): `0x${string}` {
  return `0x${toWord(decimals)}`;
}

function rpcReturning(round: `0x${string}`, decimals: `0x${string}`): RpcClientWithFallback {
  return {
    ethCall: jest
      .fn()
      .mockImplementation(
        (_chainId: string, _endpoints: string[], _address: string, data: string) =>
          Promise.resolve(data.startsWith('0xfeaf968c') ? round : decimals)
      ),
  } as unknown as RpcClientWithFallback;
}

describe('RedStone Monad price-feed registry', () => {
  it('contains only the reviewed direct-USD feeds with unique contracts', () => {
    expect(REDSTONE_MONAD_PRICE_FEEDS).toHaveLength(12);
    expect(new Set(REDSTONE_MONAD_PRICE_FEEDS.map((feed) => feed.address.toLowerCase())).size).toBe(
      REDSTONE_MONAD_PRICE_FEEDS.length
    );
    expect(REDSTONE_MONAD_PRICE_FEEDS.every((feed) => feed.alias.endsWith('/USD'))).toBe(true);
    expect(resolveRedStoneMonadFeed('MON')?.feedName).toBe('MON_USD');
    expect(resolveRedStoneMonadFeed('AUSD/USD')?.feedName).toBe('AUSD_USD');
    // Fundamental exchange-rate feeds are intentionally not USD price feeds.
    expect(resolveRedStoneMonadFeed('WEETH')).toBeNull();
  });
});

describe('RedStoneMonadOnChainService', () => {
  const btc = resolveRedStoneMonadFeed('BTC');

  beforeAll(() => {
    if (!btc) throw new Error('BTC must be present in the RedStone Monad registry');
  });

  it('decodes an AggregatorV3 response and preserves on-chain freshness evidence', async () => {
    const updatedAt = Math.floor(Date.now() / 1000) - 15;
    const rpc = rpcReturning(
      roundResponse(42n, 8_126_529_211_069n, BigInt(updatedAt - 1), BigInt(updatedAt), 42n),
      decimalsResponse(8n)
    );
    const service = new RedStoneMonadOnChainService(rpc);

    const result = await service.getPrice(btc!);

    expect(result).toMatchObject({
      symbol: 'BTC/USD',
      feedName: 'BTC_USD',
      price: 81265.29211069,
      decimals: 8,
      roundId: 42n,
      answeredInRound: 42n,
      updatedAt,
    });
    expect(rpc.ethCall).toHaveBeenCalledWith(
      '143',
      expect.arrayContaining(REDSTONE_MONAD_RPC_ENDPOINTS),
      btc!.address,
      expect.stringMatching(/^0xfeaf968c/),
      undefined
    );
  });

  it('rejects stale, future-dated, incomplete, and non-positive rounds', async () => {
    const stale = new RedStoneMonadOnChainService(
      rpcReturning(
        roundResponse(1n, 100_000_000n, 1_000n, BigInt(Math.floor(Date.now() / 1000) - 21_601), 1n),
        decimalsResponse(8n)
      )
    );
    await expect(stale.getPrice(btc!)).rejects.toThrow('stale or future-dated');

    const future = new RedStoneMonadOnChainService(
      rpcReturning(
        roundResponse(
          1n,
          100_000_000n,
          BigInt(Math.floor(Date.now() / 1000) + 301),
          BigInt(Math.floor(Date.now() / 1000) + 301),
          1n
        ),
        decimalsResponse(8n)
      )
    );
    await expect(future.getPrice(btc!)).rejects.toThrow('stale or future-dated');

    const incomplete = new RedStoneMonadOnChainService(
      rpcReturning(
        roundResponse(2n, 100_000_000n, 1_000n, BigInt(Math.floor(Date.now() / 1000)), 1n),
        decimalsResponse(8n)
      )
    );
    await expect(incomplete.getPrice(btc!)).rejects.toThrow('Incomplete RedStone round');

    const nonPositive = new RedStoneMonadOnChainService(
      rpcReturning(
        roundResponse(1n, 0n, 1_000n, BigInt(Math.floor(Date.now() / 1000)), 1n),
        decimalsResponse(8n)
      )
    );
    await expect(nonPositive.getPrice(btc!)).rejects.toThrow('Invalid non-positive RedStone price');
  });

  it('scales signed fixed-point values only after validating feed decimals', () => {
    expect(scaleRedStoneValue(8_126_529_211_069n, 8)).toBe(81265.29211069);
    expect(() => scaleRedStoneValue(1n, -1)).toThrow('Invalid RedStone feed decimals');
    expect(() => scaleRedStoneValue(1n, 37)).toThrow('Invalid RedStone feed decimals');
  });
});

describe('RedStoneClient Monad path', () => {
  afterEach(() => jest.restoreAllMocks());

  it('uses contract-backed Monad data and remains shadow-only during review', async () => {
    const updatedAt = Math.floor(Date.now() / 1000) - 10;
    jest.spyOn(redStoneMonadOnChainService, 'getPrice').mockResolvedValue({
      symbol: 'MON/USD',
      feedName: 'MON_USD',
      feedAddress: resolveRedStoneMonadFeed('MON')!.address,
      price: 0.02166161,
      decimals: 8,
      roundId: 123n,
      answeredInRound: 123n,
      startedAt: updatedAt - 1,
      updatedAt,
      timestamp: updatedAt * 1000,
      rawAnswer: 2_166_161n,
      maxAgeSeconds: 21_600,
      priceDeviationPercent: 0.5,
    });
    const client = new RedStoneClient();

    const result = await client.getPrice('MON');

    expect(result).toMatchObject({
      provider: OracleProvider.REDSTONE,
      chain: Blockchain.MONAD,
      symbol: 'MON/USD',
      price: 0.02166161,
      countsTowardOracleQuorum: false,
      verification: {
        contractAddress: resolveRedStoneMonadFeed('MON')!.address,
        chainId: 143,
        rawValue: '2166161',
        sourceTimestamp: updatedAt,
        valueExponent: -8,
        assetId: 'MON_USD',
      },
    });
    expect(result.verification?.method).toContain('latestRoundData');
  });

  it('supports only the reviewed feed subset on Monad', () => {
    const client = new RedStoneClient();
    expect(client.isSymbolSupported('MON', Blockchain.MONAD)).toBe(true);
    expect(client.isSymbolSupported('BTC/USD', Blockchain.MONAD)).toBe(true);
    expect(client.isSymbolSupported('WEETH', Blockchain.MONAD)).toBe(false);
    expect(client.isSymbolSupported('MON', Blockchain.BASE)).toBe(false);
    expect(client.getSupportedChainsForSymbol('MON')).toEqual([Blockchain.MONAD]);
  });
});
