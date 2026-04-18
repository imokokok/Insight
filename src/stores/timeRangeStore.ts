import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

import { createLogger } from '@/lib/utils/logger';
import { type UITimeRange } from '@/types/ui/layout';

const logger = createLogger('timeRangeStore');

interface CustomDateRange {
  startDate: Date;
  endDate: Date;
}

interface BrushRange {
  startIndex: number;
  endIndex: number;
  startTime: number;
  endTime: number;
}

interface SelectedTimeRange {
  startTime: number;
  endTime: number;
  startHour: number;
  endHour: number;
  label: string;
}

type TimeRangeCallback = (range: SelectedTimeRange) => void;

interface TimeRangeState {
  globalTimeRange: UITimeRange;
  syncEnabled: boolean;
  customDateRange: CustomDateRange | null;
  brushRange: BrushRange | null;
  selectedHour: number | null;
  selectedTimeRange: SelectedTimeRange | null;
  _timeRangeCallbacks: Set<TimeRangeCallback>;

  setGlobalTimeRange: (range: UITimeRange) => void;
  setSyncEnabled: (enabled: boolean) => void;
  setCustomDateRange: (range: CustomDateRange | null) => void;
  setBrushRange: (range: BrushRange | null) => void;
  setSelectedHour: (hour: number | null) => void;
  setSelectedTimeRange: (range: SelectedTimeRange | null) => void;
  registerTimeRangeCallback: (callback: TimeRangeCallback) => void;
  unregisterTimeRangeCallback: (callback: TimeRangeCallback) => void;
}

const isValidTimeRange = (value: unknown): value is UITimeRange => {
  const validRanges: UITimeRange[] = ['1H', '24H', '7D', '30D', '90D', '1Y', 'ALL'];
  return typeof value === 'string' && validRanges.includes(value as UITimeRange);
};

const parseCustomDateRange = (value: unknown): CustomDateRange | null => {
  if (!value || typeof value !== 'object') return null;
  const parsed = value as { startDate?: string; endDate?: string };
  if (parsed.startDate && parsed.endDate) {
    return {
      startDate: new Date(parsed.startDate),
      endDate: new Date(parsed.endDate),
    };
  }
  return null;
};

const useTimeRangeStore = create<TimeRangeState>()(
  devtools(
    persist(
      (set, get) => ({
        globalTimeRange: '24H',
        syncEnabled: true,
        customDateRange: null,
        brushRange: null,
        selectedHour: null,
        selectedTimeRange: null,
        _timeRangeCallbacks: new Set<TimeRangeCallback>(),

        setGlobalTimeRange: (range) =>
          set({
            globalTimeRange: range,
            customDateRange: null,
            brushRange: null,
          }),

        setSyncEnabled: (enabled) => set({ syncEnabled: enabled }),

        setCustomDateRange: (range) =>
          set({
            customDateRange: range,
            globalTimeRange: range ? 'ALL' : '24H',
          }),

        setBrushRange: (range) => set({ brushRange: range }),

        setSelectedHour: (hour) => set({ selectedHour: hour }),

        setSelectedTimeRange: (range) => {
          set({ selectedTimeRange: range });
          if (range) {
            const callbacks = get()._timeRangeCallbacks;
            callbacks.forEach((callback) => {
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
        },

        registerTimeRangeCallback: (callback) => {
          set((state) => ({
            _timeRangeCallbacks: new Set(state._timeRangeCallbacks).add(callback),
          }));
        },

        unregisterTimeRangeCallback: (callback) => {
          set((state) => {
            const newSet = new Set(state._timeRangeCallbacks);
            newSet.delete(callback);
            return { _timeRangeCallbacks: newSet };
          });
        },
      }),
      {
        name: 'insight-timeRange-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          globalTimeRange: state.globalTimeRange,
          syncEnabled: state.syncEnabled,
          customDateRange: state.customDateRange
            ? {
                startDate: state.customDateRange.startDate.toISOString(),
                endDate: state.customDateRange.endDate.toISOString(),
              }
            : null,
          selectedHour: state.selectedHour,
        }),
        onRehydrateStorage: () => (state) => {
          if (!state) return;
          if (state.customDateRange) {
            const parsed = parseCustomDateRange({
              startDate: (state.customDateRange as unknown as { startDate: string }).startDate,
              endDate: (state.customDateRange as unknown as { endDate: string }).endDate,
            });
            if (parsed) {
              state.customDateRange = parsed;
            }
          }
          if (!isValidTimeRange(state.globalTimeRange)) {
            state.globalTimeRange = '24H';
          }
        },
      }
    ),
    { name: 'TimeRangeStore' }
  )
);

const useGlobalTimeRange = () => useTimeRangeStore((state) => state.globalTimeRange);
const useSetGlobalTimeRange = () => useTimeRangeStore((state) => state.setGlobalTimeRange);

const useSyncEnabled = () => useTimeRangeStore((state) => state.syncEnabled);
const useSetSyncEnabled = () => useTimeRangeStore((state) => state.setSyncEnabled);

const useCustomDateRange = () => useTimeRangeStore((state) => state.customDateRange);
const useSetCustomDateRange = () => useTimeRangeStore((state) => state.setCustomDateRange);

const useBrushRange = () => useTimeRangeStore((state) => state.brushRange);
const useSetBrushRange = () => useTimeRangeStore((state) => state.setBrushRange);

const useSelectedHour = () => useTimeRangeStore((state) => state.selectedHour);
const useSetSelectedHour = () => useTimeRangeStore((state) => state.setSelectedHour);

const useSelectedTimeRange = () => useTimeRangeStore((state) => state.selectedTimeRange);
const useSetSelectedTimeRange = () => useTimeRangeStore((state) => state.setSelectedTimeRange);

const useTimeRangeActions = () =>
  useTimeRangeStore(
    useShallow((state) => ({
      setGlobalTimeRange: state.setGlobalTimeRange,
      setSyncEnabled: state.setSyncEnabled,
      setCustomDateRange: state.setCustomDateRange,
      setBrushRange: state.setBrushRange,
      setSelectedHour: state.setSelectedHour,
      setSelectedTimeRange: state.setSelectedTimeRange,
    }))
  );

const useSyncControl = () => {
  const syncEnabled = useTimeRangeStore((state) => state.syncEnabled);
  const setSyncEnabled = useTimeRangeStore((state) => state.setSyncEnabled);
  return {
    syncEnabled,
    toggleSync: () => setSyncEnabled(!syncEnabled),
    enableSync: () => setSyncEnabled(true),
    disableSync: () => setSyncEnabled(false),
  };
};

const useTimeRangeCallback = () => {
  const registerTimeRangeCallback = useTimeRangeStore((state) => state.registerTimeRangeCallback);
  const unregisterTimeRangeCallback = useTimeRangeStore(
    (state) => state.unregisterTimeRangeCallback
  );
  return { registerTimeRangeCallback, unregisterTimeRangeCallback };
};
