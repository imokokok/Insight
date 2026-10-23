import { PythMonadClient } from '@/lib/oracles/clients/pythMonad';
import {
  PYTH_MONAD_CORE_ADDRESS,
  PYTH_MONAD_SPONSORED_FEEDS,
  resolvePythMonadFeed,
} from '@/lib/oracles/constants/pythMonad';
import {
  PythMonadOnChainService,
  pythMonadOnChainService,
  scalePythValue,
} from '@/lib/oracles/services/pythMonadOnChainService';
import { type RpcClientWithFallback } from '@/lib/oracles/utils/rpcClientWithFallback';
import { Blockchain, OracleProvider } from '@/types/oracle';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));

function toWord(value: bigint): string {
  const normalized = value < 0n ? (1n << 256n) + value : value;
  return normalized.toString(16).padStart(64, '0');
}

function pythResponse(
  price: bigint,
  conf: bigint,
  exponent: bigint,
  publishTime: bigint
): `0x${string}` {
  return `0x${toWord(price)}${toWord(conf)}${toWord(exponent)}${toWord(publishTime)}`;
}

function rpcReturning(result: `0x${string}`): RpcClientWithFallback {
  return { ethCall: jest.fn().mockResolvedValue(result) } as unknown as RpcClientWithFallback;
}

describe('Pyth Monad sponsored feed registry', () => {
  it('contains every reviewed sponsored feed with a unique valid ID', () => {
    expect(PYTH_MONAD_SPONSORED_FEEDS).toHaveLength(60);
    expect(new Set(PYTH_MONAD_SPONSORED_FEEDS.map((feed) => feed.id)).size).toBe(60);
    expect(PYTH_MONAD_SPONSORED_FEEDS.every((feed) => /^[a-f0-9]{64}$/.test(feed.id))).toBe(true);
    expect(resolvePythMonadFeed('BTC')?.alias).toBe('BTC/USD');
    expect(resolvePythMonadFeed('STETH/ETH.RR')?.alias).toBe('STETH/ETH.RR');
    expect(resolvePythMonadFeed('NOT_A_FEED')).toBeNull();
  });
});

describe('PythMonadOnChainService', () => {
  const btc = resolvePythMonadFeed('BTC');

  beforeAll(() => {
    if (!btc) throw new Error('BTC must be present in the sponsored registry');
  });

  it('decodes Pyth Core values and preserves confidence and publish-time evidence', async () => {
    const publishedAt = Math.floor(Date.now() / 1000) - 15;
    const rpc = rpcReturning(
      pythResponse(8_126_529_211_069n, 417_946_651n, -8n, BigInt(publishedAt))
    );
    const service = new PythMonadOnChainService(rpc);

    const result = await service.getPrice(btc!);

    expect(result).toMatchObject({
      symbol: 'BTC/USD',
      price: 81265.29211069,
      conf: 4.17946651,
      exponent: -8,
      publishTime: publishedAt,
    });
    expect(result.confidenceRatio).toBeCloseTo(0.00005143, 8);
    expect(rpc.ethCall).toHaveBeenCalledWith(
      '143',
      ['https://rpc.monad.xyz'],
      PYTH_MONAD_CORE_ADDRESS,
      expect.stringMatching(/^0x96834ad3/),
      undefined
    );
  });

  it('rejects stale, future-dated, and wide-confidence Core values before they become usable', async () => {
    const stale = new PythMonadOnChainService(
      rpcReturning(
        pythResponse(100_000_000n, 100n, -8n, BigInt(Math.floor(Date.now() / 1000) - 7201))
      )
    );
    await expect(stale.getPrice(btc!)).rejects.toThrow('stale or future-dated');

    const future = new PythMonadOnChainService(
      rpcReturning(
        pythResponse(100_000_000n, 100n, -8n, BigInt(Math.floor(Date.now() / 1000) + 301))
      )
    );
    await expect(future.getPrice(btc!)).rejects.toThrow('stale or future-dated');

    const uncertain = new PythMonadOnChainService(
      rpcReturning(
        pythResponse(100_000_000n, 20_000_001n, -8n, BigInt(Math.floor(Date.now() / 1000)))
      )
    );
    await expect(uncertain.getPrice(btc!)).rejects.toThrow('confidence interval is too wide');
  });

  it('bounds Pyth exponents before converting them to JavaScript numbers', () => {
    expect(scalePythValue(8126529211069n, -8)).toBe(81265.29211069);
    expect(() => scalePythValue(1n, -31)).toThrow('Invalid Pyth exponent');
    expect(() => scalePythValue(1n, 31)).toThrow('Invalid Pyth exponent');
  });
});

describe('PythMonadClient', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns evidence-backed Monad data without turning a Pyth interval into an original probability', async () => {
    const publishedAt = Math.floor(Date.now() / 1000) - 10;
    jest.spyOn(pythMonadOnChainService, 'getPrice').mockResolvedValue({
      symbol: 'BTC/USD',
      feedId: `0x${resolvePythMonadFeed('BTC')!.id}`,
      price: 81265.29211069,
      conf: 4.17946651,
      exponent: -8,
      publishTime: publishedAt,
      timestamp: publishedAt * 1000,
      confidenceRatio: 0.00005143,
      maxAgeSeconds: 7200,
      priceDeviationPercent: 0.1,
    });
    const client = new PythMonadClient();

    const result = await client.getPrice('BTC', Blockchain.MONAD);

    expect(result).toMatchObject({
      provider: OracleProvider.PYTH,
      chain: Blockchain.MONAD,
      symbol: 'BTC/USD',
      confidenceSource: 'calculated',
      publishTime: publishedAt,
      feedId: `0x${resolvePythMonadFeed('BTC')!.id}`,
      verification: {
        contractAddress: PYTH_MONAD_CORE_ADDRESS,
        chainId: 143,
        explorerUrl: `https://monadscan.com/address/${PYTH_MONAD_CORE_ADDRESS}#readContract`,
      },
    });
    expect(result.confidenceInterval?.widthPercentage).toBeCloseTo(0.010286, 5);
  });

  it('is Monad-only and recognizes both bare symbols and canonical pairs', () => {
    const client = new PythMonadClient();
    expect(client.isSymbolSupported('BTC', Blockchain.MONAD)).toBe(true);
    expect(client.isSymbolSupported('BTC/USD', Blockchain.MONAD)).toBe(true);
    expect(client.isSymbolSupported('BTC', Blockchain.BASE)).toBe(false);
    expect(client.getSupportedChainsForSymbol('MON')).toEqual([Blockchain.MONAD]);
  });
});
