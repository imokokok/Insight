'use client';

import { useTranslations } from '@/i18n';
import { useKeyboardShortcuts, useGlobalKeyboardListener } from '@/hooks';
import { useShortcutContext } from './ShortcutContext';
import { useUIStore } from '@/stores/uiStore';

/**
 * 快捷键初始化组件
 * 负责注册全局快捷键和初始化键盘监听
 */
export function ShortcutInitializer() {
  const _t = useTranslations();
  const { toggleHelp } = useShortcutContext();
  const { closeModal } = useUIStore();

  // 初始化全局键盘监听
  useGlobalKeyboardListener();

  // 注册帮助面板快捷键 (?)
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
        // 关闭帮助面板
        toggleHelp();
        // 关闭模态框
        closeModal();
      },
      description: 'shortcuts.close',
      preventDefault: true,
    },
  ]);

  return null;
}

export default ShortcutInitializer;
