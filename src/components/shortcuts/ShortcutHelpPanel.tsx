'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { X, Command, Keyboard } from 'lucide-react';
import { useShortcutContext } from './ShortcutContext';
import { getPlatformShortcut, KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';

interface ShortcutItemProps {
  shortcut: KeyboardShortcut;
  labelKey: string;
}

function ShortcutItem({ shortcut, labelKey }: ShortcutItemProps) {
  const t = useTranslations();
  const displayShortcut = getPlatformShortcut(shortcut);

  return (
    <div className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors">
      <span className="text-sm text-gray-700">
        {t.has(labelKey) ? t(labelKey) : labelKey}
      </span>
      <kbd className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-mono text-gray-600">
        {displayShortcut}
      </kbd>
    </div>
  );
}

interface ShortcutCategoryProps {
  titleKey: string;
  shortcuts: { shortcut: KeyboardShortcut; labelKey: string }[];
}

function ShortcutCategory({ titleKey, shortcuts }: ShortcutCategoryProps) {
  const t = useTranslations();

  if (shortcuts.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
        {t.has(titleKey) ? t(titleKey) : titleKey}
      </h3>
      <div className="space-y-1">
        {shortcuts.map((item, index) => (
          <ShortcutItem
            key={`${item.labelKey}-${index}`}
            shortcut={item.shortcut}
            labelKey={item.labelKey}
          />
        ))}
      </div>
    </div>
  );
}

export function ShortcutHelpPanel() {
  const t = useTranslations();
  const { isHelpOpen, closeHelp, categories } = useShortcutContext();

  // 预定义的快捷键列表
  const allCategories = useMemo(() => {
    const result: { titleKey: string; shortcuts: { shortcut: KeyboardShortcut; labelKey: string }[] }[] = [];

    // 导航分类
    result.push({
      titleKey: 'shortcuts.categories.navigation',
      shortcuts: [
        {
          shortcut: { key: 'k', metaKey: true, handler: () => {} },
          labelKey: 'shortcuts.search',
        },
        {
          shortcut: { key: 'k', ctrlKey: true, handler: () => {} },
          labelKey: 'shortcuts.search',
        },
      ],
    });

    // 操作分类
    result.push({
      titleKey: 'shortcuts.categories.actions',
      shortcuts: [
        {
          shortcut: { key: 'r', handler: () => {} },
          labelKey: 'shortcuts.refresh',
        },
        {
          shortcut: { key: 'f', handler: () => {} },
          labelKey: 'shortcuts.fullscreen',
        },
        {
          shortcut: { key: 'e', handler: () => {} },
          labelKey: 'shortcuts.export',
        },
      ],
    });

    // 通用分类
    result.push({
      titleKey: 'shortcuts.categories.general',
      shortcuts: [
        {
          shortcut: { key: '?', handler: () => {} },
          labelKey: 'shortcuts.help',
        },
        {
          shortcut: { key: 'Escape', handler: () => {} },
          labelKey: 'shortcuts.close',
        },
      ],
    });

    // 添加动态分类
    categories.forEach((cat) => {
      result.push({
        titleKey: cat.labelKey,
        shortcuts: cat.shortcuts.map((s) => ({
          shortcut: s,
          labelKey: s.description || 'shortcuts.unknown',
        })),
      });
    });

    return result;
  }, [categories]);

  return (
    <AnimatePresence>
      {isHelpOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={closeHelp}
          />

          {/* Panel */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden pointer-events-auto max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Keyboard className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {t('shortcuts.title')}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {t('shortcuts.subtitle')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeHelp}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label={t('common.actions.close')}
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {allCategories.map((category, index) => (
                  <ShortcutCategory
                    key={`${category.titleKey}-${index}`}
                    titleKey={category.titleKey}
                    shortcuts={category.shortcuts}
                  />
                ))}

                {/* Tips */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Command className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">
                        {t('shortcuts.tips.title')}
                      </h4>
                      <p className="text-sm text-blue-700 mt-1">
                        {t('shortcuts.tips.description')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{t('shortcuts.footer.hint')}</span>
                  <kbd className="px-2 py-1 bg-white border border-gray-200 rounded font-mono">
                    ?
                  </kbd>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ShortcutHelpPanel;
