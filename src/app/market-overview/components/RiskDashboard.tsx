'use client';

import { useI18n } from '@/lib/i18n/provider';
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
  const { locale } = useI18n();

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">
            {locale === 'zh-CN' ? '风险指标' : 'Risk Metrics'}
          </h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">
            {locale === 'zh-CN' ? '风险指标' : 'Risk Metrics'}
          </h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          {locale === 'zh-CN' ? '暂无风险数据' : 'No risk data available'}
        </div>
      </div>
    );
  }

  const getRiskLabel = (level: RiskLevel): string => {
    const labels: Record<RiskLevel, string> = {
      low: locale === 'zh-CN' ? '低风险' : 'Low Risk',
      medium: locale === 'zh-CN' ? '中等风险' : 'Medium Risk',
      high: locale === 'zh-CN' ? '高风险' : 'High Risk',
      critical: locale === 'zh-CN' ? '极高风险' : 'Critical Risk',
    };
    return labels[level];
  };

  const getHHIStatus = (value: number): { label: string; color: string } => {
    if (value < 1500) {
      return {
        label: locale === 'zh-CN' ? '竞争型市场' : 'Competitive Market',
        color: semanticColors.success.main,
      };
    } else if (value < 2500) {
      return {
        label: locale === 'zh-CN' ? '中度集中' : 'Moderate Concentration',
        color: semanticColors.warning.main,
      };
    } else if (value < 3500) {
      return {
        label: locale === 'zh-CN' ? '高度集中' : 'High Concentration',
        color: semanticColors.danger.main,
      };
    } else {
      return {
        label: locale === 'zh-CN' ? '垄断型市场' : 'Monopoly Market',
        color: semanticColors.info.dark,
      };
    }
  };

  const hhiStatus = getHHIStatus(data.hhi.value);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            {locale === 'zh-CN' ? '风险指标' : 'Risk Metrics'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {locale === 'zh-CN' ? '综合风险:' : 'Overall Risk:'}
          </span>
          <span
            className="px-2 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: `${getRiskLevelColor(data.overallRisk.level)}20`,
              color: getRiskLevelColor(data.overallRisk.level),
            }}
          >
            {getRiskLabel(data.overallRisk.level)} ({data.overallRisk.score})
          </span>
        </div>
      </div>

      {/* 风险指标卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* HHI 指数 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <PieChart className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              {locale === 'zh-CN' ? 'HHI 指数' : 'HHI Index'}
            </span>
          </div>
          <div className="mb-2">
            <span className="text-2xl font-bold text-gray-900">{data.hhi.value}</span>
          </div>
          <div className="space-y-2">
            <div
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
              style={{ backgroundColor: `${hhiStatus.color}20`, color: hhiStatus.color }}
            >
              {hhiStatus.label}
            </div>
            <div className="text-xs text-gray-500">
              CR4: {data.hhi.concentrationRatio.toFixed(1)}%
            </div>
          </div>
          {/* 进度条 */}
          <div className="mt-3">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
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
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              {locale === 'zh-CN' ? '多元化评分' : 'Diversification'}
            </span>
          </div>
          <div className="mb-2">
            <span className="text-2xl font-bold text-gray-900">{data.diversification.score}</span>
            <span className="text-sm text-gray-500">/100</span>
          </div>
          <div
            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mb-3"
            style={{
              backgroundColor: `${getRiskLevelColor(data.diversification.level)}20`,
              color: getRiskLevelColor(data.diversification.level),
            }}
          >
            {getRiskLabel(data.diversification.level)}
          </div>
          {/* 因素分解 */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">{locale === 'zh-CN' ? '链多样性' : 'Chains'}</span>
              <span className="font-medium">{data.diversification.factors.chainDiversity}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">
                {locale === 'zh-CN' ? '协议多样性' : 'Protocols'}
              </span>
              <span className="font-medium">{data.diversification.factors.protocolDiversity}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{locale === 'zh-CN' ? '资产多样性' : 'Assets'}</span>
              <span className="font-medium">{data.diversification.factors.assetDiversity}%</span>
            </div>
          </div>
        </div>

        {/* 波动率指数 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              {locale === 'zh-CN' ? '波动率指数' : 'Volatility Index'}
            </span>
          </div>
          <div className="mb-2">
            <span className="text-2xl font-bold text-gray-900">{data.volatility.index}</span>
          </div>
          <div
            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mb-3"
            style={{
              backgroundColor: `${getRiskLevelColor(data.volatility.level)}20`,
              color: getRiskLevelColor(data.volatility.level),
            }}
          >
            {getRiskLabel(data.volatility.level)}
          </div>
          {/* 波动率详情 */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">
                {locale === 'zh-CN' ? '年化波动率' : 'Annualized'}
              </span>
              <span className="font-medium">
                {(data.volatility.annualizedVolatility * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{locale === 'zh-CN' ? '日波动率' : 'Daily'}</span>
              <span className="font-medium">
                {(data.volatility.dailyVolatility * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* 相关性风险 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              {locale === 'zh-CN' ? '相关性风险' : 'Correlation Risk'}
            </span>
          </div>
          <div className="mb-2">
            <span className="text-2xl font-bold text-gray-900">{data.correlationRisk.score}</span>
            <span className="text-sm text-gray-500">/100</span>
          </div>
          <div
            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mb-3"
            style={{
              backgroundColor: `${getRiskLevelColor(data.correlationRisk.level)}20`,
              color: getRiskLevelColor(data.correlationRisk.level),
            }}
          >
            {getRiskLabel(data.correlationRisk.level)}
          </div>
          {/* 相关性详情 */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">
                {locale === 'zh-CN' ? '平均相关性' : 'Avg Correlation'}
              </span>
              <span className="font-medium">
                {(data.correlationRisk.avgCorrelation * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">
                {locale === 'zh-CN' ? '高相关对' : 'High Corr Pairs'}
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
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">
              {locale === 'zh-CN' ? '市场集中度风险警告' : 'Market Concentration Risk Warning'}
            </p>
            <p className="text-xs text-red-600 mt-1">
              {locale === 'zh-CN'
                ? `HHI 指数为 ${data.hhi.value}，表明市场高度集中。前4大企业占据 ${data.hhi.concentrationRatio}% 的市场份额，存在系统性风险。`
                : `HHI index is ${data.hhi.value}, indicating high market concentration. Top 4 players control ${data.hhi.concentrationRatio}% market share, posing systemic risk.`}
            </p>
          </div>
        </div>
      )}

      {data.diversification.score < 40 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              {locale === 'zh-CN' ? '多元化不足警告' : 'Diversification Warning'}
            </p>
            <p className="text-xs text-amber-600 mt-1">
              {locale === 'zh-CN'
                ? '多元化评分较低，建议增加链、协议和资产的多样性以降低风险。'
                : 'Diversification score is low. Consider increasing diversity across chains, protocols, and assets to reduce risk.'}
            </p>
          </div>
        </div>
      )}

      {/* 更新时间 */}
      <div className="mt-4 text-xs text-gray-400 text-right">
        {locale === 'zh-CN' ? '更新于: ' : 'Updated: '}
        {new Date(data.overallRisk.timestamp).toLocaleString(
          locale === 'zh-CN' ? 'zh-CN' : 'en-US'
        )}
      </div>
    </div>
  );
}
