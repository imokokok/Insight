import { type ReactNode } from 'react';

import {
  WINkLinkGamingDataPanel,
  WINkLinkTRONEcosystemPanel,
  WINkLinkStakingPanel,
  WINkLinkRiskPanel,
} from '@/components/oracle/panels';

import { type PanelConfig, type PanelRenderContext } from './types';

const renderGamingTab = (context: PanelRenderContext): ReactNode => {
  return (
    <div className="mb-6">
      <WINkLinkGamingDataPanel
        data={{
          totalGamingVolume: 850000000,
          activeGames: 45,
          dailyRandomRequests: 2500000,
          dataSources: [
            {
              id: 'game-001',
              name: 'WINk Casino',
              type: 'platform',
              category: 'casino',
              users: 650000,
              volume24h: 8500000,
              dataTypes: ['Random Numbers', 'Price Feeds'],
              reliability: 99.99,
              lastUpdate: Date.now(),
            },
            {
              id: 'game-002',
              name: 'TRONbet Dice',
              type: 'game',
              category: 'casino',
              users: 280000,
              volume24h: 3200000,
              dataTypes: ['Random Numbers'],
              reliability: 99.97,
              lastUpdate: Date.now() - 30000,
            },
            {
              id: 'game-003',
              name: 'SportX',
              type: 'platform',
              category: 'sports',
              users: 420000,
              volume24h: 5800000,
              dataTypes: ['Sports Results', 'Price Feeds'],
              reliability: 99.95,
              lastUpdate: Date.now() - 60000,
            },
          ],
          randomNumberServices: [
            {
              serviceId: 'rng-001',
              name: 'WINkLink VRF',
              requestCount: 15000000,
              averageResponseTime: 85,
              securityLevel: 'high',
              supportedChains: ['TRON', 'BTTC'],
            },
            {
              serviceId: 'rng-002',
              name: 'Gaming Random Oracle',
              requestCount: 8500000,
              averageResponseTime: 95,
              securityLevel: 'high',
              supportedChains: ['TRON'],
            },
          ],
          vrfUseCases: [
            {
              id: 'vrf-001',
              name: 'Random Number Generation',
              description: 'Secure random numbers for gaming',
              category: 'gaming',
              usageCount: 15000000,
              reliability: 99.99,
            },
            {
              id: 'vrf-002',
              name: 'Lottery Draw',
              description: 'Fair lottery drawing mechanism',
              category: 'lottery',
              usageCount: 5200000,
              reliability: 99.98,
            },
          ],
          categoryDistribution: [
            { category: 'casino', count: 18, percentage: 40, volume24h: 4200000 },
            { category: 'sports', count: 12, percentage: 26.7, volume24h: 3100000 },
          ],
        }}
      />
    </div>
  );
};

const renderTronTab = (context: PanelRenderContext): ReactNode => {
  return (
    <div className="mb-6">
      <WINkLinkTRONEcosystemPanel
        data={{
          networkStats: {
            totalTransactions: 8500000000,
            tps: 65,
            blockHeight: 65000000,
            blockTime: 3,
            totalAccounts: 180000000,
            dailyActiveUsers: 2500000,
            energyConsumption: 4500000000,
            bandwidthConsumption: 2800000000,
          },
          integratedDApps: [
            {
              id: 'dapp-001',
              name: 'WINk',
              category: 'gaming',
              users: 850000,
              volume24h: 15000000,
              contractAddress: 'TND...abc',
              integrationDate: Date.now() - 86400000 * 365,
              status: 'active',
            },
            {
              id: 'dapp-002',
              name: 'JustSwap',
              category: 'defi',
              users: 420000,
              volume24h: 8500000,
              contractAddress: 'TND...def',
              integrationDate: Date.now() - 86400000 * 300,
              status: 'active',
            },
          ],
          totalValueLocked: 1200000000,
          dailyTransactions: 4500000,
          integrationCoverage: 85,
          networkGrowth: [
            {
              month: '2024-06',
              transactions: 7200000000,
              accounts: 165000000,
              tvl: 980000000,
            },
            {
              month: '2024-07',
              transactions: 7500000000,
              accounts: 168000000,
              tvl: 1050000000,
            },
            {
              month: '2024-08',
              transactions: 7800000000,
              accounts: 172000000,
              tvl: 1120000000,
            },
          ],
          marketShare: {
            oracleUsage: 78,
            totalDapps: 120,
            integratedDapps: 45,
          },
        }}
      />
    </div>
  );
};

const renderStakingTab = (context: PanelRenderContext): ReactNode => {
  return (
    <div className="mb-6">
      <WINkLinkStakingPanel
        data={{
          totalStaked: 45000000,
          totalNodes: 40,
          activeNodes: 35,
          averageApr: 12.5,
          rewardPool: 2500000,
          stakingTiers: [
            {
              tier: 'Bronze',
              minStake: 500000,
              maxStake: 1000000,
              apr: 10.5,
              nodeCount: 15,
            },
            {
              tier: 'Silver',
              minStake: 1000000,
              maxStake: 2000000,
              apr: 11.5,
              nodeCount: 12,
            },
            { tier: 'Gold', minStake: 2000000, maxStake: 4000000, apr: 12.5, nodeCount: 8 },
            {
              tier: 'Platinum',
              minStake: 4000000,
              maxStake: 10000000,
              apr: 14.0,
              nodeCount: 5,
            },
          ],
          nodes: [
            {
              id: 'node-001',
              address: 'TND...1a2b',
              name: 'WINkLink Guardian',
              region: 'Asia',
              stakedAmount: 5000000,
              rewardsEarned: 850000,
              uptime: 99.99,
              responseTime: 85,
              validatedRequests: 12500000,
              joinDate: Date.now() - 86400000 * 400,
              status: 'active',
              tier: 'platinum',
            },
            {
              id: 'node-002',
              address: 'TND...2c3d',
              name: 'TRON Oracle Node',
              region: 'Europe',
              stakedAmount: 3200000,
              rewardsEarned: 520000,
              uptime: 99.95,
              responseTime: 95,
              validatedRequests: 9800000,
              joinDate: Date.now() - 86400000 * 350,
              status: 'active',
              tier: 'gold',
            },
          ],
        }}
      />
    </div>
  );
};

const renderRiskTab = (context: PanelRenderContext): ReactNode => {
  return (
    <div className="mb-6">
      <WINkLinkRiskPanel
        data={{
          overallRisk: 2.5,
          decentralization: 85,
          dataQuality: 96.5,
          uptime: 99.92,
          staleness: 0.5,
          deviation: 0.12,
          lastUpdate: Date.now(),
        }}
      />
    </div>
  );
};

export const winKLinkPanelConfig: PanelConfig = {
  renderGamingTab,
  renderTronTab,
  renderStakingTab,
  renderRiskTab,
};

export default winKLinkPanelConfig;
