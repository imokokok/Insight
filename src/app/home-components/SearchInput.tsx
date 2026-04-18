import { useState, useCallback } from 'react';

import { Search, X } from 'lucide-react';

import type { SearchResult } from '@/lib/constants/searchConfig';

import SearchDropdown from './SearchDropdown';

import type { DropdownItem } from './hooks/useDropdown';

interface SearchInputProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearch: (item: string | SearchResult) => void;
  onClearHistory: () => void;
  onRemoveHistoryItem: (symbol: string, e: React.MouseEvent) => void;
  searchHistory: { symbol: string }[];
  searchResults: SearchResult[];
  dropdownItems: DropdownItem[];
  isDropdownOpen: boolean;
  highlightedIndex: number;
  onDropdownOpenChange: (open: boolean) => void;
  onHighlightChange: (index: number) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onKeyDown: (e: React.KeyboardEvent, onSelectItem: () => void) => void;
  getTokenSymbolFromQuery: (query: string) => string | null;
}

export default function SearchInput({
  searchQuery,
  onSearchQueryChange,
  onSearch,
  onClearHistory,
  onRemoveHistoryItem,
  dropdownItems,
  isDropdownOpen,
  highlightedIndex,
  onDropdownOpenChange,
  onHighlightChange,
  dropdownRef,
  inputRef,
  onKeyDown,
  getTokenSymbolFromQuery,
}: SearchInputProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  const handleSelectItem = useCallback(() => {
    if (highlightedIndex >= 0 && highlightedIndex < dropdownItems.length) {
      const selectedItem = dropdownItems[highlightedIndex];
      if (selectedItem.type === 'search') {
        onSearch(selectedItem.item);
      } else {
        onSearch(selectedItem.item.symbol);
      }
    } else if (searchQuery.trim()) {
      const tokenSymbol = getTokenSymbolFromQuery(searchQuery);
      if (tokenSymbol) {
        onSearch(tokenSymbol);
      } else {
        onSearch(searchQuery);
      }
    }
    onDropdownOpenChange(false);
  }, [
    highlightedIndex,
    dropdownItems,
    searchQuery,
    onSearch,
    onDropdownOpenChange,
    getTokenSymbolFromQuery,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isComposing) return;
    handleSelectItem();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isComposing) return;
    onKeyDown(e, handleSelectItem);
  };

  return (
    <div className="relative max-w-xl mx-auto z-[100]" ref={dropdownRef}>
      <form
        onSubmit={handleSubmit}
        className={`relative flex items-center bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border-2 transition-all duration-300 ease-out overflow-visible ${
          isSearchFocused
            ? 'border-blue-400 shadow-blue-200/50 shadow-xl'
            : 'border-gray-200/80 hover:border-gray-300'
        }`}
        style={{
          boxShadow: isSearchFocused
            ? `0 0 0 4px rgba(59, 130, 246, 0.1), 0 10px 40px -10px rgba(59, 130, 246, 0.2)`
            : undefined,
        }}
      >
        <div className="pl-5">
          <Search
            className={`w-5 h-5 transition-all duration-300 ${
              isSearchFocused ? 'text-blue-500 scale-110' : 'text-gray-400'
            }`}
          />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            onSearchQueryChange(e.target.value);
            onDropdownOpenChange(true);
            onHighlightChange(-1);
          }}
          onFocus={() => {
            setIsSearchFocused(true);
            onDropdownOpenChange(true);
          }}
          onBlur={() => setIsSearchFocused(false)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder="Search token, oracle, or blockchain..."
          className="flex-1 px-4 sm:px-5 py-4 sm:py-5 text-sm sm:text-base text-gray-900 placeholder-gray-400 bg-transparent border-0 min-w-0"
          style={{ outline: 'none', boxShadow: 'none' }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              onSearchQueryChange('');
              inputRef.current?.focus();
            }}
            className="p-1 mr-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          type="submit"
          className="mr-2 px-5 sm:px-7 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 hover:shadow-lg hover:shadow-blue-500/25 active:scale-95 transition-all duration-200 text-sm sm:text-base whitespace-nowrap"
        >
          Search
        </button>

        <SearchDropdown
          isOpen={isDropdownOpen}
          searchQuery={searchQuery}
          dropdownItems={dropdownItems}
          highlightedIndex={highlightedIndex}
          onHighlight={onHighlightChange}
          onSelect={onSearch}
          onClearHistory={onClearHistory}
          onRemoveHistoryItem={onRemoveHistoryItem}
        />
      </form>
    </div>
  );
}
