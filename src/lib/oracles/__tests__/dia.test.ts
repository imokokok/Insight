import { DIAClient } from '@/lib/oracles/clients/dia';
import { diaSymbols } from '@/lib/oracles/constants/supportedSymbols';
import { OracleProvider, Blockchain } from '@/types/oracle';

jest.mock('@/lib/utils/logger', () => ({
  normalizeError: (e: unknown) => (e instanceof Error ? e : new Error(String(e))),
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('DIAClient', () => {
  let client: DIAClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new DIAClient();
  });

  describe('constructor', () => {
    it('should create client with default config', () => {
      expect(client.name).toBe(OracleProvider.DIA);
      expect(client.supportedChains).toContain(Blockchain.ETHEREUM);
      expect(client.supportedChains).toContain(Blockchain.ARBITRUM);
      expect(client.supportedChains).toContain(Blockchain.POLYGON);
      expect(client.supportedChains).toContain(Blockchain.AVALANCHE);
      expect(client.supportedChains).toContain(Blockchain.BNB_CHAIN);
      expect(client.supportedChains).toContain(Blockchain.BASE);
      expect(client.defaultUpdateIntervalMinutes).toBe(5);
    });

    it('should create client with custom config', () => {
      const customClient = new DIAClient({
        useDatabase: false,
        validateData: false,
        useRealData: false,
      });
      expect(customClient).toBeInstanceOf(DIAClient);
    });

    it('should have correct supported chains count', () => {
      expect(client.supportedChains.length).toBe(6);
    });
  });

  describe('getSupportedSymbols', () => {
    it('should return array of supported symbols', () => {
      const symbols = client.getSupportedSymbols();

      expect(Array.isArray(symbols)).toBe(true);
      expect(symbols).toContain('BTC');
      expect(symbols).toContain('ETH');
      expect(symbols).toContain('USDC');
      expect(symbols).toContain('USDT');
      expect(symbols).toContain('LINK');
      expect(symbols).toContain('UNI');
    });

    it('should return a copy of symbols array', () => {
      const symbols1 = client.getSupportedSymbols();
      const symbols2 = client.getSupportedSymbols();

      expect(symbols1).not.toBe(symbols2);
      expect(symbols1).toEqual(symbols2);
    });

    it('should match diaSymbols from supportedSymbols', () => {
      const symbols = client.getSupportedSymbols();
      expect(symbols).toEqual([...diaSymbols]);
    });
  });

  describe('isSymbolSupported', () => {
    it('should return true for supported symbol without chain', () => {
      expect(client.isSymbolSupported('BTC')).toBe(true);
      expect(client.isSymbolSupported('ETH')).toBe(true);
      expect(client.isSymbolSupported('LINK')).toBe(true);
    });

    it('should return true for supported symbol on supported chain', () => {
      expect(client.isSymbolSupported('BTC', Blockchain.ETHEREUM)).toBe(true);
      expect(client.isSymbolSupported('ETH', Blockchain.ARBITRUM)).toBe(true);
      expect(client.isSymbolSupported('LINK', Blockchain.POLYGON)).toBe(true);
    });

    it('should return true for supported symbol on all supported chains', () => {
      const supportedChains = [
        Blockchain.ETHEREUM,
        Blockchain.ARBITRUM,
        Blockchain.POLYGON,
        Blockchain.AVALANCHE,
        Blockchain.BNB_CHAIN,
        Blockchain.BASE,
      ];

      supportedChains.forEach((chain) => {
        expect(client.isSymbolSupported('ETH', chain)).toBe(true);
      });
    });

    it('should return false for unsupported symbol', () => {
      expect(client.isSymbolSupported('UNKNOWN')).toBe(false);
      expect(client.isSymbolSupported('INVALID')).toBe(false);
      expect(client.isSymbolSupported('FAKECOIN')).toBe(false);
    });

    it('should return false for unsupported symbol on supported chain', () => {
      expect(client.isSymbolSupported('UNKNOWN', Blockchain.ETHEREUM)).toBe(false);
    });

    it('should return false for supported symbol on unsupported chain', () => {
      expect(client.isSymbolSupported('BTC', Blockchain.SOLANA)).toBe(false);
      expect(client.isSymbolSupported('ETH', Blockchain.OPTIMISM)).toBe(false);
    });

    it('should handle lowercase symbols', () => {
      expect(client.isSymbolSupported('btc')).toBe(true);
      expect(client.isSymbolSupported('eth')).toBe(true);
      expect(client.isSymbolSupported('unknown')).toBe(false);
    });
  });

  describe('getSupportedChainsForSymbol', () => {
    it('should return supported chains for supported symbol', () => {
      const chains = client.getSupportedChainsForSymbol('ETH');

      expect(Array.isArray(chains)).toBe(true);
      expect(chains).toContain(Blockchain.ETHEREUM);
      expect(chains).toContain(Blockchain.ARBITRUM);
      expect(chains).toContain(Blockchain.POLYGON);
      expect(chains.length).toBe(6);
    });

    it('should return empty array for unsupported symbol', () => {
      const chains = client.getSupportedChainsForSymbol('UNKNOWN');

      expect(chains).toEqual([]);
    });

    it('should return same chains for all supported symbols', () => {
      const ethChains = client.getSupportedChainsForSymbol('ETH');
      const btcChains = client.getSupportedChainsForSymbol('BTC');
      const linkChains = client.getSupportedChainsForSymbol('LINK');

      expect(ethChains).toEqual(btcChains);
      expect(btcChains).toEqual(linkChains);
    });
  });

  describe('getHistoricalPrices', () => {
    it('should return empty array', async () => {
      const result = await client.getHistoricalPrices('ETH');
      expect(result).toEqual([]);
    });

    it('should return empty array for any symbol', async () => {
      const result = await client.getHistoricalPrices('BTC');
      expect(result).toEqual([]);
    });

    it('should return empty array regardless of chain parameter', async () => {
      const result = await client.getHistoricalPrices('ETH', Blockchain.ARBITRUM);
      expect(result).toEqual([]);
    });

    it('should return empty array regardless of period parameter', async () => {
      const result = await client.getHistoricalPrices('ETH', undefined, 48);
      expect(result).toEqual([]);
    });
  });
});
