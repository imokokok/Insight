import { act } from '@testing-library/react';

import { useUIStore } from '../uiStore';

beforeEach(() => {
  useUIStore.setState({
    modal: { isOpen: false, modalId: null, modalData: null },
  });
});

describe('uiStore - Initial state', () => {
  it('should have initial state', () => {
    const state = useUIStore.getState();
    expect(state.modal.isOpen).toBe(false);
    expect(state.modal.modalId).toBeNull();
    expect(state.modal.modalData).toBeNull();
  });
});

describe('uiStore - modal', () => {
  it('openModal should open modal', () => {
    act(() => {
      useUIStore.getState().openModal('settings', { tab: 'general' });
    });

    const modal = useUIStore.getState().modal;
    expect(modal.isOpen).toBe(true);
    expect(modal.modalId).toBe('settings');
    expect(modal.modalData).toEqual({ tab: 'general' });
  });

  it('closeModal should close modal', () => {
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
