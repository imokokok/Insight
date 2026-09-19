import { InternalError, UnsupportedSymbolError } from '@/lib/errors';
import * as factory from '@/lib/oracles/factory';
import * as dynamicFeedResolver from '@/lib/oracles/utils/dynamicFeedResolver';
import { OracleProvider, Blockchain } from '@/types/oracle';

import { getConsensusPrice, resolveProvidersForSymbol } from '../consensusPriceService';

jest.mock('@/lib/oracles/utils/dynamicFeedResolver', () => ({
  getAllActiveFeedsByProvider: jest.fn(),
}));
jest.mock('@/lib/oracles/factory', () => ({
  getDefaultFactory: jest.fn(),
}));
jest.mock('@/lib/oracles/base/databaseOperations', () => ({
  fetchPriceWithDatabase: jest.fn(),
}));
jest.mock('@/lib/oracles/services/reputationService', () => ({
  reputationService: { getReputations: jest.fn() },
}));

const mockFetchPriceWithDatabase = jest.requireMock('@/lib/oracles/base/databaseOperations')
  .fetchPriceWithDatabase as jest.Mock;
const mockGetReputations = jest.requireMock('@/lib/oracles/services/reputationService')
  .reputationService.getReputations as jest.Mock;

const getAllActiveFeedsByProvider = dynamicFeedResolver.getAllActiveFeedsByProvider as jest.Mock;
const getDefaultFactory = factory.getDefaultFactory as jest.Mock;

const getClient = jest.fn();
const isSymbolSupported = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  getClient.mockReturnValue({ isSymbolSupported });
  getDefaultFactory.mockReturnValue({ getClient });
  // Default: the curated static list knows nothing (simulates a stale list
  // that lags the DB). Individual tests override per-provider as needed.
  isSymbolSupported.mockReturnValue(false);
  mockGetReputations.mockResolvedValue([]);
});

describe('resolveProvidersForSymbol', () => {
  it('does not treat another quote currency or another chain as registered USD coverage', async () => {
    getAllActiveFeedsByProvider.mockResolvedValue(
      new Map<string, unknown[]>([
        [OracleProvider.API3, [{ symbol: 'ETH/EUR', chain_id: 1 }]],
        [OracleProvider.CHAINLINK, [{ symbol: 'ETH/USD', chain_id: 8453 }]],
      ])
    );
    expect(await resolveProvidersForSymbol('ETH', Blockchain.ETHEREUM)).toEqual([]);
  });

  it('includes a provider that has a DB-verified active feed on the specific chain even when the static list lags', async () => {
    // API3 AERO is sponsored on Base (chain_id 8453) and live in oracle_feeds,
    // but the static API3_AVAILABLE_PAIRS table has not been synced yet.
    getAllActiveFeedsByProvider.mockResolvedValue(
      new Map<string, unknown[]>([[OracleProvider.API3, [{ symbol: 'AERO/USD', chain_id: 8453 }]]])
    );

    const providers = await resolveProvidersForSymbol('AERO', Blockchain.BASE);

    expect(providers).toContain(OracleProvider.API3);
  });

  it('still excludes a chain-specific provider served only via a chain-agnostic (chain_id=0) feed', async () => {
    // Reflector only serves Stellar; a chain_id=0 feed must NOT let it be
    // activated on Ethereum. This preserves the guard the original gate relied on.
    getAllActiveFeedsByProvider.mockResolvedValue(
      new Map<string, unknown[]>([[OracleProvider.REFLECTOR, [{ symbol: 'XLM/USD', chain_id: 0 }]]])
    );

    const providers = await resolveProvidersForSymbol('XLM', Blockchain.ETHEREUM);

    expect(providers).not.toContain(OracleProvider.REFLECTOR);
  });

  it('does not admit a provider with no DB feed and no static support', async () => {
    getAllActiveFeedsByProvider.mockResolvedValue(new Map());

    const providers = await resolveProvidersForSymbol('GHOST', Blockchain.ETHEREUM);

    expect(providers).not.toContain(OracleProvider.API3);
  });

  it('keeps including a provider when both DB feed and static list agree', async () => {
    getAllActiveFeedsByProvider.mockResolvedValue(
      new Map<string, unknown[]>([[OracleProvider.API3, [{ symbol: 'AERO/USD', chain_id: 8453 }]]])
    );
    isSymbolSupported.mockImplementation(
      (symbol: string, chain?: Blockchain) => symbol === 'AERO' && chain === Blockchain.BASE
    );

    const providers = await resolveProvidersForSymbol('AERO', Blockchain.BASE);

    expect(providers).toContain(OracleProvider.API3);
  });
});

describe('getConsensusPrice failure semantics', () => {
  beforeEach(() => {
    getAllActiveFeedsByProvider.mockResolvedValue(
      new Map<string, unknown[]>([[OracleProvider.API3, [{ symbol: 'AERO/USD', chain_id: 8453 }]]])
    );
  });

  it('fails explicitly when every configured provider fetch fails', async () => {
    mockFetchPriceWithDatabase.mockRejectedValue(new Error('upstream unavailable'));

    await expect(getConsensusPrice('AERO', Blockchain.BASE)).rejects.toBeInstanceOf(InternalError);
  });

  it('keeps true no-coverage distinct from an upstream outage', async () => {
    mockFetchPriceWithDatabase.mockRejectedValue(
      UnsupportedSymbolError.create('AERO', [], OracleProvider.API3)
    );

    await expect(getConsensusPrice('AERO', Blockchain.BASE)).rejects.toBeInstanceOf(
      UnsupportedSymbolError
    );
  });

  it('retains per-provider failures for an explicit diagnostic probe, while ordinary checks still fail', async () => {
    mockFetchPriceWithDatabase.mockRejectedValue(new Error('upstream unavailable'));
    const probe = await getConsensusPrice('AERO', Blockchain.BASE, undefined, undefined, {
      allowUnavailable: true,
    });
    expect(probe.participantCount).toBe(0);
    expect(probe.providers).toHaveLength(1);
    expect(probe.providers[0].status).toBe('error');
    await expect(getConsensusPrice('AERO', Blockchain.BASE)).rejects.toBeInstanceOf(InternalError);
  });
});

describe('getConsensusPrice provider scoping', () => {
  it('fetches and computes consensus only from explicitly targeted providers', async () => {
    getAllActiveFeedsByProvider.mockResolvedValue(
      new Map<string, unknown[]>([
        [OracleProvider.API3, [{ symbol: 'ETH/USD', chain_id: 1 }]],
        [OracleProvider.CHAINLINK, [{ symbol: 'ETH/USD', chain_id: 1 }]],
      ])
    );
    mockFetchPriceWithDatabase.mockImplementation(async (provider: OracleProvider) => ({
      provider,
      symbol: 'ETH',
      chain: Blockchain.ETHEREUM,
      price: provider === OracleProvider.API3 ? 2000 : 5000,
      timestamp: Date.now(),
      confidence: 0.9,
    }));

    const result = await getConsensusPrice('ETH', Blockchain.ETHEREUM, undefined, [
      OracleProvider.API3,
    ]);

    expect(mockFetchPriceWithDatabase).toHaveBeenCalledTimes(1);
    expect(mockFetchPriceWithDatabase).toHaveBeenCalledWith(
      OracleProvider.API3,
      'ETH',
      Blockchain.ETHEREUM,
      true,
      false
    );
    expect(result.consensusPrice).toBe(2000);
    expect(result.participantCount).toBe(1);
    expect(result.providers.map((provider) => provider.provider)).toEqual([OracleProvider.API3]);
  });
});
