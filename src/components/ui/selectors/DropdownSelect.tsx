'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { DropdownSelectProps, SelectorOption } from './types';

export function DropdownSelect<T = string>({
  options,
  value,
  onChange,
  placeholder = '请选择...',
  disabled = false,
  searchable = false,
  searchPlaceholder = '搜索...',
  categories,
  defaultCategory,
  className = '',
  renderValue,
  renderOption,
  noOptionsMessage = '无匹配选项',
}: DropdownSelectProps<T>) {
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
          o.label.toLowerCase().includes(query) ||
          String(o.value).toLowerCase().includes(query)
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

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setHighlightedIndex(0);
      if (searchable) {
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
    }
  }, [isOpen, searchable]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery, selectedCategory]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredOptions[highlightedIndex]) {
            onChange(filteredOptions[highlightedIndex].value);
            setIsOpen(false);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    },
    [isOpen, filteredOptions, highlightedIndex, onChange]
  );

  const handleSelect = (option: SelectorOption<T>) => {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
  };

  const defaultRenderValue = (option: SelectorOption<T> | undefined) => {
    if (!option) return <span className="text-gray-400">{placeholder}</span>;
    return (
      <div className="flex items-center gap-2">
        {option.icon && (
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: option.color }}
          />
        )}
        <span className="font-medium">{option.label}</span>
      </div>
    );
  };

  const defaultRenderOption = (option: SelectorOption<T>, isSelected: boolean) => (
    <div className="flex items-center gap-2">
      {option.icon && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: option.color }}
        />
      )}
      <span className={isSelected ? 'text-blue-700 font-medium' : ''}>
        {option.label}
      </span>
    </div>
  );

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2
          bg-white border border-gray-200 text-sm
          hover:border-gray-300 hover:bg-gray-50
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          transition-all duration-200
          ${isOpen ? 'border-blue-500 ring-2 ring-blue-500' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {renderValue
          ? renderValue(selectedOption!)
          : defaultRenderValue(selectedOption)}
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-full min-w-[200px] bg-white border border-gray-200 shadow-lg z-50 animate-in fade-in slide-in-from-top-1 duration-200"
          role="listbox"
        >
          {searchable && (
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {categories && !searchQuery && (
            <div className="flex border-b border-gray-100">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className="flex-1 px-3 py-2 text-xs font-medium transition-colors duration-150"
                  style={{
                    color:
                      selectedCategory === cat.value
                        ? '#2563eb'
                        : '#4b5563',
                    borderBottom:
                      selectedCategory === cat.value
                        ? '2px solid #2563eb'
                        : 'none',
                    backgroundColor:
                      selectedCategory === cat.value ? '#eff6ff' : 'transparent',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          <div className="max-h-64 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-sm text-center text-gray-500">
                {noOptionsMessage}
              </div>
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
                      ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    style={{
                      backgroundColor: isSelected
                        ? '#eff6ff'
                        : isHighlighted
                          ? '#f3f4f6'
                          : 'transparent',
                    }}
                    role="option"
                    aria-selected={isSelected}
                  >
                    {renderOption
                      ? renderOption(option, isSelected)
                      : defaultRenderOption(option, isSelected)}
                    {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                );
              })
            )}
          </div>

          <div className="px-3 py-2 text-xs flex justify-between border-t border-gray-100 text-gray-400 bg-gray-50">
            <span>使用 ↑↓ 导航，Enter 选择</span>
            <span>共 {filteredOptions.length} 个</span>
          </div>
        </div>
      )}
    </div>
  );
}
