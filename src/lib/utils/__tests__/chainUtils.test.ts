import { Blockchain } from '@/types/oracle';

import {
  formatChainName,
  getChainShortName,
  isBlockchain,
  assertBlockchain,
  safeBlockchainCast,
  getSupportedChainsForOracle,
  getOraclesSupportingChain,
  isChainSupportedByOracle,
} from '../chainUtils';

describe('chainUtils', () => {
  describe('formatChainName', () => {
    it('should format Ethereum correctly', () => {
      expect(formatChainName(Blockchain.ETHEREUM)).toBe('Ethereum');
    });

    it('should format BNB Chain correctly', () => {
      expect(formatChainName(Blockchain.BNB_CHAIN)).toBe('Bnb Chain');
    });

    it('should format unknown chain', () => {
      expect(formatChainName('unknown' as Blockchain)).toBe('Unknown');
    });
  });

  describe('getChainShortName', () => {
    it('should return ETH for Ethereum', () => {
      expect(getChainShortName(Blockchain.ETHEREUM)).toBe('ETH');
    });

    it('should return SOL for Solana', () => {
      expect(getChainShortName(Blockchain.SOLANA)).toBe('SOL');
    });

    it('should return BNB for BNB Chain', () => {
      expect(getChainShortName(Blockchain.BNB_CHAIN)).toBe('BNB');
    });
  });

  describe('isBlockchain', () => {
    it('should return true for valid blockchain', () => {
      expect(isBlockchain(Blockchain.ETHEREUM)).toBe(true);
    });

    it('should return false for invalid blockchain', () => {
      expect(isBlockchain('invalid')).toBe(false);
    });

    it('should return false for non-string value', () => {
      expect(isBlockchain(123)).toBe(false);
    });
  });

  describe('assertBlockchain', () => {
    it('should return blockchain for valid value', () => {
      expect(assertBlockchain(Blockchain.ETHEREUM)).toBe(Blockchain.ETHEREUM);
    });

    it('should throw error for invalid value', () => {
      expect(() => assertBlockchain('invalid')).toThrow('Invalid Blockchain value');
    });

    it('should include context in error message', () => {
      expect(() => assertBlockchain('invalid', 'test context')).toThrow(
        'Invalid Blockchain value: "invalid" in test context'
      );
    });
  });

  describe('safeBlockchainCast', () => {
    it('should return value for valid blockchain', () => {
      expect(safeBlockchainCast(Blockchain.ETHEREUM)).toBe(Blockchain.ETHEREUM);
    });

    it('should return undefined for invalid value without fallback', () => {
      expect(safeBlockchainCast('invalid')).toBeUndefined();
    });

    it('should return fallback for invalid value with fallback', () => {
      expect(safeBlockchainCast('invalid', Blockchain.ETHEREUM)).toBe(Blockchain.ETHEREUM);
    });
  });

  describe('getSupportedChainsForOracle', () => {
    it('should return array of supported chains', () => {
      const chains = getSupportedChainsForOracle('chainlink');
      expect(Array.isArray(chains)).toBe(true);
    });
  });

  describe('getOraclesSupportingChain', () => {
    it('should return array of oracle providers', () => {
      const oracles = getOraclesSupportingChain(Blockchain.ETHEREUM);
      expect(Array.isArray(oracles)).toBe(true);
    });
  });

  describe('isChainSupportedByOracle', () => {
    it('should return boolean', () => {
      const result = isChainSupportedByOracle(Blockchain.ETHEREUM, 'chainlink');
      expect(typeof result).toBe('boolean');
    });
  });
});
