import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';

import { type UITimeRange } from '@/types/ui/layout';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('uiStore');

type Theme = 'light' | 'dark' | 'system';

interface SidebarState {
  isOpen: boolean;
  isCollapsed: boolean;
  activeItem: string | null;
}

interface ModalState {
  isOpen: boolean;
  modalId: string | null;
  modalData: Record<string, unknown> | null;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
  createdAt: Date;
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

type TimeRangeCallback = (range: SelectedTimeRange) => void;

interface TimeRangeState {
  globalTimeRange: UITimeRange;
  syncEnabled: boolean;
  customDateRange: CustomDateRange | null;
  brushRange: BrushRange | null;
  selectedHour: number | null;
  selectedTimeRange: SelectedTimeRange | null;
}

interface UIStore extends TimeRangeState {
  sidebar: SidebarState;
  modal: ModalState;
  notifications: Notification[];
  theme: Theme;
  isMobile: boolean;
  _timeRangeCallbacks: Set<TimeRangeCallback>;

  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  toggleSidebarCollapse: () => void;
  setActiveSidebarItem: (item: string | null) => void;

  openModal: (modalId: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;

  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  setTheme: (theme: Theme) => void;
  setIsMobile: (isMobile: boolean) => void;

  setGlobalTimeRange: (range: UITimeRange) => void;
  setSyncEnabled: (enabled: boolean) => void;
  setCustomDateRange: (range: CustomDateRange | null) => void;
  setBrushRange: (range: BrushRange | null) => void;
  setSelectedHour: (hour: number | null) => void;
  setSelectedTimeRange: (range: SelectedTimeRange | null) => void;
  registerTimeRangeCallback: (callback: TimeRangeCallback) => void;
  unregisterTimeRangeCallback: (callback: TimeRangeCallback) => void;
}

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const _STORAGE_KEYS = {
  TIME_RANGE: 'insight_timeRange',
  SYNC_ENABLED: 'insight_syncEnabled',
  CUSTOM_DATE_RANGE: 'insight_customDateRange',
  SELECTED_HOUR: 'insight_selectedHour',
} as const;

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

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set, get) => ({
        sidebar: {
          isOpen: true,
          isCollapsed: false,
          activeItem: null,
        },
        modal: {
          isOpen: false,
          modalId: null,
          modalData: null,
        },
        notifications: [],
        theme: 'system',
        isMobile: false,
        _timeRangeCallbacks: new Set<TimeRangeCallback>(),

        globalTimeRange: '24H',
        syncEnabled: true,
        customDateRange: null,
        brushRange: null,
        selectedHour: null,
        selectedTimeRange: null,

        openSidebar: () =>
          set((state) => ({
            sidebar: { ...state.sidebar, isOpen: true },
          })),

        closeSidebar: () =>
          set((state) => ({
            sidebar: { ...state.sidebar, isOpen: false },
          })),

        toggleSidebar: () =>
          set((state) => ({
            sidebar: { ...state.sidebar, isOpen: !state.sidebar.isOpen },
          })),

        toggleSidebarCollapse: () =>
          set((state) => ({
            sidebar: { ...state.sidebar, isCollapsed: !state.sidebar.isCollapsed },
          })),

        setActiveSidebarItem: (item) =>
          set((state) => ({
            sidebar: { ...state.sidebar, activeItem: item },
          })),

        openModal: (modalId, data) =>
          set({
            modal: {
              isOpen: true,
              modalId,
              modalData: data || null,
            },
          }),

        closeModal: () =>
          set({
            modal: {
              isOpen: false,
              modalId: null,
              modalData: null,
            },
          }),

        addNotification: (notification) => {
          const newNotification: Notification = {
            ...notification,
            id: generateId(),
            createdAt: new Date(),
          };
          set((state) => ({
            notifications: [...state.notifications, newNotification],
          }));

          if (notification.duration !== 0) {
            const duration = notification.duration || 5000;
            setTimeout(() => {
              useUIStore.getState().removeNotification(newNotification.id);
            }, duration);
          }
        },

        removeNotification: (id) =>
          set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          })),

        clearNotifications: () => set({ notifications: [] }),

        setTheme: (theme) => set({ theme }),

        setIsMobile: (isMobile) => set({ isMobile }),

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
          get()._timeRangeCallbacks.add(callback);
        },

        unregisterTimeRangeCallback: (callback) => {
          get()._timeRangeCallbacks.delete(callback);
        },
      }),
      {
        name: 'ui-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          sidebar: {
            isCollapsed: state.sidebar.isCollapsed,
          },
          theme: state.theme,
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
    { name: 'UIStore' }
  )
);

export const useSidebar = () => useUIStore((state) => state.sidebar);
export const useSidebarActions = () =>
  useUIStore((state) => ({
    openSidebar: state.openSidebar,
    closeSidebar: state.closeSidebar,
    toggleSidebar: state.toggleSidebar,
    toggleSidebarCollapse: state.toggleSidebarCollapse,
    setActiveSidebarItem: state.setActiveSidebarItem,
  }));

export const useModal = () => useUIStore((state) => state.modal);
export const useModalActions = () =>
  useUIStore((state) => ({
    openModal: state.openModal,
    closeModal: state.closeModal,
  }));

export const useNotifications = () => useUIStore((state) => state.notifications);
export const useNotificationActions = () =>
  useUIStore((state) => ({
    addNotification: state.addNotification,
    removeNotification: state.removeNotification,
    clearNotifications: state.clearNotifications,
  }));

export const useTheme = () => useUIStore((state) => state.theme);
export const useThemeActions = () =>
  useUIStore((state) => ({
    setTheme: state.setTheme,
  }));

export const useIsMobile = () => useUIStore((state) => state.isMobile);
export const useSetIsMobile = () => useUIStore((state) => state.setIsMobile);

export const useGlobalTimeRange = () => useUIStore((state) => state.globalTimeRange);
export const useSetGlobalTimeRange = () => useUIStore((state) => state.setGlobalTimeRange);

export const useSyncEnabled = () => useUIStore((state) => state.syncEnabled);
export const useSetSyncEnabled = () => useUIStore((state) => state.setSyncEnabled);

export const useCustomDateRange = () => useUIStore((state) => state.customDateRange);
export const useSetCustomDateRange = () => useUIStore((state) => state.setCustomDateRange);

export const useBrushRange = () => useUIStore((state) => state.brushRange);
export const useSetBrushRange = () => useUIStore((state) => state.setBrushRange);

export const useSelectedHour = () => useUIStore((state) => state.selectedHour);
export const useSetSelectedHour = () => useUIStore((state) => state.setSelectedHour);

export const useSelectedTimeRange = () => useUIStore((state) => state.selectedTimeRange);
export const useSetSelectedTimeRange = () => useUIStore((state) => state.setSelectedTimeRange);

export const useTimeRangeActions = () =>
  useUIStore((state) => ({
    setGlobalTimeRange: state.setGlobalTimeRange,
    setSyncEnabled: state.setSyncEnabled,
    setCustomDateRange: state.setCustomDateRange,
    setBrushRange: state.setBrushRange,
    setSelectedHour: state.setSelectedHour,
    setSelectedTimeRange: state.setSelectedTimeRange,
  }));

export const useSyncControl = () => {
  const syncEnabled = useUIStore((state) => state.syncEnabled);
  const setSyncEnabled = useUIStore((state) => state.setSyncEnabled);
  return {
    syncEnabled,
    toggleSync: () => setSyncEnabled(!syncEnabled),
    enableSync: () => setSyncEnabled(true),
    disableSync: () => setSyncEnabled(false),
  };
};

export const useTimeRangeCallback = () => {
  const registerTimeRangeCallback = useUIStore((state) => state.registerTimeRangeCallback);
  const unregisterTimeRangeCallback = useUIStore((state) => state.unregisterTimeRangeCallback);
  return { registerTimeRangeCallback, unregisterTimeRangeCallback };
};
