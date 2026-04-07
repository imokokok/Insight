'use client';

import Image from 'next/image';

import { TrendingUp, TrendingDown, RefreshCw, WifiOff } from 'lucide-react';

import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';

import { OracleTokenPricesSkeleton } from './skeletons';

import type { OracleTokenPrice } from '../types/oracle';

interface OracleTokenPricesProps {
  /** 代币价格数据 */
  prices: OracleTokenPrice[];
  /** 是否正在加载 */
  isLoading?: boolean;
  /** 是否出错 */
  isError?: boolean;
  /** 最后更新时间 */
  lastUpdated: Date | null;
  /** 手动刷新函数 */
  onRefresh?: () => void;
}

/**
 * 格式化价格显示
 */
function formatPrice(price: number): string {
  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (price >= 1) {
    return `$${price.toFixed(2)}`;
  } else if (price >= 0.01) {
    return `$${price.toFixed(4)}`;
  } else {
    return `$${price.toFixed(6)}`;
  }
}

/**
 * 格式化涨跌幅
 */
function formatChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

/**
 * 格式化交易量
 */
function formatVolume(volume: number): string {
  if (volume >= 1e9) {
    return `$${(volume / 1e9).toFixed(2)}B`;
  } else if (volume >= 1e6) {
    return `$${(volume / 1e6).toFixed(2)}M`;
  } else if (volume >= 1e3) {
    return `$${(volume / 1e3).toFixed(2)}K`;
  }
  return `$${volume.toFixed(2)}`;
}

/**
 * 单个代币价格卡片组件
 */
function TokenPriceCard({ price, isError }: { price: OracleTokenPrice; isError?: boolean }) {
  const t = useTranslations('marketOverview.tokenPrices');
  const isPositive = price.priceChangePercentage24h >= 0;
  const isNegative = price.priceChangePercentage24h < 0;

  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div
      className={cn(
        // 卡片基础样式 - 使用设计系统的 card-elevated 风格
        'bg-white rounded-lg border border-gray-200 p-4',
        'shadow-sm hover:shadow-md',
        'transition-all duration-200 ease-out',
        'hover:-translate-y-0.5 hover:border-gray-300',
        'cursor-pointer group relative overflow-hidden'
      )}
    >
      {/* 顶部：Logo 和代币信息 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div
            className="relative w-10 h-10 flex-shrink-0 rounded-full overflow-hidden"
            style={{ backgroundColor: `${price.themeColor}15` }}
          >
            <Image
              src={price.logoPath}
              alt={price.oracleName}
              fill
              className="object-contain p-1.5"
              sizes="40px"
            />
          </div>
          {/* 代币符号和名称 */}
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-gray-900 leading-tight">
              {price.symbol}
            </span>
            <span className="text-xs text-gray-500 leading-tight">{price.oracleName}</span>
          </div>
        </div>

        {/* 离线状态指示器 */}
        {isError && (
          <div className="flex items-center gap-1 text-amber-600">
            <WifiOff className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      {/* 中部：价格 */}
      <div className="mb-3">
        <span className="text-xl font-bold text-gray-900 tabular-nums tracking-tight">
          {formatPrice(price.currentPrice)}
        </span>
      </div>

      {/* 底部：涨跌幅 Pill */}
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
          'transition-colors duration-200',
          isPositive && 'bg-success-50 text-success-700 border border-success-200',
          isNegative && 'bg-danger-50 text-danger-700 border border-danger-200',
          !isPositive && !isNegative && 'bg-gray-100 text-gray-600 border border-gray-200'
        )}
      >
        <TrendIcon className="w-3 h-3 flex-shrink-0" />
        <span className="tabular-nums">{formatChange(price.priceChangePercentage24h)}</span>
      </div>

      {/* 24h 高/低和成交量 - 直接显示 */}
      <div className="mt-3 pt-3 border-t border-gray-100 text-xs space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-gray-500">{t('high24h')}</span>
          <span className="text-gray-700 font-medium tabular-nums">
            {formatPrice(price.high24h)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">{t('low24h')}</span>
          <span className="text-gray-700 font-medium tabular-nums">
            {formatPrice(price.low24h)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">{t('volume')}</span>
          <span className="text-gray-700 font-medium tabular-nums">
            {formatVolume(price.volume24h)}
          </span>
        </div>
      </div>

      {/* 底部主题色装饰条 - 始终显示 */}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5"
        style={{ backgroundColor: price.themeColor }}
      />
    </div>
  );
}

/**
 * 预言机代币价格展示组件
 */
export default function OracleTokenPrices({
  prices,
  isLoading = false,
  isError = false,
  lastUpdated,
  onRefresh,
}: OracleTokenPricesProps) {
  const t = useTranslations('marketOverview.tokenPrices');

  if (isLoading && prices.length === 0) {
    return <OracleTokenPricesSkeleton />;
  }

  const formattedLastUpdated = lastUpdated
    ? lastUpdated.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '--:--:--';

  return (
    <div className="w-full">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">{t('title')}</h3>
          {isError && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              {t('offlineMode')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {t('updatedAt', { time: formattedLastUpdated })}
          </span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                'hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1'
              )}
              title={t('refresh')}
            >
              <RefreshCw className={cn('w-4 h-4 text-gray-600', isLoading && 'animate-spin')} />
            </button>
          )}
        </div>
      </div>

      {/* 价格卡片网格布局 */}
      {prices.length > 0 ? (
        <div
          className={cn(
            // 网格布局：桌面端3列，平板端2列，移动端1列
            'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
            'gap-3'
          )}
        >
          {prices.map((price) => (
            <TokenPriceCard key={price.symbol} price={price} isError={isError} />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center w-full py-12 text-gray-500 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
          {t('noData')}
        </div>
      )}
    </div>
  );
}
