'use client';

import React, { useEffect, useRef, useCallback, useState, useMemo, memo } from 'react';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Command, ArrowUp, ArrowDown, CornerDownLeft } from 'lucide-react';

import { useKeyboardShortcuts, useDebounce } from '@/hooks';

import { type SearchResult, type SearchGroup } from './types';
import { useGlobalSearch } from './useGlobalSearch';
import { useSearchKeyboardNavigation } from './useSearchKeyboardNavigation';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

function arePropsEqual(prevProps: GlobalSearchProps, nextProps: GlobalSearchProps): boolean {
  if (prevProps.isOpen !== nextProps.isOpen) return false;
  if (prevProps.onClose !== nextProps.onClose) return false;

  return true;
}

interface SearchResultItemProps {
  result: SearchResult;
  isActive: boolean;
  onSelect: () => void;
  onHover: () => void;
  itemRef: (el: HTMLDivElement | null) => void;
}

interface SearchGroupSectionProps {
  group: SearchGroup;
  groupIndex: number;
  activeGroupIndex: number;
  activeItemIndex: number;
  onSelect: (result: SearchResult) => void;
  onHover: (groupIndex: number, itemIndex: number) => void;
  getItemRef: (groupIndex: number, itemIndex: number) => (el: HTMLDivElement | null) => void;
}

function ResultIcon({ result }: { result: SearchResult }) {
  const [imageError, setImageError] = useState(false);

  if (result.iconUrl && !imageError) {
    return (
      <Image
        src={result.iconUrl}
        alt=""
        width={20}
        height={20}
        className="w-5 h-5 object-contain"
        onError={() => setImageError(true)}
      />
    );
  }

  if (result.icon || imageError) {
    const IconComponent = result.icon || Search;
    return <IconComponent className="w-5 h-5" aria-hidden="true" />;
  }

  const defaultIcons: Record<SearchResult['type'], React.ReactNode> = {
    oracle: <div className="w-5 h-5 rounded-full bg-primary-500" aria-hidden="true" />,
    pair: <div className="w-5 h-5 rounded bg-success-500" aria-hidden="true" />,
    blockchain: <div className="w-5 h-5 rounded bg-purple-500" aria-hidden="true" />,
    page: <div className="w-5 h-5 rounded bg-gray-500" aria-hidden="true" />,
    feature: <div className="w-5 h-5 rounded bg-warning-500" aria-hidden="true" />,
    documentation: <div className="w-5 h-5 rounded bg-indigo-500" aria-hidden="true" />,
  };

  return defaultIcons[result.type] || null;
}

function SearchResultItem({ result, isActive, onSelect, onHover, itemRef }: SearchResultItemProps) {
  return (
    <div
      ref={itemRef}
      role="option"
      aria-selected={isActive}
      tabIndex={-1}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      onMouseEnter={onHover}
      className={`
        flex items-center gap-3 px-4 py-3 sm:py-4 transition-colors duration-150 rounded-lg
        ${isActive ? 'bg-primary-50 border-l-2 border-primary-500' : 'hover:bg-gray-50 border-l-2 border-transparent'}
        cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset
      `}
    >
      <div
        className={`
          flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center
          ${isActive ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500'}
        `}
        aria-hidden="true"
      >
        <ResultIcon result={result} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-medium truncate ${isActive ? 'text-primary-900' : 'text-gray-900'}`}>
          {result.title}
        </div>
        {result.description && (
          <div className="text-sm text-gray-500 truncate">{result.description}</div>
        )}
      </div>
      {isActive && (
        <CornerDownLeft className="w-4 h-4 text-primary-500 flex-shrink-0" aria-hidden="true" />
      )}
    </div>
  );
}

function SearchGroupSection({
  group,
  groupIndex,
  activeGroupIndex,
  activeItemIndex,
  onSelect,
  onHover,
  getItemRef,
}: SearchGroupSectionProps) {
  return (
    <div className="py-2" role="group" aria-label={group.label}>
      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {group.label}
      </div>
      <div className="space-y-0.5" role="listbox">
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

function EmptyState({ query }: { query: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Search className="w-8 h-8 text-gray-400" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">No results found</h3>
      <p className="text-sm text-gray-500 max-w-xs">
        No results found for &quot;{query}&quot;. Try a different search term.
      </p>
    </div>
  );
}

function InitialState() {
  const shortcuts = useMemo(
    () => [
      {
        key: '↑↓',
        keyLabel: 'Arrow Keys',
        label: 'Navigate',
      },
      { key: '↵', keyLabel: 'Enter', label: 'Select' },
      { key: 'esc', keyLabel: 'Escape', label: 'Close' },
    ],
    []
  );

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mb-4">
        <Search className="w-8 h-8 text-primary-500" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">Search</h3>
      <p className="text-sm text-gray-500 mb-6">
        Search for oracles, pairs, blockchains, and more...
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {shortcuts.map((shortcut) => (
          <div key={shortcut.key} className="flex items-center gap-2 text-xs text-gray-500">
            <kbd
              className="px-2 py-1 bg-gray-100 rounded-md text-gray-700 font-mono"
              aria-label={shortcut.keyLabel}
            >
              {shortcut.key}
            </kbd>
            <span>{shortcut.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GlobalSearchComponent({ isOpen, onClose }: GlobalSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState('');

  const debouncedQuery = useDebounce(query, 300);

  const { results, isSearching, error, search, clearSearch, retry } = useGlobalSearch({
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

  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const setItemRef = useCallback(
    (groupIndex: number, itemIndex: number) => (el: HTMLDivElement | null) => {
      const key = getItemRef(groupIndex, itemIndex);
      if (el) {
        itemRefs.current.set(key, el);
      } else {
        itemRefs.current.delete(key);
      }
    },
    [getItemRef]
  );

  useEffect(() => {
    const currentRefs = itemRefs.current;
    return () => {
      currentRefs.clear();
    };
  }, [results]);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } else {
      clearSearch();
      reset();
      requestAnimationFrame(() => {
        previousFocusRef.current?.focus();
      });
    }
  }, [isOpen, clearSearch, reset]);

  useEffect(() => {
    search(debouncedQuery);
    reset();
  }, [debouncedQuery, search, reset]);

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      router.push(result.href);
      onClose();
    },
    [router, onClose]
  );

  useKeyboardShortcuts([
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

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
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
        case 'Tab':
          e.preventDefault();
          if (e.shiftKey) {
            moveUp();
          } else {
            moveDown();
          }
          break;
        case 'Home':
          e.preventDefault();
          setPosition(0, 0);
          break;
        case 'End':
          e.preventDefault();
          if (results.length > 0) {
            const lastGroupIndex = results.length - 1;
            const lastItemIndex = results[lastGroupIndex].results.length - 1;
            setPosition(lastGroupIndex, lastItemIndex);
          }
          break;
        case 'PageDown':
          e.preventDefault();
          for (let i = 0; i < 5; i++) moveDown();
          break;
        case 'PageUp':
          e.preventDefault();
          for (let i = 0; i < 5; i++) moveUp();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, moveDown, moveUp, activeResult, handleSelect, results, setPosition]);

  useEffect(() => {
    if (activeGroupIndex >= 0 && activeItemIndex >= 0) {
      const refKey = getItemRef(activeGroupIndex, activeItemIndex);
      const element = itemRefs.current.get(refKey);
      if (element) {
        element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [activeGroupIndex, activeItemIndex, getItemRef]);

  const handleClear = useCallback(() => {
    setQuery('');
    clearSearch();
    inputRef.current?.focus();
  }, [clearSearch]);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  if (!isOpen) return null;

  const totalResults = results.reduce((sum, group) => sum + group.results.length, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
            className="fixed inset-0 bg-black/40 z-50 supports-[backdrop-filter]:backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-[10vh] pointer-events-none"
            role="dialog"
            aria-modal="true"
            aria-label="Search"
          >
            <motion.div
              ref={modalRef}
              initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: 'easeOut' }}
              className="w-full max-w-2xl mx-4 bg-white rounded-lg shadow-2xl overflow-hidden pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
                <Search className="w-5 h-5 text-gray-400 flex-shrink-0" aria-hidden="true" />
                <input
                  ref={inputRef}
                  type="text"
                  role="searchbox"
                  aria-label="Search"
                  aria-autocomplete="list"
                  aria-controls="search-results-listbox"
                  aria-activedescendant={
                    activeResult ? `search-item-${activeResult.item.id}` : undefined
                  }
                  aria-describedby="search-shortcuts"
                  value={query}
                  onChange={handleQueryChange}
                  placeholder="Search oracles, pairs, blockchains..."
                  className="flex-1 text-lg text-gray-900 placeholder-gray-400 bg-transparent border-none outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
                {query && (
                  <button
                    onClick={handleClear}
                    aria-label="Clear search"
                    className="p-1 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  >
                    <X className="w-4 h-4 text-gray-400" aria-hidden="true" />
                  </button>
                )}
                <div className="hidden md:flex items-center gap-1 text-xs text-gray-400">
                  <kbd className="px-2 py-1 bg-gray-100 rounded-md font-mono">ESC</kbd>
                </div>
              </div>

              <div aria-live="polite" aria-atomic="true" className="sr-only">
                {isSearching && totalResults > 0 && `${totalResults} results found`}
                {isSearching && totalResults === 0 && query && 'No results found'}
                {error && 'Search error'}
              </div>

              <div
                id="search-results-listbox"
                role="listbox"
                aria-label="Search results"
                className="max-h-[50vh] sm:max-h-[60vh] overflow-y-auto overscroll-contain"
              >
                {!isSearching && !query && <InitialState />}

                {isSearching && results.length === 0 && !error && <EmptyState query={query} />}

                {error && (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                      <Search className="w-8 h-8 text-red-400" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Search Error</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      An error occurred while searching. Please try again.
                    </p>
                    <button
                      onClick={retry}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    >
                      Retry
                    </button>
                  </div>
                )}

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
                        getItemRef={setItemRef}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
                <div className="hidden sm:flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <ArrowUp className="w-3 h-3" aria-hidden="true" />
                    <ArrowDown className="w-3 h-3" aria-hidden="true" />
                    <span>Navigate</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CornerDownLeft className="w-3 h-3" aria-hidden="true" />
                    <span>Select</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Command className="w-3 h-3" aria-hidden="true" />
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

export const GlobalSearch = memo(GlobalSearchComponent, arePropsEqual);
