'use client';

import { useState, useRef, useEffect } from 'react';

import { Settings2, Check } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { ColumnVisibilityDropdownProps } from '../types';

export function ColumnVisibilityDropdown<T extends Record<string, unknown>>({
  columns,
  visibleColumns,
  onToggleColumn,
  onToggleAll,
}: ColumnVisibilityDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allVisible = visibleColumns.size === columns.length;
  const someVisible = visibleColumns.size > 0 && visibleColumns.size < columns.length;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors',
          'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
          someVisible && 'text-blue-600 border-blue-200 bg-blue-50'
        )}
        title={'columnSettings'}
      >
        <Settings2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{'columnSettings'}</span>
        {someVisible && <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-blue-500" />}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-white rounded-lg border border-gray-200 shadow-lg py-1">
          <div className="px-3 py-2 border-b border-gray-100">
            <button
              type="button"
              onClick={onToggleAll}
              className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900 transition-colors"
            >
              <div
                className={cn(
                  'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                  allVisible
                    ? 'bg-blue-600 border-blue-600'
                    : someVisible
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300'
                )}
              >
                {(allVisible || someVisible) && <Check className="w-3 h-3 text-white" />}
              </div>
              <span>{allVisible ? 'deselectAll' : 'selectAll'}</span>
            </button>
          </div>

          <div className="max-h-[240px] overflow-y-auto py-1">
            {columns.map((column) => {
              const isVisible = visibleColumns.has(column.key);
              const isFixed = !!column.fixed;

              return (
                <button
                  key={column.key}
                  type="button"
                  onClick={() => onToggleColumn(column.key)}
                  disabled={isFixed}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors',
                    isFixed ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <div
                    className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                      isVisible ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                    )}
                  >
                    {isVisible && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="flex-1 text-left truncate">
                    {typeof column.header === 'string' ? column.header : column.key}
                  </span>
                  {isFixed && <span className="text-[10px] text-gray-400">{'fixed'}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
