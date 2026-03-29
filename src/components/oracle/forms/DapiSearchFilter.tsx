'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

import {
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Save,
  FolderOpen,
  Trash2,
  Check,
} from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useDebounce } from '@/hooks/useDebounce';
import { useTranslations } from '@/i18n';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('DapiSearchFilter');

export interface DapiFilters {
  search: string;
  categories: string[];
  chains: string[];
  statuses: string[];
}

interface SavedFilter {
  id: string;
  name: string;
  filters: DapiFilters;
  createdAt: Date;
}

interface DapiSearchFilterProps {
  onFilterChange: (filters: DapiFilters) => void;
  categories: string[];
  chains: string[];
  statuses: string[];
  initialFilters?: DapiFilters;
}

const STORAGE_KEY = 'api3_dapi_saved_filters';

export function DapiSearchFilter({
  onFilterChange,
  categories,
  chains,
  statuses,
  initialFilters,
}: DapiSearchFilterProps) {
  const t = useTranslations();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSavedFilters, setShowSavedFilters] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState<DapiFilters>(
    initialFilters || {
      search: '',
      categories: [],
      chains: [],
      statuses: [],
    }
  );

  const debouncedSearch = useDebounce(filters.search, 300);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSavedFilters(
          parsed.map((f: SavedFilter) => ({
            ...f,
            createdAt: new Date(f.createdAt),
          }))
        );
      } catch (error) {
        logger.error(
          'Failed to parse saved filters',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSavedFilters(false);
        setShowSaveDialog(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    onFilterChange({
      ...filters,
      search: debouncedSearch,
    });
  }, [debouncedSearch, filters.categories, filters.chains, filters.statuses]);

  const handleSearchChange = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  }, []);

  const toggleFilter = useCallback(
    (type: keyof Pick<DapiFilters, 'categories' | 'chains' | 'statuses'>, value: string) => {
      setFilters((prev) => {
        const current = prev[type];
        const updated = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        return { ...prev, [type]: updated };
      });
    },
    []
  );

  const clearAllFilters = useCallback(() => {
    setFilters({
      search: '',
      categories: [],
      chains: [],
      statuses: [],
    });
  }, []);

  const saveCurrentFilter = useCallback(() => {
    if (!saveFilterName.trim()) return;

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: saveFilterName.trim(),
      filters: { ...filters },
      createdAt: new Date(),
    };

    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSaveFilterName('');
    setShowSaveDialog(false);
  }, [saveFilterName, filters, savedFilters]);

  const loadFilter = useCallback((saved: SavedFilter) => {
    setFilters(saved.filters);
    setShowSavedFilters(false);
  }, []);

  const deleteFilter = useCallback(
    (id: string) => {
      const updated = savedFilters.filter((f) => f.id !== id);
      setSavedFilters(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    },
    [savedFilters]
  );

  const activeFilterCount =
    filters.categories.length + filters.chains.length + filters.statuses.length;

  const hasActiveFilters = activeFilterCount > 0 || filters.search.length > 0;

  return (
    <div className="space-y-3" ref={dropdownRef}>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('api3.dapi.searchPlaceholder') || 'Search dAPIs...'}
            className="pl-10 pr-10"
            aria-label={t('api3.dapi.searchLabel') || 'Search dAPIs'}
          />
          {filters.search && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={t('common.clear') || 'Clear'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={showAdvanced ? 'bg-gray-100' : ''}
          >
            <Filter className="w-4 h-4 mr-1.5" />
            {t('api3.dapi.filters') || 'Filters'}
            {activeFilterCount > 0 && (
              <Badge variant="primary" size="sm" className="ml-1.5">
                {activeFilterCount}
              </Badge>
            )}
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4 ml-1" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-1" />
            )}
          </Button>

          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowSavedFilters(!showSavedFilters)}
            >
              <FolderOpen className="w-4 h-4 mr-1.5" />
              {t('api3.dapi.savedFilters') || 'Saved'}
            </Button>

            {showSavedFilters && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg border border-gray-200 shadow-lg z-50">
                <div className="p-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {t('api3.dapi.savedFiltersTitle') || 'Saved Filters'}
                  </h3>
                </div>

                {savedFilters.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    {t('api3.dapi.noSavedFilters') || 'No saved filters'}
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {savedFilters.map((saved) => (
                      <div
                        key={saved.id}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                      >
                        <button onClick={() => loadFilter(saved)} className="flex-1 text-left">
                          <div className="text-sm font-medium text-gray-900">{saved.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {saved.createdAt.toLocaleDateString()}
                          </div>
                        </button>
                        <button
                          onClick={() => deleteFilter(saved.id)}
                          className="p-1 text-gray-400 hover:text-red-500"
                          aria-label={t('common.delete') || 'Delete'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-3 border-t border-gray-100">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setShowSavedFilters(false);
                      setShowSaveDialog(true);
                    }}
                    disabled={!hasActiveFilters}
                  >
                    <Save className="w-4 h-4 mr-1.5" />
                    {t('api3.dapi.saveCurrentFilters') || 'Save Current'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <X className="w-4 h-4 mr-1.5" />
              {t('api3.dapi.clearAll') || 'Clear'}
            </Button>
          )}
        </div>
      </div>

      {showSaveDialog && (
        <div className="flex gap-2 p-3 bg-gray-50 rounded-lg">
          <Input
            type="text"
            value={saveFilterName}
            onChange={(e) => setSaveFilterName(e.target.value)}
            placeholder={t('api3.dapi.filterNamePlaceholder') || 'Filter name...'}
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && saveCurrentFilter()}
          />
          <Button size="sm" onClick={saveCurrentFilter} disabled={!saveFilterName.trim()}>
            <Check className="w-4 h-4 mr-1" />
            {t('common.save') || 'Save'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowSaveDialog(false)}>
            {t('common.cancel') || 'Cancel'}
          </Button>
        </div>
      )}

      {showAdvanced && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              {t('api3.dapi.categories') || 'Categories'}
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => toggleFilter('categories', category)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    filters.categories.includes(category)
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {category}
                  {filters.categories.includes(category) && (
                    <Check className="w-3 h-3 inline ml-1" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              {t('api3.dapi.chains') || 'Chains'}
            </label>
            <div className="flex flex-wrap gap-2">
              {chains.map((chain) => (
                <button
                  key={chain}
                  onClick={() => toggleFilter('chains', chain)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    filters.chains.includes(chain)
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {chain}
                  {filters.chains.includes(chain) && <Check className="w-3 h-3 inline ml-1" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              {t('api3.dapi.statuses') || 'Status'}
            </label>
            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => (
                <button
                  key={status}
                  onClick={() => toggleFilter('statuses', status)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    filters.statuses.includes(status)
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {status}
                  {filters.statuses.includes(status) && <Check className="w-3 h-3 inline ml-1" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {hasActiveFilters && !showAdvanced && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              {t('api3.dapi.search') || 'Search'}: {filters.search}
              <button onClick={() => handleSearchChange('')} className="ml-1 hover:text-gray-700">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.categories.map((cat) => (
            <Badge key={cat} variant="secondary" className="gap-1">
              {cat}
              <button
                onClick={() => toggleFilter('categories', cat)}
                className="ml-1 hover:text-gray-700"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {filters.chains.map((chain) => (
            <Badge key={chain} variant="secondary" className="gap-1">
              {chain}
              <button
                onClick={() => toggleFilter('chains', chain)}
                className="ml-1 hover:text-gray-700"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {filters.statuses.map((status) => (
            <Badge key={status} variant="secondary" className="gap-1">
              {status}
              <button
                onClick={() => toggleFilter('statuses', status)}
                className="ml-1 hover:text-gray-700"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
