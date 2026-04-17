import { renderHook } from '@testing-library/react';

import {
  useKeyboardShortcuts,
  useGlobalKeyboardListener,
  useCommonShortcuts,
  checkShortcutConflicts,
  formatShortcut,
  getPlatformShortcut,
  shortcutManager,
  type KeyboardShortcut,
} from '../ui/useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    shortcutManager.setActiveScope('global');
  });

  it('should register shortcuts on mount', () => {
    const handler = jest.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: 'a', handler, description: 'Test shortcut' }];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const registered = shortcutManager.getShortcuts();
    expect(registered.some((s) => s.key === 'a')).toBe(true);
  });

  it('should unregister shortcuts on unmount', () => {
    const handler = jest.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: 'b', handler, description: 'Test shortcut' }];

    const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts));

    unmount();

    const registered = shortcutManager.getShortcuts();
    expect(registered.some((s) => s.key === 'b')).toBe(false);
  });

  it('should handle key combinations', () => {
    const handler = jest.fn();
    const shortcuts: KeyboardShortcut[] = [
      { key: 's', ctrlKey: true, handler, description: 'Save' },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
    });

    shortcutManager.handleKeyDown(event);

    expect(handler).toHaveBeenCalled();
  });

  it('should respect scope', () => {
    const globalHandler = jest.fn();
    const scopedHandler = jest.fn();

    const globalShortcuts: KeyboardShortcut[] = [
      { key: 'x', handler: globalHandler, scope: 'global' },
    ];
    const scopedShortcuts: KeyboardShortcut[] = [
      { key: 'x', handler: scopedHandler, scope: 'modal' },
    ];

    renderHook(() => useKeyboardShortcuts(globalShortcuts));
    renderHook(() => useKeyboardShortcuts(scopedShortcuts));

    shortcutManager.setActiveScope('modal');

    const event = new KeyboardEvent('keydown', { key: 'x' });
    shortcutManager.handleKeyDown(event);

    expect(scopedHandler).toHaveBeenCalled();
    expect(globalHandler).not.toHaveBeenCalled();
  });

  it('should respect priority', () => {
    const lowPriorityHandler = jest.fn();
    const highPriorityHandler = jest.fn();

    const shortcuts: KeyboardShortcut[] = [
      { key: 'p', handler: lowPriorityHandler, priority: 1 },
      { key: 'p', handler: highPriorityHandler, priority: 10 },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = new KeyboardEvent('keydown', { key: 'p' });
    shortcutManager.handleKeyDown(event);

    expect(highPriorityHandler).toHaveBeenCalled();
    expect(lowPriorityHandler).not.toHaveBeenCalled();
  });

  it('should prevent default when configured', () => {
    const handler = jest.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: 'r', handler, preventDefault: true }];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = new KeyboardEvent('keydown', { key: 'r' });
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

    shortcutManager.handleKeyDown(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});

describe('useGlobalKeyboardListener', () => {
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('should add event listener on mount', () => {
    renderHook(() => useGlobalKeyboardListener());

    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should remove event listener on unmount', () => {
    const { unmount } = renderHook(() => useGlobalKeyboardListener());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should not trigger shortcuts when typing in input', () => {
    const handler = jest.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: 'a', handler }];

    renderHook(() => useKeyboardShortcuts(shortcuts));
    renderHook(() => useGlobalKeyboardListener());

    const inputEvent = new KeyboardEvent('keydown', {
      key: 'a',
      bubbles: true,
    });

    Object.defineProperty(inputEvent, 'target', {
      value: document.createElement('a'),
      writable: false,
    });

    window.dispatchEvent(inputEvent);

    expect(handler).not.toHaveBeenCalled();
  });

  it('should allow Escape key in input fields', () => {
    const handler = jest.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: 'Escape', handler }];

    renderHook(() => useKeyboardShortcuts(shortcuts));
    renderHook(() => useGlobalKeyboardListener());

    const inputElement = document.createElement('a');
    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
    });

    Object.defineProperty(escapeEvent, 'target', {
      value: inputElement,
      writable: false,
    });

    window.dispatchEvent(escapeEvent);

    expect(handler).toHaveBeenCalled();
  });
});

describe('useCommonShortcuts', () => {
  beforeEach(() => {
    shortcutManager.setActiveScope('global');
  });

  it('should register refresh shortcut', () => {
    const onRefresh = jest.fn();

    renderHook(() => useCommonShortcuts({ onRefresh }));

    const event = new KeyboardEvent('keydown', { key: 'r' });
    shortcutManager.handleKeyDown(event);

    expect(onRefresh).toHaveBeenCalled();
  });

  it('should register search shortcut with meta key', () => {
    const onSearch = jest.fn();

    renderHook(() => useCommonShortcuts({ onSearch }));

    const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
    shortcutManager.handleKeyDown(event);

    expect(onSearch).toHaveBeenCalled();
  });

  it('should register search shortcut with ctrl key', () => {
    const onSearch = jest.fn();

    renderHook(() => useCommonShortcuts({ onSearch }));

    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    shortcutManager.handleKeyDown(event);

    expect(onSearch).toHaveBeenCalled();
  });

  it('should register close shortcut', () => {
    const onClose = jest.fn();

    renderHook(() => useCommonShortcuts({ onClose }));

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    shortcutManager.handleKeyDown(event);

    expect(onClose).toHaveBeenCalled();
  });

  it('should register fullscreen shortcut', () => {
    const onFullscreen = jest.fn();

    renderHook(() => useCommonShortcuts({ onFullscreen }));

    const event = new KeyboardEvent('keydown', { key: 'f' });
    shortcutManager.handleKeyDown(event);

    expect(onFullscreen).toHaveBeenCalled();
  });

  it('should register export shortcut', () => {
    const onExport = jest.fn();

    renderHook(() => useCommonShortcuts({ onExport }));

    const event = new KeyboardEvent('keydown', { key: 'e' });
    shortcutManager.handleKeyDown(event);

    expect(onExport).toHaveBeenCalled();
  });

  it('should not register shortcuts when callbacks are not provided', () => {
    renderHook(() => useCommonShortcuts({}));

    const shortcuts = shortcutManager.getAllShortcuts();
    expect(shortcuts.length).toBe(0);
  });
});

describe('checkShortcutConflicts', () => {
  it('should detect conflicts', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 's', ctrlKey: true, handler: jest.fn() },
      { key: 's', ctrlKey: true, handler: jest.fn() },
    ];

    const conflicts = checkShortcutConflicts(shortcuts);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].conflictKey).toBe('Ctrl+S');
  });

  it('should not detect conflicts for different keys', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 's', ctrlKey: true, handler: jest.fn() },
      { key: 'a', ctrlKey: true, handler: jest.fn() },
    ];

    const conflicts = checkShortcutConflicts(shortcuts);

    expect(conflicts).toHaveLength(0);
  });

  it('should not detect conflicts for different modifiers', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 's', ctrlKey: true, handler: jest.fn() },
      { key: 's', metaKey: true, handler: jest.fn() },
    ];

    const conflicts = checkShortcutConflicts(shortcuts);

    expect(conflicts).toHaveLength(0);
  });

  it('should not detect conflicts for different scopes', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 's', ctrlKey: true, handler: jest.fn(), scope: 'global' },
      { key: 's', ctrlKey: true, handler: jest.fn(), scope: 'modal' },
    ];

    const conflicts = checkShortcutConflicts(shortcuts);

    expect(conflicts).toHaveLength(0);
  });
});

describe('formatShortcut', () => {
  it('should format simple key', () => {
    const shortcut: KeyboardShortcut = { key: 'a', handler: jest.fn() };
    expect(formatShortcut(shortcut)).toBe('A');
  });

  it('should format key with modifiers', () => {
    const shortcut: KeyboardShortcut = {
      key: 's',
      ctrlKey: true,
      shiftKey: true,
      handler: jest.fn(),
    };
    expect(formatShortcut(shortcut)).toBe('Ctrl+Shift+S');
  });

  it('should format special keys', () => {
    expect(formatShortcut({ key: 'Escape', handler: jest.fn() })).toBe('Esc');
    expect(formatShortcut({ key: 'Enter', handler: jest.fn() })).toBe('↵');
    expect(formatShortcut({ key: 'ArrowUp', handler: jest.fn() })).toBe('↑');
    expect(formatShortcut({ key: 'ArrowDown', handler: jest.fn() })).toBe('↓');
    expect(formatShortcut({ key: 'ArrowLeft', handler: jest.fn() })).toBe('←');
    expect(formatShortcut({ key: 'ArrowRight', handler: jest.fn() })).toBe('→');
  });
});

describe('getPlatformShortcut', () => {
  const originalPlatform = navigator.platform;

  afterEach(() => {
    Object.defineProperty(navigator, 'platform', {
      value: originalPlatform,
      configurable: true,
    });
  });

  it('should format for Mac platform', () => {
    Object.defineProperty(navigator, 'platform', {
      value: 'MacIntel',
      configurable: true,
    });

    const shortcut: KeyboardShortcut = {
      key: 's',
      metaKey: true,
      shiftKey: true,
      handler: jest.fn(),
    };

    expect(getPlatformShortcut(shortcut)).toBe('⌘⇧S');
  });

  it('should format for non-Mac platform', () => {
    Object.defineProperty(navigator, 'platform', {
      value: 'Win32',
      configurable: true,
    });

    const shortcut: KeyboardShortcut = {
      key: 's',
      ctrlKey: true,
      shiftKey: true,
      handler: jest.fn(),
    };

    expect(getPlatformShortcut(shortcut)).toBe('Ctrl+Shift+S');
  });
});

describe('shortcutManager', () => {
  beforeEach(() => {
    shortcutManager.setActiveScope('global');
  });

  it('should register and unregister shortcuts', () => {
    const shortcut: KeyboardShortcut = { key: 't', handler: jest.fn() };

    const unregister = shortcutManager.register(shortcut);

    expect(shortcutManager.getShortcuts().some((s) => s.key === 't')).toBe(true);

    unregister();

    expect(shortcutManager.getShortcuts().some((s) => s.key === 't')).toBe(false);
  });

  it('should set and get active scope', () => {
    shortcutManager.setActiveScope('modal');

    expect(shortcutManager.getActiveScope()).toBe('modal');
  });

  it('should get all shortcuts', () => {
    const shortcut1: KeyboardShortcut = { key: 'a', handler: jest.fn(), scope: 'global' };
    const shortcut2: KeyboardShortcut = { key: 'b', handler: jest.fn(), scope: 'modal' };

    shortcutManager.register(shortcut1);
    shortcutManager.register(shortcut2);

    const all = shortcutManager.getAllShortcuts();

    expect(all.length).toBeGreaterThanOrEqual(2);
  });
});
