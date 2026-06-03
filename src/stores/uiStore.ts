import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface ModalState {
  isOpen: boolean;
  modalId: string | null;
  modalData: Record<string, unknown> | null;
}

interface UIStore {
  modal: ModalState;

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
