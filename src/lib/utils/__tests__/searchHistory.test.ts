import {
  getSearchHistory,
  saveSearchHistory,
  clearSearchHistory,
  removeFromSearchHistory,
} from '../searchHistory';

const STORAGE_KEY = 'oracle_insight_search_history';

describe('searchHistory', () => {
  let localStorageStore: Record<string, string> = {};

  beforeEach(() => {
    localStorageStore = {};
    jest.clearAllMocks();

    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      return localStorageStore[key] || null;
    });

    jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      localStorageStore[key] = value;
    });

    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation((key: string) => {
      delete localStorageStore[key];
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getSearchHistory', () => {
    it('should return empty array when no history exists', () => {
      const result = getSearchHistory();

      expect(result).toEqual([]);
    });

    it('should return parsed history from localStorage', () => {
      const history = [
        { symbol: 'BTC', timestamp: Date.now() - 1000 },
        { symbol: 'ETH', timestamp: Date.now() - 2000 },
      ];
      localStorageStore[STORAGE_KEY] = JSON.stringify(history);

      const result = getSearchHistory();

      expect(result).toHaveLength(2);
      expect(result[0].symbol).toBe('BTC');
      expect(result[1].symbol).toBe('ETH');
    });

    it('should sort history by timestamp descending', () => {
      const history = [
        { symbol: 'ETH', timestamp: 1000 },
        { symbol: 'BTC', timestamp: 3000 },
        { symbol: 'SOL', timestamp: 2000 },
      ];
      localStorageStore[STORAGE_KEY] = JSON.stringify(history);

      const result = getSearchHistory();

      expect(result[0].symbol).toBe('BTC');
      expect(result[1].symbol).toBe('SOL');
      expect(result[2].symbol).toBe('ETH');
    });

    it('should filter out items without symbol property', () => {
      const history = [
        { symbol: 'BTC', timestamp: 1000 },
        { timestamp: 3000 },
        { symbol: 'ETH', timestamp: 4000 },
        null,
      ];
      localStorageStore[STORAGE_KEY] = JSON.stringify(history);

      const result = getSearchHistory();

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.symbol)).toEqual(['ETH', 'BTC']);
    });

    it('should return empty array when localStorage throws error', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      const result = getSearchHistory();

      expect(result).toEqual([]);
    });

    it('should return empty array when JSON is invalid', () => {
      localStorageStore[STORAGE_KEY] = 'invalid json';

      const result = getSearchHistory();

      expect(result).toEqual([]);
    });
  });

  describe('saveSearchHistory', () => {
    it('should add new item to history', () => {
      saveSearchHistory('BTC');

      const stored = JSON.parse(localStorageStore[STORAGE_KEY]);
      expect(stored).toHaveLength(1);
      expect(stored[0].symbol).toBe('BTC');
      expect(stored[0].timestamp).toBeDefined();
    });

    it('should normalize symbol to uppercase', () => {
      saveSearchHistory('btc');

      const stored = JSON.parse(localStorageStore[STORAGE_KEY]);
      expect(stored[0].symbol).toBe('BTC');
    });

    it('should trim whitespace from symbol', () => {
      saveSearchHistory('  ETH  ');

      const stored = JSON.parse(localStorageStore[STORAGE_KEY]);
      expect(stored[0].symbol).toBe('ETH');
    });

    it('should move existing item to the front', () => {
      const existingHistory = [
        { symbol: 'BTC', timestamp: 1000 },
        { symbol: 'ETH', timestamp: 2000 },
      ];
      localStorageStore[STORAGE_KEY] = JSON.stringify(existingHistory);

      saveSearchHistory('BTC');

      const stored = JSON.parse(localStorageStore[STORAGE_KEY]);
      expect(stored).toHaveLength(2);
      expect(stored[0].symbol).toBe('BTC');
    });

    it('should limit history to MAX_HISTORY_ITEMS (10)', () => {
      for (let i = 0; i < 15; i++) {
        saveSearchHistory(`COIN${i}`);
      }

      const stored = JSON.parse(localStorageStore[STORAGE_KEY]);
      expect(stored).toHaveLength(10);
    });

    it('should not save empty symbol', () => {
      saveSearchHistory('');

      expect(localStorageStore[STORAGE_KEY]).toBeUndefined();
    });

    it('should not save whitespace-only symbol', () => {
      saveSearchHistory('   ');

      expect(localStorageStore[STORAGE_KEY]).toBeUndefined();
    });

    it('should handle storage errors gracefully', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
        throw new Error('Quota exceeded');
      });

      expect(() => saveSearchHistory('BTC')).not.toThrow();
    });
  });

  describe('clearSearchHistory', () => {
    it('should remove history from localStorage', () => {
      localStorageStore[STORAGE_KEY] = JSON.stringify([{ symbol: 'BTC', timestamp: 1000 }]);

      clearSearchHistory();

      expect(localStorageStore[STORAGE_KEY]).toBeUndefined();
    });

    it('should handle storage errors gracefully', () => {
      jest.spyOn(Storage.prototype, 'removeItem').mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      expect(() => clearSearchHistory()).not.toThrow();
    });
  });

  describe('removeFromSearchHistory', () => {
    it('should remove specific symbol from history', () => {
      const history = [
        { symbol: 'BTC', timestamp: 1000 },
        { symbol: 'ETH', timestamp: 2000 },
        { symbol: 'SOL', timestamp: 3000 },
      ];
      localStorageStore[STORAGE_KEY] = JSON.stringify(history);

      removeFromSearchHistory('ETH');

      const stored = JSON.parse(localStorageStore[STORAGE_KEY]);
      expect(stored).toHaveLength(2);
      expect(stored.find((s: { symbol: string }) => s.symbol === 'ETH')).toBeUndefined();
    });

    it('should normalize symbol when removing', () => {
      const history = [
        { symbol: 'BTC', timestamp: 1000 },
        { symbol: 'ETH', timestamp: 2000 },
      ];
      localStorageStore[STORAGE_KEY] = JSON.stringify(history);

      removeFromSearchHistory('eth');

      const stored = JSON.parse(localStorageStore[STORAGE_KEY]);
      expect(stored).toHaveLength(1);
      expect(stored[0].symbol).toBe('BTC');
    });

    it('should handle removing non-existent symbol', () => {
      const history = [
        { symbol: 'BTC', timestamp: 1000 },
        { symbol: 'ETH', timestamp: 2000 },
      ];
      localStorageStore[STORAGE_KEY] = JSON.stringify(history);

      removeFromSearchHistory('SOL');

      const stored = JSON.parse(localStorageStore[STORAGE_KEY]);
      expect(stored).toHaveLength(2);
    });

    it('should not remove with empty symbol', () => {
      const history = [{ symbol: 'BTC', timestamp: 1000 }];
      localStorageStore[STORAGE_KEY] = JSON.stringify(history);

      removeFromSearchHistory('');

      const stored = JSON.parse(localStorageStore[STORAGE_KEY]);
      expect(stored).toHaveLength(1);
    });

    it('should handle storage errors gracefully', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      expect(() => removeFromSearchHistory('BTC')).not.toThrow();
    });
  });

  describe('integration tests', () => {
    it('should handle full workflow: save, get, remove, clear', () => {
      saveSearchHistory('BTC');
      saveSearchHistory('ETH');
      saveSearchHistory('SOL');

      let history = getSearchHistory();
      expect(history).toHaveLength(3);
      expect(history[0].symbol).toBe('SOL');

      removeFromSearchHistory('ETH');
      history = getSearchHistory();
      expect(history).toHaveLength(2);

      clearSearchHistory();
      history = getSearchHistory();
      expect(history).toHaveLength(0);
    });

    it('should maintain history order correctly with multiple saves', () => {
      saveSearchHistory('BTC');
      saveSearchHistory('ETH');
      saveSearchHistory('SOL');
      saveSearchHistory('BTC');

      const history = getSearchHistory();
      expect(history).toHaveLength(3);
      expect(history[0].symbol).toBe('BTC');
      expect(history[1].symbol).toBe('SOL');
      expect(history[2].symbol).toBe('ETH');
    });

    it('should handle rapid successive saves', () => {
      const symbols = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'LINK', 'UNI', 'AVAX', 'MATIC', 'ATOM'];

      symbols.forEach((symbol) => saveSearchHistory(symbol));

      const history = getSearchHistory();
      expect(history).toHaveLength(10);
    });

    it('should correctly handle history limit overflow', () => {
      const symbols = [
        'BTC',
        'ETH',
        'SOL',
        'ADA',
        'DOT',
        'LINK',
        'UNI',
        'AVAX',
        'MATIC',
        'ATOM',
        'NEAR',
        'FTM',
      ];

      symbols.forEach((symbol) => saveSearchHistory(symbol));

      const history = getSearchHistory();
      expect(history).toHaveLength(10);
      expect(history[0].symbol).toBe('FTM');
      expect(history.find((h) => h.symbol === 'BTC')).toBeUndefined();
    });
  });
});
