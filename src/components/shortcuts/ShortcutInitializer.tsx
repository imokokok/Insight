'use client';

import { useKeyboardShortcuts, useGlobalKeyboardListener } from '@/hooks';
import { useUIStore } from '@/stores/uiStore';

import { useShortcutContext } from './ShortcutContext';

/**
 * Keyboard shortcut initialization component
 * Responsible for registering global shortcuts and initializing keyboard listener
 */
export function ShortcutInitializer() {
  const { toggleHelp } = useShortcutContext();
  const { closeModal } = useUIStore();

  // Initialize global keyboard listener
  useGlobalKeyboardListener();

  // Register help panel shortcut (?)
  useKeyboardShortcuts([
    {
      key: '?',
      handler: toggleHelp,
      description: 'shortcuts.help',
      preventDefault: true,
    },
    {
      key: 'Escape',
      handler: () => {
        // Close help panel
        toggleHelp();
        // Close modal
        closeModal();
      },
      description: 'shortcuts.close',
      preventDefault: true,
    },
  ]);

  return null;
}
