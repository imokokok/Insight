import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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

interface UIStore {
  sidebar: SidebarState;
  modal: ModalState;
  notifications: Notification[];
  theme: Theme;
  isMobile: boolean;

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
}

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export const useUIStore = create<UIStore>()(
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
            get().removeNotification(newNotification.id);
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
    }),
    {
      name: 'ui-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebar: {
          isCollapsed: state.sidebar.isCollapsed,
        },
        theme: state.theme,
      }),
    }
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
