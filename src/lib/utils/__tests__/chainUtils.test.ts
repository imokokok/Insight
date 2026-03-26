import {
  formatChainName,
  getChainColor,
  getChainIcon,
  isEVMChain,
  isCosmosChain,
  getChainExplorerUrl,
  getChainNativeToken,
  getChainRpcUrl,
  validateChainId,
  getSupportedChains,
  getChainById,
} from '../chainUtils';
import { Blockchain } from '@/types/oracle';

describe('chainUtils', () => {
  describe('formatChainName', () => {
    it('should format Ethereum correctly', () => {
      expect(formatChainName(Blockchain.ETHEREUM)).toBe('Ethereum');
    });

    it('should format BNB Chain correctly', () => {
      expect(formatChainName(Blockchain.BNB_CHAIN)).toBe('BNB Chain');
    });

    it('should format unknown chain', () => {
      expect(formatChainName('unknown' as Blockchain)).toBe('Unknown');
    });
  });

  describe('getChainColor', () => {
    it('should return color for Ethereum', () => {
      const color = getChainColor(Blockchain.ETHEREUM);
      expect(color).toBeDefined();
      expect(typeof color).toBe('string');
    });

    it('should return color for Polygon', () => {
      const color = getChainColor(Blockchain.POLYGON);
      expect(color).toBeDefined();
    });

    it('should return default color for unknown chain', () => {
      const color = getChainColor('unknown' as Blockchain);
      expect(color).toBe('#6B7280');
    });
  });

  describe('getChainIcon', () => {
    it('should return icon for Ethereum', () => {
      const icon = getChainIcon(Blockchain.ETHEREUM);
      expect(icon).toBeDefined();
    });

    it('should return default icon for unknown chain', () => {
      const icon = getChainIcon('unknown' as Blockchain);
      expect(icon).toBeDefined();
    });
  });

  describe('isEVMChain', () => {
    it('should return true for Ethereum', () => {
      expect(isEVMChain(Blockchain.ETHEREUM)).toBe(true);
    });

    it('should return true for Polygon', () => {
      expect(isEVMChain(Blockchain.POLYGON)).toBe(true);
    });

    it('should return true for Arbitrum', () => {
      expect(isEVMChain(Blockchain.ARBITRUM)).toBe(true);
    });

    it('should return false for Solana', () => {
      expect(isEVMChain(Blockchain.SOLANA)).toBe(false);
    });

    it('should return false for Cosmos', () => {
      expect(isEVMChain(Blockchain.COSMOS)).toBe(false);
    });
  });

  describe('isCosmosChain', () => {
    it('should return true for Cosmos', () => {
      expect(isCosmosChain(Blockchain.COSMOS)).toBe(true);
    });

    it('should return true for Osmosis', () => {
      expect(isCosmosChain(Blockchain.OSMOSIS)).toBe(true);
    });

    it('should return false for Ethereum', () => {
      expect(isCosmosChain(Blockchain.ETHEREUM)).toBe(false);
    });

    it('should return false for Solana', () => {
      expect(isCosmosChain(Blockchain.SOLANA)).toBe(false);
    });
  });

  describe('getChainExplorerUrl', () => {
    it('should return Etherscan URL for Ethereum', () => {
      const url = getChainExplorerUrl(Blockchain.ETHEREUM);
      expect(url).toContain('etherscan.io');
    });

    it('should return Polygonscan URL for Polygon', () => {
      const url = getChainExplorerUrl(Blockchain.POLYGON);
      expect(url).toContain('polygonscan.com');
    });

    it('should return empty string for unknown chain', () => {
      const url = getChainExplorerUrl('unknown' as Blockchain);
      expect(url).toBe('');
    });
  });

  describe('getChainNativeToken', () => {
    it('should return ETH for Ethereum', () => {
      expect(getChainNativeToken(Blockchain.ETHEREUM)).toBe('ETH');
    });

    it('should return MATIC for Polygon', () => {
      expect(getChainNativeToken(Blockchain.POLYGON)).toBe('MATIC');
    });

    it('should return BNB for BNB Chain', () => {
      expect(getChainNativeToken(Blockchain.BNB_CHAIN)).toBe('BNB');
    });

    it('should return SOL for Solana', () => {
      expect(getChainNativeToken(Blockchain.SOLANA)).toBe('SOL');
    });

    it('should return empty string for unknown chain', () => {
      expect(getChainNativeToken('unknown' as Blockchain)).toBe('');
    });
  });

  describe('getChainRpcUrl', () => {
    it('should return RPC URL for Ethereum', () => {
      const url = getChainRpcUrl(Blockchain.ETHEREUM);
      expect(url).toBeDefined();
      expect(typeof url).toBe('string');
    });

    it('should return empty string for unknown chain', () => {
      const url = getChainRpcUrl('unknown' as Blockchain);
      expect(url).toBe('');
    });
  });

  describe('validateChainId', () => {
    it('should return true for valid Ethereum chain ID', () => {
      expect(validateChainId(1)).toBe(true);
    });

    it('should return true for valid Polygon chain ID', () => {
      expect(validateChainId(137)).toBe(true);
    });

    it('should return false for invalid chain ID', () => {
      expect(validateChainId(999999)).toBe(false);
    });

    it('should return false for negative chain ID', () => {
      expect(validateChainId(-1)).toBe(false);
    });
  });

  describe('getSupportedChains', () => {
    it('should return array of supported chains', () => {
      const chains = getSupportedChains();
      expect(Array.isArray(chains)).toBe(true);
      expect(chains.length).toBeGreaterThan(0);
    });

    it('should include Ethereum', () => {
      const chains = getSupportedChains();
      expect(chains).toContain(Blockchain.ETHEREUM);
    });

    it('should include Polygon', () => {
      const chains = getSupportedChains();
      expect(chains).toContain(Blockchain.POLYGON);
    });
  });

  describe('getChainById', () => {
    it('should return Ethereum for chain ID 1', () => {
      expect(getChainById(1)).toBe(Blockchain.ETHEREUM);
    });

    it('should return Polygon for chain ID 137', () => {
      expect(getChainById(137)).toBe(Blockchain.POLYGON);
    });

    it('should return null for unknown chain ID', () => {
      expect(getChainById(999999)).toBeNull();
    });
  });
});
