'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
  useRef,
} from 'react';
import { TimeRange } from '@/components/oracle/common/TabNavigation';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('TimeRangeContext');

const STORAGE_KEYS = {
  TIME_RANGE: 'insight_timeRange',
  SYNC_ENABLED: 'insight_syncEnabled',
  CUSTOM_DATE_RANGE: 'insight_customDateRange',
  SELECTED_HOUR: 'insight_selectedHour',
} as const;

export interface TimeRangeContextValue {
  globalTimeRange: TimeRange;
  setGlobalTimeRange: (range: TimeRange) => void;
  syncEnabled: boolean;
  setSyncEnabled: (enabled: boolean) => void;
  customDateRange: CustomDateRange | null;
  setCustomDateRange: (range: CustomDateRange | null) => void;
  brushRange: BrushRange | null;
  setBrushRange: (range: BrushRange | null) => void;
  selectedHour: number | null;
  setSelectedHour: (hour: number | null) => void;
  selectedTimeRange: SelectedTimeRange | null;
  setSelectedTimeRange: (range: SelectedTimeRange | null) => void;
  onTimeRangeChange: ((range: SelectedTimeRange) => void) | null;
  registerTimeRangeCallback: (callback: (range: SelectedTimeRange) => void) => void;
  unregisterTimeRangeCallback: (callback: (range: SelectedTimeRange) => void) => void;
}

export interface CustomDateRange {
  startDate: Date;
  endDate: Date;
}

export interface BrushRange {
  startIndex: number;
  endIndex: number;
  startTime: number;
  endTime: number;
}

export interface SelectedTimeRange {
  startTime: number;
  endTime: number;
  startHour: number;
  endHour: number;
  label: string;
}

const TimeRangeContext = createContext<TimeRangeContextValue | undefined>(undefined);

interface TimeRangeProviderProps {
  children: ReactNode;
  defaultTimeRange?: TimeRange;
  defaultSyncEnabled?: boolean;
}

function getStoredTimeRange(defaultValue: TimeRange): TimeRange {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TIME_RANGE);
    if (stored && ['1H', '24H', '7D', '30D', '90D', '1Y', 'ALL'].includes(stored)) {
      return stored as TimeRange;
    }
  } catch (error) {
    logger.warn(
      'Failed to read timeRange from localStorage',
      error instanceof Error ? error : new Error(String(error))
    );
  }
  return defaultValue;
}

function getStoredSyncEnabled(defaultValue: boolean): boolean {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SYNC_ENABLED);
    if (stored !== null) {
      return stored === 'true';
    }
  } catch (error) {
    logger.warn(
      'Failed to read syncEnabled from localStorage',
      error instanceof Error ? error : new Error(String(error))
    );
  }
  return defaultValue;
}

function getStoredCustomDateRange(): CustomDateRange | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_DATE_RANGE);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        startDate: new Date(parsed.startDate),
        endDate: new Date(parsed.endDate),
      };
    }
  } catch (error) {
    logger.warn(
      'Failed to read customDateRange from localStorage',
      error instanceof Error ? error : new Error(String(error))
    );
  }
  return null;
}

function getStoredSelectedHour(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SELECTED_HOUR);
    if (stored !== null) {
      const hour = parseInt(stored, 10);
      if (!isNaN(hour) && hour >= 0 && hour <= 23) {
        return hour;
      }
    }
  } catch (error) {
    logger.warn(
      'Failed to read selectedHour from localStorage',
      error instanceof Error ? error : new Error(String(error))
    );
  }
  return null;
}

export function TimeRangeProvider({
  children,
  defaultTimeRange = '24H',
  defaultSyncEnabled = true,
}: TimeRangeProviderProps) {
  const [globalTimeRange, setGlobalTimeRangeState] = useState<TimeRange>(() =>
    getStoredTimeRange(defaultTimeRange)
  );
  const [syncEnabled, setSyncEnabledState] = useState<boolean>(() =>
    getStoredSyncEnabled(defaultSyncEnabled)
  );
  const [customDateRange, setCustomDateRangeState] = useState<CustomDateRange | null>(() =>
    getStoredCustomDateRange()
  );
  const [brushRange, setBrushRangeState] = useState<BrushRange | null>(null);
  const [selectedHour, setSelectedHourState] = useState<number | null>(() =>
    getStoredSelectedHour()
  );
  const [selectedTimeRange, setSelectedTimeRangeState] = useState<SelectedTimeRange | null>(null);

  const callbacksRef = useRef<Set<(range: SelectedTimeRange) => void>>(new Set());

  const setGlobalTimeRange = useCallback((range: TimeRange) => {
    setGlobalTimeRangeState(range);
    setCustomDateRangeState(null);
    setBrushRangeState(null);
    try {
      localStorage.setItem(STORAGE_KEYS.TIME_RANGE, range);
      localStorage.removeItem(STORAGE_KEYS.CUSTOM_DATE_RANGE);
    } catch (error) {
      logger.warn(
        'Failed to save timeRange to localStorage',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }, []);

  const setSyncEnabled = useCallback((enabled: boolean) => {
    setSyncEnabledState(enabled);
    try {
      localStorage.setItem(STORAGE_KEYS.SYNC_ENABLED, String(enabled));
    } catch (error) {
      logger.warn(
        'Failed to save syncEnabled to localStorage',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }, []);

  const setCustomDateRange = useCallback((range: CustomDateRange | null) => {
    setCustomDateRangeState(range);
    if (range) {
      setGlobalTimeRangeState('ALL');
      try {
        localStorage.setItem(
          STORAGE_KEYS.CUSTOM_DATE_RANGE,
          JSON.stringify({
            startDate: range.startDate.toISOString(),
            endDate: range.endDate.toISOString(),
          })
        );
        localStorage.setItem(STORAGE_KEYS.TIME_RANGE, 'ALL');
      } catch (error) {
        logger.warn(
          'Failed to save customDateRange to localStorage',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    } else {
      try {
        localStorage.removeItem(STORAGE_KEYS.CUSTOM_DATE_RANGE);
      } catch (error) {
        logger.warn(
          'Failed to remove customDateRange from localStorage',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  }, []);

  const setBrushRange = useCallback((range: BrushRange | null) => {
    setBrushRangeState(range);
  }, []);

  const setSelectedHour = useCallback((hour: number | null) => {
    setSelectedHourState(hour);
    if (hour !== null) {
      try {
        localStorage.setItem(STORAGE_KEYS.SELECTED_HOUR, String(hour));
      } catch (error) {
        logger.warn(
          'Failed to save selectedHour to localStorage',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    } else {
      try {
        localStorage.removeItem(STORAGE_KEYS.SELECTED_HOUR);
      } catch (error) {
        logger.warn(
          'Failed to remove selectedHour from localStorage',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  }, []);

  const setSelectedTimeRange = useCallback((range: SelectedTimeRange | null) => {
    setSelectedTimeRangeState(range);
    if (range) {
      callbacksRef.current.forEach((callback) => {
        try {
          callback(range);
        } catch (error) {
          logger.error(
            'Error in time range callback',
            error instanceof Error ? error : new Error(String(error))
          );
        }
      });
    }
  }, []);

  const registerTimeRangeCallback = useCallback((callback: (range: SelectedTimeRange) => void) => {
    callbacksRef.current.add(callback);
  }, []);

  const unregisterTimeRangeCallback = useCallback(
    (callback: (range: SelectedTimeRange) => void) => {
      callbacksRef.current.delete(callback);
    },
    []
  );

  const onTimeRangeChange = useCallback((range: SelectedTimeRange) => {
    callbacksRef.current.forEach((callback) => {
      try {
        callback(range);
      } catch (error) {
        logger.error(
          'Error in time range callback',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    });
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.TIME_RANGE && e.newValue) {
        const validRanges = ['1H', '24H', '7D', '30D', '90D', '1Y', 'ALL'];
        if (validRanges.includes(e.newValue)) {
          setGlobalTimeRangeState(e.newValue as TimeRange);
        }
      } else if (e.key === STORAGE_KEYS.SYNC_ENABLED && e.newValue !== null) {
        setSyncEnabledState(e.newValue === 'true');
      } else if (e.key === STORAGE_KEYS.CUSTOM_DATE_RANGE && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setCustomDateRangeState({
            startDate: new Date(parsed.startDate),
            endDate: new Date(parsed.endDate),
          });
        } catch (error) {
          logger.warn(
            'Failed to parse customDateRange from storage event',
            error instanceof Error ? error : new Error(String(error))
          );
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const value: TimeRangeContextValue = {
    globalTimeRange,
    setGlobalTimeRange,
    syncEnabled,
    setSyncEnabled,
    customDateRange,
    setCustomDateRange,
    brushRange,
    setBrushRange,
    selectedHour,
    setSelectedHour,
    selectedTimeRange,
    setSelectedTimeRange,
    onTimeRangeChange: null,
    registerTimeRangeCallback,
    unregisterTimeRangeCallback,
  };

  return <TimeRangeContext.Provider value={value}>{children}</TimeRangeContext.Provider>;
}

export function useTimeRange(): TimeRangeContextValue {
  const context = useContext(TimeRangeContext);
  if (context === undefined) {
    throw new Error('useTimeRange must be used within a TimeRangeProvider');
  }
  return context;
}

export function useOptionalTimeRange(): TimeRangeContextValue | null {
  const context = useContext(TimeRangeContext);
  return context ?? null;
}

export function useGlobalTimeRange(): {
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
} {
  const { globalTimeRange, setGlobalTimeRange } = useTimeRange();

  return {
    timeRange: globalTimeRange,
    setTimeRange: setGlobalTimeRange,
  };
}

export function useSyncControl(): {
  syncEnabled: boolean;
  toggleSync: () => void;
  enableSync: () => void;
  disableSync: () => void;
} {
  const { syncEnabled, setSyncEnabled } = useTimeRange();

  return {
    syncEnabled,
    toggleSync: () => setSyncEnabled(!syncEnabled),
    enableSync: () => setSyncEnabled(true),
    disableSync: () => setSyncEnabled(false),
  };
}

export { TimeRangeContext };
