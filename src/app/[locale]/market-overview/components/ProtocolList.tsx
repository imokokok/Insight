'use client';

import { useState, useMemo } from 'react';

import { Search, TrendingUp, TrendingDown } from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type ProtocolDetail } from '../types';

interface ProtocolListProps {
  data: ProtocolDetail[];
  loading?: boolean;
}

export default function ProtocolList({ data, loading = false }: ProtocolListProps) {
  const t = useTranslations('marketOverview.protocolList');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'tvs' | 'change'>('tvs');

  // 过滤和排序数据
  const filteredData = useMemo(() => {
    let result = [...data];

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.chains.some((chain) => chain.toLowerCase().includes(query)) ||
          item.primaryOracle.toLowerCase().includes(query)
      );
    }

    // 排序
    result.sort((a, b) => {
      if (sortBy === 'tvs') {
        return b.tvl - a.tvl;
      }
      return b.change24h - a.change24h;
    });

    return result;
  }, [data, searchQuery, sortBy]);

  // 格式化TVS
  const formatTVS = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent animate-spin" />
          <span className="text-gray-500 text-sm">{t('loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search and Filter */}
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortBy('tvs')}
            className={`px-3 py-1.5 text-sm transition-colors ${
              sortBy === 'tvs'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('sortByTVS')}
          </button>
          <button
            onClick={() => setSortBy('change')}
            className={`px-3 py-1.5 text-sm transition-colors ${
              sortBy === 'change'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('sortByChange')}
          </button>
        </div>
      </div>

      {/* Protocol List */}
      <div className="flex-1 overflow-auto">
        {filteredData.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">{t('noData')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredData.map((protocol) => (
              <div key={protocol.id} className="p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 flex items-center justify-center text-primary-600 font-medium text-sm">
                      {protocol.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{protocol.name}</div>
                      <div className="text-xs text-gray-500">
                        {protocol.chains[0]}
                        {protocol.chains.length > 1 ? ` +${protocol.chains.length - 1}` : ''} •{' '}
                        {protocol.primaryOracle}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">{formatTVS(protocol.tvl)}</div>
                    <div
                      className={`text-xs flex items-center justify-end gap-1 ${
                        protocol.change24h >= 0 ? 'text-success-600' : 'text-danger-600'
                      }`}
                    >
                      {protocol.change24h >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {protocol.change24h >= 0 ? '+' : ''}
                      {protocol.change24h.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500">{t('showing', { count: filteredData.length })}</p>
      </div>
    </div>
  );
}
