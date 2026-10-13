import { createPublicClient, decodeFunctionResult, encodeFunctionData } from 'viem';

import { fetchChainlinkMarketReference } from '@/lib/marketReference/chainlink';
import { getChainlinkRPCConfig } from '@/lib/oracles/services/chainlinkDataSources';

import { getOnchainRouteQuote, OnchainRouteQuoteError } from '../onchainRouteQuote';

jest.mock('viem', () => {
  const actual = jest.requireActual('viem');
  return {
    ...actual,
    createPublicClient: jest.fn(),
    decodeFunctionResult: jest.fn(),
    encodeFunctionData: jest.fn(() => '0x1234'),
    http: jest.fn(() => ({})),
  };
});

jest.mock('@/lib/marketReference/chainlink', () => ({
  fetchChainlinkMarketReference: jest.fn(),
}));

jest.mock('@/lib/oracles/services/chainlinkDataSources', () => ({
  getChainlinkRPCConfig: jest.fn(),
}));

const mockCreatePublicClient = createPublicClient as jest.MockedFunction<typeof createPublicClient>;
const mockDecodeFunctionResult = decodeFunctionResult as jest.MockedFunction<
  typeof decodeFunctionResult
>;
const mockEncodeFunctionData = encodeFunctionData as jest.MockedFunction<typeof encodeFunctionData>;
const mockFetchChainlink = fetchChainlinkMarketReference as jest.MockedFunction<
  typeof fetchChainlinkMarketReference
>;
const mockGetRpcConfig = getChainlinkRPCConfig as jest.MockedFunction<typeof getChainlinkRPCConfig>;

const NOW = new Date('2026-10-13T10:00:00.000Z');
const BLOCK_HASH = `0x${'aa'.repeat(32)}` as `0x${string}`;
const BLOCK_TIMESTAMP = BigInt(Math.floor(NOW.getTime() / 1000) - 1);
const ENDPOINTS = ['https://rpc-one.example', 'https://rpc-two.example'];

function makeRpcClient(overrides: Record<string, unknown> = {}) {
  return {
    getChainId: jest.fn().mockResolvedValue(1),
    getBlockNumber: jest.fn().mockResolvedValue(23_000_000n),
    getBlock: jest.fn().mockResolvedValue({ hash: BLOCK_HASH, timestamp: BLOCK_TIMESTAMP }),
    call: jest.fn().mockResolvedValue({ data: '0x1234' }),
    ...overrides,
  };
}

function mockRpcClients(...clients: ReturnType<typeof makeRpcClient>[]) {
  for (const client of clients) mockCreatePublicClient.mockReturnValueOnce(client as never);
}

describe('getOnchainRouteQuote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRpcConfig.mockReturnValue({ endpoints: ENDPOINTS } as never);
    mockFetchChainlink.mockResolvedValue({
      provider: 'chainlink-data-feed',
      symbol: 'ETH',
      quote: 'USD',
      chainId: 1,
      feedAddress: `0x${'cc'.repeat(20)}`,
      feedPath: null,
      feedCategory: null,
      heartbeatSeconds: 3600,
      price: 2000,
      decimals: 8,
      updatedAt: new Date(NOW.getTime() - 1_000).toISOString(),
      ageSeconds: 1,
      isFresh: true,
      roundId: '123',
    });
  });

  it('quotes the exact Chainlink-sized input and records the agreed block witnesses', async () => {
    const firstClient = makeRpcClient();
    const secondClient = makeRpcClient();
    mockRpcClients(firstClient, secondClient);
    mockDecodeFunctionResult.mockReturnValue([1_000_000_000n, [], [], 1n] as never);

    const result = await getOnchainRouteQuote({
      asset: 'ETH',
      destinationAsset: 'USDC',
      chainId: 1,
      tradeAmountUsd: 1000,
      maxAgeSeconds: 30,
      now: NOW,
    });

    expect(result.price).toBeCloseTo(2000, 10);
    expect(result.observedAt).toBe(new Date(Number(BLOCK_TIMESTAMP) * 1000).toISOString());
    expect(result.evidence).toMatchObject({
      blockNumber: '23000000',
      blockHash: BLOCK_HASH,
      amountInRaw: '500000000000000000',
      amountOutRaw: '1000000000',
      rpcWitnessCount: 2,
      rpcWitnessHosts: ['rpc-one.example', 'rpc-two.example'],
    });
    expect(firstClient.call).toHaveBeenCalledTimes(1);
    expect(secondClient.call).toHaveBeenCalledTimes(1);
    expect(mockEncodeFunctionData).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'quoteExactInput',
        args: [expect.stringMatching(/^0x/), 500_000_000_000_000_000n],
      })
    );
  });

  it('fails closed when the RPC hosts disagree on the route output', async () => {
    mockRpcClients(makeRpcClient(), makeRpcClient());
    mockDecodeFunctionResult
      .mockReturnValueOnce([1_000_000_000n, [], [], 1n] as never)
      .mockReturnValueOnce([1_000_000_001n, [], [], 1n] as never);

    await expect(
      getOnchainRouteQuote({
        asset: 'ETH',
        destinationAsset: 'USDC',
        chainId: 1,
        tradeAmountUsd: 1000,
        maxAgeSeconds: 30,
        now: NOW,
      })
    ).rejects.toMatchObject({ code: 'rpc_disagreement' });
  });

  it('does not count different ports on the same host as two witnesses', async () => {
    mockGetRpcConfig.mockReturnValue({
      endpoints: ['https://same.example:8545', 'https://same.example:9545'],
    } as never);

    await expect(
      getOnchainRouteQuote({
        asset: 'ETH',
        destinationAsset: 'USDC',
        chainId: 1,
        tradeAmountUsd: 1000,
        maxAgeSeconds: 30,
        now: NOW,
      })
    ).rejects.toBeInstanceOf(OnchainRouteQuoteError);
    expect(mockCreatePublicClient).not.toHaveBeenCalled();
  });
});
