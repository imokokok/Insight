import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface ModalState {
  isOpen: boolean;
  modalId: string | null;
  modalData: Record<string, unknown> | null;
}

interface UIStore {
  modal: ModalState;

  openModal: (modalId: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIStore>()(
  devtools(
    (set) => ({
      modal: {
        isOpen: false,
        modalId: null,
        modalData: null,
      },

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
    }),
    { name: 'UIStore' }
  )
);
