import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';

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

interface UIStore {
  sidebar: SidebarState;
  modal: ModalState;
  isMobile: boolean;

  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  toggleSidebarCollapse: () => void;
  setActiveSidebarItem: (item: string | null) => void;

  openModal: (modalId: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;

  setIsMobile: (isMobile: boolean) => void;
}

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set) => ({
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

        setIsMobile: (isMobile) => set({ isMobile }),
      }),
      {
        name: 'ui-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          sidebar: {
            isCollapsed: state.sidebar.isCollapsed,
          },
        }),
      }
    ),
    { name: 'UIStore' }
  )
);
