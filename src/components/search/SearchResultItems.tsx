import React, { useState, useMemo } from 'react';

import Image from 'next/image';

import { Search, CornerDownLeft } from 'lucide-react';

import { type SearchResult, type SearchGroup } from './types';

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
    oracle: <div className="h-5 w-5 bg-primary-700" aria-hidden="true" />,
    pair: <div className="h-5 w-5 bg-primary-600" aria-hidden="true" />,
    blockchain: <div className="h-5 w-5 bg-blue-500" aria-hidden="true" />,
    page: <div className="h-5 w-5 bg-slate-700" aria-hidden="true" />,
    feature: <div className="h-5 w-5 bg-primary-400" aria-hidden="true" />,
    documentation: <div className="h-5 w-5 bg-blue-800" aria-hidden="true" />,
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
        flex items-center gap-3 border-b border-slate-900/10 px-4 py-3 sm:py-4 transition-colors duration-150
        ${isActive ? 'bg-primary-50 border-l-2 border-primary-500' : 'hover:bg-gray-50 border-l-2 border-transparent'}
        cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset
      `}
    >
      <div
        className={`
          flex h-8 w-8 flex-shrink-0 items-center justify-center border
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
      <div className="mb-4 flex h-16 w-16 items-center justify-center border border-slate-300 bg-white">
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
      <div className="mb-4 flex h-16 w-16 items-center justify-center border border-primary-200 bg-primary-50">
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
              className="border border-slate-300 bg-white px-2 py-1 font-mono text-gray-700"
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

export { SearchGroupSection, EmptyState, InitialState };
