'use client';

import { useState, useCallback, ReactNode, useRef, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

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
  const [focusedOptionIndex, setFocusedOptionIndex] = useState<{ sectionId: string; index: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Map<string, HTMLInputElement>>(new Map());

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

  const filteredSections =
    showSearch && searchQuery
      ? sections.map((section) => ({
          ...section,
          options: section.options.filter((option) =>
            option.label.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
      : sections;

  const hasActiveFilters = Object.values(filters).some((arr) => arr.length > 0);

  // Get all active filters as tags
  const activeFilterTags = Object.entries(filters).flatMap(([sectionId, values]) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return [];
    return values.map((value) => {
      const option = section.options.find((o) => o.value === value);
      return {
        sectionId,
        value,
        label: option?.label || value,
        sectionLabel: section.label,
      };
    });
  });

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, sectionId: string, optionIndex: number, totalOptions: number) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (optionIndex < totalOptions - 1) {
          const nextKey = `${sectionId}-${optionIndex + 1}`;
          optionRefs.current.get(nextKey)?.focus();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (optionIndex > 0) {
          const prevKey = `${sectionId}-${optionIndex - 1}`;
          optionRefs.current.get(prevKey)?.focus();
        }
        break;
      case 'Escape':
        e.preventDefault();
        toggleSection(sectionId);
        break;
    }
  };

  return (
    <div ref={panelRef} className={`bg-white border border-gray-200 rounded-lg ${className}`}>
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

      {/* Active Filter Tags */}
      {activeFilterTags.length > 0 && (
        <div className="p-3 border-b border-gray-200 bg-blue-50/50">
          <div className="flex flex-wrap gap-2">
            {activeFilterTags.map((tag) => (
              <motion.span
                key={`${tag.sectionId}-${tag.value}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
              >
                <span className="font-medium">{tag.label}</span>
                <button
                  onClick={() => handleOptionToggle(tag.sectionId, tag.value, true)}
                  className="p-0.5 hover:bg-blue-200 rounded-full transition-colors"
                  aria-label={`移除 ${tag.label}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.span>
            ))}
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
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full"
                  >
                    {filters[section.id].length}
                  </motion.span>
                )}
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
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

            <AnimatePresence>
              {expandedSections.has(section.id) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-3 space-y-1">
                    {section.options.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">没有可用的选项</p>
                    ) : (
                      section.options.map((option, optionIndex) => {
                        const isSelected = filters[section.id]?.includes(option.value);
                        const optionKey = `${section.id}-${optionIndex}`;
                        return (
                          <label
                            key={option.value}
                            className={`
                              flex items-center gap-3 py-2 px-2 -mx-2 rounded cursor-pointer
                              transition-all duration-150
                              ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}
                            `}
                          >
                            <input
                              ref={(el) => {
                                if (el) optionRefs.current.set(optionKey, el);
                              }}
                              type={section.multiSelect ? 'checkbox' : 'radio'}
                              checked={isSelected}
                              onChange={() =>
                                handleOptionToggle(section.id, option.value, section.multiSelect)
                              }
                              onKeyDown={(e) => handleKeyDown(e, section.id, optionIndex, section.options.length)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-offset-0"
                            />
                            <span className={`flex-1 text-sm ${isSelected ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                              {option.label}
                            </span>
                            {option.count !== undefined && (
                              <span className="text-xs text-gray-400">{option.count}</span>
                            )}
                          </label>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {hasActiveFilters && (
        <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={handleClearAll}
            className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
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
              isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
