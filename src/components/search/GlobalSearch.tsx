'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from '@/i18n';
import { Search, X, Command, ArrowUp, ArrowDown, CornerDownLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobalSearch } from './useGlobalSearch';
import { useSearchKeyboardNavigation } from './useSearchKeyboardNavigation';
import { SearchResult, SearchGroup } from './types';
import { useKeyboardShortcuts } from '@/hooks';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

// Type icon component
function ResultIcon({ result }: { result: SearchResult }) {
  if (result.iconUrl) {
    return (
      <img
        src={result.iconUrl}
        alt={result.title}
        className="w-5 h-5 object-contain"
        onError={(e) => {
          // Fallback to default icon on error
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  if (result.icon) {
    const IconComponent = result.icon;
    return <IconComponent className="w-5 h-5" />;
  }

  // Default icon based on type
  const defaultIcons: Record<SearchResult['type'], React.ReactNode> = {
    oracle: <div className="w-5 h-5 rounded-full bg-primary-500" />,
    pair: <div className="w-5 h-5 rounded bg-success-500" />,
    blockchain: <div className="w-5 h-5 rounded bg-purple-500" />,
    page: <div className="w-5 h-5 rounded bg-gray-500" />,
    feature: <div className="w-5 h-5 rounded bg-warning-500" />,
    documentation: <div className="w-5 h-5 rounded bg-indigo-500" />,
  };

  return defaultIcons[result.type] || null;
}

// Search result item component
function SearchResultItem({
  result,
  isActive,
  onSelect,
  onHover,
  itemRef,
}: {
  result: SearchResult;
  isActive: boolean;
  onSelect: () => void;
  onHover: () => void;
  itemRef: (el: HTMLDivElement | null) => void;
}) {
  const t = useTranslations();

  return (
    <div
      ref={itemRef}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`
        flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors duration-150 rounded-lg
        ${isActive ? 'bg-primary-50 border-l-2 border-primary-500' : 'hover:bg-gray-50 border-l-2 border-transparent'}
      `}
    >
      <div
        className={`
          flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center
          ${isActive ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500'}
        `}
      >
        <ResultIcon result={result} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-medium truncate ${isActive ? 'text-primary-900' : 'text-gray-900'}`}>
          {t.has(result.title) ? t(result.title) : result.title}
        </div>
        {result.description && (
          <div className="text-sm text-gray-500 truncate">
            {t.has(result.description) ? t(result.description) : result.description}
          </div>
        )}
      </div>
      {isActive && <CornerDownLeft className="w-4 h-4 text-primary-500 flex-shrink-0" />}
    </div>
  );
}

// Search group component
function SearchGroupSection({
  group,
  groupIndex,
  activeGroupIndex,
  activeItemIndex,
  onSelect,
  onHover,
  getItemRef,
}: {
  group: SearchGroup;
  groupIndex: number;
  activeGroupIndex: number;
  activeItemIndex: number;
  onSelect: (result: SearchResult) => void;
  onHover: (groupIndex: number, itemIndex: number) => void;
  getItemRef: (groupIndex: number, itemIndex: number) => (el: HTMLDivElement | null) => void;
}) {
  const t = useTranslations();

  return (
    <div className="py-2">
      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {t(group.label)}
      </div>
      <div className="space-y-0.5">
        {group.results.map((result, itemIndex) => (
          <SearchResultItem
            key={result.id}
            result={result}
            isActive={groupIndex === activeGroupIndex && itemIndex === activeItemIndex}
            onSelect={() => onSelect(result)}
            onHover={() => onHover(groupIndex, itemIndex)}
            itemRef={getItemRef(groupIndex, itemIndex)}
          />
        ))}
      </div>
    </div>
  );
}

// Empty state component
function EmptyState({ query }: { query: string }) {
  const t = useTranslations();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Search className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">{t('search.noResults')}</h3>
      <p className="text-sm text-gray-500 max-w-xs">{t('search.noResultsDesc', { query })}</p>
    </div>
  );
}

// Initial state component
function InitialState() {
  const t = useTranslations();

  const shortcuts = [
    { key: '↑↓', label: t('search.shortcuts.navigate') },
    { key: '↵', label: t('search.shortcuts.select') },
    { key: 'esc', label: t('search.shortcuts.close') },
  ];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mb-4">
        <Search className="w-8 h-8 text-primary-500" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">{t('search.initialTitle')}</h3>
      <p className="text-sm text-gray-500 mb-6">{t('search.initialDesc')}</p>
      <div className="flex flex-wrap justify-center gap-3">
        {shortcuts.map((shortcut) => (
          <div key={shortcut.key} className="flex items-center gap-2 text-xs text-gray-500">
            <kbd className="px-2 py-1 bg-gray-100 rounded-md text-gray-700 font-mono">
              {shortcut.key}
            </kbd>
            <span>{shortcut.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main GlobalSearch component
export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  const { results, isSearching, search, clearSearch } = useGlobalSearch({
    maxResults: 30,
    threshold: 0.3,
  });

  const {
    activeGroupIndex,
    activeItemIndex,
    activeResult,
    moveDown,
    moveUp,
    reset,
    setPosition,
    getItemRef,
  } = useSearchKeyboardNavigation(results);

  // Item refs for scrolling
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const setItemRef = useCallback(
    (groupIndex: number, itemIndex: number) => (el: HTMLDivElement | null) => {
      if (el) {
        itemRefs.current.set(getItemRef(groupIndex, itemIndex), el);
      }
    },
    [getItemRef]
  );

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery('');
      clearSearch();
      reset();
    }
  }, [isOpen, clearSearch, reset]);

  // Handle search query change
  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      search(value);
      reset();
    },
    [search, reset]
  );

  // Handle result selection
  const handleSelect = useCallback(
    (result: SearchResult) => {
      router.push(result.href);
      onClose();
    },
    [router, onClose]
  );

  // Handle keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'k',
      metaKey: true,
      handler: () => {
        if (!isOpen) {
          // This is handled by parent component
        }
      },
      preventDefault: true,
    },
    {
      key: 'Escape',
      handler: () => {
        if (isOpen) {
          onClose();
        }
      },
      preventDefault: true,
    },
  ]);

  // Handle keyboard navigation in search
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in input (except for navigation keys)
      const isInputFocused = document.activeElement === inputRef.current;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          moveDown();
          break;
        case 'ArrowUp':
          e.preventDefault();
          moveUp();
          break;
        case 'Enter':
          if (activeResult) {
            e.preventDefault();
            handleSelect(activeResult.item);
          }
          break;
        case 'Home':
          if (e.ctrlKey) {
            e.preventDefault();
            setPosition(0, 0);
          }
          break;
        case 'End':
          if (e.ctrlKey && results.length > 0) {
            e.preventDefault();
            const lastGroupIndex = results.length - 1;
            const lastItemIndex = results[lastGroupIndex].results.length - 1;
            setPosition(lastGroupIndex, lastItemIndex);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, moveDown, moveUp, activeResult, handleSelect, results, setPosition]);

  // Scroll active item into view
  useEffect(() => {
    if (activeGroupIndex >= 0 && activeItemIndex >= 0) {
      const refKey = getItemRef(activeGroupIndex, activeItemIndex);
      const element = itemRefs.current.get(refKey);
      if (element) {
        element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [activeGroupIndex, activeItemIndex, getItemRef]);

  // Clear search
  const handleClear = useCallback(() => {
    setQuery('');
    clearSearch();
    inputRef.current?.focus();
  }, [clearSearch]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Search Dialog */}
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full max-w-2xl mx-4 bg-white rounded-lg shadow-2xl overflow-hidden pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
                <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={handleQueryChange}
                  placeholder={t('search.placeholder')}
                  className="flex-1 text-lg text-gray-900 placeholder-gray-400 bg-transparent border-none outline-none"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
                {query && (
                  <button
                    onClick={handleClear}
                    className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
                <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
                  <kbd className="px-2 py-1 bg-gray-100 rounded-md font-mono">ESC</kbd>
                </div>
              </div>

              {/* Search Results */}
              <div className="max-h-[60vh] overflow-y-auto">
                {!isSearching && !query && <InitialState />}

                {isSearching && results.length === 0 && <EmptyState query={query} />}

                {isSearching && results.length > 0 && (
                  <div className="py-2">
                    {results.map((group, groupIndex) => (
                      <SearchGroupSection
                        key={group.type}
                        group={group}
                        groupIndex={groupIndex}
                        activeGroupIndex={activeGroupIndex}
                        activeItemIndex={activeItemIndex}
                        onSelect={handleSelect}
                        onHover={setPosition}
                        getItemRef={
                          setItemRef as (
                            groupIndex: number,
                            itemIndex: number
                          ) => (el: HTMLDivElement | null) => void
                        }
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <ArrowUp className="w-3 h-3" />
                    <ArrowDown className="w-3 h-3" />
                    <span>{t('search.footer.navigate')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CornerDownLeft className="w-3 h-3" />
                    <span>{t('search.footer.select')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Command className="w-3 h-3" />
                  <span>K</span>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export default GlobalSearch;
