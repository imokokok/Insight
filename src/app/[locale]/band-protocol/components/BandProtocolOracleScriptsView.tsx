'use client';

import { useState, useMemo, useCallback } from 'react';

import {
  Activity,
  CheckCircle2,
  Clock,
  Code,
  ExternalLink,
  FileJson,
  RefreshCw,
  Search,
  TrendingUp,
  X,
  AlertCircle,
} from 'lucide-react';

import { useTranslations } from '@/i18n';
import type { OracleScript, OracleScriptCategory } from '@/lib/oracles/bandProtocol';

import { type BandProtocolOracleScriptsViewProps } from '../types';

const ITEMS_PER_PAGE = 10;

const getCategoryConfig = (t: (key: string) => string): Record<OracleScriptCategory, { label: string; color: string }> => ({
  price: { label: t('band.bandProtocol.categories.price'), color: 'bg-blue-100 text-blue-700' },
  sports: { label: t('band.bandProtocol.categories.sports'), color: 'bg-emerald-100 text-emerald-700' },
  random: { label: t('band.bandProtocol.categories.random'), color: 'bg-purple-100 text-purple-700' },
  custom: { label: t('band.bandProtocol.categories.custom'), color: 'bg-amber-100 text-amber-700' },
});

interface ScriptDetailModalProps {
  script: OracleScript | null;
  onClose: () => void;
}

function ScriptDetailModal({ script, onClose }: ScriptDetailModalProps) {
  const t = useTranslations();

  if (!script) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{script.name}</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-60px)]">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                {t('band.bandProtocol.oracleScripts.description')}
              </p>
              <p className="text-sm text-gray-700">{script.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  {t('band.bandProtocol.oracleScripts.owner')}
                </p>
                <p className="text-sm font-mono text-gray-700 truncate">{script.owner}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  {t('band.bandProtocol.oracleScripts.category')}
                </p>
                <span
                  className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryConfig(t)[script.category].color}`}
                >
                  {getCategoryConfig(t)[script.category].label}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  {t('band.bandProtocol.oracleScripts.callCount')}
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {script.callCount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  {t('band.bandProtocol.oracleScripts.successRate')}
                </p>
                <p
                  className={`text-sm font-semibold ${script.successRate >= 99 ? 'text-emerald-600' : script.successRate >= 95 ? 'text-blue-600' : 'text-amber-600'}`}
                >
                  {script.successRate.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  {t('band.bandProtocol.oracleScripts.avgResponseTime')}
                </p>
                <p className="text-sm font-semibold text-gray-900">{script.avgResponseTime}ms</p>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileJson className="w-4 h-4 text-gray-500" />
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  {t('band.bandProtocol.oracleScripts.schema')}
                </p>
              </div>
              <pre className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs font-mono text-gray-700 overflow-x-auto">
                {script.schema}
              </pre>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Code className="w-4 h-4 text-gray-500" />
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  {t('band.bandProtocol.oracleScripts.code')}
                </p>
              </div>
              <pre className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs font-mono text-gray-700 overflow-x-auto">
                {script.code}
              </pre>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <a
                href={`https://docs.bandchain.org/oracle-scripts/${script.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700"
              >
                <ExternalLink className="w-4 h-4" />
                {t('band.bandProtocol.oracleScripts.viewDocumentation')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BandProtocolOracleScriptsView({ oracleScripts, isLoading, error: propError, onRefresh }: BandProtocolOracleScriptsViewProps) {
  const t = useTranslations();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedScript, setSelectedScript] = useState<OracleScript | null>(null);

  const categories = useMemo(() => {
    const counts: Record<string, number> = { all: oracleScripts.length };
    oracleScripts.forEach((script) => {
      counts[script.category] = (counts[script.category] || 0) + 1;
    });
    return [
      { id: 'all', label: t('band.bandProtocol.oracleScripts.allCategories'), count: counts.all },
      { id: 'price', label: 'Price', count: counts.price || 0 },
      { id: 'sports', label: 'Sports', count: counts.sports || 0 },
      { id: 'random', label: 'Random', count: counts.random || 0 },
      { id: 'custom', label: 'Custom', count: counts.custom || 0 },
    ];
  }, [oracleScripts, t]);

  const filteredScripts = useMemo(() => {
    let result = oracleScripts;

    if (selectedCategory !== 'all') {
      result = result.filter((script) => script.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (script) =>
          script.name.toLowerCase().includes(query) ||
          script.description.toLowerCase().includes(query)
      );
    }

    return result;
  }, [oracleScripts, selectedCategory, searchQuery]);

  const paginatedScripts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredScripts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredScripts, currentPage]);

  const totalPages = Math.ceil(filteredScripts.length / ITEMS_PER_PAGE);

  const totalCalls = oracleScripts.reduce((sum, s) => sum + s.callCount, 0);
  const avgSuccessRate = oracleScripts.length
    ? oracleScripts.reduce((sum, s) => sum + s.successRate, 0) / oracleScripts.length
    : 0;
  const avgResponseTime = oracleScripts.length
    ? oracleScripts.reduce((sum, s) => sum + s.avgResponseTime, 0) / oracleScripts.length
    : 0;

  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const handleScriptClick = useCallback((script: OracleScript) => {
    setSelectedScript(script);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedScript(null);
  }, []);

  const handleRefresh = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  const displayError = propError;

  if (displayError) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('band.bandProtocol.oracleScripts.loadError')}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {displayError.message || t('band.bandProtocol.oracleScripts.failedToLoad')}
          </p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {t('band.bandProtocol.oracleScripts.retry')}
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="h-12 bg-gray-200 rounded mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-6 md:gap-8">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('band.bandProtocol.oracleScripts.totalScripts')}
            </p>
            <p className="text-xl font-semibold text-gray-900">{oracleScripts.length}</p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('band.bandProtocol.oracleScripts.totalCalls')}
            </p>
            <p className="text-xl font-semibold text-gray-900">{(totalCalls / 1e6).toFixed(1)}M</p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('band.bandProtocol.oracleScripts.avgSuccessRate')}
            </p>
            <p className="text-xl font-semibold text-emerald-600">{avgSuccessRate.toFixed(2)}%</p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('band.bandProtocol.oracleScripts.avgResponseTime')}
            </p>
            <p className="text-xl font-semibold text-gray-900">{Math.round(avgResponseTime)}ms</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('band.bandProtocol.oracleScripts.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-4">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryChange(category.id)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              selectedCategory === category.id
                ? 'text-gray-900 bg-gray-100'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {category.label}
            <span
              className={`text-xs ${
                selectedCategory === category.id ? 'text-gray-600' : 'text-gray-400'
              }`}
            >
              {category.count}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('band.bandProtocol.oracleScripts.scriptName')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('band.bandProtocol.oracleScripts.category')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('band.bandProtocol.oracleScripts.callCount')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('band.bandProtocol.oracleScripts.successRate')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('band.bandProtocol.oracleScripts.avgResponseTime')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedScripts.map((script) => (
                <tr
                  key={script.id}
                  onClick={() => handleScriptClick(script)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{script.name}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[240px]">
                        {script.description}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryConfig(t)[script.category].color}`}
                    >
                      {getCategoryConfig(t)[script.category].label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-gray-900">
                      {script.callCount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`text-sm font-medium ${
                        script.successRate >= 99
                          ? 'text-emerald-600'
                          : script.successRate >= 95
                            ? 'text-blue-600'
                            : 'text-amber-600'
                      }`}
                    >
                      {script.successRate.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-gray-900">{script.avgResponseTime}ms</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredScripts.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            {t('band.bandProtocol.oracleScripts.noResults')}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              {t('band.bandProtocol.oracleScripts.showing')}{' '}
              {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredScripts.length)}{' '}
              {t('band.bandProtocol.oracleScripts.of')} {filteredScripts.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('band.bandProtocol.oracleScripts.previous')}
              </button>
              <span className="text-sm text-gray-500">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('band.bandProtocol.oracleScripts.next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedScript && <ScriptDetailModal script={selectedScript} onClose={handleCloseModal} />}
    </div>
  );
}
