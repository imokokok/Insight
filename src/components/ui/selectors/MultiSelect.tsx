'use client';

import { MultiSelectProps, SelectorOption } from './types';

const sizeClasses = {
  sm: 'px-2 py-1 text-[11px]',
  md: 'px-3 py-1.5 text-xs',
  lg: 'px-4 py-2 text-sm',
};

export function MultiSelect<T = string>({
  options,
  value,
  onChange,
  disabled = false,
  size = 'md',
  className = '',
  label,
  showSelectAll = true,
  selectAllLabel = '全选',
  deselectAllLabel = '取消全选',
  maxVisible,
}: MultiSelectProps<T>) {
  const isSelected = (option: SelectorOption<T>): boolean => {
    return value.some((v) => v === option.value);
  };

  const handleToggle = (option: SelectorOption<T>) => {
    if (disabled || option.disabled) return;

    const newValue = isSelected(option)
      ? value.filter((v) => v !== option.value)
      : [...value, option.value];
    onChange(newValue);
  };

  const handleSelectAll = () => {
    if (disabled) return;
    const allValues = options.filter((o) => !o.disabled).map((o) => o.value);
    if (value.length === allValues.length) {
      onChange([]);
    } else {
      onChange(allValues);
    }
  };

  const allSelected = value.length === options.filter((o) => !o.disabled).length;
  const displayOptions = maxVisible ? options.slice(0, maxVisible) : options;
  const hasMore = maxVisible && options.length > maxVisible;

  return (
    <div className={className}>
      {(label || showSelectAll) && (
        <div className="flex items-center justify-between mb-2.5">
          {label && (
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              {label}
            </span>
          )}
          {showSelectAll && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleSelectAll}
                disabled={disabled}
                className="text-[10px] px-2 py-1 text-gray-600 bg-white hover:bg-gray-100 transition-colors rounded border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectAllLabel}
              </button>
              <button
                onClick={() => onChange([])}
                disabled={disabled}
                className="text-[10px] px-2 py-1 text-gray-600 bg-white hover:bg-gray-100 transition-colors rounded border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deselectAllLabel}
              </button>
            </div>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {displayOptions.map((option) => {
          const selected = isSelected(option);
          return (
            <button
              key={String(option.value)}
              onClick={() => handleToggle(option)}
              disabled={disabled || option.disabled}
              className={`inline-flex items-center gap-1.5 font-medium transition-all duration-200 rounded-md ${sizeClasses[size]} ${
                selected
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              } ${disabled || option.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {option.icon && (
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: selected ? 'white' : option.color }}
                />
              )}
              {option.label}
            </button>
          );
        })}
        {hasMore && (
          <span className="inline-flex items-center px-2 py-1 text-xs text-gray-400">
            +{options.length - maxVisible!}
          </span>
        )}
      </div>
      {value.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          已选择 {value.length} 项
        </div>
      )}
    </div>
  );
}
