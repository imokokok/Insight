import { getDIAAssetConfigAsync } from '@/lib/oracles/constants/diaConstants';
import { fetchWithTimeout } from '@/lib/oracles/diaUtils';
import { diaPriceService } from '@/lib/oracles/services/diaPriceService';
import { OracleProvider } from '@/types/oracle';

jest.mock('@/lib/utils/logger', () => ({
  normalizeError: (e: unknown) => (e instanceof Error ? e : new Error(String(e))),
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

jest.mock('@/lib/oracles/constants/diaConstants', () => ({
  getDIAAssetConfigAsync: jest.fn(),
}));

jest.mock('@/lib/oracles/diaUtils', () => ({
  DIA_API_BASE_URL: 'https://api.diadia.org/v1',
  fetchWithTimeout: jest.fn(),
}));

const mockGetConfig = getDIAAssetConfigAsync as jest.Mock;
const mockFetch = fetchWithTimeout as jest.Mock;

function quotation(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    Symbol: 'MOCK',
    Name: 'Mock',
    Address: '0x0',
    Blockchain: 'Ethereum',
    Price: 1,
    PriceYesterday: 0.9,
    VolumeYesterdayUSD: 100,
    Time: new Date().toISOString(),
    Source: 'MOCK',
    ...overrides,
  };
}

describe('DIAPriceService symbol fallback', () => {
  beforeEach(() => jest.clearAllMocks());

  it('falls back to /v1/quotation/{symbol} when no address mapping exists', async () => {
    mockGetConfig.mockResolvedValue(null);
    mockFetch.mockResolvedValue(quotation({ Symbol: 'DOGE', Price: 0.12, PriceYesterday: 0.11 }));

    const result = await diaPriceService.getAssetPrice('DOGE');

    expect(result).not.toBeNull();
    expect(result?.provider).toBe(OracleProvider.DIA);
    expect(result?.symbol).toBe('DOGE');
    expect(result?.price).toBe(0.12);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.diadia.org/v1/quotation/DOGE',
      expect.any(Object)
    );
  });

  it('returns null when the symbol endpoint yields no price (404)', async () => {
    mockGetConfig.mockResolvedValue(null);
    mockFetch.mockResolvedValue(null);

    const result = await diaPriceService.getAssetPrice('FAKECOIN');

    expect(result).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.diadia.org/v1/quotation/FAKECOIN',
      expect.any(Object)
    );
  });

  it('still uses precise assetQuotation when a mapping exists', async () => {
    mockGetConfig.mockResolvedValue({ symbol: 'ETH', blockchain: 'Ethereum', address: '0x0' });
    mockFetch.mockResolvedValue(quotation({ Symbol: 'ETH', Price: 3000, PriceYesterday: 2950 }));

    const result = await diaPriceService.getAssetPrice('ETH');

    expect(result?.price).toBe(3000);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.diadia.org/v1/assetQuotation/Ethereum/0x0',
      expect.any(Object)
    );
  });
});
