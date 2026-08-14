import { WINkLinkClient } from '@/lib/oracles/clients/winklink';
import { getWINkLinkRealDataService } from '@/lib/oracles/services/winklinkRealDataService';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

jest.mock('@/lib/oracles/services/winklinkRealDataService');
jest.mock('@/lib/oracles/base/databaseOperations');
jest.mock('@/lib/utils/logger', () => ({
  normalizeError: (e: unknown) => (e instanceof Error ? e : new Error(String(e))),
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

const mockRealDataService = {
  getPriceFromContract: jest.fn(),
  getHistoricalPrices: jest.fn(),
};

function createMockPriceData(symbol: string, price: number): PriceData {
  return {
    provider: OracleProvider.WINKLINK,
    symbol,
    price,
    timestamp: Date.now(),
    decimals: 8,
    confidence: 0.95,
    chain: Blockchain.TRON,
    source: 'winklink-contract',
  };
}

describe('WINkLinkClient', () => {
  let client: WINkLinkClient;

  beforeEach(() => {
    jest.clearAllMocks();
    (getWINkLinkRealDataService as jest.Mock).mockReturnValue(mockRealDataService);
    client = new WINkLinkClient();
  });

  describe('constructor', () => {
    it('should create client with default config', () => {
      expect(client.name).toBe(OracleProvider.WINKLINK);
      expect(client.supportedChains).toEqual([Blockchain.TRON]);
      expect(client.defaultUpdateIntervalMinutes).toBe(60);
    });

    it('should create client with custom config', () => {
      const customClient = new WINkLinkClient({
        useDatabase: false,
        validateData: false,
        useRealData: false,
      });
      expect(customClient).toBeInstanceOf(WINkLinkClient);
    });
  });

  describe('getSupportedSymbols', () => {
    it('should return WINkLink supported symbols', () => {
      const symbols = client.getSupportedSymbols();

      expect(Array.isArray(symbols)).toBe(true);
      expect(symbols).toContain('BTC');
      expect(symbols).toContain('ETH');
      expect(symbols).toContain('TRX');
      expect(symbols).toContain('USDT');
      expect(symbols).toContain('USDC');
      expect(symbols).toContain('WIN');
      expect(symbols).toContain('BTT');
      expect(symbols).toContain('JST');
      expect(symbols).toContain('SUN');
    });
  });

  describe('isSymbolSupported', () => {
    it('should return true for supported symbol without chain', () => {
      expect(client.isSymbolSupported('BTC')).toBe(true);
      expect(client.isSymbolSupported('ETH')).toBe(true);
      expect(client.isSymbolSupported('TRX')).toBe(true);
      expect(client.isSymbolSupported('WIN')).toBe(true);
    });

    it('should return true for supported symbol on TRON chain', () => {
      expect(client.isSymbolSupported('BTC', Blockchain.TRON)).toBe(true);
      expect(client.isSymbolSupported('ETH', Blockchain.TRON)).toBe(true);
    });

    it('should return false for unsupported symbol', () => {
      expect(client.isSymbolSupported('UNKNOWN')).toBe(false);
      expect(client.isSymbolSupported('SOL')).toBe(false);
    });

    it('should return false for supported symbol on unsupported chain', () => {
      expect(client.isSymbolSupported('BTC', Blockchain.ETHEREUM)).toBe(false);
      expect(client.isSymbolSupported('ETH', Blockchain.ARBITRUM)).toBe(false);
      expect(client.isSymbolSupported('TRX', Blockchain.SOLANA)).toBe(false);
    });

    it('should handle case-insensitive symbol check', () => {
      expect(client.isSymbolSupported('btc')).toBe(true);
      expect(client.isSymbolSupported('Eth')).toBe(true);
      expect(client.isSymbolSupported('WIN')).toBe(true);
    });

    it('should resolve symbol aliases', () => {
      expect(client.isSymbolSupported('APENFT')).toBe(true);
    });
  });

  describe('getSupportedChainsForSymbol', () => {
    it('should return TRON chain for supported symbol', () => {
      expect(client.getSupportedChainsForSymbol('BTC')).toEqual([Blockchain.TRON]);
    });

    it('should return TRON chain for WIN token', () => {
      expect(client.getSupportedChainsForSymbol('WIN')).toEqual([Blockchain.TRON]);
    });

    it('should return empty array for unsupported symbol', () => {
      expect(client.getSupportedChainsForSymbol('UNKNOWN')).toEqual([]);
    });
  });

  describe('getPrice', () => {
    it('should fetch price from real data service for BTC', async () => {
      mockRealDataService.getPriceFromContract.mockResolvedValue(createMockPriceData('BTC', 45000));

      const result = await client.getPrice('BTC');

      expect(getWINkLinkRealDataService).toHaveBeenCalled();
      expect(mockRealDataService.getPriceFromContract).toHaveBeenCalledWith(
        'BTC',
        undefined,
        undefined
      );
      expect(result.provider).toBe(OracleProvider.WINKLINK);
      expect(result.symbol).toBe('BTC');
      expect(result.price).toBe(45000);
      expect(result.chain).toBe(Blockchain.TRON);
    });

    it('should fetch price for ETH', async () => {
      mockRealDataService.getPriceFromContract.mockResolvedValue(createMockPriceData('ETH', 3000));

      const result = await client.getPrice('ETH');

      expect(result.symbol).toBe('ETH');
      expect(result.price).toBe(3000);
    });

    it('should fetch price for TRX', async () => {
      mockRealDataService.getPriceFromContract.mockResolvedValue(createMockPriceData('TRX', 0.08));

      const result = await client.getPrice('TRX');

      expect(result.symbol).toBe('TRX');
      expect(result.price).toBe(0.08);
    });

    it('should normalize lowercase symbols', async () => {
      mockRealDataService.getPriceFromContract.mockResolvedValue(createMockPriceData('BTC', 45000));

      const result = await client.getPrice('btc');

      expect(mockRealDataService.getPriceFromContract).toHaveBeenCalledWith(
        'BTC',
        undefined,
        undefined
      );
      expect(result.symbol).toBe('BTC');
    });

    it('should resolve symbol aliases before calling contract', async () => {
      mockRealDataService.getPriceFromContract.mockResolvedValue(
        createMockPriceData('NFT', 0.000001)
      );

      const result = await client.getPrice('APENFT');

      expect(mockRealDataService.getPriceFromContract).toHaveBeenCalledWith(
        'NFT',
        undefined,
        undefined
      );
      expect(result.symbol).toBe('NFT');
    });

    it('should pass abort signal to real data service', async () => {
      const controller = new AbortController();
      mockRealDataService.getPriceFromContract.mockResolvedValue(createMockPriceData('BTC', 45000));

      await client.getPrice('BTC', undefined, { signal: controller.signal });

      expect(mockRealDataService.getPriceFromContract).toHaveBeenCalledWith(
        'BTC',
        undefined,
        controller.signal
      );
    });

    it('should return 24h change data when provided by service', async () => {
      mockRealDataService.getPriceFromContract.mockResolvedValue({
        ...createMockPriceData('BTC', 45000),
        change24h: 500,
        change24hPercent: 1.12,
      });

      const result = await client.getPrice('BTC');

      expect(result.change24h).toBe(500);
      expect(result.change24hPercent).toBe(1.12);
    });
  });

  describe('getPrice - WIN token', () => {
    it('should reject WIN token with NO_DATA_AVAILABLE', async () => {
      await expect(client.getPrice('WIN')).rejects.toMatchObject({
        code: 'NO_DATA_AVAILABLE',
      });
      expect(mockRealDataService.getPriceFromContract).not.toHaveBeenCalled();
    });

    it('should reject lowercase win token', async () => {
      await expect(client.getPrice('win')).rejects.toMatchObject({
        code: 'NO_DATA_AVAILABLE',
      });
    });
  });

  describe('getPrice - error handling', () => {
    it('should throw NO_DATA_AVAILABLE when service returns null', async () => {
      mockRealDataService.getPriceFromContract.mockResolvedValue(null);

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'NO_DATA_AVAILABLE',
      });
    });

    it('should throw WINKLINK_ERROR when service throws', async () => {
      mockRealDataService.getPriceFromContract.mockRejectedValue(new Error('RPC failure'));

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'WINKLINK_ERROR',
      });
    });

    it('should throw NETWORK_ERROR when signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        client.getPrice('BTC', undefined, { signal: controller.signal })
      ).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
      });
      expect(mockRealDataService.getPriceFromContract).not.toHaveBeenCalled();
    });

    it('should throw INVALID_SYMBOL for empty symbol', async () => {
      await expect(client.getPrice('')).rejects.toMatchObject({
        code: 'INVALID_SYMBOL',
      });
    });
  });

  describe('getHistoricalPrices', () => {
    it('should always return an empty array', async () => {
      const result = await client.getHistoricalPrices('BTC');

      expect(result).toEqual([]);
    });

    it('should return empty array for TRON chain', async () => {
      const result = await client.getHistoricalPrices('BTC', Blockchain.TRON);

      expect(result).toEqual([]);
    });

    it('should return empty array for custom period', async () => {
      const result = await client.getHistoricalPrices('BTC', Blockchain.TRON, 48);

      expect(result).toEqual([]);
    });

    it('should return empty array for WIN token', async () => {
      const result = await client.getHistoricalPrices('WIN');

      expect(result).toEqual([]);
    });

    it('should not call real data service historical prices method', async () => {
      await client.getHistoricalPrices('BTC');

      expect(mockRealDataService.getHistoricalPrices).not.toHaveBeenCalled();
    });
  });

  describe('TRON ecosystem integration', () => {
    it('should only support TRON chain', () => {
      expect(client.supportedChains).toHaveLength(1);
      expect(client.supportedChains).toContain(Blockchain.TRON);
    });

    it('should reject non-TRON chains for symbol support', () => {
      expect(client.isSymbolSupported('BTC', Blockchain.ETHEREUM)).toBe(false);
      expect(client.isSymbolSupported('ETH', Blockchain.ARBITRUM)).toBe(false);
      expect(client.isSymbolSupported('TRX', Blockchain.SOLANA)).toBe(false);
    });

    it('should accept TRON chain for supported symbols', () => {
      expect(client.isSymbolSupported('BTC', Blockchain.TRON)).toBe(true);
      expect(client.isSymbolSupported('ETH', Blockchain.TRON)).toBe(true);
      expect(client.isSymbolSupported('TRX', Blockchain.TRON)).toBe(true);
    });
  });

  describe('Real data service integration', () => {
    it('should call getWINkLinkRealDataService singleton for getPrice', async () => {
      mockRealDataService.getPriceFromContract.mockResolvedValue(createMockPriceData('BTC', 45000));

      await client.getPrice('BTC');

      expect(getWINkLinkRealDataService).toHaveBeenCalled();
    });

    it('should use same service instance for multiple getPrice calls', async () => {
      mockRealDataService.getPriceFromContract.mockResolvedValue(createMockPriceData('BTC', 45000));

      await client.getPrice('BTC');
      await client.getPrice('ETH');

      expect(getWINkLinkRealDataService).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle symbol with special characters', async () => {
      mockRealDataService.getPriceFromContract.mockResolvedValue(null);

      await expect(client.getPrice('BTC-USD')).rejects.toMatchObject({
        code: 'NO_DATA_AVAILABLE',
      });
    });

    it('should handle very long symbol', async () => {
      mockRealDataService.getPriceFromContract.mockResolvedValue(null);

      await expect(client.getPrice('VERYLONGSYMBOL')).rejects.toMatchObject({
        code: 'NO_DATA_AVAILABLE',
      });
    });

    it('should handle concurrent price requests', async () => {
      mockRealDataService.getPriceFromContract.mockImplementation((symbol: string) =>
        Promise.resolve(createMockPriceData(symbol, 1))
      );

      const symbols = ['BTC', 'ETH', 'TRX'];
      const results = await Promise.all(symbols.map((s) => client.getPrice(s)));

      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.provider).toBe(OracleProvider.WINKLINK);
      });
    });
  });

  describe('Price data format validation', () => {
    it('should return price data with all required fields', async () => {
      mockRealDataService.getPriceFromContract.mockResolvedValue(createMockPriceData('BTC', 45000));

      const result = await client.getPrice('BTC');

      expect(result).toHaveProperty('provider');
      expect(result).toHaveProperty('symbol');
      expect(result).toHaveProperty('price');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('chain');
    });
  });
});
