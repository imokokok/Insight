import { Clock, TrendingUp, Search, ChevronRight, X, Coins, Database, Link2 } from 'lucide-react';

import type { SearchResult } from '@/lib/constants/searchConfig';

import type { DropdownItem } from './hooks/useDropdown';

interface SearchDropdownProps {
  isOpen: boolean;
  searchQuery: string;
  dropdownItems: DropdownItem[];
  highlightedIndex: number;
  onHighlight: (index: number) => void;
  onSelect: (item: string | SearchResult) => void;
  onClearHistory: () => void;
  onRemoveHistoryItem: (symbol: string, e: React.MouseEvent) => void;
}

export default function SearchDropdown({
  isOpen,
  searchQuery,
  dropdownItems,
  highlightedIndex,
  onHighlight,
  onSelect,
  onClearHistory,
  onRemoveHistoryItem,
}: SearchDropdownProps) {
  if (!isOpen) return null;

  const getTypeIcon = (dropdownItem: DropdownItem) => {
    if (dropdownItem.type === 'history') return <Clock className="w-4 h-4 text-gray-400" />;
    if (dropdownItem.type === 'popular') return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (dropdownItem.type === 'search') {
      const itemType = dropdownItem.item.item.type;
      if (itemType === 'token') return <Coins className="w-4 h-4 text-amber-500" />;
      if (itemType === 'oracle') return <Database className="w-4 h-4 text-blue-500" />;
      if (itemType === 'chain') return <Link2 className="w-4 h-4 text-purple-500" />;
    }
    return <Search className="w-4 h-4 text-gray-400" />;
  };

  const getTypeLabel = (dropdownItem: DropdownItem) => {
    if (dropdownItem.type === 'popular') return 'Popular';
    if (dropdownItem.type === 'search') {
      const itemType = dropdownItem.item.item.type;
      if (itemType === 'token') return 'Token';
      if (itemType === 'oracle') return 'Oracle';
      if (itemType === 'chain') return 'Blockchain';
    }
    return null;
  };

  const getTypeColor = (dropdownItem: DropdownItem) => {
    if (dropdownItem.type === 'popular') return 'text-emerald-600 bg-emerald-50';
    if (dropdownItem.type === 'search') {
      const itemType = dropdownItem.item.item.type;
      if (itemType === 'token') return 'text-amber-600 bg-amber-50';
      if (itemType === 'oracle') return 'text-blue-600 bg-blue-50';
      if (itemType === 'chain') return 'text-purple-600 bg-purple-50';
    }
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-[200] animate-in fade-in slide-in-from-top-2 duration-200 text-left">
      {searchQuery.trim() && dropdownItems.length === 0 ? (
        <div className="px-4 py-6 text-center text-gray-500 text-sm">No results found</div>
      ) : (
        <>
          {!searchQuery.trim() && (
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>Recent Searches</span>
              </div>
              <button
                type="button"
                onClick={onClearHistory}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          <div className="max-h-80 overflow-y-auto">
            {dropdownItems.map((dropdownItem, index) => {
              const isSearchResult = dropdownItem.type === 'search';
              const symbol =
                dropdownItem.type === 'search'
                  ? dropdownItem.item.item.symbol || ''
                  : dropdownItem.item.symbol;
              const name = dropdownItem.type === 'search' ? dropdownItem.item.item.name : symbol;

              return (
                <div
                  key={`${dropdownItem.type}-${symbol}-${index}`}
                  onMouseEnter={() => onHighlight(index)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                    index === highlightedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (dropdownItem.type === 'search') {
                        onSelect(dropdownItem.item);
                      } else {
                        onSelect(dropdownItem.item.symbol);
                      }
                    }}
                    className="flex-1 flex items-center gap-3 text-left"
                  >
                    {getTypeIcon(dropdownItem)}
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">
                        {symbol}
                        {isSearchResult && symbol !== name && (
                          <span className="ml-2 text-sm text-gray-500 font-normal">{name}</span>
                        )}
                      </span>
                    </div>
                    {getTypeLabel(dropdownItem) && (
                      <span className={`text-xs px-2 py-0.5 rounded ${getTypeColor(dropdownItem)}`}>
                        {getTypeLabel(dropdownItem)}
                      </span>
                    )}
                  </button>
                  <div className="flex items-center gap-2">
                    {dropdownItem.type === 'history' && (
                      <button
                        type="button"
                        onClick={(e) => onRemoveHistoryItem(dropdownItem.item.symbol, e)}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                        title="Remove from history"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
            <span>↑↓ to navigate, Enter to select</span>
            <span>Esc to close</span>
          </div>
        </>
      )}
    </div>
  );
}
