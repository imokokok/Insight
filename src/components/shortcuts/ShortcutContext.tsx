'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

import {
  type KeyboardShortcut,
  shortcutManager,
  checkShortcutConflicts,
  type ShortcutConflict,
} from '@/hooks';

export interface ShortcutCategory {
  id: string;
  labelKey: string;
  shortcuts: KeyboardShortcut[];
}

export interface ShortcutContextState {
  isHelpOpen: boolean;
  categories: ShortcutCategory[];
  conflicts: ShortcutConflict[];
  activeScope: string;
}

export interface ShortcutContextActions {
  openHelp: () => void;
  closeHelp: () => void;
  toggleHelp: () => void;
  registerShortcut: (shortcut: KeyboardShortcut, categoryId?: string) => () => void;
  unregisterShortcut: (shortcut: KeyboardShortcut) => void;
  addCategory: (category: ShortcutCategory) => void;
  removeCategory: (categoryId: string) => void;
  setActiveScope: (scope: string) => void;
  checkConflicts: () => ShortcutConflict[];
}

export interface ShortcutContextValue extends ShortcutContextState, ShortcutContextActions {}

const ShortcutContext = createContext<ShortcutContextValue | undefined>(undefined);

export interface ShortcutProviderProps {
  children: ReactNode;
  defaultCategories?: ShortcutCategory[];
}

export function ShortcutProvider({ children, defaultCategories = [] }: ShortcutProviderProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [categories, setCategories] = useState<ShortcutCategory[]>(defaultCategories);
  const [conflicts, setConflicts] = useState<ShortcutConflict[]>([]);
  const [activeScope, setActiveScope] = useState('global');

  const openHelp = useCallback(() => {
    setIsHelpOpen(true);
  }, []);

  const closeHelp = useCallback(() => {
    setIsHelpOpen(false);
  }, []);

  const toggleHelp = useCallback(() => {
    setIsHelpOpen((prev) => !prev);
  }, []);

  const registerShortcut = useCallback((shortcut: KeyboardShortcut, categoryId?: string) => {
    const unregister = shortcutManager.register(shortcut);

    if (categoryId) {
      setCategories((prev) => {
        const existing = prev.find((c) => c.id === categoryId);
        if (existing) {
          return prev.map((c) =>
            c.id === categoryId ? { ...c, shortcuts: [...c.shortcuts, shortcut] } : c
          );
        }
        return prev;
      });
    }

    // 重新检查冲突
    const allShortcuts = shortcutManager.getAllShortcuts();
    const newConflicts = checkShortcutConflicts(allShortcuts);
    setConflicts(newConflicts);

    return () => {
      unregister();
      if (categoryId) {
        setCategories((prev) =>
          prev.map((c) =>
            c.id === categoryId ? { ...c, shortcuts: c.shortcuts.filter((s) => s !== shortcut) } : c
          )
        );
      }
    };
  }, []);

  const unregisterShortcut = useCallback((shortcut: KeyboardShortcut) => {
    shortcutManager.unregister(shortcut);

    setCategories((prev) =>
      prev.map((c) => ({
        ...c,
        shortcuts: c.shortcuts.filter((s) => s !== shortcut),
      }))
    );

    // 重新检查冲突
    const allShortcuts = shortcutManager.getAllShortcuts();
    const newConflicts = checkShortcutConflicts(allShortcuts);
    setConflicts(newConflicts);
  }, []);

  const addCategory = useCallback((category: ShortcutCategory) => {
    setCategories((prev) => {
      const exists = prev.find((c) => c.id === category.id);
      if (exists) {
        return prev.map((c) => (c.id === category.id ? category : c));
      }
      return [...prev, category];
    });
  }, []);

  const removeCategory = useCallback((categoryId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
  }, []);

  const handleSetActiveScope = useCallback((scope: string) => {
    setActiveScope(scope);
    shortcutManager.setActiveScope(scope);
  }, []);

  const checkConflicts = useCallback(() => {
    const allShortcuts = shortcutManager.getAllShortcuts();
    const newConflicts = checkShortcutConflicts(allShortcuts);
    setConflicts(newConflicts);
    return newConflicts;
  }, []);

  const value = useMemo<ShortcutContextValue>(
    () => ({
      isHelpOpen,
      categories,
      conflicts,
      activeScope,
      openHelp,
      closeHelp,
      toggleHelp,
      registerShortcut,
      unregisterShortcut,
      addCategory,
      removeCategory,
      setActiveScope: handleSetActiveScope,
      checkConflicts,
    }),
    [
      isHelpOpen,
      categories,
      conflicts,
      activeScope,
      openHelp,
      closeHelp,
      toggleHelp,
      registerShortcut,
      unregisterShortcut,
      addCategory,
      removeCategory,
      handleSetActiveScope,
      checkConflicts,
    ]
  );

  return <ShortcutContext.Provider value={value}>{children}</ShortcutContext.Provider>;
}

export function useShortcutContext(): ShortcutContextValue {
  const context = useContext(ShortcutContext);
  if (context === undefined) {
    throw new Error('useShortcutContext must be used within a ShortcutProvider');
  }
  return context;
}

export function useShortcutHelp(): {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
} {
  const context = useContext(ShortcutContext);
  if (context === undefined) {
    throw new Error('useShortcutHelp must be used within a ShortcutProvider');
  }
  return {
    isOpen: context.isHelpOpen,
    open: context.openHelp,
    close: context.closeHelp,
    toggle: context.toggleHelp,
  };
}

export function useShortcutRegistration(): {
  register: (shortcut: KeyboardShortcut, categoryId?: string) => () => void;
  unregister: (shortcut: KeyboardShortcut) => void;
} {
  const context = useContext(ShortcutContext);
  if (context === undefined) {
    throw new Error('useShortcutRegistration must be used within a ShortcutProvider');
  }
  return {
    register: context.registerShortcut,
    unregister: context.unregisterShortcut,
  };
}

export default ShortcutContext;
