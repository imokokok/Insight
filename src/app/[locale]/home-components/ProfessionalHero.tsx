'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import {
  ArrowRight,
  Search,
  TrendingUp,
  Shield,
  Zap,
  Activity,
  Clock,
  X,
  ChevronRight,
  Coins,
  Database,
  Link2,
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { chartColors } from '@/lib/config/colors';
import { symbols } from '@/lib/constants';
import {
  getSearchHistory,
  saveSearchHistory,
  clearSearchHistory,
  removeFromSearchHistory,
  SearchHistoryItem,
} from '@/lib/utils/searchHistory';
import { searchAll, getTokenSymbol, type SearchableItem, type SearchResult } from '@/lib/constants/searchConfig';
import HeroBackground from './HeroBackground';

interface TrendData {
  value: number;
}

interface Metric {
  label: string;
  value: string;
  subLabel: string;
  icon: typeof Shield;
  trend: TrendData[];
  color: string;
}

const generateTrendData = (baseValue: number, points: number = 20): TrendData[] => {
  const data: TrendData[] = [];
  let currentValue = baseValue;
  for (let i = 0; i < points; i++) {
    const change = (Math.random() - 0.48) * 0.05;
    currentValue = currentValue * (1 + change);
    data.push({ value: currentValue });
  }
  return data;
};

const getStaticMetrics = (t: (key: string) => string): Omit<Metric, 'trend'>[] => [
  {
    label: 'tvs',
    value: '$42.1B',
    subLabel: t('home.hero.metrics.totalValueSecured'),
    icon: Shield,
    color: chartColors.chart.blue,
  },
  {
    label: 'oracles',
    value: '5',
    subLabel: t('home.hero.metrics.activeOracles'),
    icon: Zap,
    color: chartColors.chart.emerald,
  },
  {
    label: 'pairs',
    value: '1200+',
    subLabel: t('home.hero.metrics.supportedPairs'),
    icon: TrendingUp,
    color: chartColors.chart.violet,
  },
];

// 热门币种
const POPULAR_TOKENS = ['BTC', 'ETH', 'SOL', 'AVAX', 'LINK', 'UNI', 'AAVE', 'MKR'];

export default function ProfessionalHero() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [isComposing, setIsComposing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(false);
  const [mountedState, setMountedState] = useState(false);

  // 加载搜索历史和 mounted 状态
  useEffect(() => {
    const initializeData = () => {
      setSearchHistory(getSearchHistory());
    };
    initializeData();
    mountedRef.current = true;
    // 使用 requestAnimationFrame 避免同步 setState 警告
    requestAnimationFrame(() => {
      setMountedState(true);
    });
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchAll(searchQuery);
  }, [searchQuery]);

  const dropdownItems = useMemo(() => {
    const items: { type: 'history' | 'popular' | 'search'; item: SearchResult | { symbol: string }; resultType?: 'token' | 'oracle' | 'chain' | 'protocol' }[] = [];

    if (!searchQuery.trim() && searchHistory.length > 0) {
      searchHistory.slice(0, 3).forEach((historyItem) => {
        items.push({ type: 'history', item: { symbol: historyItem.symbol } });
      });
    }

    if (!searchQuery.trim()) {
      POPULAR_TOKENS.forEach((symbol) => {
        if (!items.some((i) => 'symbol' in i.item && i.item.symbol === symbol)) {
          items.push({ type: 'popular', item: { symbol } });
        }
      });
    }

    searchResults.forEach((result) => {
      items.push({ type: 'search', item: result, resultType: result.item.type as 'token' | 'oracle' | 'chain' | 'protocol' });
    });

    return items.slice(0, 10);
  }, [searchHistory, searchResults, searchQuery]);

  const handleSearch = useCallback(
    (searchItem: string | SearchResult) => {
      let path: string;
      let symbolToSave: string | null = null;

      if (typeof searchItem === 'string') {
        const normalizedSymbol = searchItem.trim().toUpperCase();
        if (!normalizedSymbol) return;
        symbolToSave = normalizedSymbol;
        path = `/${locale}/price-query?symbol=${normalizedSymbol}`;
      } else {
        const result = searchItem as SearchResult;
        path = `/${locale}${result.item.path}`;
        if (result.item.type === 'token' && result.item.symbol) {
          symbolToSave = result.item.symbol;
        }
      }

      if (symbolToSave) {
        saveSearchHistory(symbolToSave);
        setSearchHistory(getSearchHistory());
      }
      
      setIsDropdownOpen(false);
      router.push(path);
    },
    [locale, router]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isComposing) return;
    if (highlightedIndex >= 0 && highlightedIndex < dropdownItems.length) {
      const selectedItem = dropdownItems[highlightedIndex];
      if (selectedItem.type === 'search' && 'score' in selectedItem.item) {
        handleSearch(selectedItem.item as SearchResult);
      } else if ('symbol' in selectedItem.item) {
        handleSearch(selectedItem.item.symbol);
      }
    } else if (searchQuery.trim()) {
      const tokenSymbol = getTokenSymbol(searchQuery);
      if (tokenSymbol) {
        handleSearch(tokenSymbol);
      } else {
        handleSearch(searchQuery);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isComposing) return;

    if (!isDropdownOpen) {
      if (e.key === 'ArrowDown' && dropdownItems.length > 0) {
        e.preventDefault();
        setIsDropdownOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < dropdownItems.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < dropdownItems.length) {
          const selectedItem = dropdownItems[highlightedIndex];
          if (selectedItem.type === 'search' && 'score' in selectedItem.item) {
            handleSearch(selectedItem.item as SearchResult);
          } else if ('symbol' in selectedItem.item) {
            handleSearch(selectedItem.item.symbol);
          }
        } else if (searchQuery.trim()) {
          const tokenSymbol = getTokenSymbol(searchQuery);
          if (tokenSymbol) {
            handleSearch(tokenSymbol);
          } else {
            handleSearch(searchQuery);
          }
        }
        break;
      case 'Escape':
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 清除搜索历史
  const handleClearHistory = () => {
    clearSearchHistory();
    setSearchHistory([]);
  };

  // 删除单条搜索历史
  const handleRemoveHistoryItem = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromSearchHistory(symbol);
    setSearchHistory(getSearchHistory());
  };

  // 高亮匹配文字
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.trim()})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="text-emerald-600 font-semibold">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const metrics = useMemo(() => {
    const staticMetrics = getStaticMetrics(t);
    if (!mountedState) {
      return staticMetrics.map((m) => ({
        ...m,
        trend: [{ value: 0 }],
      }));
    }
    return staticMetrics.map((m) => ({
      ...m,
      trend:
        m.label === 'tvs'
          ? generateTrendData(40)
          : m.label === 'oracles'
            ? generateTrendData(5, 15)
            : generateTrendData(1100, 25),
    }));
  }, [t, mountedState]);

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden">
      <HeroBackground />
      <div className="relative z-10 flex-1 flex items-center px-6 lg:px-12 xl:px-20 py-12">
        <div className="w-full max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">
                {t('home.hero.liveData')}
              </span>
              <span className="w-1 h-1 bg-emerald-400"></span>
              <span className="text-xs text-emerald-600">
                {t('home.hero.badge') || '专业预言机数据平台'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              {t('home.hero.title.part1')}
              <br />
              <span className="text-gray-700">{t('home.hero.title.part2')}</span>
            </h1>

            <p className="text-lg md:text-xl text-gray-600 mb-10 leading-relaxed max-w-2xl mx-auto">
              {t('home.hero.description') ||
                '全面分析和比较主流预言机协议。实时监控价格数据，评估协议性能，助力 Web3 开发者和分析师做出明智决策。'}
            </p>

            {/* 搜索框区域 */}
            <div className="relative max-w-2xl mx-auto mb-4 z-[100]" ref={dropdownRef}>
              <form
                onSubmit={handleSubmit}
                className={`relative flex items-center bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border transition-all duration-300 ease-out overflow-visible ${
                  isSearchFocused
                    ? 'shadow-xl shadow-emerald-500/10 border-emerald-300/50 scale-[1.02]'
                    : 'border-gray-200/80 hover:border-gray-300 hover:shadow-xl'
                }`}
              >
                <div className="pl-5">
                  <Search
                    className={`w-5 h-5 transition-all duration-300 ${
                      isSearchFocused ? 'text-emerald-600 scale-110' : 'text-gray-400'
                    }`}
                  />
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                    setHighlightedIndex(-1);
                  }}
                  onFocus={() => {
                    setIsSearchFocused(true);
                    setIsDropdownOpen(true);
                  }}
                  onBlur={() => setIsSearchFocused(false)}
                  onKeyDown={handleKeyDown}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  placeholder={t('home.hero.searchPlaceholder')}
                  className="flex-1 px-4 sm:px-5 py-4 sm:py-5 text-sm sm:text-base text-gray-900 placeholder-gray-400 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus:border-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 min-w-0 !outline-none"
                  style={{ outline: 'none', boxShadow: 'none' }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      inputRef.current?.focus();
                    }}
                    className="p-1 mr-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="submit"
                  className="mr-2 px-5 sm:px-7 py-2.5 sm:py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white font-semibold rounded-xl hover:from-gray-800 hover:to-gray-700 hover:shadow-lg hover:shadow-gray-900/25 active:scale-95 transition-all duration-200 text-sm sm:text-base whitespace-nowrap"
                >
                  {t('common.actions.search')}
                </button>

                {isDropdownOpen && dropdownItems.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {!searchQuery.trim() && searchHistory.length > 0 && (
                      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>最近搜索</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleClearHistory}
                          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          清除
                        </button>
                      </div>
                    )}

                    <div className="max-h-80 overflow-y-auto">
                      {dropdownItems.map((dropdownItem, index) => {
                        const isSearchResult = dropdownItem.type === 'search' && 'score' in dropdownItem.item;
                        const searchResult = isSearchResult ? (dropdownItem.item as SearchResult) : null;
                        const searchableItem = searchResult?.item;
                        const symbol = 'symbol' in dropdownItem.item ? dropdownItem.item.symbol : searchableItem?.symbol || '';
                        const name = searchableItem?.name || symbol;
                        
                        const getTypeIcon = () => {
                          if (dropdownItem.type === 'history') return <Clock className="w-4 h-4 text-gray-400" />;
                          if (dropdownItem.type === 'popular') return <TrendingUp className="w-4 h-4 text-emerald-500" />;
                          if (searchableItem?.type === 'token') return <Coins className="w-4 h-4 text-amber-500" />;
                          if (searchableItem?.type === 'oracle') return <Database className="w-4 h-4 text-blue-500" />;
                          if (searchableItem?.type === 'chain') return <Link2 className="w-4 h-4 text-purple-500" />;
                          return <Search className="w-4 h-4 text-gray-400" />;
                        };

                        const getTypeLabel = () => {
                          if (dropdownItem.type === 'popular') return '热门';
                          if (searchableItem?.type === 'token') return '代币';
                          if (searchableItem?.type === 'oracle') return '预言机';
                          if (searchableItem?.type === 'chain') return '区块链';
                          return null;
                        };

                        const getTypeColor = () => {
                          if (dropdownItem.type === 'popular') return 'text-emerald-600 bg-emerald-50';
                          if (searchableItem?.type === 'token') return 'text-amber-600 bg-amber-50';
                          if (searchableItem?.type === 'oracle') return 'text-blue-600 bg-blue-50';
                          if (searchableItem?.type === 'chain') return 'text-purple-600 bg-purple-50';
                          return 'text-gray-600 bg-gray-50';
                        };

                        return (
                          <div
                            key={`${dropdownItem.type}-${symbol}-${index}`}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                              index === highlightedIndex ? 'bg-emerald-50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                if (isSearchResult && searchResult) {
                                  handleSearch(searchResult);
                                } else if (symbol) {
                                  handleSearch(symbol);
                                }
                              }}
                              className="flex-1 flex items-center gap-3 text-left"
                            >
                              {getTypeIcon()}
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-900">
                                  {symbol}
                                  {searchableItem && symbol !== name && (
                                    <span className="ml-2 text-sm text-gray-500 font-normal">
                                      {name}
                                    </span>
                                  )}
                                </span>
                              </div>
                              {getTypeLabel() && (
                                <span className={`text-xs px-2 py-0.5 rounded ${getTypeColor()}`}>
                                  {getTypeLabel()}
                                </span>
                              )}
                            </button>
                            <div className="flex items-center gap-2">
                              {dropdownItem.type === 'history' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    if ('symbol' in dropdownItem.item) {
                                      handleRemoveHistoryItem(dropdownItem.item.symbol, e);
                                    }
                                  }}
                                  className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                                  title="删除此记录"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <ChevronRight className="w-4 h-4 text-gray-300" />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
                      <span>使用 ↑↓ 选择，↵ 确认</span>
                      <span>ESC 关闭</span>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* 热门币种快捷标签 */}
            <div className="max-w-2xl mx-auto mb-10">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400 mr-1">热门:</span>
                {POPULAR_TOKENS.map((token) => (
                  <button
                    key={token}
                    onClick={() => handleSearch(token)}
                    className="px-3 py-1 text-xs font-medium text-gray-600 bg-white/80 hover:bg-white border border-gray-200 hover:border-emerald-300 rounded-full transition-all duration-200 hover:shadow-sm hover:text-emerald-600"
                  >
                    {token}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-12">
              <Link
                href="/market-overview"
                className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-colors duration-200 group w-full sm:w-auto justify-center"
              >
                {t('home.hero.ctaPrimary') || '查看市场概览'}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
              <Link
                href="/price-query"
                className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white text-gray-700 font-semibold border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors duration-200 group w-full sm:w-auto justify-center"
              >
                <Search className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors duration-200" />
                {t('home.hero.ctaSecondary') || '查询价格'}
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {metrics.map((metric) => {
                const Icon = metric.icon;
                const isPositive =
                  metric.trend[metric.trend.length - 1].value >= metric.trend[0].value;
                const percentChange =
                  (metric.trend[metric.trend.length - 1].value / metric.trend[0].value - 1) * 100;

                return (
                  <div
                    key={metric.label}
                    className="group bg-white border border-gray-200 p-5 hover:border-gray-400 transition-colors duration-200"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gray-100">
                          <Icon className="w-5 h-5 text-gray-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-500">{metric.subLabel}</span>
                      </div>
                      <div
                        className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 border ${
                          isPositive
                            ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                            : 'text-red-600 bg-red-50 border-red-200'
                        }`}
                      >
                        <TrendingUp className={`w-3 h-3 ${!isPositive && 'rotate-180'}`} />
                        <span>
                          {isPositive ? '+' : ''}
                          {percentChange.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-3">{metric.value}</div>
                    <div className="h-12 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metric.trend}>
                          <defs>
                            <linearGradient
                              id={`gradient-${metric.label}`}
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop offset="5%" stopColor={metric.color} stopOpacity={0.2} />
                              <stop offset="95%" stopColor={metric.color} stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke={metric.color}
                            strokeWidth={2}
                            fill={`url(#gradient-${metric.label})`}
                            dot={false}
                            animationDuration={1500}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
