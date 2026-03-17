import { ReactNode } from 'react';
import { PanelConfig, PanelRenderContext } from './types';
import { UMAClient } from '@/lib/oracles/uma';
import { DisputeResolutionPanel, ValidatorAnalyticsPanel } from '@/components/oracle';
import { StakingPanel } from '../../panels/StakingPanel';
import { UMADataQualityScoreCard } from '../UMADataQualityScoreCard';
import { UMADashboardPanel } from '../../panels/UMADashboardPanel';
import { UMAEcosystemPanel } from '../../panels/UMAEcosystemPanel';
import { UMANetworkPanel } from '../../panels/UMANetworkPanel';
import { UMARiskPanel } from '../../panels/UMARiskPanel';

const getStats = (context: PanelRenderContext) => {
  const { config, t, umaNetworkStats } = context;

  const activeValidators = umaNetworkStats?.activeValidators ?? 850;
  const totalDisputes = umaNetworkStats?.totalDisputes ?? 1250;
  const disputeSuccessRate = umaNetworkStats?.disputeSuccessRate ?? 78;

  return [
    {
      title: t('uma.stats.activeValidators'),
      value: `${activeValidators.toLocaleString()}+`,
      change: '+3%',
      changeType: 'positive' as 'positive' | 'negative' | 'neutral',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
    {
      title: t('uma.stats.totalDisputes'),
      value: `${totalDisputes.toLocaleString()}+`,
      change: '+15%',
      changeType: 'positive' as 'positive' | 'negative' | 'neutral',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
          />
        </svg>
      ),
    },
    {
      title: t('uma.stats.disputeSuccessRate'),
      value: `${disputeSuccessRate}%`,
      change: '+5%',
      changeType: 'positive' as 'positive' | 'negative' | 'neutral',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      title: t('uma.stats.supportedChains'),
      value: `${config.supportedChains.length}+`,
      change: '0%',
      changeType: 'neutral' as 'positive' | 'negative' | 'neutral',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
      ),
    },
  ];
};

const renderNetworkTab = (context: PanelRenderContext): ReactNode => {
  const { config, umaNetworkStats } = context;

  if (!(config.client instanceof UMAClient)) {
    return null;
  }

  return (
    <div className="mb-6">
      <UMANetworkPanel
        networkStats={umaNetworkStats}
        client={config.client}
      />
    </div>
  );
};

const renderValidatorsTab = (context: PanelRenderContext): ReactNode => {
  const { config, umaNetworkStats, t } = context;

  if (!(config.client instanceof UMAClient)) {
    return null;
  }

  return (
    <>
      <div className="mb-6">
        <UMADashboardPanel
          activeValidators={umaNetworkStats?.activeValidators ?? 850}
          avgResponseTime={config.networkData.avgResponseTime}
          nodeUptime={config.networkData.nodeUptime}
          dataFeeds={config.networkData.dataFeeds}
          networkStatus={[
            {
              label: t('chainlink.networkHealth.activeNodes'),
              value: (umaNetworkStats?.activeValidators ?? 850).toLocaleString(),
              status: 'healthy',
            },
            {
              label: t('chainlink.stats.dataFeeds'),
              value: config.networkData.dataFeeds.toLocaleString(),
              status: 'healthy',
            },
            {
              label: t('chainlink.networkHealth.responseTime'),
              value: `${config.networkData.avgResponseTime}ms`,
              status: config.networkData.avgResponseTime < 300 ? 'healthy' : 'warning',
            },
            {
              label: t('chainlink.successRate'),
              value: `${config.networkData.nodeUptime}%`,
              status: 'healthy',
            },
          ]}
          dataSources={[
            {
              name: `${config.name} Market`,
              status: 'active',
              latency: `${config.networkData.latency}ms`,
            },
            {
              name: config.defaultChain,
              status: 'active',
              latency: `${config.networkData.avgResponseTime}ms`,
            },
            {
              name: 'Secondary Feed',
              status: 'active',
              latency: `${Math.round(config.networkData.avgResponseTime * 1.2)}ms`,
            },
            {
              name: 'Backup Node',
              status: 'syncing',
              latency: `${Math.round(config.networkData.avgResponseTime * 1.5)}ms`,
            },
          ]}
        />
      </div>
      <div className="mb-6">
        <UMADataQualityScoreCard />
      </div>
      <div className="mb-6">
        <ValidatorAnalyticsPanel />
      </div>
    </>
  );
};

const renderDisputesTab = (context: PanelRenderContext): ReactNode => {
  return (
    <div className="mb-6">
      <DisputeResolutionPanel />
    </div>
  );
};

const renderStakingTab = (context: PanelRenderContext): ReactNode => {
  return (
    <div className="mb-6">
      <StakingPanel />
    </div>
  );
};

const renderRiskTab = (context: PanelRenderContext): ReactNode => {
  const { config } = context;

  if (!(config.client instanceof UMAClient)) {
    return null;
  }

  return (
    <div className="mb-6">
      <UMARiskPanel client={config.client} />
    </div>
  );
};

const renderEcosystemTab = (context: PanelRenderContext): ReactNode => {
  const { config } = context;

  return (
    <div className="mb-6">
      <UMAEcosystemPanel supportedChains={config.supportedChains} />
    </div>
  );
};

export const umaPanelConfig: PanelConfig = {
  getStats,
  renderNetworkTab,
  renderValidatorsTab,
  renderDisputesTab,
  renderStakingTab,
  renderRiskTab,
  renderEcosystemTab,
};

export default umaPanelConfig;
