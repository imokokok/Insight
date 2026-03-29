'use client';

import { useState } from 'react';

import {
  Shield,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Lock,
  Server,
  Users,
  FileText,
  ChevronRight,
  CheckCircle,
  Info,
  ExternalLink,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type TellorRiskViewProps } from '../types';

interface RiskMetric {
  category: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  description: string;
}

const riskMetrics: RiskMetric[] = [
  {
    category: 'Smart Contract Risk',
    score: 85,
    trend: 'stable',
    description: 'Well-audited contracts with no major vulnerabilities',
  },
  {
    category: 'Oracle Risk',
    score: 78,
    trend: 'up',
    description: 'Diversified data sources with strong anti-manipulation',
  },
  {
    category: 'Centralization Risk',
    score: 72,
    trend: 'down',
    description: 'Decentralized reporter network with some concentration',
  },
  {
    category: 'Liquidity Risk',
    score: 88,
    trend: 'up',
    description: 'Sufficient market liquidity and trading depth',
  },
];

const securityEvents = [
  {
    date: '2024-01-15',
    title: 'Tellor Layer Mainnet Launch',
    description: 'Successful migration to dedicated Tellor Layer blockchain',
    type: 'positive',
  },
  {
    date: '2024-02-01',
    title: 'Dispute Resolution Optimization',
    description: 'Improved dispute mechanism with faster resolution',
    type: 'positive',
  },
  {
    date: '2024-02-20',
    title: 'Staking Contract V2',
    description: 'Upgraded staking contract with better reward distribution',
    type: 'positive',
  },
];

const mitigationMeasures = [
  {
    title: 'Dispute Mechanism',
    description: 'Robust dispute resolution to ensure data accuracy',
    icon: Shield,
  },
  {
    title: 'Staking Slashing',
    description: 'Economic incentives to discourage malicious behavior',
    icon: Lock,
  },
  {
    title: 'Multi-Source Data',
    description: 'Aggregation from multiple sources for reliability',
    icon: Server,
  },
  {
    title: 'Decentralized Governance',
    description: 'Community-driven decision making process',
    icon: Users,
  },
];

export function TellorRiskView({ risk, isLoading }: TellorRiskViewProps) {
  const t = useTranslations('tellor');
  const [selectedMetric, setSelectedMetric] = useState<RiskMetric | null>(null);

  const overallScore = Math.round(
    riskMetrics.reduce((sum, m) => sum + m.score, 0) / riskMetrics.length
  );

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-8">
      {/* 总体风险评估 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-medium text-gray-900 mb-4">
            {t('risk.overallLevel')}
          </h3>
          <div className="flex items-center gap-8">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke={overallScore >= 80 ? '#10b981' : overallScore >= 60 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="12"
                  strokeDasharray={`${(overallScore / 100) * 351.86} 351.86`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <span className={`text-3xl font-bold ${getScoreColor(overallScore)}`}>
                    {overallScore}
                  </span>
                  <span className="text-xs text-gray-400 block">/100</span>
                </div>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    overallScore >= 80
                      ? 'bg-emerald-100 text-emerald-800'
                      : overallScore >= 60
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {overallScore >= 80 ? t('risk.lowRisk') : overallScore >= 60 ? t('risk.mediumRisk') : t('risk.highRisk')}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {t('risk.basedOnMetrics')}
              </p>
              <div className="flex flex-wrap gap-2">
                {riskMetrics.map((metric, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedMetric(metric)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedMetric?.category === metric.category
                        ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {metric.category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 风险指标详情 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-medium text-gray-900 mb-4">
            {t('risk.categories')}
          </h3>
          <div className="space-y-4">
            {riskMetrics.map((metric, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => setSelectedMetric(metric)}
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{metric.category}</p>
                  <p className="text-xs text-gray-500">{metric.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-semibold ${getScoreColor(metric.score)}`}>
                    {metric.score}
                  </span>
                  {metric.trend === 'up' ? (
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  ) : metric.trend === 'down' ? (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  ) : (
                    <Activity className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 安全事件时间线 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('risk.securityEvents')}
        </h3>
        <div className="space-y-4">
          {securityEvents.map((event, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full ${
                    event.type === 'positive' ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                />
                {index < securityEvents.length - 1 && (
                  <div className="w-px h-full bg-gray-200 mt-1" />
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-400">{event.date}</span>
                  {event.type === 'positive' ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  )}
                </div>
                <h4 className="text-sm font-medium text-gray-900">{event.title}</h4>
                <p className="text-xs text-gray-500 mt-1">{event.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 风险缓解措施 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('risk.mitigationMeasures')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mitigationMeasures.map((measure, index) => {
            const Icon = measure.icon;
            return (
              <div
                key={index}
                className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="p-2 rounded-lg bg-white">
                  <Icon className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{measure.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">{measure.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 免责声明 */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-amber-800">{t('risk.disclaimer')}</h4>
          <p className="text-xs text-amber-700 mt-1">
            {t('risk.disclaimerText')}
          </p>
        </div>
      </div>
    </div>
  );
}
