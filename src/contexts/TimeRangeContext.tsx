'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from 'react';
import { TimeRange } from '@/components/oracle/TabNavigation';

export interface TimeRangeContextValue {
  globalTimeRange: TimeRange;
  setGlobalTimeRange: (range: TimeRange) => void;
  syncEnabled: boolean;
  setSyncEnabled: (enabled: boolean) => void;
  customDateRange: CustomDateRange | null;
  setCustomDateRange: (range: CustomDateRange | null) => void;
  brushRange: BrushRange | null;
  setBrushRange: (range: BrushRange | null) => void;
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

const TimeRangeContext = createContext<TimeRangeContextValue | undefined>(undefined);

interface TimeRangeProviderProps {
  children: ReactNode;
  defaultTimeRange?: TimeRange;
  defaultSyncEnabled?: boolean;
}

export function TimeRangeProvider({
  children,
  defaultTimeRange = '24H',
  defaultSyncEnabled = true,
}: TimeRangeProviderProps) {
  const [globalTimeRange, setGlobalTimeRangeState] = useState<TimeRange>(defaultTimeRange);
  const [syncEnabled, setSyncEnabledState] = useState(defaultSyncEnabled);
  const [customDateRange, setCustomDateRangeState] = useState<CustomDateRange | null>(null);
  const [brushRange, setBrushRangeState] = useState<BrushRange | null>(null);

  const setGlobalTimeRange = useCallback(
    (range: TimeRange) => {
      if (syncEnabled) {
        setGlobalTimeRangeState(range);
        setCustomDateRangeState(null);
        setBrushRangeState(null);
      }
    },
    [syncEnabled]
  );

  const setSyncEnabled = useCallback((enabled: boolean) => {
    setSyncEnabledState(enabled);
  }, []);

  const setCustomDateRange = useCallback(
    (range: CustomDateRange | null) => {
      if (syncEnabled) {
        setCustomDateRangeState(range);
        if (range) {
          setGlobalTimeRangeState('ALL');
        }
      }
    },
    [syncEnabled]
  );

  const setBrushRange = useCallback(
    (range: BrushRange | null) => {
      if (syncEnabled) {
        setBrushRangeState(range);
      }
    },
    [syncEnabled]
  );

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'globalTimeRange' && e.newValue && syncEnabled) {
        setGlobalTimeRangeState(e.newValue as TimeRange);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [syncEnabled]);

  const value: TimeRangeContextValue = {
    globalTimeRange,
    setGlobalTimeRange,
    syncEnabled,
    setSyncEnabled,
    customDateRange,
    setCustomDateRange,
    brushRange,
    setBrushRange,
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
  const { globalTimeRange, setGlobalTimeRange, syncEnabled } = useTimeRange();

  return {
    timeRange: globalTimeRange,
    setTimeRange: syncEnabled ? setGlobalTimeRange : () => {},
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
