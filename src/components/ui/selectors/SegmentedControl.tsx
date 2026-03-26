'use client';

import { type SegmentedControlProps, type SelectorOption } from './types';

const sizeClasses = {
  xs: 'px-2 py-1 text-[10px]',
  sm: 'px-2.5 py-1 text-[11px]',
  md: 'px-3 py-1.5 text-xs',
  lg: 'px-4 py-2 text-sm',
};

export function SegmentedControl<T = string>({
  options,
  value,
  onChange,
  multiple = false,
  disabled = false,
  size = 'md',
  className = '',
  label,
  showSelectAll = false,
  selectAllLabel = '全选',
  deselectAllLabel = '取消全选',
}: SegmentedControlProps<T>) {
  const isSelected = (option: SelectorOption<T>): boolean => {
    if (multiple && Array.isArray(value)) {
      return value.some((v) => v === option.value);
    }
    return value === option.value;
  };

  const handleSelect = (option: SelectorOption<T>) => {
    if (disabled || option.disabled) return;

    if (multiple && Array.isArray(value)) {
      const newValue = isSelected(option)
        ? value.filter((v) => v !== option.value)
        : [...value, option.value];
      onChange(newValue);
    } else {
      onChange(option.value);
    }
  };

  const handleSelectAll = () => {
    if (disabled) return;
    const allValues = options.filter((o) => !o.disabled).map((o) => o.value);
    if (multiple && Array.isArray(value)) {
      if (value.length === allValues.length) {
        onChange([]);
      } else {
        onChange(allValues);
      }
    }
  };

  const allSelected =
    multiple && Array.isArray(value) && value.length === options.filter((o) => !o.disabled).length;

  return (
    <div className={className}>
      {(label || (multiple && showSelectAll)) && (
        <div className="flex items-center justify-between mb-2.5">
          {label && (
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              {label}
            </span>
          )}
          {multiple && showSelectAll && (
            <button
              onClick={handleSelectAll}
              disabled={disabled}
              className="text-[10px] px-2 py-1 text-gray-600 bg-white hover:bg-gray-50 transition-all duration-200 rounded-md border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {allSelected ? deselectAllLabel : selectAllLabel}
            </button>
          )}
        </div>
      )}
      <div
        className="flex flex-wrap gap-1 p-1 bg-gray-100/80 rounded-lg"
        style={{ isolation: 'isolate' }}
      >
        {options.map((option) => {
          const selected = isSelected(option);
          return (
            <button
              key={String(option.value)}
              onClick={() => handleSelect(option)}
              disabled={disabled || option.disabled}
              className={`relative inline-flex items-center gap-1.5 font-medium transition-all duration-200 ease-out rounded-md ${sizeClasses[size]} ${
                selected ? 'bg-white text-gray-900 shadow-md' : 'text-gray-600 hover:text-gray-900'
              } ${disabled || option.disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98] hover:bg-gray-50/50'}`}
              style={{ zIndex: selected ? 1 : 0 }}
            >
              {option.icon && (
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: option.color }}
                />
              )}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
