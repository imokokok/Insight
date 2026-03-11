'use client';

import { useMemo } from 'react';
import { DashboardCard } from './DashboardCard';
import { PriceDeviationRisk } from './PriceDeviationRisk';
import { ConcentrationRisk } from './ConcentrationRisk';
import { CrossChainRisk } from './CrossChainRisk';
import { OracleProvider } from '@/lib/types/oracle';

interface RiskScore {
  overall: number;
  priceDeviation: number;
  concentration: number;
  crossChain: number;
}

interface RiskAssessmentPanelProps {
  provider?: OracleProvider;
}

function getRiskLevel(score: number): { label: string; color: string; bgColor: string } {
  if (score >= 80) {
    return { label: '低风险', color: 'text-green-600', bgColor: 'bg-green-100' };
  } else if (score >= 60) {
    return { label: '中等风险', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
  } else if (score >= 40) {
    return { label: '较高风险', color: 'text-orange-600', bgColor: 'bg-orange-100' };
  } else {
    return { label: '高风险', color: 'text-red-600', bgColor: 'bg-red-100' };
  }
}

function RiskScoreCard({
  title,
  score,
  description,
}: {
  title: string;
  score: number;
  description: string;
}) {
  const riskLevel = getRiskLevel(score);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700">{title}</h4>
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${riskLevel.bgColor} ${riskLevel.color}`}
        >
          {riskLevel.label}
        </span>
      </div>
      <div className="flex items-end gap-2 mb-2">
        <span className={`text-3xl font-bold ${riskLevel.color}`}>{score}</span>
        <span className="text-sm text-gray-500 mb-1">/100</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${
            score >= 80
              ? 'bg-green-500'
              : score >= 60
                ? 'bg-yellow-500'
                : score >= 40
                  ? 'bg-orange-500'
                  : 'bg-red-500'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}

export function RiskAssessmentPanel({ provider }: RiskAssessmentPanelProps) {
  const riskScores: RiskScore = useMemo(() => {
    return {
      overall: 78,
      priceDeviation: 85,
      concentration: 72,
      crossChain: 76,
    };
  }, []);

  const overallRisk = getRiskLevel(riskScores.overall);

  const isPythNetwork = provider === OracleProvider.PYTH_NETWORK;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">风险评估总览</h3>
            <p className="text-sm text-gray-500 mt-1">综合评估 Oracle 网络的安全性和可靠性</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">综合风险评分</span>
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full ${overallRisk.bgColor} ${overallRisk.color}`}
              >
                {overallRisk.label}
              </span>
            </div>
            <div className="flex items-end justify-end gap-1 mt-2">
              <span className={`text-4xl font-bold ${overallRisk.color}`}>
                {riskScores.overall}
              </span>
              <span className="text-lg text-gray-500 mb-1">/100</span>
            </div>
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              riskScores.overall >= 80
                ? 'bg-green-500'
                : riskScores.overall >= 60
                  ? 'bg-yellow-500'
                  : riskScores.overall >= 40
                    ? 'bg-orange-500'
                    : 'bg-red-500'
            }`}
            style={{ width: `${riskScores.overall}%` }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RiskScoreCard
            title="价格偏差风险"
            score={riskScores.priceDeviation}
            description="评估价格与市场均价的偏离程度"
          />
          <RiskScoreCard
            title="数据源集中度风险"
            score={riskScores.concentration}
            description="评估数据源的多样性和去中心化程度"
          />
          <RiskScoreCard
            title="跨链一致性风险"
            score={riskScores.crossChain}
            description="评估不同链上价格的一致性"
          />
        </div>
      </div>

      {isPythNetwork ? (
        <>
          <PriceDeviationRisk />
          <ConcentrationRisk />
          <CrossChainRisk />
        </>
      ) : (
        <DashboardCard title="风险评估详情">
          <div className="flex flex-col items-center justify-center py-12">
            <svg
              className="w-16 h-16 text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-gray-500 text-center">
              完整的风险评估功能目前仅支持 Pyth Network
              <br />
              <span className="text-sm">其他 Oracle 提供商的风险评估功能即将推出</span>
            </p>
          </div>
        </DashboardCard>
      )}
    </div>
  );
}
