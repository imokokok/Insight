'use client';

import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertCircle,
  Info,
  BarChart3,
  Zap,
  Clock,
  Droplets,
  Building2,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

// Fixed base timestamp for deterministic mock data
const BASE_TIMESTAMP = 1704067200000; // 2024-01-01 00:00:00 UTC

export interface DeviationDataSource {
  name: string;
  price: number;
  deviation: number;
  deviationDirection: 'up' | 'down' | 'neutral';
  lastUpdate: string;
  reliability: number;
}

export interface DeviationHistoryPoint {
  timestamp: number;
  deviation: number;
}

export interface DeviationStats {
  maxDeviation: number;
  avgDeviation: number;
  minDeviation: number;
  deviationCount: number;
}

export interface DeviationFactor {
  name: string;
  impact: number;
  description: string;
  status: 'low' | 'medium' | 'high';
  type?: 'market' | 'update' | 'liquidity' | 'other';
}

export interface DeviationImpact {
  affectedVaults: number;
  liquidationRisk: 'low' | 'medium' | 'high';
  arbitrageOpportunity: boolean;
  potentialProfit: number;
}

export interface DeviationData {
  chroniclePrice: number;
  sources: DeviationDataSource[];
  history: DeviationHistoryPoint[];
  stats: DeviationStats;
  factors: DeviationFactor[];
  impact: DeviationImpact;
}

export interface ChroniclePriceDeviationViewProps {
  deviationData: DeviationData | null;
  symbol: string;
  isLoading?: boolean;
}

export function ChroniclePriceDeviationView({
  deviationData,
  symbol,
  isLoading,
}: ChroniclePriceDeviationViewProps) {
  const t = useTranslations();

  const defaultData: DeviationData = {
    chroniclePrice: 2000.45,
    sources: [
      {
        name: 'Chainlink',
        price: 2001.23,
        deviation: 0.039,
        deviationDirection: 'down',
        lastUpdate: '12s ago',
        reliability: 99.8,
      },
      {
        name: 'Pyth',
        price: 1999.87,
        deviation: 0.029,
        deviationDirection: 'up',
        lastUpdate: '8s ago',
        reliability: 99.5,
      },
      {
        name: 'Uniswap V3',
        price: 2002.15,
        deviation: 0.085,
        deviationDirection: 'down',
        lastUpdate: '3s ago',
        reliability: 97.2,
      },
    ],
    history: [
      { timestamp: BASE_TIMESTAMP - 86400000, deviation: 0.05 },
      { timestamp: BASE_TIMESTAMP - 82800000, deviation: 0.12 },
      { timestamp: BASE_TIMESTAMP - 79200000, deviation: 0.08 },
      { timestamp: BASE_TIMESTAMP - 75600000, deviation: 0.15 },
      { timestamp: BASE_TIMESTAMP - 72000000, deviation: 0.22 },
      { timestamp: BASE_TIMESTAMP - 68400000, deviation: 0.18 },
      { timestamp: BASE_TIMESTAMP - 64800000, deviation: 0.11 },
      { timestamp: BASE_TIMESTAMP - 61200000, deviation: 0.06 },
      { timestamp: BASE_TIMESTAMP - 57600000, deviation: 0.09 },
      { timestamp: BASE_TIMESTAMP - 54000000, deviation: 0.14 },
      { timestamp: BASE_TIMESTAMP - 50400000, deviation: 0.19 },
      { timestamp: BASE_TIMESTAMP - 46800000, deviation: 0.25 },
      { timestamp: BASE_TIMESTAMP - 43200000, deviation: 0.21 },
      { timestamp: BASE_TIMESTAMP - 39600000, deviation: 0.16 },
      { timestamp: BASE_TIMESTAMP - 36000000, deviation: 0.12 },
      { timestamp: BASE_TIMESTAMP - 32400000, deviation: 0.08 },
      { timestamp: BASE_TIMESTAMP - 28800000, deviation: 0.05 },
      { timestamp: BASE_TIMESTAMP - 25200000, deviation: 0.07 },
      { timestamp: BASE_TIMESTAMP - 21600000, deviation: 0.11 },
      { timestamp: BASE_TIMESTAMP - 18000000, deviation: 0.09 },
      { timestamp: BASE_TIMESTAMP - 14400000, deviation: 0.06 },
      { timestamp: BASE_TIMESTAMP - 10800000, deviation: 0.04 },
      { timestamp: BASE_TIMESTAMP - 7200000, deviation: 0.03 },
      { timestamp: BASE_TIMESTAMP - 3600000, deviation: 0.05 },
      { timestamp: BASE_TIMESTAMP, deviation: 0.04 },
    ],
    stats: {
      maxDeviation: 0.25,
      avgDeviation: 0.11,
      minDeviation: 0.03,
      deviationCount: 156,
    },
    factors: [
      {
        name: t('chronicle.priceDeviation.marketVolatility'),
        impact: 35,
        description: t('chronicle.priceDeviation.marketVolatilityDesc'),
        status: 'medium',
      },
      {
        name: t('chronicle.priceDeviation.updateDelay'),
        impact: 45,
        description: t('chronicle.priceDeviation.updateDelayDesc'),
        status: 'high',
      },
      {
        name: t('chronicle.priceDeviation.liquidityIssue'),
        impact: 20,
        description: t('chronicle.priceDeviation.liquidityIssueDesc'),
        status: 'low',
      },
    ],
    impact: {
      affectedVaults: 12,
      liquidationRisk: 'low',
      arbitrageOpportunity: true,
      potentialProfit: 2450,
    },
  };

  const data = deviationData || defaultData;

  const getDeviationColor = (deviation: number) => {
    if (deviation <= 0.05) return 'text-emerald-600';
    if (deviation <= 0.15) return 'text-amber-600';
    return 'text-red-600';
  };

  const getDeviationBgColor = (deviation: number) => {
    if (deviation <= 0.05) return 'bg-emerald-500';
    if (deviation <= 0.15) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getDeviationBgLight = (deviation: number) => {
    if (deviation <= 0.05) return 'bg-emerald-100';
    if (deviation <= 0.15) return 'bg-amber-100';
    return 'bg-red-100';
  };

  const getStatusColor = (status: 'low' | 'medium' | 'high') => {
    switch (status) {
      case 'low':
        return 'text-emerald-600 bg-emerald-100';
      case 'medium':
        return 'text-amber-600 bg-amber-100';
      case 'high':
        return 'text-red-600 bg-red-100';
    }
  };

  const getRiskColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low':
        return 'text-emerald-600';
      case 'medium':
        return 'text-amber-600';
      case 'high':
        return 'text-red-600';
    }
  };

  const getRiskBgColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low':
        return 'bg-emerald-100';
      case 'medium':
        return 'bg-amber-100';
      case 'high':
        return 'bg-red-100';
    }
  };

  const getDirectionIcon = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-emerald-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const maxHistoryDeviation = Math.max(...data.history.map((h) => h.deviation));

  return (
    <div className="space-y-8">
      {/* 实时偏差展示 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-medium text-gray-900">
              {t('chronicle.priceDeviation.realtimeTitle')}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {t('chronicle.priceDeviation.realtimeDesc')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-1">{symbol}</p>
            <p className="text-2xl font-bold text-gray-900">
              ${data.chroniclePrice.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">{t('chronicle.priceDeviation.chroniclePrice')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.sources.map((source, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {source.name === 'Chainlink' && <Building2 className="w-4 h-4 text-blue-600" />}
                  {source.name === 'Pyth' && <Zap className="w-4 h-4 text-purple-600" />}
                  {source.name === 'Uniswap V3' && <Droplets className="w-4 h-4 text-pink-600" />}
                  <span className="text-sm font-medium text-gray-900">{source.name}</span>
                </div>
                {getDirectionIcon(source.deviationDirection)}
              </div>

              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xl font-semibold text-gray-900">
                  ${source.price.toLocaleString()}
                </span>
                <span className={`text-sm font-medium ${getDeviationColor(source.deviation)}`}>
                  {source.deviationDirection === 'down' ? '-' : '+'}
                  {(source.deviation * 100).toFixed(2)}%
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {source.lastUpdate}
                </span>
                <span>
                  {source.reliability}% {t('chronicle.priceDeviation.reliability')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 偏差历史趋势图表 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-gray-900">
            {t('chronicle.priceDeviation.historyTitle')}
          </h3>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {t('chronicle.priceDeviation.deviation')}
            </span>
          </div>
        </div>

        <div className="h-40 flex items-end gap-1">
          {data.history.map((point, index) => {
            const height = (point.deviation / maxHistoryDeviation) * 100;
            return (
              <div
                key={index}
                className={`flex-1 rounded-t transition-colors ${getDeviationBgColor(point.deviation)}`}
                style={{ height: `${Math.max(height, 5)}%`, opacity: 0.7 }}
                title={`${(point.deviation * 100).toFixed(2)}%`}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>{t('chronicle.hero.24hAgo')}</span>
          <span>18h</span>
          <span>12h</span>
          <span>6h</span>
          <span>{t('chronicle.hero.now')}</span>
        </div>
      </div>

      {/* 偏差统计 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-4 rounded-lg bg-gray-50">
          <p className="text-sm text-gray-500 mb-1">{t('chronicle.priceDeviation.maxDeviation')}</p>
          <p className={`text-2xl font-semibold ${getDeviationColor(data.stats.maxDeviation)}`}>
            {data.stats.maxDeviation}%
          </p>
        </div>
        <div className="p-4 rounded-lg bg-gray-50">
          <p className="text-sm text-gray-500 mb-1">{t('chronicle.priceDeviation.avgDeviation')}</p>
          <p className={`text-2xl font-semibold ${getDeviationColor(data.stats.avgDeviation)}`}>
            {data.stats.avgDeviation}%
          </p>
        </div>
        <div className="p-4 rounded-lg bg-gray-50">
          <p className="text-sm text-gray-500 mb-1">{t('chronicle.priceDeviation.minDeviation')}</p>
          <p className={`text-2xl font-semibold ${getDeviationColor(data.stats.minDeviation)}`}>
            {data.stats.minDeviation}%
          </p>
        </div>
        <div className="p-4 rounded-lg bg-gray-50">
          <p className="text-sm text-gray-500 mb-1">
            {t('chronicle.priceDeviation.deviationCount')}
          </p>
          <p className="text-2xl font-semibold text-gray-900">{data.stats.deviationCount}</p>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 偏差原因分析 */}
      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('chronicle.priceDeviation.analysisTitle')}
        </h3>
        <div className="space-y-4">
          {data.factors.map((factor, index) => (
            <div key={index} className="p-4 rounded-lg border border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getStatusColor(factor.status)}`}>
                    {factor.type === 'market' && <BarChart3 className="w-4 h-4" />}
                    {factor.type === 'update' && <Clock className="w-4 h-4" />}
                    {factor.type === 'liquidity' && <Droplets className="w-4 h-4" />}
                    {(!factor.type || factor.type === 'other') && <Info className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{factor.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{factor.description}</p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(factor.status)}`}
                >
                  {factor.impact}%
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full">
                <div
                  className={`h-2 rounded-full transition-all ${
                    factor.status === 'low'
                      ? 'bg-emerald-500'
                      : factor.status === 'medium'
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${factor.impact}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 偏差影响评估 */}
      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('chronicle.priceDeviation.impactTitle')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 影响的金库数量 */}
          <div className="p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">
                  {t('chronicle.priceDeviation.affectedVaults')}
                </p>
                <p className="text-2xl font-semibold text-gray-900">{data.impact.affectedVaults}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">{t('chronicle.priceDeviation.vaultsDesc')}</p>
          </div>

          {/* 清算风险评估 */}
          <div className="p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${getRiskBgColor(data.impact.liquidationRisk)}`}>
                <AlertTriangle className={`w-5 h-5 ${getRiskColor(data.impact.liquidationRisk)}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">
                  {t('chronicle.priceDeviation.liquidationRisk')}
                </p>
                <p
                  className={`text-xl font-semibold capitalize ${getRiskColor(data.impact.liquidationRisk)}`}
                >
                  {data.impact.liquidationRisk === 'low'
                    ? t('chronicle.risk.lowRisk')
                    : data.impact.liquidationRisk === 'medium'
                      ? t('chronicle.risk.mediumRisk')
                      : t('chronicle.risk.highRisk')}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {t('chronicle.priceDeviation.liquidationRiskDesc')}
            </p>
          </div>

          {/* 套利机会提示 */}
          <div className="p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`p-2 rounded-lg ${data.impact.arbitrageOpportunity ? 'bg-emerald-100' : 'bg-gray-100'}`}
              >
                <Zap
                  className={`w-5 h-5 ${data.impact.arbitrageOpportunity ? 'text-emerald-600' : 'text-gray-400'}`}
                />
              </div>
              <div>
                <p className="text-xs text-gray-500">
                  {t('chronicle.priceDeviation.arbitrageOpportunity')}
                </p>
                <p
                  className={`text-xl font-semibold ${data.impact.arbitrageOpportunity ? 'text-emerald-600' : 'text-gray-400'}`}
                >
                  {data.impact.arbitrageOpportunity
                    ? t('chronicle.priceDeviation.available')
                    : t('chronicle.priceDeviation.unavailable')}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500">{t('chronicle.priceDeviation.arbitrageDesc')}</p>
          </div>

          {/* 潜在收益 */}
          <div className="p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`p-2 rounded-lg ${data.impact.arbitrageOpportunity ? 'bg-purple-100' : 'bg-gray-100'}`}
              >
                <BarChart3
                  className={`w-5 h-5 ${data.impact.arbitrageOpportunity ? 'text-purple-600' : 'text-gray-400'}`}
                />
              </div>
              <div>
                <p className="text-xs text-gray-500">
                  {t('chronicle.priceDeviation.potentialProfit')}
                </p>
                <p
                  className={`text-xl font-semibold ${data.impact.arbitrageOpportunity ? 'text-purple-600' : 'text-gray-400'}`}
                >
                  ${data.impact.potentialProfit.toLocaleString()}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500">{t('chronicle.priceDeviation.profitDesc')}</p>
          </div>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 偏差分布统计 */}
      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('chronicle.priceDeviation.distributionTitle')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-4 p-4 rounded-lg bg-emerald-50">
            <div className="p-3 rounded-full bg-emerald-100">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('chronicle.priceDeviation.normalRange')}</p>
              <p className="text-2xl font-semibold text-emerald-600">68%</p>
              <p className="text-xs text-gray-500">{t('chronicle.priceDeviation.timeSpent')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-lg bg-amber-50">
            <div className="p-3 rounded-full bg-amber-100">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('chronicle.priceDeviation.moderateRange')}</p>
              <p className="text-2xl font-semibold text-amber-600">27%</p>
              <p className="text-xs text-gray-500">{t('chronicle.priceDeviation.timeSpent')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-lg bg-red-50">
            <div className="p-3 rounded-full bg-red-100">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('chronicle.priceDeviation.highRange')}</p>
              <p className="text-2xl font-semibold text-red-600">5%</p>
              <p className="text-xs text-gray-500">{t('chronicle.priceDeviation.timeSpent')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 套利机会详情 */}
      {data.impact.arbitrageOpportunity && (
        <>
          <div className="border-t border-gray-200" />
          <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <Zap className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-900">
                    {t('chronicle.priceDeviation.arbitrageAlert')}
                  </p>
                  <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                    {t('chronicle.priceDeviation.active')}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-3">
                  {t('chronicle.priceDeviation.arbitrageDetail')}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">
                    {t('chronicle.priceDeviation.buyAt')}: $2,000.45
                  </span>
                  <ArrowRight className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-500">
                    {t('chronicle.priceDeviation.sellAt')}: $2,002.15
                  </span>
                  <span className="ml-2 text-emerald-600 font-medium">
                    +${data.impact.potentialProfit.toLocaleString()}{' '}
                    {t('chronicle.priceDeviation.potential')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 信息提示 */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-gray-900 mb-1">
            {t('chronicle.priceDeviation.infoTitle')}
          </p>
          <p className="text-xs text-gray-600">{t('chronicle.priceDeviation.infoDesc')}</p>
        </div>
      </div>
    </div>
  );
}
