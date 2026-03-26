'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

import Image from 'next/image';

import { TrendingUp, Activity, Globe, ChevronDown, Search } from 'lucide-react';

import { useLocale } from '@/i18n';
import { isChineseLocale } from '@/i18n/routing';
import { baseColors } from '@/lib/config/colors';

import { tradingPairs } from '../cross-oracle/constants';

interface ChainData {
  name: string;
  price: number;
  deviation: number;
}

type Category = 'all' | 'layer1' | 'defi' | 'stablecoin';

// 分类标签配置
const categoryLabels: Record<Category, string> = {
  all: '全部',
  layer1: 'Layer 1',
  defi: 'DeFi',
  stablecoin: '稳定币',
};

// 加密货币到logo文件的映射
const cryptoLogoMap: Record<string, string> = {
  BTC: '/logos/cryptos/btc.svg',
  ETH: '/logos/cryptos/eth.svg',
  SOL: '/logos/cryptos/sol.svg',
  AVAX: '/logos/cryptos/avax.svg',
  NEAR: '/logos/cryptos/near.svg',
  MATIC: '/logos/cryptos/matic.svg',
  ARB: '/logos/cryptos/arb.svg',
  OP: '/logos/cryptos/op.svg',
  DOT: '/logos/cryptos/dot.svg',
  ADA: '/logos/cryptos/ada.svg',
  ATOM: '/logos/cryptos/atom.svg',
  FTM: '/logos/cryptos/ftm.svg',
  LINK: '/logos/cryptos/link.svg',
  UNI: '/logos/cryptos/uni.svg',
  AAVE: '/logos/cryptos/aave.svg',
  MKR: '/logos/cryptos/mkr.svg',
  SNX: '/logos/cryptos/snx.svg',
  COMP: '/logos/cryptos/comp.svg',
  YFI: '/logos/cryptos/yfi.svg',
  CRV: '/logos/cryptos/crv.svg',
  LDO: '/logos/cryptos/ldo.svg',
  SUSHI: '/logos/cryptos/sushi.svg',
  '1INCH': '/logos/cryptos/1inch.svg',
  BAL: '/logos/cryptos/bal.svg',
  FXS: '/logos/cryptos/fxs.svg',
  RPL: '/logos/cryptos/rpl.svg',
  GMX: '/logos/cryptos/gmx.svg',
  DYDX: '/logos/cryptos/dydx.svg',
  USDC: '/logos/cryptos/usdc.svg',
  USDT: '/logos/cryptos/usdt.svg',
  DAI: '/logos/cryptos/dai.svg',
};

// 加密货币图标组件
const CryptoIcon: React.FC<{ symbol: string; className?: string }> = ({
  symbol,
  className = 'w-5 h-5',
}) => {
  const baseAsset = symbol.split('/')[0];
  const [hasError, setHasError] = useState(false);

  // 获取logo路径
  const logoPath = cryptoLogoMap[baseAsset];

  // 如果有logo路径且未加载失败，显示官方logo
  if (logoPath && !hasError) {
    return (
      <Image
        src={logoPath}
        alt={`${baseAsset} logo`}
        width={20}
        height={20}
        className={`rounded-full ${className}`}
        onError={() => setHasError(true)}
      />
    );
  }

  // 回退到文字占位符
  const pairConfig = tradingPairs.find((p) => p.symbol === symbol);
  const iconColor = pairConfig?.iconColor || '#6B7280';

  return (
    <div
      className={`rounded-full flex items-center justify-center text-xs font-bold text-white ${className}`}
      style={{ backgroundColor: iconColor }}
    >
      {baseAsset.slice(0, 2)}
    </div>
  );
};

const chainDataMap: Record<string, ChainData[]> = {
  'BTC/USD': [
    { name: 'Ethereum', price: 67245.32, deviation: 0 },
    { name: 'Arbitrum', price: 67238.15, deviation: -0.011 },
    { name: 'BSC', price: 67234.56, deviation: -0.016 },
    { name: 'Polygon', price: 67212.45, deviation: -0.049 },
  ],
  'ETH/USD': [
    { name: 'Ethereum', price: 3456.78, deviation: 0 },
    { name: 'Arbitrum', price: 3454.23, deviation: -0.074 },
    { name: 'BSC', price: 3455.89, deviation: -0.026 },
    { name: 'Polygon', price: 3452.67, deviation: -0.119 },
  ],
  'LINK/USD': [
    { name: 'Ethereum', price: 14.23, deviation: 0 },
    { name: 'Arbitrum', price: 14.21, deviation: -0.14 },
    { name: 'BSC', price: 14.22, deviation: -0.07 },
    { name: 'Polygon', price: 14.18, deviation: -0.35 },
  ],
  'SOL/USD': [
    { name: 'Ethereum', price: 145.67, deviation: 0 },
    { name: 'Arbitrum', price: 145.45, deviation: -0.15 },
    { name: 'BSC', price: 145.56, deviation: -0.08 },
    { name: 'Polygon', price: 145.23, deviation: -0.3 },
  ],
  'AVAX/USD': [
    { name: 'Ethereum', price: 28.45, deviation: 0 },
    { name: 'Arbitrum', price: 28.38, deviation: -0.25 },
    { name: 'BSC', price: 28.42, deviation: -0.11 },
    { name: 'Polygon', price: 28.31, deviation: -0.49 },
  ],
};

const getDeviationStyle = (deviation: number): string => {
  const absDeviation = Math.abs(deviation);
  if (absDeviation < 0.1) return 'bg-emerald-50/80 border-emerald-100 text-emerald-700';
  if (absDeviation < 0.3) return 'bg-amber-50/80 border-amber-100 text-amber-700';
  return 'bg-danger-50/80 border-danger-100 text-danger-700';
};

const getDeviationIntensity = (deviation: number): string => {
  const absDeviation = Math.abs(deviation);
  if (absDeviation < 0.1) return 'bg-emerald-500';
  if (absDeviation < 0.3) return 'bg-amber-500';
  return 'bg-danger-500';
};

const getConsistencyStatus = (deviation: number): string => {
  const absDeviation = Math.abs(deviation);
  if (absDeviation < 0.1) return 'high';
  if (absDeviation < 0.3) return 'medium';
  return 'low';
};

// 交易对选择器组件
function PairSelector({
  selectedSymbol,
  onSymbolChange,
}: {
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 根据分类和搜索词过滤交易对
  const filteredPairs = useMemo(() => {
    let pairs = tradingPairs;

    // 按分类筛选
    if (selectedCategory !== 'all') {
      pairs = pairs.filter((pair) => pair.category === selectedCategory);
    }

    // 按搜索词筛选
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      pairs = pairs.filter(
        (pair) =>
          pair.symbol.toLowerCase().includes(query) || pair.name.toLowerCase().includes(query)
      );
    }

    return pairs;
  }, [selectedCategory, searchQuery]);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 打开时聚焦搜索框并重置状态
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedCategory('all');
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  // 当分类或搜索变化时，重置高亮索引
  useEffect(() => {
    setHighlightedIndex(0);
  }, [selectedCategory, searchQuery]);

  // 键盘导航
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev < filteredPairs.length - 1 ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredPairs[highlightedIndex]) {
            onSymbolChange(filteredPairs[highlightedIndex].symbol);
            setIsOpen(false);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    },
    [isOpen, filteredPairs, highlightedIndex, onSymbolChange]
  );

  const handleSelect = (symbol: string) => {
    onSymbolChange(symbol);
    setIsOpen(false);
  };

  const baseAsset = selectedSymbol.split('/')[0];
  const quoteAsset = selectedSymbol.split('/')[1];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 选择器按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`
          flex items-center gap-2 px-3 py-2 
          bg-white border border-gray-200 
          hover:border-gray-300 hover:bg-gray-50
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          transition-all duration-200
          ${isOpen ? 'border-primary-500 ring-2 ring-primary-500' : ''}
        `}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <CryptoIcon symbol={selectedSymbol} />
        <div className="flex items-baseline gap-1">
          <span className="text-base font-semibold" style={{ color: baseColors.gray[900] }}>
            {baseAsset}
          </span>
          <span className="text-sm" style={{ color: baseColors.gray[400] }}>
            /{quoteAsset}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: baseColors.gray[400] }}
        />
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div
          className="
            absolute top-full right-0 mt-1 w-72
            shadow-lg z-50
            animate-in fade-in slide-in-from-top-1 duration-200
          "
          style={{
            backgroundColor: baseColors.gray[50],
            border: `1px solid ${baseColors.gray[200]}`,
          }}
          role="listbox"
        >
          {/* 搜索框 */}
          <div className="p-2" style={{ borderBottom: `1px solid ${baseColors.gray[100]}` }}>
            <div className="relative">
              <Search
                className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: baseColors.gray[400] }}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                placeholder="搜索交易对..."
                className="
                  w-full pl-8 pr-3 py-1.5 text-sm rounded
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                "
                style={{
                  border: `1px solid ${baseColors.gray[200]}`,
                }}
              />
            </div>
          </div>

          {/* 分类标签 */}
          {!searchQuery && (
            <div className="flex" style={{ borderBottom: `1px solid ${baseColors.gray[100]}` }}>
              {(Object.keys(categoryLabels) as Category[]).map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className="flex-1 px-3 py-2 text-xs font-medium transition-colors duration-150"
                  style={{
                    color:
                      selectedCategory === category
                        ? baseColors.primary[600]
                        : baseColors.gray[600],
                    borderBottom:
                      selectedCategory === category
                        ? `2px solid ${baseColors.primary[600]}`
                        : 'none',
                    backgroundColor:
                      selectedCategory === category ? baseColors.primary[50] : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCategory !== category) {
                      e.currentTarget.style.color = baseColors.gray[900];
                      e.currentTarget.style.backgroundColor = baseColors.gray[50];
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCategory !== category) {
                      e.currentTarget.style.color = baseColors.gray[600];
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {categoryLabels[category]}
                </button>
              ))}
            </div>
          )}

          {/* 选项列表 */}
          <div className="max-h-64 overflow-y-auto py-1">
            {filteredPairs.length === 0 ? (
              <div
                className="px-3 py-4 text-sm text-center"
                style={{ color: baseColors.gray[500] }}
              >
                未找到匹配的交易对
              </div>
            ) : (
              filteredPairs.map((pair, index) => {
                const isSelected = pair.symbol === selectedSymbol;
                const isHighlighted = index === highlightedIndex;
                const [base, quote] = pair.symbol.split('/');

                const getBgColor = () => {
                  if (isSelected) return baseColors.primary[50];
                  if (isHighlighted) return baseColors.gray[100];
                  return 'transparent';
                };

                return (
                  <button
                    key={pair.symbol}
                    onClick={() => handleSelect(pair.symbol)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors duration-150"
                    style={{
                      backgroundColor: getBgColor(),
                    }}
                    onMouseOver={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = baseColors.gray[50];
                      }
                    }}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <CryptoIcon symbol={pair.symbol} />
                    <div className="flex flex-col flex-1">
                      <div className="flex items-baseline gap-1">
                        <span
                          className="text-sm font-medium"
                          style={{
                            color: isSelected ? baseColors.primary[700] : baseColors.gray[900],
                          }}
                        >
                          {base}
                        </span>
                        <span className="text-xs" style={{ color: baseColors.gray[400] }}>
                          /{quote}
                        </span>
                      </div>
                      <span className="text-xs" style={{ color: baseColors.gray[400] }}>
                        {pair.name}
                      </span>
                    </div>
                    {isSelected && (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke={baseColors.primary[600]}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* 底部提示 */}
          <div
            className="px-3 py-2 text-xs flex justify-between"
            style={{
              backgroundColor: baseColors.gray[50],
              borderTop: `1px solid ${baseColors.gray[100]}`,
              color: baseColors.gray[400],
            }}
          >
            <span>使用 ↑↓ 导航，Enter 选择</span>
            <span>共 {filteredPairs.length} 个</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CrossChainPriceMonitor() {
  const locale = useLocale();
  const isZh = isChineseLocale(locale);
  const [selectedPair, setSelectedPair] = useState('BTC/USD');
  const [hoveredChain, setHoveredChain] = useState<string | null>(null);

  const currentData = chainDataMap[selectedPair] || chainDataMap['BTC/USD'];
  const avgPrice = currentData.reduce((sum, chain) => sum + chain.price, 0) / currentData.length;
  const maxDeviation = Math.max(...currentData.map((c) => Math.abs(c.deviation)));
  const highConsistencyCount = currentData.filter((c) => Math.abs(c.deviation) < 0.1).length;
  const consistencyRate = (highConsistencyCount / currentData.length) * 100;

  return (
    <div className="bg-white border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-50 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isZh ? '跨链价格监控' : 'Cross-Chain Price Monitor'}
              </h2>
              <p className="text-sm text-gray-500">
                {isZh
                  ? '实时追踪不同链上的价格差异'
                  : 'Real-time price deviation tracking across chains'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{isZh ? '交易对:' : 'Trading Pair:'}</span>
            <PairSelector selectedSymbol={selectedPair} onSymbolChange={setSelectedPair} />
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50/80 p-4 rounded-lg flex flex-col justify-center h-24">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-primary-600" />
              <span className="text-sm text-gray-500">{isZh ? '平均价格' : 'Average Price'}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">${avgPrice.toFixed(2)}</div>
          </div>
          <div className="bg-gray-50/80 p-4 rounded-lg flex flex-col justify-center h-24">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-gray-500">{isZh ? '最大偏差' : 'Max Deviation'}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{maxDeviation.toFixed(3)}%</div>
          </div>
          <div className="bg-gray-50/80 p-4 rounded-lg flex flex-col justify-center h-24">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-gray-500">
                {isZh ? '监控链数' : 'Chains Monitored'}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{currentData.length}</div>
          </div>
          <div className="bg-gray-50/80 p-4 rounded-lg flex flex-col justify-center h-24">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-gray-500">
                {isZh ? '一致性率' : 'Consistency Rate'}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{consistencyRate.toFixed(1)}%</div>
          </div>
        </div>

        {/* Chain Comparison Grid */}
        <div className="grid grid-cols-2 gap-4">
          {currentData.map((chain) => (
            <div
              key={chain.name}
              className={`p-4 rounded-lg transition-all cursor-pointer ${getDeviationStyle(chain.deviation)} ${
                hoveredChain === chain.name ? 'ring-2 ring-blue-400 ring-offset-1' : ''
              }`}
              onMouseEnter={() => setHoveredChain(chain.name)}
              onMouseLeave={() => setHoveredChain(null)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{chain.name}</h3>
                  <div className="text-2xl font-bold mt-1">${chain.price.toFixed(2)}</div>
                </div>
                <div className="text-right">
                  <div
                    className={`inline-flex items-center gap-1 px-2 py-1 text-sm font-medium rounded ${
                      chain.deviation === 0
                        ? 'bg-gray-100/80 text-gray-600'
                        : chain.deviation > 0
                          ? 'bg-danger-100/80 text-danger-600'
                          : 'bg-emerald-100/80 text-emerald-600'
                    }`}
                  >
                    {chain.deviation > 0 ? '+' : ''}
                    {chain.deviation.toFixed(3)}%
                  </div>
                  <div className="mt-2">
                    <span
                      className={`inline-block w-3 h-3 rounded-full ${getDeviationIntensity(chain.deviation)}`}
                    />
                    <span className="ml-2 text-xs capitalize">
                      {getConsistencyStatus(chain.deviation)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center justify-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
            <span className="text-gray-600 font-medium">
              {isZh ? '高一致性 (<0.1%)' : 'High Consistency (<0.1%)'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-200" />
            <span className="text-gray-600 font-medium">
              {isZh ? '中等一致性 (0.1-0.3%)' : 'Medium Consistency (0.1-0.3%)'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-danger-500 shadow-sm shadow-red-200" />
            <span className="text-gray-600 font-medium">
              {isZh ? '低一致性 (>0.3%)' : 'Low Consistency (>0.3%)'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
