'use client';

/**
 * @fileoverview 查询结果展示组件
 * @description 展示价格查询的结果，包括统计、图表和详情 - 统一大卡片布局
 */

import { useState } from 'react';

import Image from 'next/image';

import {
  TrendingUp,
  BarChart3,
  Clock,
  Database,
  ArrowUpIcon,
  ArrowDownIcon,
  Hash,
  FileText,
  Layers,
  History,
  Settings,
  Shield,
} from 'lucide-react';

import { ChartSkeleton, EmptyStateEnhanced, ProgressBar, SegmentedControl } from '@/components/ui';
import { useTranslations } from '@/i18n';
import {
  type OracleProvider,
  type Blockchain,
  OracleProvider as OracleProviderEnum,
} from '@/lib/oracles';

import { type QueryResult, type PriceData } from '../constants';
import { type QueryError } from '../hooks/usePriceQuery';

import { PriceChart, DataSourceSection, UnifiedExportSection, ErrorBanner } from './index';

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
const TokenIcon: React.FC<{ symbol: string; className?: string }> = ({
  symbol,
  className = 'w-14 h-14',
}) => {
  const [hasError, setHasError] = useState(false);

  // 获取logo路径
  const logoPath = cryptoLogoMap[symbol];

  // 如果有logo路径且未加载失败，显示官方logo
  if (logoPath && !hasError) {
    return (
      <Image
        src={logoPath}
        alt={`${symbol} logo`}
        width={56}
        height={56}
        className={`rounded-full ${className}`}
        onError={() => setHasError(true)}
      />
    );
  }

  // 回退到渐变色文字占位符
  return (
    <div
      className={`rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg ${className}`}
    >
      {symbol.slice(0, 2)}
    </div>
  );
};

interface ChartDataPoint {
  timestamp: number;
  time: string;
  [key: string]: number | string;
}

interface QueryResultsProps {
  isLoading: boolean;
  queryResults: QueryResult[];
  historicalData: Partial<Record<string, PriceData[]>>;
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  standardDeviation: number;
  standardDeviationPercent: number;
  avgChange24hPercent?: number;
  validPrices: number[];
  chartData: ChartDataPoint[];
  queryDuration: number | null;
  queryProgress: { completed: number; total: number };
  currentQueryTarget: { oracle: OracleProvider | null; chain: Blockchain | null };
  selectedTimeRange: number;
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  onRefresh: () => void;
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
  queryErrors: QueryError[];
  onRetryDataSource: (provider: OracleProvider, chain: Blockchain) => void;
  onRetryAllErrors: () => void;
  onClearErrors: () => void;
}

/**
 * 格式化价格显示
 */
function formatPrice(price: number): string {
  if (price <= 0) return '-';
  return price.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * 格式化大数字（如市值、交易量）
 */
function formatLargeNumber(num: number): string {
  if (num >= 1e12) {
    return `$${(num / 1e12).toFixed(2)}T`;
  }
  if (num >= 1e9) {
    return `$${(num / 1e9).toFixed(2)}B`;
  }
  if (num >= 1e6) {
    return `$${(num / 1e6).toFixed(2)}M`;
  }
  if (num >= 1e3) {
    return `$${(num / 1e3).toFixed(2)}K`;
  }
  return `$${num.toFixed(2)}`;
}

/**
 * 查询结果展示组件
 *
 * @param props - 组件属性
 * @returns 查询结果 JSX 元素
 */
// eslint-disable-next-line max-lines-per-function, complexity
export function QueryResults({
  isLoading,
  queryResults,
  historicalData: _historicalData,
  avgPrice,
  maxPrice,
  minPrice,
  priceRange,
  standardDeviation,
  standardDeviationPercent,
  avgChange24hPercent,
  chartData,
  queryDuration,
  queryProgress,
  currentQueryTarget,
  selectedTimeRange,
  selectedSymbol,
  setSelectedSymbol,
  onRefresh,
  chartContainerRef,
  queryErrors,
  onRetryDataSource,
  onRetryAllErrors,
  onClearErrors,
}: QueryResultsProps) {
  const t = useTranslations();

  // 加载状态
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">{t('priceQuery.loadingData')}</h3>
            <span className="text-xs text-gray-500">
              {queryProgress.completed} / {queryProgress.total}
            </span>
          </div>
          <ProgressBar
            progress={queryProgress.completed}
            total={queryProgress.total}
            showPercentage={true}
            size="md"
            variant="default"
          />
          <p className="text-xs text-gray-500 mt-2">
            {t('priceQuery.querying')}{' '}
            {currentQueryTarget.oracle && t(`navbar.${currentQueryTarget.oracle.toLowerCase()}`)}{' '}
            {currentQueryTarget.chain && t(`blockchain.${currentQueryTarget.chain.toLowerCase()}`)}
          </p>
        </div>
        <ChartSkeleton height={300} variant="price" showToolbar={true} />
      </div>
    );
  }

  // 空状态
  if (queryResults.length === 0) {
    return (
      <EmptyStateEnhanced
        type="search"
        title={t('priceQuery.noResults.title', { symbol: selectedSymbol })}
        description={t('priceQuery.noResults.description')}
        size="lg"
        variant="page"
      >
        <div className="mt-8 pt-6 border-t border-gray-100 w-full max-w-md">
          <p className="text-xs text-gray-400 mb-4 flex items-center justify-center gap-1">
            <TrendingUp className="w-3 h-3" aria-hidden="true" />
            {t('priceQuery.noResults.popularTokens')}
          </p>
          <div className="flex items-center justify-center">
            <SegmentedControl
              options={['BTC', 'ETH', 'SOL', 'AVAX', 'LINK', 'UNI'].map((token) => ({
                value: token,
                label: token,
              }))}
              value={selectedSymbol}
              onChange={(value) => setSelectedSymbol(value as string)}
              size="sm"
            />
          </div>
        </div>
      </EmptyStateEnhanced>
    );
  }

  // 获取当前价格数据
  const currentResult = queryResults[0];
  const currentPrice = currentResult?.priceData;
  const currentPriceValue = currentPrice?.price || avgPrice;
  const change24hValue = currentPrice?.change24hPercent ?? avgChange24hPercent ?? 0;
  const volume24hValue = 0;

  // 计算价格趋势
  const isPositiveChange = change24hValue >= 0;
  const changeColor = isPositiveChange ? 'text-emerald-600' : 'text-red-600';
  const changeBg = isPositiveChange ? 'bg-emerald-50' : 'bg-red-50';
  const changeBorder = isPositiveChange ? 'border-emerald-200' : 'border-red-200';
  const ChangeIcon = isPositiveChange ? ArrowUpIcon : ArrowDownIcon;

  // 获取一致性评级
  const getConsistencyRating = (stdDevPercent: number): { label: string; color: string } => {
    if (stdDevPercent < 0.1)
      return { label: t('priceQuery.stats.consistency.excellent'), color: 'text-emerald-600' };
    if (stdDevPercent < 0.3)
      return { label: t('priceQuery.stats.consistency.good'), color: 'text-blue-600' };
    if (stdDevPercent < 0.5)
      return { label: t('priceQuery.stats.consistency.fair'), color: 'text-amber-600' };
    return { label: t('priceQuery.stats.consistency.poor'), color: 'text-red-600' };
  };

  const consistencyRating =
    standardDeviationPercent > 0 ? getConsistencyRating(standardDeviationPercent) : null;

  // 判断是否为 Chainlink 预言机
  const isChainlink = currentResult?.provider === OracleProviderEnum.CHAINLINK;
  const chainlinkData = isChainlink ? currentResult?.priceData : null;

  // 判断是否为 Pyth 预言机
  const isPyth = currentResult?.provider === OracleProviderEnum.PYTH;
  const pythData = isPyth ? currentResult?.priceData : null;

  return (
    <div className="space-y-4">
      {/* 错误提示横幅 */}
      {queryErrors.length > 0 && (
        <ErrorBanner
          errors={queryErrors}
          onRetry={onRetryDataSource}
          onRetryAll={onRetryAllErrors}
          onDismiss={onClearErrors}
        />
      )}

      {/* 统一大卡片 - 价格信息展示 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* 头部区域：代币符号和当前价格 */}
        <div className="px-6 py-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* 左侧：代币信息 */}
            <div className="flex items-center gap-4">
              <TokenIcon symbol={selectedSymbol} />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedSymbol}</h2>
                <p className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  {queryResults.length} {t('priceQuery.dataSources.title')}
                </p>
              </div>
            </div>

            {/* 右侧：当前价格 */}
            <div className="text-left sm:text-right">
              <p className="text-sm text-gray-500 mb-1">{t('priceQuery.currentPrice')}</p>
              <div className="flex items-baseline gap-3 sm:justify-end">
                <span className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">
                  ${formatPrice(currentPriceValue)}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-semibold border ${changeBg} ${changeColor} ${changeBorder}`}
                >
                  <ChangeIcon className="w-3.5 h-3.5" />
                  {isPositiveChange ? '+' : ''}
                  {change24hValue.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 统计区域：关键指标 */}
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {isChainlink && chainlinkData ? (
              <>
                {/* Chainlink Feed 元数据 - 轮次 ID */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Hash className="w-3.5 h-3.5 text-blue-500" />
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('priceQuery.stats.roundId') || 'Round ID'}
                    </p>
                  </div>
                  <p
                    className="text-lg font-bold text-gray-900 font-mono truncate"
                    title={chainlinkData.roundId}
                  >
                    {chainlinkData.roundId ? `#${chainlinkData.roundId.slice(-6)}` : '-'}
                  </p>
                </div>

                {/* Chainlink Feed 元数据 - 回答轮次 */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('priceQuery.stats.answeredInRound') || 'Answered In'}
                    </p>
                  </div>
                  <p
                    className="text-lg font-bold text-gray-900 font-mono truncate"
                    title={chainlinkData.answeredInRound}
                  >
                    {chainlinkData.answeredInRound
                      ? `#${chainlinkData.answeredInRound.slice(-6)}`
                      : '-'}
                  </p>
                </div>

                {/* Chainlink Feed 元数据 - 精度 */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Settings className="w-3.5 h-3.5 text-amber-500" />
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('priceQuery.stats.decimals') || 'Decimals'}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-gray-900 font-mono">
                    {chainlinkData.decimals ?? '-'}
                  </p>
                </div>

                {/* Chainlink Feed 元数据 - 版本 */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-500" />
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('priceQuery.stats.version') || 'Version'}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-gray-900 font-mono">
                    {chainlinkData.version ?? '-'}
                  </p>
                </div>

                {/* Chainlink Feed 元数据 - 轮次开始时间 */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <History className="w-3.5 h-3.5 text-purple-500" />
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('priceQuery.stats.roundStarted') || 'Round Started'}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-gray-900">
                    {chainlinkData.startedAt
                      ? new Date(chainlinkData.startedAt).toLocaleTimeString()
                      : '-'}
                  </p>
                </div>

                {/* Chainlink Feed 元数据 - 数据源描述 */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Shield className="w-3.5 h-3.5 text-rose-500" />
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('priceQuery.stats.feedDescription') || 'Feed'}
                    </p>
                  </div>
                  <p
                    className="text-sm font-bold text-gray-900 truncate"
                    title={chainlinkData.source}
                  >
                    {chainlinkData.source || '-'}
                  </p>
                </div>
              </>
            ) : isPyth && pythData ? (
              <>
                {/* Pyth 元数据 - Price Feed ID */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Hash className="w-3.5 h-3.5 text-purple-500" />
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('priceQuery.stats.priceId') || 'Price Feed ID'}
                    </p>
                  </div>
                  <p
                    className="text-lg font-bold text-gray-900 font-mono truncate"
                    title={pythData.priceId}
                  >
                    {pythData.priceId
                      ? `${pythData.priceId.slice(0, 6)}...${pythData.priceId.slice(-4)}`
                      : '-'}
                  </p>
                </div>

                {/* Pyth 元数据 - 价格指数 */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Settings className="w-3.5 h-3.5 text-blue-500" />
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('priceQuery.stats.exponent') || 'Exponent'}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-gray-900 font-mono">
                    {pythData.exponent !== undefined ? `10^${pythData.exponent}` : '-'}
                  </p>
                </div>

                {/* Pyth 元数据 - 置信区间绝对值 */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('priceQuery.stats.confidenceAbs') || 'Confidence'}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-gray-900 font-mono">
                    {pythData.conf !== undefined ? `$${pythData.conf.toFixed(4)}` : '-'}
                  </p>
                </div>

                {/* Pyth 元数据 - 发布时间 */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('priceQuery.stats.publishTime') || 'Published'}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-gray-900">
                    {pythData.publishTime
                      ? new Date(pythData.publishTime).toLocaleTimeString()
                      : '-'}
                  </p>
                </div>

                {/* Pyth 元数据 - 置信区间宽度 */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('priceQuery.stats.confidenceWidth') || 'Spread %'}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-gray-900 font-mono">
                    {pythData.confidenceInterval?.widthPercentage !== undefined
                      ? `${pythData.confidenceInterval.widthPercentage.toFixed(4)}%`
                      : '-'}
                  </p>
                </div>

                {/* Pyth 元数据 - 置信度分数 */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Shield className="w-3.5 h-3.5 text-rose-500" />
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('priceQuery.stats.confidenceScore') || 'Confidence Score'}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-gray-900 font-mono">
                    {pythData.confidence !== undefined ? `${pythData.confidence.toFixed(2)}%` : '-'}
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* 24h 最高 */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                    {t('priceQuery.stats.maxPrice')}
                  </p>
                  <p className="text-lg font-bold text-gray-900 font-mono">
                    ${formatPrice(maxPrice)}
                  </p>
                </div>

                {/* 24h 最低 */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                    {t('priceQuery.stats.minPrice')}
                  </p>
                  <p className="text-lg font-bold text-gray-900 font-mono">
                    ${formatPrice(minPrice)}
                  </p>
                </div>

                {/* 平均价格 */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                    {t('priceQuery.stats.avgPrice')}
                  </p>
                  <p className="text-lg font-bold text-gray-900 font-mono">
                    ${formatPrice(avgPrice)}
                  </p>
                </div>

                {/* 价格区间 */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                    {t('priceQuery.stats.priceRange')}
                  </p>
                  <p className="text-lg font-bold text-gray-900 font-mono">
                    ${formatPrice(priceRange)}
                  </p>
                </div>

                {/* 24h 交易量 */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                    {t('priceQuery.volume24h')}
                  </p>
                  <p className="text-lg font-bold text-gray-900 font-mono">
                    {formatLargeNumber(volume24hValue)}
                  </p>
                </div>

                {/* 一致性评级 */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                    {t('priceQuery.stats.consistencyRating')}
                  </p>
                  <p
                    className={`text-lg font-bold ${
                      standardDeviationPercent > 0 ? consistencyRating?.color : 'text-gray-900'
                    }`}
                  >
                    {standardDeviationPercent > 0 ? consistencyRating?.label : '-'}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* 次要统计指标 */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-gray-500">
              <BarChart3 className="w-4 h-4" />
              <span>
                {t('priceQuery.stats.standardDeviation')}:{' '}
                <span className="font-medium text-gray-700">
                  {standardDeviation > 0 ? `${standardDeviationPercent.toFixed(4)}%` : '-'}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500">
              <Database className="w-4 h-4" />
              <span>
                {t('priceQuery.stats.dataPoints')}:{' '}
                <span className="font-medium text-gray-700">{queryResults.length}</span>
              </span>
            </div>
            {queryDuration !== null && (
              <div className="flex items-center gap-1.5 text-gray-500">
                <Clock className="w-4 h-4" />
                <span>
                  {t('priceQuery.stats.queryDuration')}:{' '}
                  <span className="font-medium text-gray-700">{queryDuration} ms</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 图表区域 */}
        <div ref={chartContainerRef} className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full"></div>
            <h3 className="text-sm font-semibold text-gray-800">
              {t('priceQuery.charts.priceHistory')}
            </h3>
            <span className="text-xs text-gray-400 ml-2">(历史数据来源于 Binance API)</span>
          </div>
          <div className="bg-gray-50/50 rounded-xl border border-gray-100 p-4">
            <PriceChart
              chartData={chartData}
              queryResults={queryResults}
              selectedTimeRange={selectedTimeRange}
              avgPrice={avgPrice}
            />
          </div>
        </div>
      </div>

      {/* 数据源和导出区域 - 卡片外部 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-1">
        <DataSourceSection
          results={queryResults}
          lastUpdated={
            queryResults.length > 0
              ? new Date(Math.max(...queryResults.map((r) => r.priceData.timestamp)))
              : null
          }
          onRefresh={onRefresh}
          isLoading={isLoading}
        />
        <UnifiedExportSection
          loading={isLoading}
          queryResults={queryResults}
          chartContainerRef={chartContainerRef}
          selectedSymbol={selectedSymbol}
          avgPrice={avgPrice}
          maxPrice={maxPrice}
          minPrice={minPrice}
          priceRange={priceRange}
          standardDeviation={standardDeviation}
          standardDeviationPercent={standardDeviationPercent}
        />
      </div>
    </div>
  );
}
