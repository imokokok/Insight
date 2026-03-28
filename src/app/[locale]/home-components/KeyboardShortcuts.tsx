'use client';

import React, { useMemo } from 'react';

import { Keyboard } from 'lucide-react';

import { getPlatformShortcut, type KeyboardShortcut } from '@/hooks';
import { useTranslations } from '@/i18n';

export interface ShortcutItem {
  key: string;
  label: string;
  shortcut: KeyboardShortcut;
}

interface KeyboardShortcutsProps {
  shortcuts?: ShortcutItem[];
  className?: string;
  compact?: boolean;
}

const defaultShortcuts: ShortcutItem[] = [
  {
    key: '1',
    label: '市场份额图',
    shortcut: { key: '1', handler: () => {} },
  },
  {
    key: '2',
    label: 'TVS 趋势图',
    shortcut: { key: '2', handler: () => {} },
  },
  {
    key: '3',
    label: '链支持图',
    shortcut: { key: '3', handler: () => {} },
  },
  {
    key: 'T',
    label: '切换表格/图表',
    shortcut: { key: 't', handler: () => {} },
  },
  {
    key: 'R',
    label: '刷新数据',
    shortcut: { key: 'r', handler: () => {} },
  },
  {
    key: 'E',
    label: '导出数据',
    shortcut: { key: 'e', handler: () => {} },
  },
  {
    key: '?',
    label: '显示帮助',
    shortcut: { key: '?', handler: () => {} },
  },
];

function ShortcutKey({ shortcut }: { shortcut: KeyboardShortcut }) {
  const displayShortcut = getPlatformShortcut(shortcut);

  return (
    <kbd
      className="inline-flex items-center justify-center min-w-[24px] px-2 py-1 text-xs font-mono font-medium bg-gray-100 border border-gray-200 rounded shadow-sm"
      style={{ color: '#4b5563' }}
    >
      {displayShortcut}
    </kbd>
  );
}

export function KeyboardShortcuts({
  shortcuts = defaultShortcuts,
  className = '',
  compact = false,
}: KeyboardShortcutsProps) {
  const t = useTranslations('ui.keyboardShortcuts');

  const displayShortcuts = useMemo(() => {
    return shortcuts.map((item) => ({
      ...item,
      displayLabel: t.has(item.key.toLowerCase()) ? t(item.key.toLowerCase()) : item.label,
    }));
  }, [shortcuts, t]);

  if (compact) {
    return (
      <div className={`flex items-center gap-2 text-xs ${className}`} style={{ color: '#6b7280' }}>
        <Keyboard className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{t('press')}</span>
        <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs font-mono">
          ?
        </kbd>
        <span>{t('forHelp')}</span>
      </div>
    );
  }

  return (
    <div
      className={`p-3 rounded-lg border ${className}`}
      style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}
      role="region"
      aria-label="键盘快捷键"
    >
      <div className="flex items-center gap-2 mb-2">
        <Keyboard className="w-4 h-4" style={{ color: '#6b7280' }} aria-hidden="true" />
        <span className="text-sm font-medium" style={{ color: '#374151' }}>
          {t('title')}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {displayShortcuts.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-2 text-xs">
            <span style={{ color: '#6b7280' }}>{item.displayLabel}</span>
            <ShortcutKey shortcut={item.shortcut} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default KeyboardShortcuts;
