import { Blockchain, OracleProvider } from '@/types/oracle';

import { parseQueryParams, updateUrlParams } from '../urlParams';

describe('urlParams', () => {
  describe('parseQueryParams', () => {
    describe('oracles parameter', () => {
      it('should parse single oracle', () => {
        const result = parseQueryParams('?oracles=chainlink');

        expect(result.oracles).toEqual(['chainlink']);
      });

      it('should parse multiple oracles', () => {
        const result = parseQueryParams('?oracles=chainlink,pyth,api3');

        expect(result.oracles).toEqual(['chainlink', 'pyth', 'api3']);
      });

      it('should ignore invalid oracle values', () => {
        const result = parseQueryParams('?oracles=chainlink,invalid,pyth');

        expect(result.oracles).toEqual(['chainlink', 'pyth']);
      });

      it('should handle oracle values with spaces', () => {
        const result = parseQueryParams('?oracles=chainlink, pyth , api3');

        expect(result.oracles).toEqual(['chainlink', 'pyth', 'api3']);
      });

      it('should handle case-insensitive oracle values', () => {
        const result = parseQueryParams('?oracles=CHAINLINK,Pyth');

        expect(result.oracles).toEqual(['chainlink', 'pyth']);
      });

      it('should return undefined when all oracle values are invalid', () => {
        const result = parseQueryParams('?oracles=invalid,unknown');

        expect(result.oracles).toBeUndefined();
      });
    });

    describe('chains parameter', () => {
      it('should parse single chain', () => {
        const result = parseQueryParams('?chains=ethereum');

        expect(result.chains).toEqual(['ethereum']);
      });

      it('should parse multiple chains', () => {
        const result = parseQueryParams('?chains=ethereum,solana,polygon');

        expect(result.chains).toEqual(['ethereum', 'solana', 'polygon']);
      });

      it('should ignore invalid chain values', () => {
        const result = parseQueryParams('?chains=ethereum,invalid,solana');

        expect(result.chains).toEqual(['ethereum', 'solana']);
      });

      it('should handle chain values with spaces', () => {
        const result = parseQueryParams('?chains=ethereum, solana , polygon');

        expect(result.chains).toEqual(['ethereum', 'solana', 'polygon']);
      });

      it('should handle case-insensitive chain values', () => {
        const result = parseQueryParams('?chains=ETHEREUM,Solana');

        expect(result.chains).toEqual(['ethereum', 'solana']);
      });
    });

    describe('symbol parameter', () => {
      it('should parse symbol', () => {
        const result = parseQueryParams('?symbol=btc');

        expect(result.symbol).toBe('BTC');
      });

      it('should convert symbol to uppercase', () => {
        const result = parseQueryParams('?symbol=eth');

        expect(result.symbol).toBe('ETH');
      });

      it('should trim whitespace from symbol', () => {
        const result = parseQueryParams('?symbol=  btc  ');

        expect(result.symbol).toBe('BTC');
      });

      it('should handle special characters in symbol', () => {
        const result = parseQueryParams('?symbol=BTC-USD');

        expect(result.symbol).toBe('BTC-USD');
      });
    });

    describe('timeRange parameter', () => {
      it('should parse valid time range', () => {
        const result = parseQueryParams('?timeRange=24');

        expect(result.timeRange).toBe(24);
      });

      it('should accept all valid time ranges', () => {
        const validRanges = [1, 6, 12, 24, 72, 168, 720];

        validRanges.forEach((range) => {
          const result = parseQueryParams(`?timeRange=${range}`);
          expect(result.timeRange).toBe(range);
        });
      });

      it('should ignore invalid time range', () => {
        const result = parseQueryParams('?timeRange=999');

        expect(result.timeRange).toBeUndefined();
      });

      it('should ignore non-numeric time range', () => {
        const result = parseQueryParams('?timeRange=abc');

        expect(result.timeRange).toBeUndefined();
      });
    });

    describe('multiple parameters', () => {
      it('should parse all parameters together', () => {
        const result = parseQueryParams(
          '?oracles=chainlink,pyth&chains=ethereum,solana&symbol=btc&timeRange=24'
        );

        expect(result).toEqual({
          oracles: ['chainlink', 'pyth'],
          chains: ['ethereum', 'solana'],
          symbol: 'BTC',
          timeRange: 24,
        });
      });

      it('should return empty object for empty query string', () => {
        const result = parseQueryParams('');

        expect(result).toEqual({});
      });

      it('should return empty object for query string with only ?', () => {
        const result = parseQueryParams('?');

        expect(result).toEqual({});
      });
    });

    describe('special characters handling', () => {
      it('should handle URL encoded values', () => {
        const result = parseQueryParams('?symbol=BTC%20USD');

        expect(result.symbol).toBe('BTC USD');
      });

      it('should handle empty parameter values', () => {
        const result = parseQueryParams('?symbol=&oracles=');

        expect(result.symbol).toBeUndefined();
        expect(result.oracles).toBeUndefined();
      });
    });
  });

  describe('updateUrlParams', () => {
    it('should call history.replaceState with correct URL', () => {
      const mockReplaceState = jest
        .spyOn(window.history, 'replaceState')
        .mockImplementation(() => {});

      const config = {
        oracles: [OracleProvider.CHAINLINK] as OracleProvider[],
        chains: [Blockchain.ETHEREUM] as Blockchain[],
        symbol: 'BTC',
        timeRange: 24,
      };

      updateUrlParams(config);

      expect(mockReplaceState).toHaveBeenCalled();
      const callArgs = mockReplaceState.mock.calls[0];
      expect(callArgs[2]).toContain('oracles=chainlink');

      mockReplaceState.mockRestore();
    });

    it('should handle empty config', () => {
      const mockReplaceState = jest
        .spyOn(window.history, 'replaceState')
        .mockImplementation(() => {});

      const config = {
        oracles: [] as OracleProvider[],
        chains: [] as Blockchain[],
        symbol: '',
        timeRange: 0,
      };

      updateUrlParams(config);

      expect(mockReplaceState).toHaveBeenCalled();

      mockReplaceState.mockRestore();
    });
  });
});
