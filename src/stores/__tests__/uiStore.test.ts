import { act, renderHook } from '@testing-library/react';

import {
  useUIStore,
  type BrushRange,
  type SelectedTimeRange,
  type CustomDateRange,
} from '../uiStore';

const localStorageMock = (() => {
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
  value: localStorageMock,
});

describe('uiStore', () => {
  beforeEach(() => {
    localStorageMock.clear();
    useUIStore.setState({
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
      globalTimeRange: '24H',
      syncEnabled: true,
      customDateRange: null,
      brushRange: null,
      selectedHour: null,
      selectedTimeRange: null,
      _timeRangeCallbacks: new Set(),
    });
  });

  describe('主题切换功能', () => {
    it('应该有默认主题 "system"', () => {
      const state = useUIStore.getState();
      expect(state.theme).toBe('system');
    });

    it('应该能够设置主题为 "light"', () => {
      const { setTheme } = useUIStore.getState();
      act(() => {
        setTheme('light');
      });
      expect(useUIStore.getState().theme).toBe('light');
    });

    it('应该能够设置主题为 "dark"', () => {
      const { setTheme } = useUIStore.getState();
      act(() => {
        setTheme('dark');
      });
      expect(useUIStore.getState().theme).toBe('dark');
    });

    it('应该能够设置主题为 "system"', () => {
      const { setTheme } = useUIStore.getState();
      act(() => {
        setTheme('dark');
      });
      act(() => {
        setTheme('system');
      });
      expect(useUIStore.getState().theme).toBe('system');
    });
  });

  describe('侧边栏状态管理', () => {
    it('应该有默认的侧边栏状态', () => {
      const state = useUIStore.getState();
      expect(state.sidebar.isOpen).toBe(true);
      expect(state.sidebar.isCollapsed).toBe(false);
      expect(state.sidebar.activeItem).toBeNull();
    });

    it('应该能够打开侧边栏', () => {
      const { closeSidebar, openSidebar } = useUIStore.getState();
      act(() => {
        closeSidebar();
      });
      expect(useUIStore.getState().sidebar.isOpen).toBe(false);

      act(() => {
        openSidebar();
      });
      expect(useUIStore.getState().sidebar.isOpen).toBe(true);
    });

    it('应该能够关闭侧边栏', () => {
      const { closeSidebar } = useUIStore.getState();
      act(() => {
        closeSidebar();
      });
      expect(useUIStore.getState().sidebar.isOpen).toBe(false);
    });

    it('应该能够切换侧边栏状态', () => {
      const { toggleSidebar } = useUIStore.getState();
      act(() => {
        toggleSidebar();
      });
      expect(useUIStore.getState().sidebar.isOpen).toBe(false);

      act(() => {
        toggleSidebar();
      });
      expect(useUIStore.getState().sidebar.isOpen).toBe(true);
    });

    it('应该能够切换侧边栏折叠状态', () => {
      const { toggleSidebarCollapse } = useUIStore.getState();
      act(() => {
        toggleSidebarCollapse();
      });
      expect(useUIStore.getState().sidebar.isCollapsed).toBe(true);

      act(() => {
        toggleSidebarCollapse();
      });
      expect(useUIStore.getState().sidebar.isCollapsed).toBe(false);
    });

    it('应该能够设置活动的侧边栏项目', () => {
      const { setActiveSidebarItem } = useUIStore.getState();
      act(() => {
        setActiveSidebarItem('dashboard');
      });
      expect(useUIStore.getState().sidebar.activeItem).toBe('dashboard');

      act(() => {
        setActiveSidebarItem(null);
      });
      expect(useUIStore.getState().sidebar.activeItem).toBeNull();
    });
  });

  describe('移动端菜单状态', () => {
    it('应该有默认的移动端状态', () => {
      const state = useUIStore.getState();
      expect(state.isMobile).toBe(false);
    });

    it('应该能够设置移动端状态', () => {
      const { setIsMobile } = useUIStore.getState();
      act(() => {
        setIsMobile(true);
      });
      expect(useUIStore.getState().isMobile).toBe(true);

      act(() => {
        setIsMobile(false);
      });
      expect(useUIStore.getState().isMobile).toBe(false);
    });
  });

  describe('模态框状态管理', () => {
    it('应该有默认的模态框状态', () => {
      const state = useUIStore.getState();
      expect(state.modal.isOpen).toBe(false);
      expect(state.modal.modalId).toBeNull();
      expect(state.modal.modalData).toBeNull();
    });

    it('应该能够打开模态框', () => {
      const { openModal } = useUIStore.getState();
      act(() => {
        openModal('test-modal', { foo: 'bar' });
      });
      const state = useUIStore.getState();
      expect(state.modal.isOpen).toBe(true);
      expect(state.modal.modalId).toBe('test-modal');
      expect(state.modal.modalData).toEqual({ foo: 'bar' });
    });

    it('应该能够打开模态框不带数据', () => {
      const { openModal } = useUIStore.getState();
      act(() => {
        openModal('simple-modal');
      });
      const state = useUIStore.getState();
      expect(state.modal.isOpen).toBe(true);
      expect(state.modal.modalId).toBe('simple-modal');
      expect(state.modal.modalData).toBeNull();
    });

    it('应该能够关闭模态框', () => {
      const { openModal, closeModal } = useUIStore.getState();
      act(() => {
        openModal('test-modal', { foo: 'bar' });
      });
      expect(useUIStore.getState().modal.isOpen).toBe(true);

      act(() => {
        closeModal();
      });
      const state = useUIStore.getState();
      expect(state.modal.isOpen).toBe(false);
      expect(state.modal.modalId).toBeNull();
      expect(state.modal.modalData).toBeNull();
    });
  });

  describe('通知管理', () => {
    it('应该有默认的空通知列表', () => {
      const state = useUIStore.getState();
      expect(state.notifications).toEqual([]);
    });

    it('应该能够添加通知', () => {
      const { addNotification } = useUIStore.getState();
      act(() => {
        addNotification({
          type: 'info',
          title: 'Test Notification',
          message: 'This is a test',
        });
      });
      const state = useUIStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].type).toBe('info');
      expect(state.notifications[0].title).toBe('Test Notification');
      expect(state.notifications[0].message).toBe('This is a test');
      expect(state.notifications[0].id).toBeDefined();
      expect(state.notifications[0].createdAt).toBeInstanceOf(Date);
    });

    it('应该能够添加不同类型的通知', () => {
      const { addNotification } = useUIStore.getState();
      const types: Array<'info' | 'success' | 'warning' | 'error'> = [
        'info',
        'success',
        'warning',
        'error',
      ];

      types.forEach((type) => {
        act(() => {
          addNotification({
            type,
            title: `${type} notification`,
          });
        });
      });

      const state = useUIStore.getState();
      expect(state.notifications).toHaveLength(4);
      state.notifications.forEach((n, i) => {
        expect(n.type).toBe(types[i]);
      });
    });

    it('应该能够移除通知', () => {
      const { addNotification, removeNotification } = useUIStore.getState();
      act(() => {
        addNotification({
          type: 'info',
          title: 'Test',
        });
      });
      const notificationId = useUIStore.getState().notifications[0].id;

      act(() => {
        removeNotification(notificationId);
      });
      expect(useUIStore.getState().notifications).toHaveLength(0);
    });

    it('应该能够清除所有通知', () => {
      const { addNotification, clearNotifications } = useUIStore.getState();
      act(() => {
        addNotification({ type: 'info', title: 'Test 1' });
        addNotification({ type: 'success', title: 'Test 2' });
        addNotification({ type: 'warning', title: 'Test 3' });
      });
      expect(useUIStore.getState().notifications).toHaveLength(3);

      act(() => {
        clearNotifications();
      });
      expect(useUIStore.getState().notifications).toHaveLength(0);
    });

    it('通知应该在指定时间后自动移除', () => {
      jest.useFakeTimers();
      const { addNotification } = useUIStore.getState();

      act(() => {
        addNotification({
          type: 'info',
          title: 'Auto remove',
          duration: 1000,
        });
      });
      expect(useUIStore.getState().notifications).toHaveLength(1);

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(useUIStore.getState().notifications).toHaveLength(0);

      jest.useRealTimers();
    });

    it('duration 为 0 的通知不应该自动移除', () => {
      jest.useFakeTimers();
      const { addNotification } = useUIStore.getState();

      act(() => {
        addNotification({
          type: 'info',
          title: 'Persistent',
          duration: 0,
        });
      });
      expect(useUIStore.getState().notifications).toHaveLength(1);

      act(() => {
        jest.advanceTimersByTime(10000);
      });
      expect(useUIStore.getState().notifications).toHaveLength(1);

      jest.useRealTimers();
    });
  });

  describe('时间范围管理', () => {
    it('应该有默认的时间范围', () => {
      const state = useUIStore.getState();
      expect(state.globalTimeRange).toBe('24H');
      expect(state.syncEnabled).toBe(true);
      expect(state.customDateRange).toBeNull();
      expect(state.brushRange).toBeNull();
      expect(state.selectedHour).toBeNull();
      expect(state.selectedTimeRange).toBeNull();
    });

    it('应该能够设置全局时间范围', () => {
      const { setGlobalTimeRange } = useUIStore.getState();
      act(() => {
        setGlobalTimeRange('7D');
      });
      expect(useUIStore.getState().globalTimeRange).toBe('7D');
    });

    it('设置全局时间范围应该清除自定义日期范围和刷选范围', () => {
      const { setCustomDateRange, setBrushRange, setGlobalTimeRange } =
        useUIStore.getState();

      act(() => {
        setCustomDateRange({
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
        });
        setBrushRange({
          startIndex: 0,
          endIndex: 10,
          startTime: 1000,
          endTime: 2000,
        });
      });

      act(() => {
        setGlobalTimeRange('30D');
      });

      const state = useUIStore.getState();
      expect(state.globalTimeRange).toBe('30D');
      expect(state.customDateRange).toBeNull();
      expect(state.brushRange).toBeNull();
    });

    it('应该能够设置同步状态', () => {
      const { setSyncEnabled } = useUIStore.getState();
      act(() => {
        setSyncEnabled(false);
      });
      expect(useUIStore.getState().syncEnabled).toBe(false);

      act(() => {
        setSyncEnabled(true);
      });
      expect(useUIStore.getState().syncEnabled).toBe(true);
    });

    it('应该能够设置自定义日期范围', () => {
      const { setCustomDateRange } = useUIStore.getState();
      const customRange: CustomDateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      act(() => {
        setCustomDateRange(customRange);
      });

      const state = useUIStore.getState();
      expect(state.customDateRange).toEqual(customRange);
      expect(state.globalTimeRange).toBe('ALL');
    });

    it('清除自定义日期范围应该重置时间范围为默认值', () => {
      const { setCustomDateRange } = useUIStore.getState();

      act(() => {
        setCustomDateRange({
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
        });
      });

      act(() => {
        setCustomDateRange(null);
      });

      const state = useUIStore.getState();
      expect(state.customDateRange).toBeNull();
      expect(state.globalTimeRange).toBe('24H');
    });

    it('应该能够设置刷选范围', () => {
      const { setBrushRange } = useUIStore.getState();
      const brushRange: BrushRange = {
        startIndex: 0,
        endIndex: 100,
        startTime: 1000000,
        endTime: 2000000,
      };

      act(() => {
        setBrushRange(brushRange);
      });

      expect(useUIStore.getState().brushRange).toEqual(brushRange);
    });

    it('应该能够设置选中的小时', () => {
      const { setSelectedHour } = useUIStore.getState();
      act(() => {
        setSelectedHour(12);
      });
      expect(useUIStore.getState().selectedHour).toBe(12);
    });

    it('应该能够设置选中的时间范围', () => {
      const { setSelectedTimeRange } = useUIStore.getState();
      const timeRange: SelectedTimeRange = {
        startTime: 1000000,
        endTime: 2000000,
        startHour: 0,
        endHour: 24,
        label: '1D',
      };

      act(() => {
        setSelectedTimeRange(timeRange);
      });

      expect(useUIStore.getState().selectedTimeRange).toEqual(timeRange);
    });
  });

  describe('时间范围回调', () => {
    it('应该能够注册时间范围回调', () => {
      const { registerTimeRangeCallback, setSelectedTimeRange } = useUIStore.getState();
      const callback = jest.fn();

      act(() => {
        registerTimeRangeCallback(callback);
      });

      const timeRange: SelectedTimeRange = {
        startTime: 1000000,
        endTime: 2000000,
        startHour: 0,
        endHour: 24,
        label: '1D',
      };

      act(() => {
        setSelectedTimeRange(timeRange);
      });

      expect(callback).toHaveBeenCalledWith(timeRange);
    });

    it('应该能够取消注册时间范围回调', () => {
      const { registerTimeRangeCallback, unregisterTimeRangeCallback, setSelectedTimeRange } =
        useUIStore.getState();
      const callback = jest.fn();

      act(() => {
        registerTimeRangeCallback(callback);
      });

      act(() => {
        unregisterTimeRangeCallback(callback);
      });

      const timeRange: SelectedTimeRange = {
        startTime: 1000000,
        endTime: 2000000,
        startHour: 0,
        endHour: 24,
        label: '1D',
      };

      act(() => {
        setSelectedTimeRange(timeRange);
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('回调抛出错误时应该不影响其他回调', () => {
      const { registerTimeRangeCallback, setSelectedTimeRange } = useUIStore.getState();
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = jest.fn();

      act(() => {
        registerTimeRangeCallback(errorCallback);
        registerTimeRangeCallback(normalCallback);
      });

      const timeRange: SelectedTimeRange = {
        startTime: 1000000,
        endTime: 2000000,
        startHour: 0,
        endHour: 24,
        label: '1D',
      };

      act(() => {
        setSelectedTimeRange(timeRange);
      });

      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('同步控制', () => {
    it('toggleSync 应该切换同步状态', () => {
      const { setSyncEnabled } = useUIStore.getState();
      expect(useUIStore.getState().syncEnabled).toBe(true);

      act(() => {
        setSyncEnabled(false);
      });
      expect(useUIStore.getState().syncEnabled).toBe(false);

      act(() => {
        setSyncEnabled(true);
      });
      expect(useUIStore.getState().syncEnabled).toBe(true);
    });

    it('enableSync 应该启用同步', () => {
      const { setSyncEnabled } = useUIStore.getState();

      act(() => {
        setSyncEnabled(false);
      });
      expect(useUIStore.getState().syncEnabled).toBe(false);

      act(() => {
        setSyncEnabled(true);
      });
      expect(useUIStore.getState().syncEnabled).toBe(true);
    });

    it('disableSync 应该禁用同步', () => {
      const { setSyncEnabled } = useUIStore.getState();

      act(() => {
        setSyncEnabled(false);
      });
      expect(useUIStore.getState().syncEnabled).toBe(false);
    });
  });

  describe('用户偏好设置持久化', () => {
    it('应该持久化主题设置', () => {
      const { setTheme } = useUIStore.getState();
      act(() => {
        setTheme('dark');
      });

      const persistedData = localStorageMock.getItem('ui-store');
      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        expect(parsed.state.theme).toBe('dark');
      }
    });

    it('应该持久化侧边栏折叠状态', () => {
      const { toggleSidebarCollapse } = useUIStore.getState();
      act(() => {
        toggleSidebarCollapse();
      });

      const persistedData = localStorageMock.getItem('ui-store');
      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        expect(parsed.state.sidebar.isCollapsed).toBe(true);
      }
    });

    it('应该持久化全局时间范围', () => {
      const { setGlobalTimeRange } = useUIStore.getState();
      act(() => {
        setGlobalTimeRange('30D');
      });

      const persistedData = localStorageMock.getItem('ui-store');
      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        expect(parsed.state.globalTimeRange).toBe('30D');
      }
    });

    it('应该持久化同步状态', () => {
      const { setSyncEnabled } = useUIStore.getState();
      act(() => {
        setSyncEnabled(false);
      });

      const persistedData = localStorageMock.getItem('ui-store');
      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        expect(parsed.state.syncEnabled).toBe(false);
      }
    });

    it('应该持久化自定义日期范围', () => {
      const { setCustomDateRange } = useUIStore.getState();
      const customRange: CustomDateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      act(() => {
        setCustomDateRange(customRange);
      });

      const persistedData = localStorageMock.getItem('ui-store');
      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        expect(parsed.state.customDateRange).toBeDefined();
        expect(parsed.state.customDateRange.startDate).toBe(customRange.startDate.toISOString());
        expect(parsed.state.customDateRange.endDate).toBe(customRange.endDate.toISOString());
      }
    });
  });

  describe('Hooks 测试', () => {
    it('useSidebar hook 应该返回侧边栏状态', () => {
      const { result } = renderHook(() => useUIStore((state) => state.sidebar));
      expect(result.current.isOpen).toBe(true);
      expect(result.current.isCollapsed).toBe(false);
    });

    it('useModal hook 应该返回模态框状态', () => {
      const { result } = renderHook(() => useUIStore((state) => state.modal));
      expect(result.current.isOpen).toBe(false);
    });

    it('useNotifications hook 应该返回通知列表', () => {
      const { result } = renderHook(() => useUIStore((state) => state.notifications));
      expect(result.current).toEqual([]);
    });

    it('useTheme hook 应该返回当前主题', () => {
      const { result } = renderHook(() => useUIStore((state) => state.theme));
      expect(result.current).toBe('system');
    });

    it('useIsMobile hook 应该返回移动端状态', () => {
      const { result } = renderHook(() => useUIStore((state) => state.isMobile));
      expect(result.current).toBe(false);
    });

    it('useGlobalTimeRange hook 应该返回全局时间范围', () => {
      const { result } = renderHook(() => useUIStore((state) => state.globalTimeRange));
      expect(result.current).toBe('24H');
    });

    it('useSyncEnabled hook 应该返回同步状态', () => {
      const { result } = renderHook(() => useUIStore((state) => state.syncEnabled));
      expect(result.current).toBe(true);
    });
  });
});
