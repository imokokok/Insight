'use client';

import { useMemo } from 'react';

import { DashboardCard } from '@/components/oracle/data-display/DashboardCard';
import { useTranslations } from '@/i18n';
import { OracleProvider } from '@/types/oracle';

import { ConcentrationRisk } from '../charts/ConcentrationRisk';
import { CrossChainRisk } from '../charts/CrossChainRisk';
import { PriceDeviationRisk } from '../charts/PriceDeviationRisk';

interface RiskScore {
  overall: number;
  priceDeviation: number;
  concentration: number;
  crossChain: number;
}

interface RiskAssessmentPanelProps {
  provider?: OracleProvider;
}

function getRiskLevel(
  score: number,
  t: (key: string) => string
): { label: string; color: string; bgColor: string } {
  if (score >= 80) {
    return {
      label: t('riskAssessment.riskLevel.low'),
      color: 'text-success-600',
      bgColor: 'bg-success-100',
    };
  } else if (score >= 60) {
    return {
      label: t('riskAssessment.riskLevel.medium'),
      color: 'text-warning-600',
      bgColor: 'bg-warning-100',
    };
  } else if (score >= 40) {
    return {
      label: t('riskAssessment.riskLevel.high'),
      color: 'text-warning-600',
      bgColor: 'bg-warning-100',
    };
  } else {
    return {
      label: t('riskAssessment.riskLevel.critical'),
      color: 'text-danger-600',
      bgColor: 'bg-danger-100',
    };
  }
}

function RiskScoreCard({
  title,
  score,
  description,
  t,
}: {
  title: string;
  score: number;
  description: string;
  t: (key: string) => string;
}) {
  const riskLevel = getRiskLevel(score, t);

  return (
    <div className="bg-white border border-gray-200  p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700">{title}</h4>
        <span className={`px-2 py-1 text-xs font-medium  ${riskLevel.bgColor} ${riskLevel.color}`}>
          {riskLevel.label}
        </span>
      </div>
      <div className="flex items-end gap-2 mb-2">
        <span className={`text-3xl font-bold ${riskLevel.color}`}>{score}</span>
        <span className="text-sm text-gray-500 mb-1">/100</span>
      </div>
      <div className="w-full bg-gray-200  h-2 mb-2">
        <div
          className={`h-2  transition-all duration-500 ${
            score >= 80
              ? 'bg-success-500'
              : score >= 60
                ? 'bg-warning-500'
                : score >= 40
                  ? 'bg-warning-500'
                  : 'bg-danger-500'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}

export function RiskAssessmentPanel({ provider }: RiskAssessmentPanelProps) {
  const t = useTranslations();

  const riskScores: RiskScore = useMemo(() => {
    return {
      overall: 78,
      priceDeviation: 85,
      concentration: 72,
      crossChain: 76,
    };
  }, []);

  const overallRisk = getRiskLevel(riskScores.overall, t);

  const isPythNetwork = provider === OracleProvider.PYTH;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200  p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {t('riskAssessment.overviewTitle')}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{t('riskAssessment.overviewDescription')}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{t('riskAssessment.overallRiskScore')}</span>
              <span
                className={`px-3 py-1 text-sm font-medium  ${overallRisk.bgColor} ${overallRisk.color}`}
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

        <div className="w-full bg-gray-200  h-3 mb-6">
          <div
            className={`h-3  transition-all duration-500 ${
              riskScores.overall >= 80
                ? 'bg-success-500'
                : riskScores.overall >= 60
                  ? 'bg-warning-500'
                  : riskScores.overall >= 40
                    ? 'bg-warning-500'
                    : 'bg-danger-500'
            }`}
            style={{ width: `${riskScores.overall}%` }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RiskScoreCard
            title={t('riskAssessment.priceDeviationRisk')}
            score={riskScores.priceDeviation}
            description={t('riskAssessment.priceDeviationRiskDesc')}
            t={t}
          />
          <RiskScoreCard
            title={t('riskAssessment.concentrationRisk')}
            score={riskScores.concentration}
            description={t('riskAssessment.concentrationRiskDesc')}
            t={t}
          />
          <RiskScoreCard
            title={t('riskAssessment.crossChainRisk')}
            score={riskScores.crossChain}
            description={t('riskAssessment.crossChainRiskDesc')}
            t={t}
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
        <DashboardCard title={t('riskAssessment.riskDetailsTitle')}>
          <div className="flex flex-col items-center justify-center py-12">
            <svg
              className="w-16 h-16 text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-gray-500 text-center">
              {t('riskAssessment.pythOnlyMessage')}
              <br />
              <span className="text-sm">{t('riskAssessment.comingSoonMessage')}</span>
            </p>
          </div>
        </DashboardCard>
      )}
    </div>
  );
}
