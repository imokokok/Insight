'use client';

import { useSyncExternalStore } from 'react';

import { type SegmentedControlProps, type SelectorOption } from './types';

const emptySubscribe = () => () => {};

function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

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
  selectAllLabel,
  deselectAllLabel,
}: SegmentedControlProps<T>) {
  const mounted = useIsMounted();

  const resolvedSelectAllLabel = selectAllLabel ?? 'Select All';
  const resolvedDeselectAllLabel = deselectAllLabel ?? 'Deselect All';
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
              className="border border-gray-300 bg-white px-2 py-1 text-[10px] text-gray-600 transition-colors hover:border-primary-400 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {allSelected ? resolvedDeselectAllLabel : resolvedSelectAllLabel}
            </button>
          )}
        </div>
      )}
      <div
        className="flex flex-wrap border border-gray-300 bg-white"
        style={{ isolation: 'isolate' }}
      >
        {options.map((option) => {
          const selected = isSelected(option);
          return (
            <button
              key={String(option.value)}
              onClick={() => handleSelect(option)}
              disabled={disabled || option.disabled}
              className={`relative inline-flex items-center gap-1.5 border-r border-gray-200 font-medium transition-colors duration-200 ease-out last:border-r-0 ${sizeClasses[size]} ${
                selected
                  ? 'bg-primary-700 text-white'
                  : 'text-gray-600 hover:bg-primary-50/50 hover:text-primary-700'
              } ${disabled || option.disabled ? 'cursor-not-allowed opacity-50' : ''}`}
              style={{ zIndex: mounted && selected ? 1 : 0 }}
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
