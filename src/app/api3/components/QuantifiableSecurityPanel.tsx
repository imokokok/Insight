'use client';

import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { API3Client, StakingData } from '@/lib/oracles/api3';
import { useI18n } from '@/lib/i18n/context';

const api3Client = new API3Client();

export function QuantifiableSecurityPanel() {
  const { t } = useI18n();
  const [data, setData] = useState<StakingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const stakingData = await api3Client.getStakingData();
        setData(stakingData);
      } catch (error) {
        console.error('Error fetching staking data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // 安全评分数据
  const securityScores = [
    { subject: t('api3.security.decentralization'), A: 85, fullMark: 100 },
    { subject: t('api3.security.dataIntegrity'), A: 92, fullMark: 100 },
    { subject: t('api3.security.manipulationResistance'), A: 88, fullMark: 100 },
    { subject: t('api3.security.economicSecurity'), A: 90, fullMark: 100 },
    { subject: t('api3.security.transparency'), A: 95, fullMark: 100 },
    { subject: t('api3.security.coverage'), A: 82, fullMark: 100 },
  ];

  // 计算总体安全评分
  const overallScore = Math.round(
    securityScores.reduce((acc, item) => acc + item.A, 0) / securityScores.length
  );

  // 获取评分等级
  const getScoreLevel = (score: number) => {
    if (score >= 90)
      return {
        label: t('api3.security.excellent'),
        color: 'text-green-600',
        bgColor: 'bg-green-100',
      };
    if (score >= 80)
      return { label: t('api3.security.good'), color: 'text-blue-600', bgColor: 'bg-blue-100' };
    if (score >= 70)
      return { label: t('api3.security.fair'), color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { label: t('api3.security.poor'), color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  const scoreLevel = getScoreLevel(overallScore);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-400">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{t('api3.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 总体安全评分 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#1E40AF"
                  strokeWidth="8"
                  strokeDasharray={`${overallScore * 2.83} 283`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-900">{overallScore}</span>
                <span className="text-xs text-gray-500">/100</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('api3.security.overallScore')}
              </h3>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${scoreLevel.bgColor} ${scoreLevel.color}`}
              >
                {scoreLevel.label}
              </span>
              <p className="text-sm text-gray-500 mt-2 max-w-md">
                {t('api3.security.scoreDescription')}
              </p>
            </div>
          </div>

          {/* 雷达图 */}
          <div className="h-64 w-full md:w-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={securityScores}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                <Radar
                  name={t('api3.security.securityScore')}
                  dataKey="A"
                  stroke="#1E40AF"
                  fill="#1E40AF"
                  fillOpacity={0.3}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 保险池和质押信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 保险池状态 */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">{t('api3.security.coveragePool')}</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">{t('api3.security.totalCoverage')}</span>
              <span className="text-lg font-semibold text-gray-900">
                ${(data.coveragePool.totalValue / 1000000).toFixed(2)}M
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">{t('api3.security.coverageRatio')}</span>
              <span className="text-lg font-semibold text-blue-600">
                {(data.coveragePool.coverageRatio * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-500">{t('api3.security.historicalPayouts')}</span>
              <span className="text-lg font-semibold text-gray-900">
                ${(data.coveragePool.historicalPayouts / 1000).toFixed(1)}K
              </span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700">{t('api3.security.coverageDescription')}</p>
          </div>
        </div>

        {/* 质押安全分析 */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">{t('api3.security.stakingAnalysis')}</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">{t('api3.security.totalStaked')}</span>
              <span className="text-lg font-semibold text-gray-900">
                {(data.totalStaked / 1000000).toFixed(1)}M API3
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">{t('api3.security.stakingApr')}</span>
              <span className="text-lg font-semibold text-green-600">{data.stakingApr}%</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-500">{t('api3.security.stakerCount')}</span>
              <span className="text-lg font-semibold text-gray-900">
                {data.stakerCount.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-green-700">{t('api3.security.stakingDescription')}</p>
          </div>
        </div>
      </div>

      {/* 安全特性 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-900 mb-4">{t('api3.security.features')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: '🔒',
              title: t('api3.security.features.firstParty'),
              desc: t('api3.security.features.firstPartyDesc'),
            },
            {
              icon: '🛡️',
              title: t('api3.security.features.coverage'),
              desc: t('api3.security.features.coverageDesc'),
            },
            {
              icon: '⚡',
              title: t('api3.security.features.slash'),
              desc: t('api3.security.features.slashDesc'),
            },
            {
              icon: '📊',
              title: t('api3.security.features.quantifiable'),
              desc: t('api3.security.features.quantifiableDesc'),
            },
            {
              icon: '🏛️',
              title: t('api3.security.features.governance'),
              desc: t('api3.security.features.governanceDesc'),
            },
            {
              icon: '🔍',
              title: t('api3.security.features.transparent'),
              desc: t('api3.security.features.transparentDesc'),
            },
          ].map((feature, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-2xl">{feature.icon}</span>
              <div>
                <h4 className="font-medium text-gray-900 text-sm">{feature.title}</h4>
                <p className="text-xs text-gray-500 mt-1">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
