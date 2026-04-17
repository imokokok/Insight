import { act } from '@testing-library/react';

import { useUIStore } from '../uiStore';

beforeEach(() => {
  useUIStore.setState({
    sidebar: { isOpen: true, isCollapsed: false, activeItem: null },
    modal: { isOpen: false, modalId: null, modalData: null },
    isMobile: false,
  });
});

describe('uiStore - 初始状态', () => {
  it('应该有正确的初始状态', () => {
    const state = useUIStore.getState();
    expect(state.sidebar.isOpen).toBe(true);
    expect(state.sidebar.isCollapsed).toBe(false);
    expect(state.sidebar.activeItem).toBeNull();
    expect(state.modal.isOpen).toBe(false);
    expect(state.modal.modalId).toBeNull();
    expect(state.modal.modalData).toBeNull();
    expect(state.isMobile).toBe(false);
  });
});

describe('uiStore - sidebar', () => {
  it('openSidebar 应该打开侧边栏', () => {
    act(() => {
      useUIStore.getState().closeSidebar();
    });
    expect(useUIStore.getState().sidebar.isOpen).toBe(false);

    act(() => {
      useUIStore.getState().openSidebar();
    });
    expect(useUIStore.getState().sidebar.isOpen).toBe(true);
  });

  it('closeSidebar 应该关闭侧边栏', () => {
    act(() => {
      useUIStore.getState().closeSidebar();
    });
    expect(useUIStore.getState().sidebar.isOpen).toBe(false);
  });

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

  it('toggleSidebarCollapse 应该切换折叠状态', () => {
    act(() => {
      useUIStore.getState().toggleSidebarCollapse();
    });
    expect(useUIStore.getState().sidebar.isCollapsed).toBe(true);

    act(() => {
      useUIStore.getState().toggleSidebarCollapse();
    });
    expect(useUIStore.getState().sidebar.isCollapsed).toBe(false);
  });

  it('setActiveSidebarItem 应该设置活动项', () => {
    act(() => {
      useUIStore.getState().setActiveSidebarItem('dashboard');
    });
    expect(useUIStore.getState().sidebar.activeItem).toBe('dashboard');

    act(() => {
      useUIStore.getState().setActiveSidebarItem(null);
    });
    expect(useUIStore.getState().sidebar.activeItem).toBeNull();
  });
});

describe('uiStore - modal', () => {
  it('openModal 应该打开模态框', () => {
    act(() => {
      useUIStore.getState().openModal('settings', { tab: 'general' });
    });

    const modal = useUIStore.getState().modal;
    expect(modal.isOpen).toBe(true);
    expect(modal.modalId).toBe('settings');
    expect(modal.modalData).toEqual({ tab: 'general' });
  });

  it('closeModal 应该关闭模态框', () => {
    act(() => {
      useUIStore.getState().openModal('settings');
    });
    expect(useUIStore.getState().modal.isOpen).toBe(true);

    act(() => {
      useUIStore.getState().closeModal();
    });
    expect(useUIStore.getState().modal.isOpen).toBe(false);
    expect(useUIStore.getState().modal.modalId).toBeNull();
  });
});

describe('uiStore - isMobile', () => {
  it('setIsMobile 应该更新移动端状态', () => {
    act(() => {
      useUIStore.getState().setIsMobile(true);
    });
    expect(useUIStore.getState().isMobile).toBe(true);

    act(() => {
      useUIStore.getState().setIsMobile(false);
    });
    expect(useUIStore.getState().isMobile).toBe(false);
  });
});
