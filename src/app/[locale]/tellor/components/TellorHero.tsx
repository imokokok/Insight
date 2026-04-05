'use client';

import { useState, useMemo } from 'react';

import {
  TrendingUp,
  TrendingDown,
  Activity,
  Globe,
  Database,
  Wallet,
  Zap,
  Shield,
  RefreshCw,
  ExternalLink,
  Clock,
  Server,
  TrendingUp as TrendingUpIcon,
  Bell,
  Plus,
  FileText,
  Layers,
  Link2,
} from 'lucide-react';

import { VerificationBadge } from '@/components/oracle/data-display';
import {
  SparklineMemo,
  CompactMetricsRow,
  ActionButtons,
  MiniPriceChart,
  UnifiedInfoSection,
  type StatItem,
} from '@/components/oracle/shared/HeroComponents';
import { LiveStatusBar, OptimizedImage } from '@/components/ui';
import { useTranslations } from '@/i18n';
import { type OracleConfig } from '@/lib/config/oracles';
import { type ChainId, getEtherscanUrl, formatTxHash } from '@/lib/oracles/tellorDataVerification';
import { type PriceData } from '@/types/oracle';

export interface TellorHeroProps {
  config: OracleConfig;
  price: PriceData | null;
  historicalData: PriceData[];
  networkStats?: {
    avgResponseTime: number;
    nodeUptime: number;
    dataFeeds: number;
  };
  isLoading: boolean;
  isError: boolean;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  verificationData?: {
    txHash?: string;
    blockHeight?: number;
    chainId?: ChainId;
  };

  onRefresh: () => void;
  onExport: () => void;
}

function EnhancedCoreStats({
  stats,
  themeColor,
  verificationData,
}: {
  stats: StatItem[];
  themeColor: string;
  verificationData?: {
    txHash?: string;
    blockHeight?: number;
    chainId?: ChainId;
  };
}) {
  const displayStats = stats.slice(0, 5);
  const t = useTranslations('tellor');

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {displayStats.map((stat, index) => {
        const isPositive = stat.changeType === 'positive';
        const isNegative = stat.changeType === 'negative';
        const isPriceStat = index === 0;
        const hasVerification = isPriceStat && verificationData?.txHash;

        return (
          <div
            key={index}
            className="relative p-3 rounded-xl bg-gray-50/50 border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all group"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${themeColor}15` }}>
                <div style={{ color: themeColor }} className="w-4 h-4">
                  {stat.icon}
                </div>
              </div>
              {stat.sparklineData && (
                <div className="opacity-60 group-hover:opacity-100 transition-opacity">
                  <SparklineMemo
                    data={stat.sparklineData}
                    positive={isPositive}
                    width={50}
                    height={20}
                  />
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500 mb-1">{stat.title}</div>
            <div className="flex items-center gap-1.5">
              <div className="text-lg font-bold text-gray-900 tracking-tight">{stat.value}</div>
              {hasVerification && (
                <a
                  href={getEtherscanUrl(
                    'tx',
                    verificationData.txHash!,
                    verificationData.chainId || 1
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-600 hover:text-cyan-700 transition-colors"
                  title={t('reporters.viewOnEtherscan')}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            {stat.change && (
              <div className="flex items-center gap-1 mt-1">
                <span
                  className={`text-xs font-medium flex items-center gap-0.5 ${
                    isPositive ? 'text-emerald-600' : isNegative ? 'text-red-600' : 'text-gray-500'
                  }`}
                >
                  {isPositive && <TrendingUp className="w-3 h-3" />}
                  {isNegative && <TrendingDown className="w-3 h-3" />}
                  {stat.change}
                </span>
                {stat.subtitle && (
                  <span className="text-[10px] text-gray-400">{stat.subtitle}</span>
                )}
              </div>
            )}
            {hasVerification && verificationData?.blockHeight && (
              <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-gray-100">
                <Link2 className="w-3 h-3 text-gray-400" />
                <span className="text-[10px] text-gray-500">
                  #{verificationData.blockHeight.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function QuickActions({
  actions,
  themeColor,
}: {
  actions?: { icon: React.ReactNode; label: string; onClick?: () => void }[];
  themeColor: string;
}) {
  const t = useTranslations('tellor');
  const defaultActions: { icon: React.ReactNode; label: string; onClick?: () => void }[] = [
    { icon: <Bell className="w-3.5 h-3.5" />, label: t('hero.priceAlert'), onClick: undefined },
    { icon: <Plus className="w-3.5 h-3.5" />, label: t('hero.addMonitor'), onClick: undefined },
    { icon: <FileText className="w-3.5 h-3.5" />, label: t('hero.apiDocs'), onClick: undefined },
    {
      icon: <Layers className="w-3.5 h-3.5" />,
      label: t('hero.switchNetwork'),
      onClick: undefined,
    },
  ];

  const displayActions = actions || defaultActions;

  return (
    <div className="flex flex-wrap gap-1.5">
      {displayActions.map((action, index) => (
        <button
          key={index}
          onClick={action.onClick}
          className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded text-[11px] text-gray-700 hover:border-gray-300 hover:shadow-sm transition-all"
        >
          {action.icon}
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}

function LatestUpdates({
  updates,
  themeColor,
}: {
  updates?: { type: 'price' | 'node' | 'feed' | 'system'; text: string; time: string }[];
  themeColor: string;
}) {
  const t = useTranslations('tellor');
  const defaultUpdates = [
    {
      type: 'price' as const,
      text: t('hero.defaultUpdates.priceUpdate'),
      time: `2${t('hero.minutesAgo')}`,
    },
    {
      type: 'node' as const,
      text: t('hero.defaultUpdates.newReporter'),
      time: `5${t('hero.minutesAgo')}`,
    },
    {
      type: 'feed' as const,
      text: t('hero.defaultUpdates.feedUpdate'),
      time: `8${t('hero.minutesAgo')}`,
    },
    {
      type: 'system' as const,
      text: t('hero.defaultUpdates.maintenanceComplete'),
      time: `15${t('hero.minutesAgo')}`,
    },
  ];

  const displayUpdates = updates || defaultUpdates;

  return (
    <div className="bg-gray-50 border-t border-gray-200 py-2 px-4">
      <div className="max-w-[1600px] mx-auto flex items-center gap-4 overflow-hidden">
        <span className="text-xs font-medium text-gray-500 flex-shrink-0">
          {t('hero.latestUpdates')}:
        </span>
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-6 animate-marquee whitespace-nowrap">
            {displayUpdates.map((update, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    update.type === 'price'
                      ? 'bg-blue-500'
                      : update.type === 'node'
                        ? 'bg-emerald-500'
                        : update.type === 'feed'
                          ? 'bg-purple-500'
                          : 'bg-gray-500'
                  }`}
                />
                <span className="text-gray-700">{update.text}</span>
                <span className="text-gray-400">{update.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TellorHero({
  config,
  price,
  historicalData,
  networkStats,
  isLoading,
  isError,
  isRefreshing,
  lastUpdated,
  verificationData,
  onRefresh,
  onExport,
}: TellorHeroProps) {
  const t = useTranslations('tellor');
  const themeColor = '#06b6d4';

  const currentPrice = price?.price ?? config.marketData.change24hValue ?? 0;
  const priceChange24h = config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;

  const priceSparkline = useMemo(() => {
    if (historicalData.length > 0) {
      return historicalData.slice(-24).map((d) => d.price);
    }
    return Array.from({ length: 24 }, (_, i) => {
      const seed = (i * 9301 + 49297) % 233280;
      const random = seed / 233280;
      return currentPrice * (1 + (random - 0.5) * 0.1);
    });
  }, [historicalData, currentPrice]);

  const primaryStats: StatItem[] = [
    {
      title: t('hero.price'),
      value: `$${currentPrice.toFixed(2)}`,
      change: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      changeType: isPositive ? 'positive' : 'negative',
      icon: <Activity className="w-4 h-4" />,
      subtitle: '24h',
      sparklineData: priceSparkline,
    },
    {
      title: t('hero.marketCap'),
      value: `$${(config.marketData.marketCap / 1e6).toFixed(1)}M`,
      change: '+8.5%',
      changeType: 'positive',
      icon: <Shield className="w-4 h-4" />,
      subtitle: '30d',
    },
    {
      title: t('hero.activeReporters'),
      value: '50+',
      change: '+5.2%',
      changeType: 'positive',
      icon: <Database className="w-4 h-4" />,
      subtitle: t('hero.low'),
    },
    {
      title: t('hero.dataFeeds'),
      value: `${config.networkData.dataFeeds}+`,
      change: '+12%',
      changeType: 'positive',
      icon: <Zap className="w-4 h-4" />,
      subtitle: t('hero.now'),
    },
    {
      title: t('hero.stakedAmount'),
      value: `${(config.marketData.circulatingSupply / 1e6).toFixed(1)}M`,
      change: '+4.2%',
      changeType: 'positive',
      icon: <Wallet className="w-4 h-4" />,
      subtitle: 'TRB',
    },
  ];

  const displayVerificationData = verificationData || null;

  const secondaryStats: StatItem[] = [
    {
      title: t('hero.supportedChains'),
      value: `${config.supportedChains.length}+`,
      change: '0%',
      changeType: 'neutral',
      icon: <Globe className="w-4 h-4" />,
      subtitle: '',
    },
    {
      title: t('hero.uptime'),
      value: `${config.networkData.nodeUptime}%`,
      change: '+0.05%',
      changeType: 'positive',
      icon: <TrendingUp className="w-4 h-4" />,
      subtitle: '',
    },
    {
      title: t('hero.avgResponse'),
      value: `${config.networkData.avgResponseTime}ms`,
      change: '-5%',
      changeType: 'positive',
      icon: <Clock className="w-4 h-4" />,
      subtitle: '',
    },
    {
      title: t('hero.dataUpdate'),
      value: t('hero.now'),
      change: '',
      changeType: 'neutral',
      icon: <Server className="w-4 h-4" />,
      subtitle: '',
    },
  ];

  const healthScore = useMemo(() => {
    const uptimeScore = config.networkData.nodeUptime * 0.4;
    const responseScore = Math.max(0, 100 - config.networkData.avgResponseTime / 5) * 0.3;
    const feedScore = Math.min(100, config.networkData.dataFeeds / 5) * 0.3;
    return Math.round(uptimeScore + responseScore + feedScore);
  }, [config]);

  const miniPriceChartLabels = {
    trend24h: t('hero.trend24h'),
    before24h: `24h${t('hero.ago')}`,
    now: t('hero.now'),
  };

  const unifiedInfoLabels = {
    healthScore: t('hero.health'),
    gas: t('hero.gas'),
    response: t('hero.response'),
    online: t('hero.online'),
    support: t('hero.support'),
    chains: t('hero.chains'),
    gasLow: t('hero.low'),
    gasMedium: t('hero.medium'),
    gasHigh: t('hero.high'),
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <LiveStatusBar
            isConnected={!isError}
            latency={networkStats?.avgResponseTime || 245}
            lastUpdate={lastUpdated || undefined}
          />
          <QuickActions themeColor={themeColor} />
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}
            >
              <OptimizedImage
                src="/logos/oracles/tellor.svg"
                alt="Tellor"
                width={28}
                height={28}
                priority
                className="w-7 h-7"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Tellor</h1>
              <p className="text-xs text-gray-500">{t('subtitle')}</p>
            </div>
          </div>

          <div className="hidden lg:block">
            <ActionButtons
              onRefresh={onRefresh}
              onExport={onExport}
              isRefreshing={isRefreshing}
              themeColor={themeColor}
            />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          <div className="flex-1 lg:w-[70%] lg:flex-none">
            <EnhancedCoreStats
              stats={primaryStats}
              themeColor={themeColor}
              verificationData={displayVerificationData ?? undefined}
            />

            <CompactMetricsRow stats={secondaryStats} />

            <UnifiedInfoSection
              networkStats={networkStats}
              healthScore={healthScore}
              chains={config.supportedChains}
              themeColor={themeColor}
              labels={unifiedInfoLabels}
            />
          </div>

          <div className="hidden lg:block w-px bg-gray-200 self-stretch" />

          <div className="lg:w-[30%] flex flex-col gap-3">
            <div className="lg:hidden">
              <ActionButtons
                onRefresh={onRefresh}
                onExport={onExport}
                isRefreshing={isRefreshing}
                themeColor={themeColor}
              />
            </div>

            <div className="p-3 rounded-xl bg-gray-50/50 border border-gray-100 flex-1">
              <MiniPriceChart
                historicalData={historicalData}
                currentPrice={price}
                themeColor={themeColor}
                labels={miniPriceChartLabels}
              />
            </div>
          </div>
        </div>
      </div>

      <LatestUpdates themeColor={themeColor} />
    </div>
  );
}

export default TellorHero;
