'use client';

import { useLocale } from 'next-intl';
import { isChineseLocale } from '@/i18n/routing';
import { RiskMetrics, RiskLevel } from '../types';
import { getRiskLevelColor } from '@/lib/analytics/riskMetrics';
import {
  AlertTriangle,
  Shield,
  TrendingUp,
  Activity,
  PieChart,
  BarChart3,
  Info,
} from 'lucide-react';
import { semanticColors } from '@/lib/config/colors';

interface RiskDashboardProps {
  data: RiskMetrics | null;
  loading?: boolean;
}

export default function RiskDashboard({ data, loading }: RiskDashboardProps) {
  const locale = useLocale();

  if (loading) {
    return (
      <div className="py-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">
            {isChineseLocale(locale) ? '风险指标' : 'Risk Metrics'}
          </h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-gray-50 h-24 border border-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">
            {isChineseLocale(locale) ? '风险指标' : 'Risk Metrics'}
          </h3>
        </div>
        <div className="text-center py-6 text-gray-500 text-sm">
          {isChineseLocale(locale) ? '暂无风险数据' : 'No risk data available'}
        </div>
      </div>
    );
  }

  const getRiskLabel = (level: RiskLevel): string => {
    const labels: Record<RiskLevel, string> = {
      low: isChineseLocale(locale) ? '低风险' : 'Low Risk',
      medium: isChineseLocale(locale) ? '中等风险' : 'Medium Risk',
      high: isChineseLocale(locale) ? '高风险' : 'High Risk',
      critical: isChineseLocale(locale) ? '极高风险' : 'Critical Risk',
    };
    return labels[level];
  };

  const getHHIStatus = (value: number): { label: string; color: string } => {
    if (value < 1500) {
      return {
        label: isChineseLocale(locale) ? '竞争型市场' : 'Competitive Market',
        color: semanticColors.success.main,
      };
    } else if (value < 2500) {
      return {
        label: isChineseLocale(locale) ? '中度集中' : 'Moderate Concentration',
        color: semanticColors.warning.main,
      };
    } else if (value < 3500) {
      return {
        label: isChineseLocale(locale) ? '高度集中' : 'High Concentration',
        color: semanticColors.danger.main,
      };
    } else {
      return {
        label: isChineseLocale(locale) ? '垄断型市场' : 'Monopoly Market',
        color: semanticColors.info.dark,
      };
    }
  };

  const hhiStatus = getHHIStatus(data.hhi.value);

  return (
    <div className="py-4 border-b border-gray-100">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-900">
            {isChineseLocale(locale) ? '风险指标' : 'Risk Metrics'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {isChineseLocale(locale) ? '综合风险:' : 'Overall Risk:'}
          </span>
          <span
            className="px-2 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: `${getRiskLevelColor(data.overallRisk.level)}15`,
              color: getRiskLevelColor(data.overallRisk.level),
            }}
          >
            {getRiskLabel(data.overallRisk.level)} ({data.overallRisk.score})
          </span>
        </div>
      </div>

      {/* 风险指标卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* HHI 指数 */}
        <div className="py-3 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <PieChart className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs text-gray-700">
              {isChineseLocale(locale) ? 'HHI 指数' : 'HHI Index'}
            </span>
          </div>
          <div className="mb-1">
            <span className="text-xl font-semibold text-gray-900">{data.hhi.value}</span>
          </div>
          <div className="space-y-1.5">
            <div
              className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: `${hhiStatus.color}15`, color: hhiStatus.color }}
            >
              {hhiStatus.label}
            </div>
            <div className="text-xs text-gray-500">
              CR4: {data.hhi.concentrationRatio.toFixed(1)}%
            </div>
          </div>
          {/* 进度条 */}
          <div className="mt-2">
            <div className="h-1.5 bg-gray-100 overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${Math.min((data.hhi.value / 5000) * 100, 100)}%`,
                  backgroundColor: hhiStatus.color,
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0</span>
              <span>2500</span>
              <span>5000+</span>
            </div>
          </div>
        </div>

        {/* 多元化评分 */}
        <div className="py-3 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs text-gray-700">
              {isChineseLocale(locale) ? '多元化评分' : 'Diversification'}
            </span>
          </div>
          <div className="mb-1">
            <span className="text-xl font-semibold text-gray-900">
              {data.diversification.score}
            </span>
            <span className="text-xs text-gray-500">/100</span>
          </div>
          <div
            className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium mb-2"
            style={{
              backgroundColor: `${getRiskLevelColor(data.diversification.level)}15`,
              color: getRiskLevelColor(data.diversification.level),
            }}
          >
            {getRiskLabel(data.diversification.level)}
          </div>
          {/* 因素分解 */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">{isChineseLocale(locale) ? '链多样性' : 'Chains'}</span>
              <span className="font-medium">{data.diversification.factors.chainDiversity}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">
                {isChineseLocale(locale) ? '协议多样性' : 'Protocols'}
              </span>
              <span className="font-medium">{data.diversification.factors.protocolDiversity}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{isChineseLocale(locale) ? '资产多样性' : 'Assets'}</span>
              <span className="font-medium">{data.diversification.factors.assetDiversity}%</span>
            </div>
          </div>
        </div>

        {/* 波动率指数 */}
        <div className="py-3 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs text-gray-700">
              {isChineseLocale(locale) ? '波动率指数' : 'Volatility Index'}
            </span>
          </div>
          <div className="mb-1">
            <span className="text-xl font-semibold text-gray-900">{data.volatility.index}</span>
          </div>
          <div
            className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium mb-2"
            style={{
              backgroundColor: `${getRiskLevelColor(data.volatility.level)}15`,
              color: getRiskLevelColor(data.volatility.level),
            }}
          >
            {getRiskLabel(data.volatility.level)}
          </div>
          {/* 波动率详情 */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">
                {isChineseLocale(locale) ? '年化波动率' : 'Annualized'}
              </span>
              <span className="font-medium">
                {(data.volatility.annualizedVolatility * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{isChineseLocale(locale) ? '日波动率' : 'Daily'}</span>
              <span className="font-medium">
                {(data.volatility.dailyVolatility * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* 相关性风险 */}
        <div className="py-3 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs text-gray-700">
              {isChineseLocale(locale) ? '相关性风险' : 'Correlation Risk'}
            </span>
          </div>
          <div className="mb-1">
            <span className="text-xl font-semibold text-gray-900">
              {data.correlationRisk.score}
            </span>
            <span className="text-xs text-gray-500">/100</span>
          </div>
          <div
            className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium mb-2"
            style={{
              backgroundColor: `${getRiskLevelColor(data.correlationRisk.level)}15`,
              color: getRiskLevelColor(data.correlationRisk.level),
            }}
          >
            {getRiskLabel(data.correlationRisk.level)}
          </div>
          {/* 相关性详情 */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">
                {isChineseLocale(locale) ? '平均相关性' : 'Avg Correlation'}
              </span>
              <span className="font-medium">
                {(data.correlationRisk.avgCorrelation * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">
                {isChineseLocale(locale) ? '高相关对' : 'High Corr Pairs'}
              </span>
              <span className="font-medium">
                {data.correlationRisk.highCorrelationPairs.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 风险提示 */}
      {(data.hhi.level === 'high' || data.hhi.level === 'critical') && (
        <div className="mt-3 p-2.5 bg-red-50 border-l-2 border-red-400 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-red-800">
              {isChineseLocale(locale) ? '市场集中度风险警告' : 'Market Concentration Risk Warning'}
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {isChineseLocale(locale)
                ? `HHI 指数为 ${data.hhi.value}，表明市场高度集中。前4大企业占据 ${data.hhi.concentrationRatio}% 的市场份额，存在系统性风险。`
                : `HHI index is ${data.hhi.value}, indicating high market concentration. Top 4 players control ${data.hhi.concentrationRatio}% market share, posing systemic risk.`}
            </p>
          </div>
        </div>
      )}

      {data.diversification.score < 40 && (
        <div className="mt-3 p-2.5 bg-amber-50 border-l-2 border-amber-400 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-amber-800">
              {isChineseLocale(locale) ? '多元化不足警告' : 'Diversification Warning'}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              {isChineseLocale(locale)
                ? '多元化评分较低，建议增加链、协议和资产的多样性以降低风险。'
                : 'Diversification score is low. Consider increasing diversity across chains, protocols, and assets to reduce risk.'}
            </p>
          </div>
        </div>
      )}

      {/* 更新时间 */}
      <div className="mt-3 text-xs text-gray-400 text-right">
        {isChineseLocale(locale) ? '更新于: ' : 'Updated: '}
        {new Date(data.overallRisk.timestamp).toLocaleString(
          isChineseLocale(locale) ? 'zh-CN' : 'en-US'
        )}
      </div>
    </div>
  );
}
