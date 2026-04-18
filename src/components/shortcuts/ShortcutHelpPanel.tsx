'use client';

import React, { useMemo } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Command, Keyboard } from 'lucide-react';

import { getPlatformShortcut, type KeyboardShortcut } from '@/hooks';

import { useShortcutContext } from './ShortcutContext';

interface ShortcutItemProps {
  shortcut: KeyboardShortcut;
  label: string;
}

function ShortcutItem({ shortcut, label }: ShortcutItemProps) {
  const displayShortcut = getPlatformShortcut(shortcut);

  return (
    <div className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors">
      <span className="text-sm text-gray-700">{label}</span>
      <kbd className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-mono text-gray-600">
        {displayShortcut}
      </kbd>
    </div>
  );
}

interface ShortcutCategoryProps {
  title: string;
  shortcuts: { shortcut: KeyboardShortcut; label: string }[];
}

function ShortcutCategory({ title, shortcuts }: ShortcutCategoryProps) {
  if (shortcuts.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
        {title}
      </h3>
      <div className="space-y-1">
        {shortcuts.map((item, index) => (
          <ShortcutItem
            key={`${item.label}-${index}`}
            shortcut={item.shortcut}
            label={item.label}
          />
        ))}
      </div>
    </div>
  );
}

export function ShortcutHelpPanel() {
  const { isHelpOpen, closeHelp, categories } = useShortcutContext();

  const allCategories = useMemo(() => {
    const result: {
      title: string;
      shortcuts: { shortcut: KeyboardShortcut; label: string }[];
    }[] = [];

    result.push({
      title: 'Navigation',
      shortcuts: [
        {
          shortcut: { key: 'k', metaKey: true, handler: () => {} },
          label: 'Search',
        },
        {
          shortcut: { key: 'k', ctrlKey: true, handler: () => {} },
          label: 'Search',
        },
      ],
    });

    result.push({
      title: 'Actions',
      shortcuts: [
        {
          shortcut: { key: 'r', handler: () => {} },
          label: 'Refresh',
        },
        {
          shortcut: { key: 'f', handler: () => {} },
          label: 'Fullscreen',
        },
        {
          shortcut: { key: 'e', handler: () => {} },
          label: 'Export',
        },
      ],
    });

    result.push({
      title: 'General',
      shortcuts: [
        {
          shortcut: { key: '?', handler: () => {} },
          label: 'Help',
        },
        {
          shortcut: { key: 'Escape', handler: () => {} },
          label: 'Close',
        },
      ],
    });

    categories.forEach((cat) => {
      result.push({
        title: cat.label,
        shortcuts: cat.shortcuts.map((s) => ({
          shortcut: s,
          label: s.description || 'Unknown',
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
                  <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                    <Keyboard className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h2>
                    <p className="text-sm text-gray-500">Quick actions at your fingertips</p>
                  </div>
                </div>
                <button
                  onClick={closeHelp}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {allCategories.map((category, index) => (
                  <ShortcutCategory
                    key={`${category.title}-${index}`}
                    title={category.title}
                    shortcuts={category.shortcuts}
                  />
                ))}

                {/* Tips */}
                <div className="mt-6 p-4 bg-primary-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Command className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-primary-900">Pro Tip</h4>
                      <p className="text-sm text-primary-700 mt-1">
                        Press any key combination to see if it triggers an action
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Press ? to toggle this panel</span>
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
