import * as factory from '@/lib/oracles/factory';
import * as dynamicFeedResolver from '@/lib/oracles/utils/dynamicFeedResolver';
import { OracleProvider, Blockchain } from '@/types/oracle';

import { resolveProvidersForSymbol } from '../consensusPriceService';

jest.mock('@/lib/oracles/utils/dynamicFeedResolver', () => ({
  getAllActiveFeedsByProvider: jest.fn(),
}));
jest.mock('@/lib/oracles/factory', () => ({
  getDefaultFactory: jest.fn(),
}));

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
});

describe('resolveProvidersForSymbol', () => {
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
