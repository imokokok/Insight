'use client';

import { useState, useMemo } from 'react';
import { ProtocolDetail } from '../types';
import { useTranslations, useLocale } from 'next-intl';
import {
  Layers,
  ExternalLink,
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  Building2,
} from 'lucide-react';

interface ProtocolListProps {
  data: ProtocolDetail[];
  loading?: boolean;
}

type SortField = 'tvl' | 'change24h' | 'change7d' | 'oracleCount';
type SortDirection = 'asc' | 'desc';

export default function ProtocolList({ data, loading = false }: ProtocolListProps) {
  const locale = useLocale();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('tvl');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // 获取所有类别
  const categories = useMemo(() => {
    const cats = new Set(data.map((p) => p.category));
    return ['all', ...Array.from(cats)];
  }, [data]);

  // 过滤和排序数据
  const filteredData = useMemo(() => {
    let filtered = data;

    // 搜索过滤
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.category.toLowerCase().includes(term) ||
          p.chains.some((c) => c.toLowerCase().includes(term))
      );
    }

    // 类别过滤
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    // 排序
    return [...filtered].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      return (aVal - bVal) * multiplier;
    });
  }, [data, searchTerm, selectedCategory, sortField, sortDirection]);

  // 切换排序
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // 切换展开状态
  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // 获取类别颜色
  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      Lending: 'bg-blue-100 text-blue-700',
      'Liquid Staking': 'bg-purple-100 text-purple-700',
      DEX: 'bg-green-100 text-green-700',
      CDP: 'bg-orange-100 text-orange-700',
      Derivatives: 'bg-red-100 text-red-700',
      Synthetics: 'bg-pink-100 text-pink-700',
      Yield: 'bg-yellow-100 text-yellow-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  // 渲染排序图标
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronUp className="w-3 h-3 text-gray-300" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3 h-3 text-blue-600" />
    ) : (
      <ChevronDown className="w-3 h-3 text-blue-600" />
    );
  };

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent animate-spin" />
          <span className="text-gray-500 text-sm">
            {locale === 'zh-CN' ? '加载中...' : 'Loading...'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 搜索和过滤 */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={locale === 'zh-CN' ? '搜索协议...' : 'Search protocols...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2 py-1.5 border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{locale === 'zh-CN' ? '所有类别' : 'All Categories'}</option>
            {categories
              .filter((c) => c !== 'all')
              .map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>
          {locale === 'zh-CN' ? '共' : 'Total'} {filteredData.length}{' '}
          {locale === 'zh-CN' ? '个协议' : 'protocols'}
        </span>
        {searchTerm && (
          <span className="text-blue-600">
            {locale === 'zh-CN' ? '搜索: ' : 'Search: '}&quot;{searchTerm}&quot;
          </span>
        )}
      </div>

      {/* 协议列表 */}
      <div className="space-y-1.5 max-h-[360px] overflow-auto">
        {filteredData.map((protocol) => (
          <div
            key={protocol.id}
            className="py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <div className="cursor-pointer" onClick={() => toggleExpand(protocol.id)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                    {protocol.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-gray-900 text-sm">{protocol.name}</span>
                      <span
                        className={`px-1.5 py-0.5 text-xs font-medium ${getCategoryColor(
                          protocol.category
                        )}`}
                      >
                        {protocol.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {protocol.chains.length} {locale === 'zh-CN' ? '条链' : 'chains'}
                      </span>
                      <span>•</span>
                      <span>
                        {locale === 'zh-CN' ? '主要预言机' : 'Primary'}: {protocol.primaryOracle}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-medium text-gray-900 text-sm">{protocol.tvlFormatted}</div>
                    <div
                      className={`text-xs font-medium ${
                        protocol.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {protocol.change24h >= 0 ? '+' : ''}
                      {protocol.change24h.toFixed(1)}% (24h)
                    </div>
                  </div>
                  {expandedItems.has(protocol.id) ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>
            </div>

            {/* 展开的详情 */}
            {expandedItems.has(protocol.id) && (
              <div className="pt-3 mt-2 border-t border-gray-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-2">
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">
                      {locale === 'zh-CN' ? '7天变化' : '7d Change'}
                    </div>
                    <div
                      className={`font-medium text-sm ${
                        protocol.change7d >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {protocol.change7d >= 0 ? '+' : ''}
                      {protocol.change7d.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">
                      {locale === 'zh-CN' ? '预言机数量' : 'Oracles'}
                    </div>
                    <div className="font-medium text-gray-900 text-sm">{protocol.oracleCount}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">
                      {locale === 'zh-CN' ? '支持链' : 'Chains'}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {protocol.chains.slice(0, 4).map((chain) => (
                        <span key={chain} className="px-1 py-0.5 bg-gray-100 text-xs text-gray-600">
                          {chain}
                        </span>
                      ))}
                      {protocol.chains.length > 4 && (
                        <span className="px-1 py-0.5 bg-gray-100 text-xs text-gray-400">
                          +{protocol.chains.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">
                      {locale === 'zh-CN' ? '主要预言机' : 'Primary Oracle'}
                    </div>
                    <div className="font-medium text-gray-900 text-sm">
                      {protocol.primaryOracle}
                    </div>
                  </div>
                </div>
                {protocol.url && (
                  <a
                    href={protocol.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-2"
                  >
                    {locale === 'zh-CN' ? '访问网站' : 'Visit Website'}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-8">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">
            {locale === 'zh-CN' ? '未找到匹配的协议' : 'No protocols found'}
          </p>
        </div>
      )}
    </div>
  );
}
