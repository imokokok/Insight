'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

import { ChevronDown, Search, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { type DropdownSelectProps, type SelectorOption } from './types';

export function DropdownSelect<T = string>({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  searchable = false,
  searchPlaceholder,
  categories,
  defaultCategory,
  className = '',
  renderValue,
  renderOption,
  noOptionsMessage,
}: DropdownSelectProps<T>) {
  const t = useTranslations();
  const resolvedPlaceholder = placeholder ?? t('crossOracle.ui.selectPlaceholder');
  const resolvedSearchPlaceholder = searchPlaceholder ?? t('crossOracle.ui.searchPlaceholder');
  const resolvedNoOptionsMessage = noOptionsMessage ?? t('crossOracle.ui.noOptionsMessage');
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(defaultCategory);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const filteredOptions = useMemo(() => {
    let filtered = options;

    if (selectedCategory && categories) {
      filtered = filtered.filter((o) => o.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.label.toLowerCase().includes(query) || String(o.value).toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [options, selectedCategory, searchQuery, categories]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setSearchQuery('');
        setHighlightedIndex(0);
        if (searchable) {
          setTimeout(() => searchInputRef.current?.focus(), 0);
        }
      }
      setIsOpen(open);
    },
    [searchable]
  );

  const handleSearchQueryChange = useCallback((query: string) => {
    setSearchQuery(query);
    setHighlightedIndex(0);
  }, []);

  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
    setHighlightedIndex(0);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOpenChange(true);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredOptions[highlightedIndex]) {
            onChange(filteredOptions[highlightedIndex].value);
            handleOpenChange(false);
          }
          break;
        case 'Escape':
          e.preventDefault();
          handleOpenChange(false);
          break;
      }
    },
    [isOpen, filteredOptions, highlightedIndex, onChange, handleOpenChange]
  );

  const handleSelect = (option: SelectorOption<T>) => {
    if (option.disabled) return;
    onChange(option.value);
    handleOpenChange(false);
  };

  const defaultRenderValue = (option: SelectorOption<T> | undefined) => {
    if (!option) return <span className="text-gray-400">{resolvedPlaceholder}</span>;
    return (
      <div className="flex items-center gap-2">
        {option.icon && (
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: option.color }} />
        )}
        <span className="font-medium text-gray-900">{option.label}</span>
      </div>
    );
  };

  const defaultRenderOption = (option: SelectorOption<T>, isSelected: boolean) => (
    <div className="flex items-center gap-2">
      {option.icon && (
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: option.color }} />
      )}
      <span className={isSelected ? 'font-medium' : ''}>{option.label}</span>
    </div>
  );

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && handleOpenChange(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2
          bg-white border border-gray-200 text-sm rounded-lg
          hover:border-gray-300 hover:bg-gray-50/50
          focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
          transition-all duration-200 ease-out
          active:scale-[0.98]
          ${isOpen ? 'border-primary-500 ring-2 ring-primary-500/20' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed active:scale-100' : ''}
        `}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {renderValue ? renderValue(selectedOption!) : defaultRenderValue(selectedOption)}
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1.5 w-full min-w-[200px] bg-white rounded-xl shadow-xl border border-gray-100 z-50 animate-in fade-in slide-in-from-top-1 duration-200 overflow-hidden"
          role="listbox"
        >
          {searchable && (
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchQueryChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={resolvedSearchPlaceholder}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200"
                />
              </div>
            </div>
          )}

          {categories && !searchQuery && (
            <div className="flex border-b border-gray-100 bg-gray-50/50">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => handleCategoryChange(cat.value)}
                  className={`flex-1 px-3 py-2.5 text-xs font-medium transition-all duration-200 border-b-2 ${
                    selectedCategory === cat.value
                      ? 'text-primary-600 border-primary-600 bg-white'
                      : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100/50'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          <div className="max-h-64 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-sm text-center text-gray-500">{resolvedNoOptionsMessage}</div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    disabled={option.disabled}
                    className={`
                      w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors duration-150
                      ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      ${isSelected ? 'bg-primary-50 text-primary-700' : isHighlighted ? 'bg-gray-50' : 'hover:bg-gray-50'}
                    `}
                    role="option"
                    aria-selected={isSelected}
                  >
                    {renderOption
                      ? renderOption(option, isSelected)
                      : defaultRenderOption(option, isSelected)}
                    {isSelected && <Check className="w-4 h-4 text-primary-600 flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          <div className="px-3 py-2 text-xs flex justify-between border-t border-gray-100 text-gray-400 bg-gray-50/50">
            <span>{t('crossOracle.ui.keyboardHint')}</span>
            <span>{t('crossOracle.ui.totalCount', { count: filteredOptions.length })}</span>
          </div>
        </div>
      )}
    </div>
  );
}
