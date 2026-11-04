/** @jest-environment node */

import { createHash } from 'node:crypto';

import { PythClient } from '@/lib/oracles/clients/pyth';
import {
  PYTH_SOLANA_PRICE_UPDATE_OWNER_PROGRAM_ID,
  PYTH_SOLANA_SPONSORED_FEEDS,
  resolvePythSolanaFeed,
} from '@/lib/oracles/constants/pythSolana';
import {
  derivePythSolanaPriceFeedAccount,
  PythSolanaOnChainService,
  pythSolanaOnChainService,
} from '@/lib/oracles/services/pythSolanaOnChainService';
import { Blockchain, OracleProvider } from '@/types/oracle';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));

const MAINNET_GENESIS_HASH = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
const NOW_SECONDS = 1_800_000_000;

function rpcResponse(id: string, result: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function priceUpdateAccount(
  feedId: string,
  owner = PYTH_SOLANA_PRICE_UPDATE_OWNER_PROGRAM_ID
): {
  owner: string;
  data: [string, 'base64'];
} {
  const account = Buffer.alloc(133);
  createHash('sha256').update('account:PriceUpdateV2').digest().copy(account, 0, 0, 8);
  Buffer.alloc(32, 7).copy(account, 8); // write authority
  account[40] = 1; // VerificationLevel.Full
  Buffer.from(feedId, 'hex').copy(account, 41);
  account.writeBigInt64LE(15_123_456_789n, 73);
  account.writeBigUInt64LE(6_000_000n, 81);
  account.writeInt32LE(-8, 89);
  account.writeBigInt64LE(BigInt(NOW_SECONDS - 10), 93);
  account.writeBigInt64LE(BigInt(NOW_SECONDS - 11), 101);
  account.writeBigInt64LE(15_120_000_000n, 109);
  account.writeBigUInt64LE(6_100_000n, 117);
  account.writeBigUInt64LE(987_654_321n, 125);
  return { owner, data: [account.toString('base64'), 'base64'] };
}

describe('Pyth Solana sponsored feed registry', () => {
  it('contains the reviewed sponsored catalogue with unique canonical feed IDs', async () => {
    expect(PYTH_SOLANA_SPONSORED_FEEDS).toHaveLength(64);
    expect(new Set(PYTH_SOLANA_SPONSORED_FEEDS.map((feed) => feed.id)).size).toBe(64);
    expect(PYTH_SOLANA_SPONSORED_FEEDS.every((feed) => /^[a-f0-9]{64}$/.test(feed.id))).toBe(true);
    expect(resolvePythSolanaFeed('SOL')?.alias).toBe('SOL/USD');
    expect(resolvePythSolanaFeed('JITOSOL/SOL.RR')?.alias).toBe('JITOSOL/SOL.RR');
    expect(resolvePythSolanaFeed('NOT_A_FEED')).toBeNull();
    await expect(derivePythSolanaPriceFeedAccount(resolvePythSolanaFeed('SOL')!.id)).resolves.toBe(
      '7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE'
    );
  });
});

describe('PythSolanaOnChainService', () => {
  const sol = resolvePythSolanaFeed('SOL');

  beforeAll(() => {
    if (!sol) throw new Error('SOL must be present in the sponsored registry');
  });

  it('accepts a fresh, fully verified Pyth Core account and retains provenance', async () => {
    const fetcher = jest.fn(async (_url: string, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as { id: string; method: string };
      if (request.method === 'getGenesisHash') return rpcResponse(request.id, MAINNET_GENESIS_HASH);
      return rpcResponse(request.id, {
        context: { slot: 123_456_789 },
        value: [priceUpdateAccount(sol!.id)],
      });
    });
    const service = new PythSolanaOnChainService({
      endpoints: () => ['https://rpc.example.test'],
      fetcher: fetcher as unknown as typeof fetch,
      now: () => NOW_SECONDS * 1000,
    });

    const result = await service.getPrice(sol!);

    expect(result).toMatchObject({
      symbol: 'SOL/USD',
      feedId: `0x${sol!.id}`,
      price: 151.23456789,
      conf: 0.06,
      exponent: -8,
      publishTime: NOW_SECONDS - 10,
      accountOwner: PYTH_SOLANA_PRICE_UPDATE_OWNER_PROGRAM_ID,
      postedSlot: '987654321',
      observationSlot: 123_456_789,
      accountDataHash: expect.stringMatching(/^0x[a-f0-9]{64}$/),
    });
    expect(result.confidenceRatio).toBeCloseTo(0.00039673, 8);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('rejects an account that is not owned by Pyth Core', async () => {
    const fetcher = jest.fn(async (_url: string, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as { id: string; method: string };
      if (request.method === 'getGenesisHash') return rpcResponse(request.id, MAINNET_GENESIS_HASH);
      return rpcResponse(request.id, {
        context: { slot: 123_456_789 },
        value: [priceUpdateAccount(sol!.id, 'NotThePythProgram1111111111111111111111111111')],
      });
    });
    const service = new PythSolanaOnChainService({
      endpoints: () => ['https://rpc.example.test'],
      fetcher: fetcher as unknown as typeof fetch,
      now: () => NOW_SECONDS * 1000,
    });

    await expect(service.getPrice(sol!)).rejects.toThrow('unavailable or unusable');
  });
});

describe('PythClient on Solana', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns a Solana-native evidence record rather than an HTTP price claim', async () => {
    const publishedAt = Math.floor(Date.now() / 1000) - 10;
    jest.spyOn(pythSolanaOnChainService, 'getPrice').mockResolvedValue({
      symbol: 'SOL/USD',
      feedId: `0x${resolvePythSolanaFeed('SOL')!.id}`,
      price: 151.23456789,
      conf: 0.06,
      exponent: -8,
      publishTime: publishedAt,
      timestamp: publishedAt * 1000,
      confidenceRatio: 0.00039673,
      maxAgeSeconds: 120,
      priceDeviationPercent: 0.5,
      accountAddress: '7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE',
      accountOwner: PYTH_SOLANA_PRICE_UPDATE_OWNER_PROGRAM_ID,
      postedSlot: '987654321',
      observationSlot: 123_456_789,
      accountDataHash: `0x${'a'.repeat(64)}`,
    });
    const client = new PythClient();

    const result = await client.getPrice('SOL', Blockchain.SOLANA);

    expect(result).toMatchObject({
      provider: OracleProvider.PYTH,
      chain: Blockchain.SOLANA,
      symbol: 'SOL/USD',
      feedId: `0x${resolvePythSolanaFeed('SOL')!.id}`,
      verification: {
        contractAddress: '7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE',
        chainId: 0,
        blockNumber: 123_456_789,
        sourceTimestamp: publishedAt,
        assetId: `0x${'a'.repeat(64)}`,
      },
    });
    expect(client.getSupportedChainsForSymbol('SOL')).toEqual([
      Blockchain.MONAD,
      Blockchain.SOLANA,
    ]);
  });
});
