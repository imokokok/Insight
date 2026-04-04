import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useTechnicalIndicators,
  useBatchTechnicalIndicators,
  IndicatorDataPoint,
  IndicatorSettings,
} from '../ui/useTechnicalIndicators';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock logger
jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('useTechnicalIndicators', () => {
  const mockData: IndicatorDataPoint[] = [
    { time: '10:00', timestamp: 1000, price: 100, volume: 1000 },
    { time: '10:01', timestamp: 2000, price: 102, volume: 1200 },
    { time: '10:02', timestamp: 3000, price: 101, volume: 1100 },
    { time: '10:03', timestamp: 4000, price: 103, volume: 1300 },
    { time: '10:04', timestamp: 5000, price: 105, volume: 1400 },
    { time: '10:05', timestamp: 6000, price: 104, volume: 1350 },
    { time: '10:06', timestamp: 7000, price: 106, volume: 1500 },
    { time: '10:07', timestamp: 8000, price: 108, volume: 1600 },
    { time: '10:08', timestamp: 9000, price: 107, volume: 1550 },
    { time: '10:09', timestamp: 10000, price: 109, volume: 1650 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Desktop mode', () => {
    it('should initialize with default settings', () => {
      const { result } = renderHook(() => useTechnicalIndicators({ isMobile: false }));

      expect(result.current.showMA7).toBe(true);
      expect(result.current.showMA14).toBe(false);
      expect(result.current.showMA30).toBe(false);
      expect(result.current.showMA60).toBe(false);
      expect(result.current.showBollingerBands).toBe(false);
      expect(result.current.showRSI).toBe(false);
      expect(result.current.showMACD).toBe(false);
      expect(result.current.showVolume).toBe(true);
      expect(result.current.isLoaded).toBe(true);
    });

    it('should toggle indicators', () => {
      const { result } = renderHook(() => useTechnicalIndicators({ isMobile: false }));

      act(() => {
        result.current.toggleMA14();
      });

      expect(result.current.showMA14).toBe(true);

      act(() => {
        result.current.toggleMA14();
      });

      expect(result.current.showMA14).toBe(false);
    });

    it('should calculate MA7 correctly', () => {
      const { result } = renderHook(() => useTechnicalIndicators({ isMobile: false }));

      const dataWithIndicators = result.current.calculateIndicators(mockData);

      // MA7 for first 6 points should be the price itself
      expect(dataWithIndicators[0].ma7).toBe(100);
      expect(dataWithIndicators[6].ma7).toBe(100);

      // MA7 for 7th point should be average of first 7 prices
      const expectedMA7 = (100 + 102 + 101 + 103 + 105 + 104 + 106) / 7;
      expect(dataWithIndicators[6].ma7).toBeCloseTo(expectedMA7, 2);
    });

    it('should calculate RSI correctly', () => {
      const { result } = renderHook(() => useTechnicalIndicators({ isMobile: false }));

      act(() => {
        result.current.toggleRSI();
      });

      const dataWithIndicators = result.current.calculateIndicators(mockData);

      // First 14 points should have default RSI of 50
      expect(dataWithIndicators[0].rsi).toBe(50);

      // RSI should be calculated for points after period
      if (dataWithIndicators.length > 14) {
        expect(dataWithIndicators[14].rsi).toBeDefined();
        expect(dataWithIndicators[14].rsi).toBeGreaterThanOrEqual(0);
        expect(dataWithIndicators[14].rsi).toBeLessThanOrEqual(100);
      }
    });

    it('should save settings to localStorage', () => {
      const { result } = renderHook(() =>
        useTechnicalIndicators({ isMobile: false, persistSettings: true })
      );

      act(() => {
        result.current.toggleMA14();
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const savedSettings = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedSettings.showMA14).toBe(true);
    });

    it('should load settings from localStorage', () => {
      const savedSettings: Partial<IndicatorSettings> = {
        showMA7: false,
        showMA14: true,
        showRSI: true,
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedSettings));

      const { result } = renderHook(() =>