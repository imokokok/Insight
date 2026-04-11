import { act } from '@testing-library/react';

import type { Notification, UIState, Theme, SidebarState } from '@/types/ui';

import { useUIStore } from '../uiStore';

const mockNotification: Notification = {
  id: 'notif-1',
  type: 'info',
  title: 'Test Notification',
  message: 'This is a test notification',
  timestamp: Date.now(),
  read: false,
};

const mockState: UIState = {
  theme: 'dark',
  sidebar: {
    isOpen: true,
    collapsed: false,
    activeItem: null,
  },
  notifications: [],
  isLoading: {},
  modals: {},
  toasts: [],
  searchQuery: '',
  filters: {},
  sortConfig: null,
  pagination: {
    page: 1,
    pageSize: 10,
    total: 0,
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  useUIStore.setState(mockState);
});

describe('uiStore - 初始状态', () => {
  it('应该有正确的初始状态', () => {
    const state = useUIStore.getState();
    expect(state.theme).toBe('dark');
    expect(state.sidebar.isOpen).toBe(true);
    expect(state.sidebar.collapsed).toBe(false);
    expect(state.notifications).toEqual([]);
    expect(state.isLoading).toEqual({});
    expect(state.modals).toEqual({});
    expect(state.toasts).toEqual([]);
    expect(state.searchQuery).toBe('');
    expect(state.filters).toEqual({});
    expect(state.sortConfig).toBeNull();
    expect(state.pagination.page).toBe(1);
  });
});

describe('uiStore - setTheme', () => {
  it('setTheme 应该更新主题', () => {
    act(() => {
      useUIStore.getState().setTheme('light');
    });
    expect(useUIStore.getState().theme).toBe('light');
  });

  it('setTheme 应该支持所有主题类型', () => {
    const themes: Theme[] = ['light', 'dark', 'system'];

    themes.forEach((theme) => {
      act(() => {
        useUIStore.getState().setTheme(theme);
      });
      expect(useUIStore.getState().theme).toBe(theme);
    });
  });
});

describe('uiStore - toggleTheme', () => {
  it('toggleTheme 应该在 light 和 dark 之间切换', () => {
    useUIStore.setState({ theme: 'dark' });

    act(() => {
      useUIStore.getState().toggleTheme();
    });
    expect(useUIStore.getState().theme).toBe('light');

    act(() => {
      useUIStore.getState().toggleTheme();
    });
    expect(useUIStore.getState().theme).toBe('dark');
  });
});

describe('uiStore - toggleSidebar', () => {
  it('toggleSidebar 应该切换侧边栏状态', () => {
    act(() => {
      useUIStore.getState().toggleSidebar();
    });
    expect(useUIStore.getState().sidebar.isOpen).toBe(false);

    act(() => {
      useUIStore.getState().toggleSidebar();
    });
    expect(useUIStore.getState().sidebar.isOpen).toBe(true);
  });
});

describe('uiStore - setSidebarOpen', () => {
  it('setSidebarOpen 应该设置侧边栏打开状态', () => {
    act(() => {
      useUIStore.getState().setSidebarOpen(false);
    });
    expect(useUIStore.getState().sidebar.isOpen).toBe(false);

    act(() => {
      useUIStore.getState().setSidebarOpen(true);
    });
    expect(useUIStore.getState().sidebar.isOpen).toBe(true);
  });
});

describe('uiStore - toggleSidebarCollapsed', () => {
  it('toggleSidebarCollapsed 应该切换侧边栏折叠状态', () => {
    act(() => {
      useUIStore.getState().toggleSidebarCollapsed();
    });
    expect(useUIStore.getState().sidebar.collapsed).toBe(true);

    act(() => {
      useUIStore.getState().toggleSidebarCollapsed();
    });
    expect(useUIStore.getState().sidebar.collapsed).toBe(false);
  });
});

describe('uiStore - setSidebarActiveItem', () => {
  it('setSidebarActiveItem 应该设置活动菜单项', () => {
    act(() => {
      useUIStore.getState().setSidebarActiveItem('dashboard');
    });
    expect(useUIStore.getState().sidebar.activeItem).toBe('dashboard');
  });

  it('setSidebarActiveItem 应该能够设置为 null', () => {
    act(() => {
      useUIStore.getState().setSidebarActiveItem('dashboard');
    });
    expect(useUIStore.getState().sidebar.activeItem).not.toBeNull();

    act(() => {
      useUIStore.getState().setSidebarActiveItem(null);
    });
    expect(useUIStore.getState().sidebar.activeItem).toBeNull();
  });
});

describe('uiStore - setSidebar', () => {
  it('setSidebar 应该更新整个侧边栏状态', () => {
    const newSidebar: SidebarState = {
      isOpen: false,
      collapsed: true,
      activeItem: 'settings',
    };

    act(() => {
      useUIStore.getState().setSidebar(newSidebar);
    });

    const sidebar = useUIStore.getState().sidebar;
    expect(sidebar.isOpen).toBe(false);
    expect(sidebar.collapsed).toBe(true);
    expect(sidebar.activeItem).toBe('settings');
  });
});

describe('uiStore - addNotification', () => {
  it('addNotification 应该添加通知', () => {
    act(() => {
      useUIStore.getState().addNotification(mockNotification);
    });

    expect(useUIStore.getState().notifications).toHaveLength(1);
    expect(useUIStore.getState().notifications[0]).toEqual(mockNotification);
  });

  it('addNotification 应该添加到列表开头', () => {
    const existingNotif = { ...mockNotification, id: 'notif-0' };
    useUIStore.setState({ notifications: [existingNotif] });

    act(() => {
      useUIStore.getState().addNotification(mockNotification);
    });

    expect(useUIStore.getState().notifications[0].id).toBe('notif-1');
  });
});

describe('uiStore - removeNotification', () => {
  it('removeNotification 应该删除通知', () => {
    useUIStore.setState({ notifications: [mockNotification] });

    act(() => {
      useUIStore.getState().removeNotification('notif-1');
    });

    expect(useUIStore.getState().notifications).toHaveLength(0);
  });

  it('removeNotification 不应该影响不存在的通知', () => {
    useUIStore.setState({ notifications: [mockNotification] });

    act(() => {
      useUIStore.getState().removeNotification('non-existent');
    });

    expect(useUIStore.getState().notifications).toHaveLength(1);
  });
});

describe('uiStore - markNotificationAsRead', () => {
  it('markNotificationAsRead 应该标记通知为已读', () => {
    useUIStore.setState({ notifications: [mockNotification] });

    act(() => {
      useUIStore.getState().markNotificationAsRead('notif-1');
    });

    expect(useUIStore.getState().notifications[0].read).toBe(true);
  });
});

describe('uiStore - markAllNotificationsAsRead', () => {
  it('markAllNotificationsAsRead 应该标记所有通知为已读', () => {
    const notif2 = { ...mockNotification, id: 'notif-2' };
    useUIStore.setState({ notifications: [mockNotification, notif2] });

    act(() => {
      useUIStore.getState().markAllNotificationsAsRead();
    });

    useUIStore.getState().notifications.forEach((n) => {
      expect(n.read).toBe(true);
    });
  });
});

describe('uiStore - clearNotifications', () => {
  it('clearNotifications 应该清除所有通知', () => {
    useUIStore.setState({ notifications: [mockNotification] });

    act(() => {
      useUIStore.getState().clearNotifications();
    });

    expect(useUIStore.getState().notifications).toHaveLength(0);
  });
});

describe('uiStore - setLoading', () => {
  it('setLoading 应该设置加载状态', () => {
    act(() => {
      useUIStore.getState().setLoading('fetchData', true);
    });

    expect(useUIStore.getState().isLoading['fetchData']).toBe(true);
  });

  it('setLoading 应该能够设置为 false', () => {
    useUIStore.setState({ isLoading: { fetchData: true } });

    act(() => {
      useUIStore.getState().setLoading('fetchData', false);
    });

    expect(useUIStore.getState().isLoading['fetchData']).toBe(false);
  });
});

describe('uiStore - clearLoading', () => {
  it('clearLoading 应该清除指定加载状态', () => {
    useUIStore.setState({ isLoading: { fetchData: true, otherData: true } });

    act(() => {
      useUIStore.getState().clearLoading('fetchData');
    });

    expect(useUIStore.getState().isLoading['fetchData']).toBeUndefined();
    expect(useUIStore.getState().isLoading['otherData']).toBe(true);
  });
});

describe('uiStore - openModal', () => {
  it('openModal 应该打开模态框', () => {
    act(() => {
      useUIStore.getState().openModal('settings', { tab: 'general' });
    });

    expect(useUIStore.getState().modals['settings']).toEqual({
      isOpen: true,
      data: { tab: 'general' },
    });
  });
});

describe('uiStore - closeModal', () => {
  it('closeModal 应该关闭模态框', () => {
    useUIStore.setState({ modals: { settings: { isOpen: true, data: {} } } });

    act(() => {
      useUIStore.getState().closeModal('settings');
    });

    expect(useUIStore.getState().modals['settings']).toBeUndefined();
  });
});

describe('uiStore - isModalOpen', () => {
  it('isModalOpen 应该返回模态框状态', () => {
    useUIStore.setState({ modals: { settings: { isOpen: true, data: {} } } });

    expect(useUIStore.getState().isModalOpen('settings')).toBe(true);
    expect(useUIStore.getState().isModalOpen('non-existent')).toBe(false);
  });
});

describe('uiStore - addToast', () => {
  it('addToast 应该添加 toast 消息', () => {
    act(() => {
      useUIStore.getState().addToast({
        id: 'toast-1',
        type: 'success',
        message: 'Operation successful',
      });
    });

    expect(useUIStore.getState().toasts).toHaveLength(1);
  });
});

describe('uiStore - removeToast', () => {
  it('removeToast 应该删除 toast 消息', () => {
    useUIStore.setState({
      toasts: [{ id: 'toast-1', type: 'success', message: 'Test' }],
    });

    act(() => {
      useUIStore.getState().removeToast('toast-1');
    });

    expect(useUIStore.getState().toasts).toHaveLength(0);
  });
});

describe('uiStore - clearToasts', () => {
  it('clearToasts 应该清除所有 toast 消息', () => {
    useUIStore.setState({
      toasts: [
        { id: 'toast-1', type: 'success', message: 'Test 1' },
        { id: 'toast-2', type: 'error', message: 'Test 2' },
      ],
    });

    act(() => {
      useUIStore.getState().clearToasts();
    });

    expect(useUIStore.getState().toasts).toHaveLength(0);
  });
});

describe('uiStore - setSearchQuery', () => {
  it('setSearchQuery 应该更新搜索查询', () => {
    act(() => {
      useUIStore.getState().setSearchQuery('BTC');
    });

    expect(useUIStore.getState().searchQuery).toBe('BTC');
  });

  it('setSearchQuery 应该能够设置为空字符串', () => {
    act(() => {
      useUIStore.getState().setSearchQuery('BTC');
    });

    act(() => {
      useUIStore.getState().setSearchQuery('');
    });

    expect(useUIStore.getState().searchQuery).toBe('');
  });
});

describe('uiStore - setFilter', () => {
  it('setFilter 应该设置过滤器', () => {
    act(() => {
      useUIStore.getState().setFilter('status', 'active');
    });

    expect(useUIStore.getState().filters['status']).toBe('active');
  });
});

describe('uiStore - removeFilter', () => {
  it('removeFilter 应该删除过滤器', () => {
    useUIStore.setState({ filters: { status: 'active', chain: 'ethereum' } });

    act(() => {
      useUIStore.getState().removeFilter('status');
    });

    expect(useUIStore.getState().filters['status']).toBeUndefined();
    expect(useUIStore.getState().filters['chain']).toBe('ethereum');
  });
});

describe('uiStore - clearFilters', () => {
  it('clearFilters 应该清除所有过滤器', () => {
    useUIStore.setState({ filters: { status: 'active', chain: 'ethereum' } });

    act(() => {
      useUIStore.getState().clearFilters();
    });

    expect(Object.keys(useUIStore.getState().filters)).toHaveLength(0);
  });
});

describe('uiStore - setSortConfig', () => {
  it('setSortConfig 应该设置排序配置', () => {
    act(() => {
      useUIStore.getState().setSortConfig({ key: 'price', direction: 'desc' });
    });

    const sortConfig = useUIStore.getState().sortConfig;
    expect(sortConfig?.key).toBe('price');
    expect(sortConfig?.direction).toBe('desc');
  });

  it('setSortConfig 应该能够设置为 null', () => {
    useUIStore.setState({ sortConfig: { key: 'price', direction: 'asc' } });

    act(() => {
      useUIStore.getState().setSortConfig(null);
    });

    expect(useUIStore.getState().sortConfig).toBeNull();
  });
});

describe('uiStore - setPage', () => {
  it('setPage 应该设置当前页码', () => {
    act(() => {
      useUIStore.getState().setPage(2);
    });

    expect(useUIStore.getState().pagination.page).toBe(2);
  });
});

describe('uiStore - setPageSize', () => {
  it('setPageSize 应该设置每页数量', () => {
    act(() => {
      useUIStore.getState().setPageSize(20);
    });

    expect(useUIStore.getState().pagination.pageSize).toBe(20);
  });
});

describe('uiStore - setTotal', () => {
  it('setTotal 应该设置总数', () => {
    act(() => {
      useUIStore.getState().setTotal(100);
    });

    expect(useUIStore.getState().pagination.total).toBe(100);
  });
});

describe('uiStore - setPagination', () => {
  it('setPagination 应该更新分页配置', () => {
    act(() => {
      useUIStore.getState().setPagination({ page: 3, pageSize: 25, total: 200 });
    });

    const pagination = useUIStore.getState().pagination;
    expect(pagination.page).toBe(3);
    expect(pagination.pageSize).toBe(25);
    expect(pagination.total).toBe(200);
  });
});

describe('uiStore - resetPagination', () => {
  it('resetPagination 应该重置分页配置', () => {
    useUIStore.setState({
      pagination: { page: 5, pageSize: 50, total: 500 },
    });

    act(() => {
      useUIStore.getState().resetPagination();
    });

    const pagination = useUIStore.getState().pagination;
    expect(pagination.page).toBe(1);
    expect(pagination.pageSize).toBe(10);
    expect(pagination.total).toBe(0);
  });
});

describe('uiStore - getUnreadNotificationCount', () => {
  it('getUnreadNotificationCount 应该返回未读通知数量', () => {
    const notif2 = { ...mockNotification, id: 'notif-2', read: true };
    const notif3 = { ...mockNotification, id: 'notif-3' };
    useUIStore.setState({ notifications: [mockNotification, notif2, notif3] });

    const count = useUIStore.getState().getUnreadNotificationCount();
    expect(count).toBe(2);
  });

  it('getUnreadNotificationCount 应该返回 0 当没有未读通知时', () => {
    const readNotif = { ...mockNotification, read: true };
    useUIStore.setState({ notifications: [readNotif] });

    const count = useUIStore.getState().getUnreadNotificationCount();
    expect(count).toBe(0);
  });
});

describe('uiStore - isLoadingAny', () => {
  it('isLoadingAny 应该返回 true 当有任何加载中', () => {
    useUIStore.setState({ isLoading: { fetchData: true } });

    expect(useUIStore.getState().isLoadingAny()).toBe(true);
  });

  it('isLoadingAny 应该返回 false 当没有加载中', () => {
    useUIStore.setState({ isLoading: {} });

    expect(useUIStore.getState().isLoadingAny()).toBe(false);
  });
});

describe('uiStore - reset', () => {
  it('reset 应该重置所有状态', () => {
    useUIStore.setState({
      theme: 'light',
      sidebar: { isOpen: false, collapsed: true, activeItem: 'test' },
      notifications: [mockNotification],
      isLoading: { test: true },
      modals: { settings: { isOpen: true, data: {} } },
      toasts: [{ id: '1', type: 'success', message: 'test' }],
      searchQuery: 'test',
      filters: { status: 'active' },
      sortConfig: { key: 'price', direction: 'desc' },
      pagination: { page: 5, pageSize: 50, total: 500 },
    });

    act(() => {
      useUIStore.getState().reset();
    });

    const state = useUIStore.getState();
    expect(state.theme).toBe('dark');
    expect(state.sidebar.isOpen).toBe(true);
    expect(state.sidebar.collapsed).toBe(false);
    expect(state.notifications).toHaveLength(0);
    expect(Object.keys(state.isLoading)).toHaveLength(0);
    expect(Object.keys(state.modals)).toHaveLength(0);
    expect(state.toasts).toHaveLength(0);
    expect(state.searchQuery).toBe('');
    expect(Object.keys(state.filters)).toHaveLength(0);
    expect(state.sortConfig).toBeNull();
    expect(state.pagination.page).toBe(1);
  });
});
