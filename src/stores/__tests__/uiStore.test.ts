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
  it('closeModal should close modal', () => {
    useUIStore.setState({
      modal: { isOpen: true, modalId: 'settings', modalData: null },
    });
    expect(useUIStore.getState().modal.isOpen).toBe(true);

    useUIStore.getState().closeModal();
    expect(useUIStore.getState().modal.isOpen).toBe(false);
    expect(useUIStore.getState().modal.modalId).toBeNull();
  });
});
