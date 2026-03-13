'use client';

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  handler: () => void;
  description?: string;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

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
          break;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Predefined shortcuts for common actions
export function useCommonShortcuts({
  onRefresh,
  onSearch,
  onClose,
}: {
  onRefresh?: () => void;
  onSearch?: () => void;
  onClose?: () => void;
}) {
  const shortcuts: KeyboardShortcut[] = [];

  if (onRefresh) {
    shortcuts.push({
      key: 'r',
      handler: onRefresh,
      description: '刷新数据',
    });
  }

  if (onSearch) {
    shortcuts.push({
      key: '/',
      handler: onSearch,
      description: '聚焦搜索',
    });
  }

  if (onClose) {
    shortcuts.push({
      key: 'Escape',
      handler: onClose,
      description: '关闭弹窗/面板',
    });
  }

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
}
