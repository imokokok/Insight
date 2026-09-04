'use client';

import { useMemo } from 'react';

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
    <div className="flex items-center justify-between border-b border-slate-900/10 px-3 py-2.5 transition-colors last:border-b-0 hover:bg-white/70">
      <span className="text-sm text-gray-700">{label}</span>
      <kbd className="inline-flex items-center gap-1 border border-slate-900/15 bg-white px-2 py-1 font-mono text-xs text-slate-600">
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
      <h3 className="mb-2 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-700">
        {title}
      </h3>
      <div className="border-y border-slate-900/10">
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
            className="fixed inset-0 z-50 bg-slate-950/45"
            onClick={closeHelp}
          />

          {/* Panel */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="pointer-events-auto flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden border border-slate-900/20 bg-[#f8f7f4]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center border border-blue-200 bg-blue-50">
                    <Keyboard className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h2>
                    <p className="text-sm text-gray-500">Quick actions at your fingertips</p>
                  </div>
                </div>
                <button
                  onClick={closeHelp}
                  className="border border-slate-900/15 p-2 transition-colors hover:border-blue-600 hover:text-blue-700"
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
                <div className="mt-6 border-l-2 border-blue-600 bg-blue-50/70 p-4">
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
              <div className="border-t border-slate-900/15 bg-white/55 px-6 py-4">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Press ? to toggle this panel</span>
                  <kbd className="border border-slate-900/15 bg-white px-2 py-1 font-mono">?</kbd>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
