import { keccak256, toHex } from 'viem';

import { StorkMonadClient } from '@/lib/oracles/clients/storkMonad';
import {
  STORK_MONAD_CONTRACT_ADDRESS,
  STORK_MONAD_PUSHED_FEEDS,
  resolveStorkMonadFeed,
} from '@/lib/oracles/constants/storkMonad';
import {
  StorkMonadOnChainService,
  scaleStorkValue,
  storkMonadOnChainService,
} from '@/lib/oracles/services/storkMonadOnChainService';
import { type RpcClientWithFallback } from '@/lib/oracles/utils/rpcClientWithFallback';
import { Blockchain, OracleProvider } from '@/types/oracle';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));

function toWord(value: bigint): string {
  const normalized = value < 0n ? (1n << 256n) + value : value;
  return normalized.toString(16).padStart(64, '0');
}

function storkResponse(timestampNs: bigint, quantizedValue: bigint): `0x${string}` {
  return `0x${toWord(timestampNs)}${toWord(quantizedValue)}`;
}

function rpcReturning(result: `0x${string}`): RpcClientWithFallback {
  return { ethCall: jest.fn().mockResolvedValue(result) } as unknown as RpcClientWithFallback;
}

describe('Stork Monad pushed-feed registry', () => {
  const documentedMonadAssetIds = [
    'AAVEUSD',
    'ADAUSD',
    'APTUSD',
    'ARBUSD',
    'AUSDUSD',
    'AVAXUSD',
    'BERAUSD',
    'BNBUSD',
    'BTCUSD',
    'CAKEUSD',
    'DOGEUSD',
    'EARNAUSDAUSD_RR',
    'ETHUSD',
    'HYPEUSD',
    'LINKUSD',
    'MONUSD',
    'OPUSD',
    'POLUSD',
    'PYTHUSD',
    'REDUSD',
    'SBTCUSD',
    'SEIUSD',
    'SOLUSD',
    'SUIUSD',
    'SUSD',
    'SUSDEUSD',
    'TIAUSD',
    'UNIUSD',
    'USDCUSD',
    'USDEUSD',
    'USDTUSD',
    'WBTCUSD',
    'WEETHUSD',
    'WETHUSD',
    'WSTETHUSD',
    'XAUUSD',
    'XRPUSD',
    'ZROUSD',
  ];

  it('uses the complete reviewed Monad set with unique asset IDs whose hashes match the contract bytes32 IDs', () => {
    expect(STORK_MONAD_PUSHED_FEEDS).toHaveLength(38);
    expect(STORK_MONAD_PUSHED_FEEDS.map((feed) => feed.assetId)).toEqual(documentedMonadAssetIds);
    expect(new Set(STORK_MONAD_PUSHED_FEEDS.map((feed) => feed.encodedAssetId)).size).toBe(38);
    for (const feed of STORK_MONAD_PUSHED_FEEDS) {
      expect(keccak256(toHex(feed.assetId))).toBe(feed.encodedAssetId);
      expect(feed.maxStalenessSeconds).toBe(3600);
    }
    expect(resolveStorkMonadFeed('BTC')?.assetId).toBe('BTCUSD');
    expect(resolveStorkMonadFeed('USDC/USD')?.assetId).toBe('USDCUSD');
    expect(resolveStorkMonadFeed('S')?.assetId).toBe('SUSD');
    expect(resolveStorkMonadFeed('EARNAUSDA/USD.RR')?.assetId).toBe('EARNAUSDAUSD_RR');
    expect(resolveStorkMonadFeed('EARNAUSDA')).toBeNull();
    expect(resolveStorkMonadFeed('NOT_A_FEED')).toBeNull();
  });
});

describe('StorkMonadOnChainService', () => {
  const btc = resolveStorkMonadFeed('BTC');

  beforeAll(() => {
    if (!btc) throw new Error('BTC must be present in the Stork registry');
  });

  it('decodes the signed 18-decimal value and nanosecond timestamp from a safe contract read', async () => {
    const publishedAtMs = Date.now() - 15_000;
    const rpc = rpcReturning(
      storkResponse(BigInt(publishedAtMs) * 1_000_000n, 81_265_292_110_690_000_000_000n)
    );
    const service = new StorkMonadOnChainService(rpc);

    const result = await service.getPrice(btc!);

    expect(result).toMatchObject({
      symbol: 'BTC/USD',
      assetId: 'BTCUSD',
      price: 81265.29211069,
      timestamp: publishedAtMs,
      sourceTimestamp: Math.floor(publishedAtMs / 1000),
    });
    expect(rpc.ethCall).toHaveBeenCalledWith(
      '143',
      expect.arrayContaining(['https://rpc.monad.xyz', 'https://rpc2.monad.xyz']),
      STORK_MONAD_CONTRACT_ADDRESS,
      expect.stringMatching(/^0x/),
      undefined
    );
  });

  it('rejects stale, future-dated, and non-positive values before they can become prices', async () => {
    const stale = new StorkMonadOnChainService(
      rpcReturning(
        storkResponse(BigInt(Date.now() - 3_601_000) * 1_000_000n, 100_000_000_000_000_000_000n)
      )
    );
    await expect(stale.getPrice(btc!)).rejects.toThrow('stale or future-dated');

    const future = new StorkMonadOnChainService(
      rpcReturning(
        storkResponse(BigInt(Date.now() + 301_000) * 1_000_000n, 100_000_000_000_000_000_000n)
      )
    );
    await expect(future.getPrice(btc!)).rejects.toThrow('stale or future-dated');

    const nonPositive = new StorkMonadOnChainService(
      rpcReturning(storkResponse(BigInt(Date.now()) * 1_000_000n, 0n))
    );
    await expect(nonPositive.getPrice(btc!)).rejects.toThrow('Invalid non-positive Stork price');
  });

  it('does not send a batch call when a feed asset ID does not match its encoded hash', async () => {
    const rpc = rpcReturning(
      storkResponse(BigInt(Date.now()) * 1_000_000n, 81_265_292_110_690_000_000_000n)
    );
    const service = new StorkMonadOnChainService(rpc);

    const readings = await service.getPrices([{ ...btc!, encodedAssetId: `0x${'0'.repeat(64)}` }]);

    expect(readings).toEqual([]);
    expect(rpc.ethCall).not.toHaveBeenCalled();
  });

  it('does not widen raw fixed-point values before scaling them', () => {
    expect(scaleStorkValue(81_265_292_110_690_000_000_000n)).toBe(81265.29211069);
    expect(() => scaleStorkValue(10n ** 400n)).toThrow('Stork scaled value is not finite');
  });
});

describe('StorkMonadClient', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns contract-backed evidence but remains out of strict quorum during shadow review', async () => {
    const publishedAtMs = Date.now() - 10_000;
    jest.spyOn(storkMonadOnChainService, 'getPrice').mockResolvedValue({
      symbol: 'BTC/USD',
      assetId: 'BTCUSD',
      encodedAssetId: resolveStorkMonadFeed('BTC')!.encodedAssetId,
      price: 81265.29211069,
      timestampNs: BigInt(publishedAtMs) * 1_000_000n,
      sourceTimestamp: Math.floor(publishedAtMs / 1000),
      timestamp: publishedAtMs,
      quantizedValue: 81_265_292_110_690_000_000_000n,
      maxAgeSeconds: 3600,
      priceDeviationPercent: 0.02,
    });
    const client = new StorkMonadClient();

    const result = await client.getPrice('BTC', Blockchain.MONAD);

    expect(result).toMatchObject({
      provider: OracleProvider.STORK,
      chain: Blockchain.MONAD,
      symbol: 'BTC/USD',
      decimals: 18,
      countsTowardOracleQuorum: false,
      verification: {
        contractAddress: STORK_MONAD_CONTRACT_ADDRESS,
        chainId: 143,
        feedHash: resolveStorkMonadFeed('BTC')!.encodedAssetId,
        rawValue: '81265292110690000000000',
        sourceTimestampNs: `${BigInt(publishedAtMs) * 1_000_000n}`,
        valueExponent: -18,
        assetId: 'BTCUSD',
      },
    });
    expect(result.confidence).toBeUndefined();
  });

  it('is Monad-only and recognizes both bare symbols and canonical pairs', () => {
    const client = new StorkMonadClient();
    expect(client.isSymbolSupported('BTC', Blockchain.MONAD)).toBe(true);
    expect(client.isSymbolSupported('BTC/USD', Blockchain.MONAD)).toBe(true);
    expect(client.isSymbolSupported('BTC', Blockchain.BASE)).toBe(false);
    expect(client.getSupportedChainsForSymbol('MON')).toEqual([Blockchain.MONAD]);
  });
});
