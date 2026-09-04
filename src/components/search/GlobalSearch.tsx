'use client';

import React, { useEffect, useRef, useCallback, useState, useMemo, memo } from 'react';

import { useRouter } from 'next/navigation';

import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Command, ArrowUp, ArrowDown, CornerDownLeft } from 'lucide-react';

import { useKeyboardShortcuts, useDebounce } from '@/hooks';

import { SearchGroupSection, EmptyState, InitialState } from './SearchResultItems';
import { type SearchResult } from './types';
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
            className="fixed inset-0 z-50 bg-slate-950/40"
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
              className="pointer-events-auto mx-4 w-full max-w-3xl overflow-hidden border border-slate-900/20 bg-[#f8f7f4]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-slate-900/15 px-5 py-5">
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
                  className="flex-1 border-none bg-transparent text-lg text-gray-900 placeholder-gray-400 outline-none focus:ring-0"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
                {query && (
                  <button
                    onClick={handleClear}
                    aria-label="Clear search"
                    className="border border-transparent p-1 transition-colors hover:border-gray-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  >
                    <X className="w-4 h-4 text-gray-400" aria-hidden="true" />
                  </button>
                )}
                <div className="hidden md:flex items-center gap-1 text-xs text-gray-400">
                  <kbd className="border border-slate-300 bg-white px-2 py-1 font-mono">ESC</kbd>
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
                    <div className="mb-4 flex h-16 w-16 items-center justify-center border border-red-200 bg-red-50">
                      <Search className="w-8 h-8 text-red-400" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Search Error</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      An error occurred while searching. Please try again.
                    </p>
                    <button
                      onClick={retry}
                      className="border border-primary-700 bg-primary-700 px-4 py-2 text-white transition-colors hover:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
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

              <div className="flex items-center justify-between border-t border-slate-900/15 bg-white/55 px-5 py-3 font-mono text-xs text-gray-500">
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
