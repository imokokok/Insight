'use client';

import { useState, useEffect } from 'react';

import HeroBackground from './HeroBackground';
import HeroContent from './HeroContent';
import { useDropdown } from './hooks/useDropdown';
import { useSearch } from './hooks/useSearch';
import PopularTokens from './PopularTokens';
import SearchInput from './SearchInput';

export default function ProfessionalHero() {
  const [isVisible, setIsVisible] = useState(false);

  const {
    searchQuery,
    setSearchQuery,
    searchHistory,
    searchResults,
    handleSearch,
    handleClearHistory,
    handleRemoveHistoryItem,
    getTokenSymbolFromQuery,
  } = useSearch();

  const {
    isDropdownOpen,
    setIsDropdownOpen,
    highlightedIndex,
    setHighlightedIndex,
    dropdownItems,
    dropdownRef,
    inputRef,
    handleKeyDown,
    POPULAR_TOKENS,
  } = useDropdown(searchQuery, searchResults, searchHistory);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleRemoveHistoryItemWithEvent = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    handleRemoveHistoryItem(symbol);
  };

  return (
    <section className="relative min-h-screen flex flex-col">
      <HeroBackground enableParticles={true} enableDataFlow={false} />

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-12 py-8 sm:py-12">
        <div
          className="w-full max-w-2xl mx-auto text-center space-y-6 sm:space-y-8"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.5s ease-out',
          }}
        >
          <HeroContent />

          <SearchInput
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onSearch={handleSearch}
            onClearHistory={handleClearHistory}
            onRemoveHistoryItem={handleRemoveHistoryItemWithEvent}
            searchHistory={searchHistory}
            searchResults={searchResults}
            dropdownItems={dropdownItems}
            isDropdownOpen={isDropdownOpen}
            highlightedIndex={highlightedIndex}
            onDropdownOpenChange={setIsDropdownOpen}
            onHighlightChange={setHighlightedIndex}
            dropdownRef={dropdownRef}
            inputRef={inputRef}
            onKeyDown={handleKeyDown}
            getTokenSymbolFromQuery={getTokenSymbolFromQuery}
          />

          <PopularTokens tokens={POPULAR_TOKENS} onTokenClick={handleSearch} />
        </div>
      </div>
    </section>
  );
}
