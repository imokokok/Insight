'use client';

import { DashboardCard } from '../common/DashboardCard';
import { useI18n } from '@/lib/i18n/provider';
import { StakingData } from '@/lib/oracles/api3';
import { AirnodeNetworkStats } from '@/lib/oracles/api3';
import { DapiCoverage } from '@/lib/oracles/api3';

interface API3RiskAssessmentPanelProps {
  staking?: StakingData;
  airnodeStats?: AirnodeNetworkStats;
  dapiCoverage?: DapiCoverage;
}

interface RiskScoreCardProps {
  title: string;
  score: number;
  description: string;
  color: 'green' | 'yellow' | 'red';
}

function RiskScoreCard({ title, score, description, color }: RiskScoreCardProps) {
  const colorClasses = {
    green: 'bg-green-100 text-green-800 border-green-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    red: 'bg-red-100 text-red-800 border-red-200',
  };

  const progressColorClasses = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div className={`p-4 border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-2xl font-bold">{score}/100</span>
      </div>
      <div className="w-full h-2 bg-white bg-opacity-50 rounded-full mb-2">
        <div
          className={`h-full rounded-full ${progressColorClasses[color]}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs opacity-80">{description}</p>
    </div>
  );
}

function CoveragePoolRisk({ staking }: { staking?: StakingData }) {
  const { t } = useI18n();

  const coverageRatio = staking?.coveragePool?.collateralizationRatio ?? 1.5;
  const totalStaked = staking?.totalStaked ?? 0;
  const coverageScore = Math.min(100, Math.max(0, coverageRatio * 50));

  let riskLevel: 'green' | 'yellow' | 'red' = 'green';
  let description = t('api3.risk.coveragePool.lowRisk');

  if (coverageRatio < 1.0) {
    riskLevel = 'red';
    description = t('api3.risk.coveragePool.criticalRisk');
  } else if (coverageRatio < 1.5) {
    riskLevel = 'yellow';
    description = t('api3.risk.coveragePool.mediumRisk');
  }

  return (
    <DashboardCard title={t('api3.risk.coveragePool.title')}>
      <div className="space-y-4">
        <RiskScoreCard
          title={t('api3.risk.coveragePool.collateralization')}
          score={Math.round(coverageScore)}
          description={description}
          color={riskLevel}
        />
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">{t('api3.risk.coveragePool.ratio')}</p>
            <p className="text-lg font-semibold text-gray-900">{coverageRatio.toFixed(2)}x</p>
          </div>
          <div className="p-3 bg-gray-50 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">{t('api3.risk.coveragePool.totalStaked')}</p>
            <p className="text-lg font-semibold text-gray-900">
              {(totalStaked / 1e6).toFixed(2)}M API3
            </p>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

function DataSourceConcentrationRisk({ dapiCoverage }: { dapiCoverage?: DapiCoverage }) {
  const { t } = useI18n();

  const totalDapis = dapiCoverage?.totalDapis ?? 0;
  const cryptoCount = dapiCoverage?.byAssetType?.crypto ?? 0;
  const concentrationRatio = totalDapis > 0 ? cryptoCount / totalDapis : 0;

  let concentrationScore = Math.round((1 - concentrationRatio) * 100);
  let riskLevel: 'green' | 'yellow' | 'red' = 'green';
  let description = t('api3.risk.concentration.diversified');

  if (concentrationRatio > 0.8) {
    riskLevel = 'red';
    description = t('api3.risk.concentration.highConcentration');
    concentrationScore = Math.round((1 - concentrationRatio) * 50);
  } else if (concentrationRatio > 0.6) {
    riskLevel = 'yellow';
    description = t('api3.risk.concentration.mediumConcentration');
    concentrationScore = Math.round((1 - concentrationRatio) * 75);
  }

  return (
    <DashboardCard title={t('api3.risk.concentration.title')}>
      <div className="space-y-4">
        <RiskScoreCard
          title={t('api3.risk.concentration.diversificationScore')}
          score={concentrationScore}
          description={description}
          color={riskLevel}
        />
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{t('api3.risk.concentration.cryptoAssets')}</span>
            <span className="font-medium">{cryptoCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{t('api3.risk.concentration.totalDapis')}</span>
            <span className="font-medium">{totalDapis}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{t('api3.risk.concentration.concentration')}</span>
            <span className="font-medium">{(concentrationRatio * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

function NetworkHealthRisk({ airnodeStats }: { airnodeStats?: AirnodeNetworkStats }) {
  const { t } = useI18n();

  const uptime = airnodeStats?.nodeUptime ?? 99.8;
  const responseTime = airnodeStats?.avgResponseTime ?? 200;

  let healthScore = Math.round((uptime / 100) * 80 + (1 - Math.min(responseTime, 500) / 500) * 20);
  let riskLevel: 'green' | 'yellow' | 'red' = 'green';
  let description = t('api3.risk.network.excellent');

  if (uptime < 99.0 || responseTime > 500) {
    riskLevel = 'red';
    description = t('api3.risk.network.poor');
    healthScore = Math.max(0, healthScore - 30);
  } else if (uptime < 99.5 || responseTime > 300) {
    riskLevel = 'yellow';
    description = t('api3.risk.network.fair');
  }

  return (
    <DashboardCard title={t('api3.risk.network.title')}>
      <div className="space-y-4">
        <RiskScoreCard
          title={t('api3.risk.network.healthScore')}
          score={healthScore}
          description={description}
          color={riskLevel}
        />
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">{t('api3.risk.network.uptime')}</p>
            <p className="text-lg font-semibold text-gray-900">{uptime.toFixed(2)}%</p>
          </div>
          <div className="p-3 bg-gray-50 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">{t('api3.risk.network.responseTime')}</p>
            <p className="text-lg font-semibold text-gray-900">{responseTime}ms</p>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

function StakingRisk({ staking }: { staking?: StakingData }) {
  const { t } = useI18n();

  const stakingApr = staking?.stakingApr ?? 12.5;
  const lockupPeriod = staking?.lockupPeriod ?? 7;

  let riskScore = 75;
  let riskLevel: 'green' | 'yellow' | 'red' = 'green';
  let description = t('api3.risk.staking.moderate');

  if (stakingApr > 20) {
    riskLevel = 'red';
    description = t('api3.risk.staking.highYieldRisk');
    riskScore = 40;
  } else if (stakingApr > 15) {
    riskLevel = 'yellow';
    description = t('api3.risk.staking.elevatedRisk');
    riskScore = 60;
  }

  return (
    <DashboardCard title={t('api3.risk.staking.title')}>
      <div className="space-y-4">
        <RiskScoreCard
          title={t('api3.risk.staking.riskScore')}
          score={riskScore}
          description={description}
          color={riskLevel}
        />
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">{t('api3.risk.staking.apr')}</p>
            <p className="text-lg font-semibold text-gray-900">{stakingApr}%</p>
          </div>
          <div className="p-3 bg-gray-50 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">{t('api3.risk.staking.lockup')}</p>
            <p className="text-lg font-semibold text-gray-900">{lockupPeriod} days</p>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

export function API3RiskAssessmentPanel({
  staking,
  airnodeStats,
  dapiCoverage,
}: API3RiskAssessmentPanelProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div className="bg-gray-100 border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">
              {t('api3.risk.overview.title')}
            </h4>
            <p className="text-sm text-gray-600">{t('api3.risk.overview.description')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CoveragePoolRisk staking={staking} />
        <DataSourceConcentrationRisk dapiCoverage={dapiCoverage} />
        <NetworkHealthRisk airnodeStats={airnodeStats} />
        <StakingRisk staking={staking} />
      </div>
    </div>
  );
}
