'use client';

import { useState } from 'react';

import { DataFreshnessIndicator } from '@/components/oracle/alerts';
import {
  RiskScoreCard,
  SecurityTimeline,
  MitigationMeasuresGrid,
} from '@/components/oracle/data-display';
import { DashboardCard } from '@/components/oracle/data-display/DashboardCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { useTranslations } from '@/i18n';
import { type StakingData, type AirnodeNetworkStats, type DAPICoverage } from '@/lib/oracles/api3';
import type { RiskEvent, MitigationMeasure } from '@/types/risk';

interface API3RiskAssessmentPanelProps {
  staking?: StakingData;
  airnodeStats?: AirnodeNetworkStats;
  dapiCoverage?: DAPICoverage;
}

interface RiskScoreCardProps {
  title: string;
  score: number;
  description: string;
  color: 'green' | 'yellow' | 'red';
}

function LegacyRiskScoreCard({ title, score, description, color }: RiskScoreCardProps) {
  const colorClasses = {
    green: 'bg-success-100 text-green-800 border-green-200',
    yellow: 'bg-warning-100 text-yellow-800 border-yellow-200',
    red: 'bg-danger-100 text-danger-800 border-danger-200',
  };

  const progressColorClasses = {
    green: 'bg-success-500',
    yellow: 'bg-warning-500',
    red: 'bg-danger-500',
  };

  return (
    <div className={`p-4 border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-2xl font-bold">{score}/100</span>
      </div>
      <div className="w-full h-2 bg-white bg-opacity-50 mb-2">
        <div className={`h-full ${progressColorClasses[color]}`} style={{ width: `${score}%` }} />
      </div>
      <p className="text-xs opacity-80">{description}</p>
    </div>
  );
}

function useAPI3SecurityEvents(): RiskEvent[] {
  const t = useTranslations();
  return [
    {
      date: '2024-03-10',
      type: 'upgrade',
      title: t('api3.risk.securityEvents.oevNetworkLaunch.title'),
      description: t('api3.risk.securityEvents.oevNetworkLaunch.description'),
      status: 'resolved',
    },
    {
      date: '2024-02-15',
      type: 'upgrade',
      title: t('api3.risk.securityEvents.airnodeV2Release.title'),
      description: t('api3.risk.securityEvents.airnodeV2Release.description'),
      status: 'resolved',
    },
    {
      date: '2024-01-20',
      type: 'response',
      title: t('api3.risk.securityEvents.dapiCoverageExpansion.title'),
      description: t('api3.risk.securityEvents.dapiCoverageExpansion.description'),
      status: 'resolved',
    },
    {
      date: '2023-12-05',
      type: 'maintenance',
      title: t('api3.risk.securityEvents.infrastructureUpgrade.title'),
      description: t('api3.risk.securityEvents.infrastructureUpgrade.description'),
      status: 'resolved',
    },
  ];
}

const api3MitigationMeasures: MitigationMeasure[] = [
  {
    name: 'api3.risk.mitigationMeasures.firstPartyOracle',
    type: 'technical',
    status: 'active',
    effectiveness: 95,
  },
  {
    name: 'api3.risk.mitigationMeasures.coveragePoolStaking',
    type: 'technical',
    status: 'active',
    effectiveness: 90,
  },
  {
    name: 'api3.risk.mitigationMeasures.daoGovernance',
    type: 'governance',
    status: 'active',
    effectiveness: 85,
  },
  {
    name: 'api3.risk.mitigationMeasures.serviceCoverage',
    type: 'operational',
    status: 'active',
    effectiveness: 88,
  },
  {
    name: 'api3.risk.mitigationMeasures.oevProtection',
    type: 'technical',
    status: 'active',
    effectiveness: 92,
  },
  {
    name: 'api3.risk.mitigationMeasures.multiChainDeployment',
    type: 'operational',
    status: 'active',
    effectiveness: 87,
  },
];

function CoveragePoolRisk({ staking }: { staking?: StakingData }) {
  const t = useTranslations();

  const coverageRatio = staking?.coveragePool?.coverageRatio ?? 1.5;
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
        <LegacyRiskScoreCard
          title={t('api3.risk.coveragePool.collateralization')}
          score={Math.round(coverageScore)}
          description={description}
          color={riskLevel}
        />
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">{t('api3.risk.coveragePool.ratio')}</p>
            <p className="text-lg font-semibold text-gray-900">{coverageRatio.toFixed(2)}x</p>
          </div>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
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

function DataSourceConcentrationRisk({ dapiCoverage }: { dapiCoverage?: DAPICoverage }) {
  const t = useTranslations();

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
        <LegacyRiskScoreCard
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
  const t = useTranslations();

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
        <LegacyRiskScoreCard
          title={t('api3.risk.network.healthScore')}
          score={healthScore}
          description={description}
          color={riskLevel}
        />
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">{t('api3.risk.network.uptime')}</p>
            <p className="text-lg font-semibold text-gray-900">{uptime.toFixed(2)}%</p>
          </div>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">{t('api3.risk.network.responseTime')}</p>
            <p className="text-lg font-semibold text-gray-900">{responseTime}ms</p>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

function StakingRisk({ staking }: { staking?: StakingData }) {
  const t = useTranslations();

  const stakingApr = staking?.stakingApr ?? 12.5;

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
        <LegacyRiskScoreCard
          title={t('api3.risk.staking.riskScore')}
          score={riskScore}
          description={description}
          color={riskLevel}
        />
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">{t('api3.risk.staking.apr')}</p>
            <p className="text-lg font-semibold text-gray-900">{stakingApr}%</p>
          </div>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">{t('api3.risk.staking.lockup')}</p>
            <p className="text-lg font-semibold text-gray-900">
              {t('api3.risk.staking.lockupValue')}
            </p>
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
  const t = useTranslations();
  const api3SecurityEvents = useAPI3SecurityEvents();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const handleRefresh = () => {
    setLastUpdated(new Date());
  };

  // Four-dimensional risk scores
  const decentralizationScore = 88;
  const securityScore = 92;
  const stabilityScore = 89;
  const dataQualityScore = 90;

  return (
    <div className="space-y-6">
      {/* Data Freshness Indicator */}
      <DataFreshnessIndicator
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
        thresholdMinutes={5}
      />

      <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary-100 border border-primary-200 rounded-lg flex-shrink-0">
            <svg
              className="w-5 h-5 text-primary-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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

      {/* Four-Dimensional Risk Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <RiskScoreCard
          title={t('api3.risk.dimensions.decentralization')}
          score={decentralizationScore}
          description={t('api3.risk.dimensions.decentralizationDesc')}
          trend="up"
          trendValue="+2.5%"
        />
        <RiskScoreCard
          title={t('api3.risk.dimensions.security')}
          score={securityScore}
          description={t('api3.risk.dimensions.securityDesc')}
          trend="neutral"
          trendValue="0%"
        />
        <RiskScoreCard
          title={t('api3.risk.dimensions.stability')}
          score={stabilityScore}
          description={t('api3.risk.dimensions.stabilityDesc')}
          trend="up"
          trendValue="+1.2%"
        />
        <RiskScoreCard
          title={t('api3.risk.dimensions.dataQuality')}
          score={dataQualityScore}
          description={t('api3.risk.dimensions.dataQualityDesc')}
          trend="up"
          trendValue="+3.1%"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CoveragePoolRisk staking={staking} />
        <DataSourceConcentrationRisk dapiCoverage={dapiCoverage} />
        <NetworkHealthRisk airnodeStats={airnodeStats} />
        <StakingRisk staking={staking} />
      </div>

      {/* Security Timeline */}
      <SecurityTimeline events={api3SecurityEvents} />

      {/* Mitigation Measures Grid */}
      <MitigationMeasuresGrid measures={api3MitigationMeasures} />
    </div>
  );
}
