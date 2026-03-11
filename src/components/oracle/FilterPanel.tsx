'use client';

import { useState, useCallback, ReactNode } from 'react';
import { useI18n } from '@/lib/i18n/context';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
  icon?: ReactNode;
}

interface FilterSection {
  id: string;
  label: string;
  options: FilterOption[];
  multiSelect?: boolean;
}

interface FilterPanelProps {
  sections: FilterSection[];
  onFilterChange: (filters: Record<string, string[]>) => void;
  defaultFilters?: Record<string, string[]>;
  showSearch?: boolean;
  searchPlaceholder?: string;
  className?: string;
}

export function FilterPanel({
  sections,
  onFilterChange,
  defaultFilters = {},
  showSearch = true,
  searchPlaceholder = '搜索...',
  className = '',
}: FilterPanelProps) {
  const { t } = useI18n();
  const [filters, setFilters] = useState<Record<string, string[]>>(defaultFilters);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map((s) => s.id))
  );

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const handleOptionToggle = useCallback(
    (sectionId: string, optionValue: string, multiSelect: boolean = false) => {
      setFilters((prev) => {
        const current = prev[sectionId] || [];
        let newValues: string[];

        if (multiSelect) {
          if (current.includes(optionValue)) {
            newValues = current.filter((v) => v !== optionValue);
          } else {
            newValues = [...current, optionValue];
          }
        } else {
          newValues = current.includes(optionValue) ? [] : [optionValue];
        }

        const newFilters = { ...prev, [sectionId]: newValues };
        onFilterChange(newFilters);
        return newFilters;
      });
    },
    [onFilterChange]
  );

  const handleClearAll = useCallback(() => {
    const emptyFilters: Record<string, string[]> = {};
    sections.forEach((s) => {
      emptyFilters[s.id] = [];
    });
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  }, [sections, onFilterChange]);

  const filteredSections = showSearch && searchQuery
    ? sections.map((section) => ({
        ...section,
        options: section.options.filter((option) =>
          option.label.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }))
    : sections;

  const hasActiveFilters = Object.values(filters).some((arr) => arr.length > 0);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {showSearch && (
        <div className="p-3 border-b border-gray-200">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      <div className="max-h-96 overflow-y-auto">
        {filteredSections.map((section) => (
          <div key={section.id} className="border-b border-gray-100 last:border-b-0">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span>{section.label}</span>
              <div className="flex items-center gap-2">
                {filters[section.id]?.length > 0 && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                    {filters[section.id].length}
                  </span>
                )}
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    expandedSections.has(section.id) ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </button>

            {expandedSections.has(section.id) && (
              <div className="px-4 pb-3 space-y-1">
                {section.options.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">没有可用的选项</p>
                ) : (
                  section.options.map((option) => {
                    const isSelected = filters[section.id]?.includes(option.value);
                    return (
                      <label
                        key={option.value}
                        className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-50 rounded px-2 -mx-2 transition-colors"
                      >
                        <input
                          type={section.multiSelect ? 'checkbox' : 'radio'}
                          checked={isSelected}
                          onChange={() =>
                            handleOptionToggle(section.id, option.value, section.multiSelect)
                          }
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="flex-1 text-sm text-gray-700">{option.label}</span>
                        {option.count !== undefined && (
                          <span className="text-xs text-gray-400">{option.count}</span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {hasActiveFilters && (
        <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={handleClearAll}
            className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            清除所有筛选
          </button>
        </div>
      )}
    </div>
  );
}

interface QuickFilterTagsProps {
  options: FilterOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  multiSelect?: boolean;
  className?: string;
}

export function QuickFilterTags({
  options,
  selectedValues,
  onChange,
  multiSelect = false,
  className = '',
}: QuickFilterTagsProps) {
  const handleClick = (value: string) => {
    if (multiSelect) {
      if (selectedValues.includes(value)) {
        onChange(selectedValues.filter((v) => v !== value));
      } else {
        onChange([...selectedValues, value]);
      }
    } else {
      onChange(selectedValues.includes(value) ? [] : [value]);
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((option) => {
        const isSelected = selectedValues.includes(option.value);
        return (
          <button
            key={option.value}
            onClick={() => handleClick(option.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
              isSelected
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {option.label}
            {option.count !== undefined && (
              <span className="ml-1.5 opacity-75">({option.count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
