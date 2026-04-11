import { renderHook } from '@testing-library/react';

import { useUser, useProfile } from '@/stores/authStore';

import {
  usePreferences,
  useDefaultOracle,
  useDefaultSymbol,
  useDefaultTimeRange,
  useDefaultCurrency,
  useAutoRefreshInterval,
} from '../utils/usePreferences';

jest.mock('@/stores/authStore', () => ({
  useUser: jest.fn(),
  useProfile: jest.fn(),
}));

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('usePreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
  });

  it('should return default preferences when no user', () => {
    (useUser as jest.Mock).mockReturnValue(null);
    (useProfile as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => usePreferences());

    expect(result.current.preferences.defaultOracle).toBe('chainlink');
    expect(result.current.preferences.defaultSymbol).toBe('BTC/USD');
    expect(result.current.preferences.defaultTimeRange).toBe('24h');
    expect(result.current.preferences.language).toBe('zh-CN');
    expect(result.current.preferences.defaultCurrency).toBe('USD');
    expect(result.current.preferences.autoRefreshInterval).toBe(30);
  });

  it('should merge local storage preferences', () => {
    (useUser as jest.Mock).mockReturnValue(null);
    (useProfile as jest.Mock).mockReturnValue(null);

    mockLocalStorage.setItem(
      'user_preferences',
      JSON.stringify({
        defaultOracle: 'pyth',
        defaultSymbol: 'ETH/USD',
        autoRefreshInterval: '60',
      })
    );

    const { result } = renderHook(() => usePreferences());

    expect(result.current.preferences.defaultOracle).toBe('pyth');
    expect(result.current.preferences.defaultSymbol).toBe('ETH/USD');
    expect(result.current.preferences.autoRefreshInterval).toBe(60);
    expect(result.current.preferences.language).toBe('zh-CN');
  });

  it('should use profile preferences when user is logged in', () => {
    (useUser as jest.Mock).mockReturnValue({ id: 'user-1' });
    (useProfile as jest.Mock).mockReturnValue({
      id: 'user-1',
      preferences: {
        default_oracle: 'dia',
        default_symbol: 'SOL/USD',
        language: 'en-US',
      },
    });

    const { result } = renderHook(() => usePreferences());

    expect(result.current.preferences.defaultOracle).toBe('dia');
    expect(result.current.preferences.defaultSymbol).toBe('SOL/USD');
    expect(result.current.preferences.language).toBe('en-US');
  });

  it('should fallback to local preferences when profile preference is missing', () => {
    (useUser as jest.Mock).mockReturnValue({ id: 'user-1' });
    (useProfile as jest.Mock).mockReturnValue({
      id: 'user-1',
      preferences: {},
    });

    mockLocalStorage.setItem(
      'user_preferences',
      JSON.stringify({
        defaultOracle: 'redstone',
      })
    );

    const { result } = renderHook(() => usePreferences());

    expect(result.current.preferences.defaultOracle).toBe('redstone');
    expect(result.current.preferences.defaultSymbol).toBe('BTC/USD');
  });

  it('should save preferences to local storage', () => {
    (useUser as jest.Mock).mockReturnValue(null);
    (useProfile as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => usePreferences());

    result.current.savePreferencesToLocal({
      defaultOracle: 'api3',
      defaultSymbol: 'LINK/USD',
      defaultTimeRange: '7d',
      language: 'en-US',
      defaultCurrency: 'EUR',
      autoRefreshInterval: 45,
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'user_preferences',
      expect.stringContaining('api3')
    );
  });

  it('should handle invalid local storage data', () => {
    (useUser as jest.Mock).mockReturnValue(null);
    (useProfile as jest.Mock).mockReturnValue(null);

    mockLocalStorage.setItem('user_preferences', 'invalid json');

    const { result } = renderHook(() => usePreferences());

    expect(result.current.preferences.defaultOracle).toBe('chainlink');
  });

  it('should return isLoading state', () => {
    (useUser as jest.Mock).mockReturnValue(null);
    (useProfile as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => usePreferences());

    expect(result.current.isLoading).toBe(false);
  });

  it('should return defaultPreferences', () => {
    (useUser as jest.Mock).mockReturnValue(null);
    (useProfile as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => usePreferences());

    expect(result.current.defaultPreferences).toBeDefined();
    expect(result.current.defaultPreferences.defaultOracle).toBe('chainlink');
  });
});

describe('useDefaultOracle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
  });

  it('should return default oracle', () => {
    (useUser as jest.Mock).mockReturnValue(null);
    (useProfile as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useDefaultOracle());

    expect(result.current.defaultOracle).toBe('chainlink');
  });
});

describe('useDefaultSymbol', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
  });

  it('should return default symbol', () => {
    (useUser as jest.Mock).mockReturnValue(null);
    (useProfile as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useDefaultSymbol());

    expect(result.current.defaultSymbol).toBe('BTC/USD');
  });
});

describe('useDefaultTimeRange', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
  });

  it('should return default time range', () => {
    (useUser as jest.Mock).mockReturnValue(null);
    (useProfile as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useDefaultTimeRange());

    expect(result.current.defaultTimeRange).toBe('24h');
  });
});

describe('useDefaultCurrency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
  });

  it('should return default currency', () => {
    (useUser as jest.Mock).mockReturnValue(null);
    (useProfile as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useDefaultCurrency());

    expect(result.current.defaultCurrency).toBe('USD');
  });
});

describe('useAutoRefreshInterval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
  });

  it('should return auto refresh interval', () => {
    (useUser as jest.Mock).mockReturnValue(null);
    (useProfile as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useAutoRefreshInterval());

    expect(result.current.autoRefreshInterval).toBe(30);
    expect(result.current.refreshIntervalMs).toBe(30000);
  });

  it('should return custom refresh interval from preferences', () => {
    (useUser as jest.Mock).mockReturnValue(null);
    (useProfile as jest.Mock).mockReturnValue(null);

    mockLocalStorage.setItem(
      'user_preferences',
      JSON.stringify({
        autoRefreshInterval: '60',
      })
    );

    const { result } = renderHook(() => useAutoRefreshInterval());

    expect(result.current.autoRefreshInterval).toBe(60);
    expect(result.current.refreshIntervalMs).toBe(60000);
  });
});
