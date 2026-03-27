'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  ArrowRight,
  Search,
  TrendingUp,
  Clock,
  X,
  ChevronRight,
  Coins,
  Database,
  Link2,
} from 'lucide-react';

import { useTranslations, useLocale } from '@/i18n';
import { searchAll, getTokenSymbol, type SearchResult } from '@/lib/constants/searchConfig';
import {
  getSearchHistory,
  saveSearchHistory,
  clearSearchHistory,
  removeFromSearchHistory,
  type SearchHistoryItem,
} from '@/lib/utils/searchHistory';

import HeroBackground from './HeroBackground';

interface HistoryDropdownItem {
  type: 'history';
  item: { symbol: string };
}

interface PopularDropdownItem {
  type: 'popular';
  item: { symbol: string };
}

interface SearchDropdownItem {
  type: 'search';
  item: SearchResult;
  resultType: 'token' | 'oracle' | 'chain' | 'protocol';
}

type DropdownItem = HistoryDropdownItem | PopularDropdownItem | SearchDropdownItem;

const POPULAR_TOKENS = ['BTC', 'ETH', 'SOL', 'AVAX', 'NEAR', 'MATIC', 'ARB'];

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
  const [isVisible, setIsVisible] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 加载搜索历史和入场动画
  useEffect(() => {
    setSearchHistory(getSearchHistory());
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const searchResults = searchQuery.trim() ? searchAll(searchQuery) : [];

  const dropdownItems: DropdownItem[] = (() => {
    const items: DropdownItem[] = [];

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
      items.push({
        type: 'search',
        item: result,
        resultType: result.item.type as 'token' | 'oracle' | 'chain' | 'protocol',
      });
    });

    return items.slice(0, 10);
  })();

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

  const handleSelectItem = useCallback(() => {
    if (highlightedIndex >= 0 && highlightedIndex < dropdownItems.length) {
      const selectedItem = dropdownItems[highlightedIndex];
      if (selectedItem.type === 'search') {
        handleSearch(selectedItem.item);
      } else {
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
  }, [highlightedIndex, dropdownItems, searchQuery, handleSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isComposing) return;
    handleSelectItem();
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
        handleSelectItem();
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

  const getTypeIcon = (dropdownItem: DropdownItem) => {
    if (dropdownItem.type === 'history') return <Clock className="w-4 h-4 text-gray-400" />;
    if (dropdownItem.type === 'popular') return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (dropdownItem.type === 'search') {
      const itemType = dropdownItem.item.item.type;
      if (itemType === 'token') return <Coins className="w-4 h-4 text-amber-500" />;
      if (itemType === 'oracle') return <Database className="w-4 h-4 text-blue-500" />;
      if (itemType === 'chain') return <Link2 className="w-4 h-4 text-purple-500" />;
    }
    return <Search className="w-4 h-4 text-gray-400" />;
  };

  const getTypeLabel = (dropdownItem: DropdownItem) => {
    if (dropdownItem.type === 'popular') return t('home.hero.popular');
    if (dropdownItem.type === 'search') {
      const itemType = dropdownItem.item.item.type;
      if (itemType === 'token') return t('home.hero.token');
      if (itemType === 'oracle') return t('home.hero.oracle');
      if (itemType === 'chain') return t('home.hero.blockchain');
    }
    return null;
  };

  const getTypeColor = (dropdownItem: DropdownItem) => {
    if (dropdownItem.type === 'popular') return 'text-emerald-600 bg-emerald-50';
    if (dropdownItem.type === 'search') {
      const itemType = dropdownItem.item.item.type;
      if (itemType === 'token') return 'text-amber-600 bg-amber-50';
      if (itemType === 'oracle') return 'text-blue-600 bg-blue-50';
      if (itemType === 'chain') return 'text-purple-600 bg-purple-50';
    }
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden">
      <HeroBackground enableParticles={true} enableDataFlow={false} />

      {/* Main Content - Centered Layout */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-12 py-8 sm:py-12">
        <div
          className="w-full max-w-2xl mx-auto text-center space-y-6 sm:space-y-8"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.5s ease-out',
          }}
        >
          {/* Live Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50/80 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 [animation-duration:2s]"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-medium text-emerald-700">{t('home.hero.liveData')}</span>
          </div>

          {/* Title */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
              {t('home.hero.title.part1')}
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 font-medium">
              {t('home.hero.title.part2')}
            </p>
          </div>

          {/* Description */}
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-lg mx-auto">
            {t('home.hero.description') ||
              '全面分析和比较主流预言机协议。实时监控价格数据，评估协议性能，助力 Web3 开发者和分析师做出明智决策。'}
          </p>

          {/* Search Box */}
          <div className="relative max-w-xl mx-auto z-[100]" ref={dropdownRef}>
            <form
              onSubmit={handleSubmit}
              className={`relative flex items-center bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border-2 transition-all duration-300 ease-out overflow-visible ${
                isSearchFocused
                  ? 'border-blue-400 shadow-blue-200/50 shadow-xl'
                  : 'border-gray-200/80 hover:border-gray-300'
              }`}
              style={{
                boxShadow: isSearchFocused
                  ? `0 0 0 4px rgba(59, 130, 246, 0.1), 0 10px 40px -10px rgba(59, 130, 246, 0.2)`
                  : undefined,
              }}
            >
              <div className="pl-5">
                <Search
                  className={`w-5 h-5 transition-all duration-300 ${
                    isSearchFocused ? 'text-blue-500 scale-110' : 'text-gray-400'
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
                className="flex-1 px-4 sm:px-5 py-4 sm:py-5 text-sm sm:text-base text-gray-900 placeholder-gray-400 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus:border-0 min-w-0"
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
                className="mr-2 px-5 sm:px-7 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 hover:shadow-lg hover:shadow-blue-500/25 active:scale-95 transition-all duration-200 text-sm sm:text-base whitespace-nowrap"
              >
                {t('actions.search')}
              </button>

              {/* Dropdown */}
              {isDropdownOpen && dropdownItems.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                  {!searchQuery.trim() && searchHistory.length > 0 && (
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{t('home.hero.recentSearch')}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearHistory}
                        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {t('home.hero.clear')}
                      </button>
                    </div>
                  )}

                  <div className="max-h-80 overflow-y-auto">
                    {dropdownItems.map((dropdownItem, index) => {
                      const isSearchResult = dropdownItem.type === 'search';
                      const symbol =
                        dropdownItem.type === 'search'
                          ? dropdownItem.item.item.symbol || ''
                          : dropdownItem.item.symbol;
                      const name = dropdownItem.type === 'search' ? dropdownItem.item.item.name : symbol;

                      return (
                        <div
                          key={`${dropdownItem.type}-${symbol}-${index}`}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                            index === highlightedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (dropdownItem.type === 'search') {
                                handleSearch(dropdownItem.item);
                              } else {
                                handleSearch(dropdownItem.item.symbol);
                              }
                            }}
                            className="flex-1 flex items-center gap-3 text-left"
                          >
                            {getTypeIcon(dropdownItem)}
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">
                                {symbol}
                                {isSearchResult && symbol !== name && (
                                  <span className="ml-2 text-sm text-gray-500 font-normal">
                                    {name}
                                  </span>
                                )}
                              </span>
                            </div>
                            {getTypeLabel(dropdownItem) && (
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${getTypeColor(dropdownItem)}`}
                              >
                                {getTypeLabel(dropdownItem)}
                              </span>
                            )}
                          </button>
                          <div className="flex items-center gap-2">
                            {dropdownItem.type === 'history' && (
                              <button
                                type="button"
                                onClick={(e) => handleRemoveHistoryItem(dropdownItem.item.symbol, e)}
                                className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                                title={t('home.hero.deleteRecord')}
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
                    <span>{t('home.hero.keyboardHint')}</span>
                    <span>{t('home.hero.escClose')}</span>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Popular Tokens - Horizontal Scroll */}
          <div className="max-w-xl mx-auto">
            <div className="flex items-center justify-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
              <span className="text-xs text-gray-400 flex-shrink-0">{t('home.hero.popular')}:</span>
              {POPULAR_TOKENS.map((token) => (
                <button
                  key={token}
                  onClick={() => handleSearch(token)}
                  className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white/80 hover:bg-white border border-gray-200 hover:border-blue-300 rounded-full transition-all duration-200 hover:shadow-sm hover:text-blue-600"
                >
                  {token}
                </button>
              ))}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/market-overview"
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-colors duration-200 group rounded-lg"
            >
              {t('home.hero.ctaPrimary') || '查看市场概览'}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
            <Link
              href="/price-query"
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white text-gray-700 font-semibold border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors duration-200 group rounded-lg"
            >
              <Search className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors duration-200" />
              {t('home.hero.ctaSecondary') || '查询价格'}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
