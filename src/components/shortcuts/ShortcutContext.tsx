'use client';

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';

import type { KeyboardShortcut } from '@/hooks';

// ============================================================================
// 类型定义
// ============================================================================

type ShortcutCategory = 'navigation' | 'actions' | 'charts' | 'data' | 'general';

interface ShortcutContextState {
  isHelpOpen: boolean;
  categories: ShortcutCategoryState[];
}

interface ShortcutCategoryState {
  id: string;
  label: string;
  shortcuts: KeyboardShortcut[];
}

interface ShortcutContextActions {
  openHelp: () => void;
  closeHelp: () => void;
  toggleHelp: () => void;
  registerShortcut: (category: string, label: string, shortcut: KeyboardShortcut) => void;
  unregisterShortcut: (category: string, key: string) => void;
}

type ShortcutContextValue = ShortcutContextState & ShortcutContextActions;

interface ShortcutProviderProps {
  children: React.ReactNode;
}

// ============================================================================
// Context
// ============================================================================

const ShortcutContext = createContext<ShortcutContextValue | null>(null);

// ============================================================================
// Reducer
// ============================================================================

type Action =
  | { type: 'OPEN_HELP' }
  | { type: 'CLOSE_HELP' }
  | { type: 'TOGGLE_HELP' }
  | {
      type: 'REGISTER_SHORTCUT';
      payload: { category: string; label: string; shortcut: KeyboardShortcut };
    }
  | { type: 'UNREGISTER_SHORTCUT'; payload: { category: string; key: string } };

const initialState: ShortcutContextState = {
  isHelpOpen: false,
  categories: [],
};

function shortcutReducer(state: ShortcutContextState, action: Action): ShortcutContextState {
  switch (action.type) {
    case 'OPEN_HELP':
      return { ...state, isHelpOpen: true };
    case 'CLOSE_HELP':
      return { ...state, isHelpOpen: false };
    case 'TOGGLE_HELP':
      return { ...state, isHelpOpen: !state.isHelpOpen };
    case 'REGISTER_SHORTCUT': {
      const { category, label, shortcut } = action.payload;
      const existingCategory = state.categories.find((c) => c.id === category);

      if (existingCategory) {
        return {
          ...state,
          categories: state.categories.map((c) =>
            c.id === category ? { ...c, shortcuts: [...c.shortcuts, shortcut] } : c
          ),
        };
      }

      return {
        ...state,
        categories: [...state.categories, { id: category, label, shortcuts: [shortcut] }],
      };
    }
    case 'UNREGISTER_SHORTCUT': {
      const { category, key } = action.payload;
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === category ? { ...c, shortcuts: c.shortcuts.filter((s) => s.key !== key) } : c
        ),
      };
    }
    default:
      return state;
  }
}

// ============================================================================
// Provider
// ============================================================================

export function ShortcutProvider({ children }: ShortcutProviderProps) {
  const [state, dispatch] = useReducer(shortcutReducer, initialState);

  const openHelp = useCallback(() => {
    dispatch({ type: 'OPEN_HELP' });
  }, []);

  const closeHelp = useCallback(() => {
    dispatch({ type: 'CLOSE_HELP' });
  }, []);

  const toggleHelp = useCallback(() => {
    dispatch({ type: 'TOGGLE_HELP' });
  }, []);

  const registerShortcut = useCallback(
    (category: string, label: string, shortcut: KeyboardShortcut) => {
      dispatch({ type: 'REGISTER_SHORTCUT', payload: { category, label, shortcut } });
    },
    []
  );

  const unregisterShortcut = useCallback((category: string, key: string) => {
    dispatch({ type: 'UNREGISTER_SHORTCUT', payload: { category, key } });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      openHelp,
      closeHelp,
      toggleHelp,
      registerShortcut,
      unregisterShortcut,
    }),
    [state, openHelp, closeHelp, toggleHelp, registerShortcut, unregisterShortcut]
  );

  return <ShortcutContext.Provider value={value}>{children}</ShortcutContext.Provider>;
}

// ============================================================================
// Hooks
// ============================================================================

export function useShortcutContext() {
  const context = useContext(ShortcutContext);
  if (!context) {
    throw new Error('useShortcutContext must be used within a ShortcutProvider');
  }
  return context;
}

function useShortcutHelp() {
  const { isHelpOpen, openHelp, closeHelp, toggleHelp } = useShortcutContext();
  return { isHelpOpen, openHelp, closeHelp, toggleHelp };
}

function useShortcutRegistration() {
  const { registerShortcut, unregisterShortcut } = useShortcutContext();
  return { registerShortcut, unregisterShortcut };
}
