'use client';

import { forwardRef, type SelectHTMLAttributes, ReactNode, useState, useMemo } from 'react';

import { ChevronDown, Search, Check } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  clearable?: boolean;
  isLoading?: boolean;
  onChange?: (value: string) => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      options,
      placeholder = '请选择...',
      searchable = false,
      clearable = false,
      isLoading = false,
      disabled,
      value,
      onChange,
      id,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    const groupedOptions = useMemo(() => {
      if (!searchable || !searchQuery) {
        const groups: Record<string, SelectOption[]> = {};
        options.forEach((option) => {
          const group = option.group || 'default';
          if (!groups[group]) groups[group] = [];
          groups[group].push(option);
        });
        return groups;
      }

      const filtered = options.filter((option) =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return { default: filtered };
    }, [options, searchQuery, searchable]);

    const selectedOption = options.find((opt) => opt.value === value);

    const handleSelect = (optionValue: string) => {
      onChange?.(optionValue);
      setIsOpen(false);
      setSearchQuery('');
    };

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {/* Hidden native select for accessibility and form submission */}
          <select
            ref={ref}
            id={selectId}
            value={value}
            disabled={disabled || isLoading}
            className="sr-only"
            {...props}
          >
            <option value="">{placeholder}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Custom select trigger */}
          <button
            type="button"
            onClick={() => !disabled && !isLoading && setIsOpen(!isOpen)}
            className={cn(
              'w-full px-4 py-2.5 text-left text-sm bg-white border rounded-md transition-all duration-200',
              'flex items-center justify-between',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
              error && 'border-danger-500 focus:ring-danger-500 focus:border-danger-500',
              !error && 'border-gray-300 hover:border-gray-400',
              isOpen && 'ring-2 ring-primary-500 border-primary-500',
              className
            )}
            disabled={disabled || isLoading}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            <span className={cn(!selectedOption && 'text-gray-400')}>
              {selectedOption?.label || placeholder}
            </span>
            <div className="flex items-center gap-2">
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-gray-400 transition-transform duration-200',
                    isOpen && 'rotate-180'
                  )}
                />
              )}
            </div>
          </button>

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
              {searchable && (
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="搜索..."
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      autoFocus
                    />
                  </div>
                </div>
              )}
              <ul className="max-h-60 overflow-auto py-1" role="listbox">
                {Object.entries(groupedOptions).map(([group, groupOptions]) => (
                  <li key={group}>
                    {group !== 'default' && (
                      <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {group}
                      </div>
                    )}
                    {groupOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSelect(option.value)}
                        disabled={option.disabled}
                        className={cn(
                          'w-full px-4 py-2 text-left text-sm flex items-center justify-between',
                          'hover:bg-gray-50 focus:bg-gray-50 focus:outline-none',
                          option.disabled && 'opacity-50 cursor-not-allowed',
                          value === option.value && 'bg-primary-50 text-primary-700'
                        )}
                        role="option"
                        aria-selected={value === option.value}
                      >
                        <span>{option.label}</span>
                        {value === option.value && <Check className="w-4 h-4 text-primary-600" />}
                      </button>
                    ))}
                  </li>
                ))}
                {searchable && searchQuery && Object.values(groupedOptions).flat().length === 0 && (
                  <li className="px-4 py-3 text-sm text-gray-500 text-center">未找到匹配项</li>
                )}
              </ul>
            </div>
          )}
        </div>
        {(error || helperText) && (
          <p className={cn('mt-1.5 text-sm', error ? 'text-danger-600' : 'text-gray-500')}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
