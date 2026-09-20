import { InternalError, UnsupportedSymbolError } from '@/lib/errors';
import * as factory from '@/lib/oracles/factory';
import * as dynamicFeedResolver from '@/lib/oracles/utils/dynamicFeedResolver';
import { OracleProvider, Blockchain } from '@/types/oracle';

import { getConsensusPrice, resolveProvidersForSymbol } from '../consensusPriceService';

jest.mock('@/lib/oracles/utils/dynamicFeedResolver', () => ({
  getAllActiveFeedsByProviderWithStatus: jest.fn(),
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

const getAllActiveFeedsByProviderWithStatus =
  dynamicFeedResolver.getAllActiveFeedsByProviderWithStatus as jest.Mock;
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
    getAllActiveFeedsByProviderWithStatus.mockResolvedValue({
      feeds: new Map<string, unknown[]>([
        [OracleProvider.API3, [{ symbol: 'ETH/EUR', chain_id: 1 }]],
        [OracleProvider.CHAINLINK, [{ symbol: 'ETH/USD', chain_id: 8453 }]],
      ]),
      errored: false,
    });
    expect(await resolveProvidersForSymbol('ETH', Blockchain.ETHEREUM)).toEqual([]);
  });

  it('includes a provider that has a DB-verified active feed on the specific chain even when the static list lags', async () => {
    // API3 AERO is sponsored on Base (chain_id 8453) and live in oracle_feeds,
    // but the static API3_AVAILABLE_PAIRS table has not been synced yet.
    getAllActiveFeedsByProviderWithStatus.mockResolvedValue({
      feeds: new Map<string, unknown[]>([
        [OracleProvider.API3, [{ symbol: 'AERO/USD', chain_id: 8453 }]],
      ]),
      errored: false,
    });

    const providers = await resolveProvidersForSymbol('AERO', Blockchain.BASE);

    expect(providers).toContain(OracleProvider.API3);
  });

  it('still excludes a chain-specific provider served only via a chain-agnostic (chain_id=0) feed', async () => {
    // Reflector only serves Stellar; a chain_id=0 feed must NOT let it be
    // activated on Ethereum. This preserves the guard the original gate relied on.
    getAllActiveFeedsByProviderWithStatus.mockResolvedValue({
      feeds: new Map<string, unknown[]>([
        [OracleProvider.REFLECTOR, [{ symbol: 'XLM/USD', chain_id: 0 }]],
      ]),
      errored: false,
    });

    const providers = await resolveProvidersForSymbol('XLM', Blockchain.ETHEREUM);

    expect(providers).not.toContain(OracleProvider.REFLECTOR);
  });

  it('does not admit a provider with no DB feed and no static support', async () => {
    getAllActiveFeedsByProviderWithStatus.mockResolvedValue({ feeds: new Map(), errored: false });

    const providers = await resolveProvidersForSymbol('GHOST', Blockchain.ETHEREUM);

    expect(providers).not.toContain(OracleProvider.API3);
  });

  it('keeps including a provider when both DB feed and static list agree', async () => {
    getAllActiveFeedsByProviderWithStatus.mockResolvedValue({
      feeds: new Map<string, unknown[]>([
        [OracleProvider.API3, [{ symbol: 'AERO/USD', chain_id: 8453 }]],
      ]),
      errored: false,
    });
    isSymbolSupported.mockImplementation(
      (symbol: string, chain?: Blockchain) => symbol === 'AERO' && chain === Blockchain.BASE
    );

    const providers = await resolveProvidersForSymbol('AERO', Blockchain.BASE);

    expect(providers).toContain(OracleProvider.API3);
  });

  it('does not revive a statically supported provider after a successful empty registry read', async () => {
    getAllActiveFeedsByProviderWithStatus.mockResolvedValue({ feeds: new Map(), errored: false });
    isSymbolSupported.mockReturnValue(true);

    const providers = await resolveProvidersForSymbol('ETH', Blockchain.ETHEREUM);

    expect(providers).toEqual([]);
  });

  it('uses the curated static list only when the registry read failed', async () => {
    getAllActiveFeedsByProviderWithStatus.mockResolvedValue({ feeds: new Map(), errored: true });
    isSymbolSupported.mockImplementation(
      (symbol: string, chain?: Blockchain) => symbol === 'ETH' && chain === Blockchain.ETHEREUM
    );

    const providers = await resolveProvidersForSymbol('ETH', Blockchain.ETHEREUM);

    expect(providers).toContain(OracleProvider.API3);
  });
});

describe('getConsensusPrice failure semantics', () => {
  beforeEach(() => {
    getAllActiveFeedsByProviderWithStatus.mockResolvedValue({
      feeds: new Map<string, unknown[]>([
        [OracleProvider.API3, [{ symbol: 'AERO/USD', chain_id: 8453 }]],
      ]),
      errored: false,
    });
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

  it('exposes unsigned Switchboard simulation without counting it toward quorum', async () => {
    getAllActiveFeedsByProviderWithStatus.mockResolvedValue({
      feeds: new Map<string, unknown[]>([
        [OracleProvider.SWITCHBOARD, [{ symbol: 'AERO/USD', chain_id: 0 }]],
      ]),
      errored: false,
    });
    isSymbolSupported.mockImplementation(
      (_symbol: string, chain?: Blockchain) => chain === Blockchain.BASE
    );
    mockFetchPriceWithDatabase.mockResolvedValue({
      provider: OracleProvider.SWITCHBOARD,
      symbol: 'AERO',
      chain: Blockchain.BASE,
      price: 0.75,
      timestamp: Date.now(),
      source: 'switchboard-simulation',
      verificationLevel: 'unsigned',
      countsTowardOracleQuorum: false,
    });

    const result = await getConsensusPrice('AERO', Blockchain.BASE, undefined, undefined, {
      allowUnavailable: true,
    });

    expect(result.participantCount).toBe(0);
    expect(result.excludedProviders).toContain(OracleProvider.SWITCHBOARD);
    expect(result.providers[0]).toMatchObject({
      status: 'success',
      verificationLevel: 'unsigned',
      countsTowardOracleQuorum: false,
      isOutlier: true,
    });
  });
});

describe('concurrent public source reads', () => {
  it('starts price reads before slow reputation lookup and shares only in-flight reads', async () => {
    getAllActiveFeedsByProviderWithStatus.mockResolvedValue({
      feeds: new Map([[OracleProvider.API3, [{ symbol: 'AERO/USD', chain_id: 8453 }]]]),
      errored: false,
    });
    let releasePrice!: (value: unknown) => void;
    let releaseReputation!: (value: unknown[]) => void;
    const price = new Promise((resolve) => {
      releasePrice = resolve;
    });
    const reputations = new Promise<unknown[]>((resolve) => {
      releaseReputation = resolve;
    });
    mockFetchPriceWithDatabase.mockReturnValue(price);
    mockGetReputations.mockReturnValue(reputations);
    const first = getConsensusPrice('AERO', Blockchain.BASE);
    const second = getConsensusPrice('aero', Blockchain.BASE);
    for (let i = 0; i < 8; i++) await Promise.resolve();
    expect(mockFetchPriceWithDatabase).toHaveBeenCalledTimes(1);
    releasePrice({
      provider: OracleProvider.API3,
      symbol: 'AERO',
      price: 1,
      timestamp: Date.now(),
    });
    releaseReputation([]);
    const results = await Promise.all([first, second]);
    expect(results[0].providers[0].fetchDurationMs).toEqual(expect.any(Number));
    await getConsensusPrice('AERO', Blockchain.BASE);
    expect(mockFetchPriceWithDatabase).toHaveBeenCalledTimes(2);
  });
});

describe('getConsensusPrice provider scoping', () => {
  it('fetches and computes consensus only from explicitly targeted providers', async () => {
    getAllActiveFeedsByProviderWithStatus.mockResolvedValue({
      feeds: new Map<string, unknown[]>([
        [OracleProvider.API3, [{ symbol: 'ETH/USD', chain_id: 1 }]],
        [OracleProvider.CHAINLINK, [{ symbol: 'ETH/USD', chain_id: 1 }]],
      ]),
      errored: false,
    });
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
