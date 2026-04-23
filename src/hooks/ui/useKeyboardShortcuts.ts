'use client';

import { useEffect, useCallback, useMemo, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  handler: () => void;
  description?: string;
  preventDefault?: boolean;
  /** Priority, higher number means higher priority */
  priority?: number;
  /** Shortcut scope, default is 'global' */
  scope?: string;
}

interface ShortcutConflict {
  shortcut1: KeyboardShortcut;
  shortcut2: KeyboardShortcut;
  conflictKey: string;
}

/**
 * Check if keyboard shortcuts conflict
 */
export function checkShortcutConflicts(shortcuts: KeyboardShortcut[]): ShortcutConflict[] {
  const conflicts: ShortcutConflict[] = [];

  for (let i = 0; i < shortcuts.length; i++) {
    for (let j = i + 1; j < shortcuts.length; j++) {
      const s1 = shortcuts[i];
      const s2 = shortcuts[j];

      if (
        s1.key.toLowerCase() === s2.key.toLowerCase() &&
        !!s1.ctrlKey === !!s2.ctrlKey &&
        !!s1.altKey === !!s2.altKey &&
        !!s1.shiftKey === !!s2.shiftKey &&
        !!s1.metaKey === !!s2.metaKey &&
        s1.scope === s2.scope
      ) {
        conflicts.push({
          shortcut1: s1,
          shortcut2: s2,
          conflictKey: formatShortcut(s1),
        });
      }
    }
  }

  return conflicts;
}

/**
 * Format shortcut as readable string
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.metaKey) parts.push('Cmd');
  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.altKey) parts.push('Alt');
  if (shortcut.shiftKey) parts.push('Shift');

  const keyMap: Record<string, string> = {
    escape: 'Esc',
    enter: '↵',
    arrowup: '↑',
    arrowdown: '↓',
    arrowleft: '←',
    arrowright: '→',
    tab: 'Tab',
    space: 'Space',
    backspace: '⌫',
    delete: 'Del',
    home: 'Home',
    end: 'End',
    pageup: 'PgUp',
    pagedown: 'PgDn',
  };

  const keyDisplay = keyMap[shortcut.key.toLowerCase()] || shortcut.key.toUpperCase();
  parts.push(keyDisplay);

  return parts.join('+');
}

/**
 * Get platform-specific shortcut display
 */
export function getPlatformShortcut(shortcut: KeyboardShortcut): string {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  const parts: string[] = [];

  if (isMac) {
    if (shortcut.metaKey) parts.push('⌘');
    if (shortcut.altKey) parts.push('⌥');
    if (shortcut.shiftKey) parts.push('⇧');
    if (shortcut.ctrlKey) parts.push('⌃');
  } else {
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.altKey) parts.push('Alt');
    if (shortcut.shiftKey) parts.push('Shift');
    if (shortcut.metaKey) parts.push('Win');
  }

  const keyMap: Record<string, string> = {
    escape: 'Esc',
    enter: '↵',
    arrowup: '↑',
    arrowdown: '↓',
    arrowleft: '←',
    arrowright: '→',
    tab: 'Tab',
    space: 'Space',
    backspace: '⌫',
    delete: 'Del',
    home: 'Home',
    end: 'End',
    pageup: 'PgUp',
    pagedown: 'PgDn',
  };

  const keyDisplay = keyMap[shortcut.key.toLowerCase()] || shortcut.key.toUpperCase();
  parts.push(keyDisplay);

  return parts.join(isMac ? '' : '+');
}

/**
 * Global keyboard shortcut manager
 */
class ShortcutManager {
  private shortcuts: Map<string, KeyboardShortcut[]> = new Map();
  private activeScope: string = 'global';

  register(shortcut: KeyboardShortcut): () => void {
    const scope = shortcut.scope || 'global';

    if (!this.shortcuts.has(scope)) {
      this.shortcuts.set(scope, []);
    }

    const scopeShortcuts = this.shortcuts.get(scope)!;
    scopeShortcuts.push(shortcut);

    // Sort by priority
    scopeShortcuts.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    return () => {
      const index = scopeShortcuts.indexOf(shortcut);
      if (index > -1) {
        scopeShortcuts.splice(index, 1);
      }
    };
  }

  unregister(shortcut: KeyboardShortcut): void {
    const scope = shortcut.scope || 'global';
    const scopeShortcuts = this.shortcuts.get(scope);

    if (scopeShortcuts) {
      const index = scopeShortcuts.indexOf(shortcut);
      if (index > -1) {
        scopeShortcuts.splice(index, 1);
      }
    }
  }

  setActiveScope(scope: string): void {
    this.activeScope = scope;
  }

  getActiveScope(): string {
    return this.activeScope;
  }

  getShortcuts(scope?: string): KeyboardShortcut[] {
    const targetScope = scope || this.activeScope;
    return this.shortcuts.get(targetScope) || [];
  }

  getAllShortcuts(): KeyboardShortcut[] {
    const all: KeyboardShortcut[] = [];
    this.shortcuts.forEach((shortcuts) => all.push(...shortcuts));
    return all;
  }

  handleKeyDown(event: KeyboardEvent): boolean {
    // Prioritize shortcuts in current scope
    const scopesToCheck = [this.activeScope, 'global'];

    for (const scope of scopesToCheck) {
      const shortcuts = this.shortcuts.get(scope) || [];

      for (const shortcut of shortcuts) {
        const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const matchesCtrl = shortcut.ctrlKey ? event.ctrlKey : !event.ctrlKey;
        const matchesAlt = shortcut.altKey ? event.altKey : !event.altKey;
        const matchesShift = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
        const matchesMeta = shortcut.metaKey ? event.metaKey : !event.metaKey;

        if (matchesKey && matchesCtrl && matchesAlt && matchesShift && matchesMeta) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.handler();
          return true;
        }
      }
    }

    return false;
  }
}

// Global keyboard shortcut manager instance
export const shortcutManager = new ShortcutManager();

/**
 * Use keyboard shortcuts Hook
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const shortcutKey = shortcuts
    .map((s) => `${s.key}:${s.ctrlKey}:${s.altKey}:${s.shiftKey}:${s.metaKey}:${s.scope}`)
    .join(',');

  useEffect(() => {
    const unregisters: (() => void)[] = [];

    shortcutsRef.current.forEach((shortcut) => {
      const wrapper: KeyboardShortcut = {
        ...shortcut,
        handler: () => {
          const current = shortcutsRef.current.find(
            (s) =>
              s.key === shortcut.key &&
              !!s.ctrlKey === !!shortcut.ctrlKey &&
              !!s.altKey === !!shortcut.altKey &&
              !!s.shiftKey === !!shortcut.shiftKey &&
              !!s.metaKey === !!shortcut.metaKey &&
              s.scope === shortcut.scope
          );
          current?.handler();
        },
      };
      const unregister = shortcutManager.register(wrapper);
      unregisters.push(unregister);
    });

    return () => {
      unregisters.forEach((unregister) => unregister());
    };
  }, [shortcutKey]);
}

/**
 * initializekeyboardeventlisten
 */
export function useGlobalKeyboardListener() {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // whenuserininputinnottriggershortcut
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Escape closefor
      if (event.key !== 'Escape') {
        return;
      }
    }

    shortcutManager.handleKeyDown(event);
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// shortcutDescription，use
const shortcutKeys = {
  refresh: 'shortcuts.refresh',
  search: 'shortcuts.search',
  close: 'shortcuts.close',
  fullscreen: 'shortcuts.fullscreen',
  export: 'shortcuts.export',
  help: 'shortcuts.help',
  navigateUp: 'shortcuts.navigateUp',
  navigateDown: 'shortcuts.navigateDown',
  select: 'shortcuts.select',
} as const;

/**
 * useshortcut Hook
 */
export function useCommonShortcuts({
  onRefresh,
  onSearch,
  onClose,
  onFullscreen,
  onExport,
}: {
  onRefresh?: () => void;
  onSearch?: () => void;
  onClose?: () => void;
  onFullscreen?: () => void;
  onExport?: () => void;
}) {
  const shortcuts: KeyboardShortcut[] = [];

  if (onRefresh) {
    shortcuts.push({
      key: 'r',
      handler: onRefresh,
      description: shortcutKeys.refresh,
      preventDefault: true,
    });
  }

  if (onSearch) {
    shortcuts.push({
      key: 'k',
      metaKey: true,
      handler: onSearch,
      description: shortcutKeys.search,
      preventDefault: true,
    });
    shortcuts.push({
      key: 'k',
      ctrlKey: true,
      handler: onSearch,
      description: shortcutKeys.search,
      preventDefault: true,
    });
  }

  if (onClose) {
    shortcuts.push({
      key: 'Escape',
      handler: onClose,
      description: shortcutKeys.close,
      preventDefault: true,
    });
  }

  if (onFullscreen) {
    shortcuts.push({
      key: 'f',
      handler: onFullscreen,
      description: shortcutKeys.fullscreen,
      preventDefault: true,
    });
  }

  if (onExport) {
    shortcuts.push({
      key: 'e',
      handler: onExport,
      description: shortcutKeys.export,
      preventDefault: true,
    });
  }

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
}
