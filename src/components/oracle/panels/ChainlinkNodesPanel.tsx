'use client';

import { DashboardCard } from '@/components/oracle/data-display/DashboardCard';
import { useTranslations } from '@/i18n';

interface NodeData {
  name: string;
  region: string;
  responseTime: number;
  successRate: number;
  reputation: number;
  stakedAmount: number;
}

interface RegionData {
  region: string;
  count: number;
  percentage: number;
}

const mockNodes: NodeData[] = [
  {
    name: 'LinkPool',
    region: 'North America',
    responseTime: 120,
    successRate: 99.9,
    reputation: 98.5,
    stakedAmount: 2500000,
  },
  {
    name: 'Certus One',
    region: 'Europe',
    responseTime: 135,
    successRate: 99.8,
    reputation: 97.2,
    stakedAmount: 1800000,
  },
  {
    name: 'Fiews',
    region: 'North America',
    responseTime: 110,
    successRate: 99.9,
    reputation: 96.8,
    stakedAmount: 2200000,
  },
  {
    name: 'Everstake',
    region: 'Europe',
    responseTime: 145,
    successRate: 99.7,
    reputation: 95.5,
    stakedAmount: 1500000,
  },
  {
    name: 'Figment',
    region: 'North America',
    responseTime: 125,
    successRate: 99.8,
    reputation: 94.9,
    stakedAmount: 1900000,
  },
  {
    name: 'Staked',
    region: 'Asia',
    responseTime: 155,
    successRate: 99.6,
    reputation: 93.8,
    stakedAmount: 1200000,
  },
  {
    name: 'Blockdaemon',
    region: 'Europe',
    responseTime: 140,
    successRate: 99.7,
    reputation: 93.2,
    stakedAmount: 1600000,
  },
  {
    name: 'Chorus One',
    region: 'Europe',
    responseTime: 130,
    successRate: 99.8,
    reputation: 92.5,
    stakedAmount: 1400000,
  },
  {
    name: 'P2P Validator',
    region: 'Asia',
    responseTime: 165,
    successRate: 99.5,
    reputation: 91.8,
    stakedAmount: 1100000,
  },
  {
    name: 'Stakefish',
    region: 'North America',
    responseTime: 115,
    successRate: 99.9,
    reputation: 91.2,
    stakedAmount: 1700000,
  },
];

const regionData: RegionData[] = [
  { region: 'North America', count: 742, percentage: 40.2 },
  { region: 'Europe', count: 628, percentage: 34.0 },
  { region: 'Asia', count: 369, percentage: 20.0 },
  { region: 'South America', count: 74, percentage: 4.0 },
  { region: 'Oceania', count: 34, percentage: 1.8 },
];

export function ChainlinkNodesPanel() {
  const t = useTranslations();

  const totalStaked = mockNodes.reduce((sum, node) => sum + node.stakedAmount, 0);
  const avgResponseTime =
    mockNodes.reduce((sum, node) => sum + node.responseTime, 0) / mockNodes.length;
  const avgSuccessRate =
    mockNodes.reduce((sum, node) => sum + node.successRate, 0) / mockNodes.length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard title={t('chainlink.nodeAnalytics.totalActiveNodes')}>
          <div className="text-3xl font-bold text-gray-900">1,847</div>
          <div className="text-sm text-gray-500 mt-1">
            {t('chainlink.nodeAnalytics.acrossRegions', { count: 5 })}
          </div>
        </DashboardCard>

        <DashboardCard title={t('chainlink.nodeAnalytics.totalStaked')}>
          <div className="text-3xl font-bold text-gray-900">${(totalStaked / 1e6).toFixed(1)}M</div>
          <div className="text-sm text-gray-500 mt-1">LINK</div>
        </DashboardCard>

        <DashboardCard title={t('chainlink.nodeAnalytics.avgResponseTime')}>
          <div className="text-3xl font-bold text-gray-900">{avgResponseTime.toFixed(0)}ms</div>
          <div className="text-sm text-gray-500 mt-1">
            {t('chainlink.nodeAnalytics.networkAverage')}
          </div>
        </DashboardCard>

        <DashboardCard title={t('chainlink.nodeAnalytics.avgSuccessRate')}>
          <div className="text-3xl font-bold text-success-600">{avgSuccessRate.toFixed(1)}%</div>
          <div className="text-sm text-gray-500 mt-1">
            {t('chainlink.nodeAnalytics.networkAverage')}
          </div>
        </DashboardCard>
      </div>

      {/* Geographic Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title={t('chainlink.nodeAnalytics.geographicDistribution')}>
          <div className="space-y-4">
            {regionData.map((region) => (
              <div key={region.region} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-primary-500"></div>
                  <span className="text-sm text-gray-700">{region.region}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full"
                      style={{ width: `${region.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-16 text-right">
                    {region.count}
                  </span>
                  <span className="text-sm text-gray-500 w-12 text-right">
                    {region.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>

        {/* Node Performance Ranking */}
        <DashboardCard title={t('chainlink.nodeAnalytics.nodePerformance')}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-600 font-medium">
                    {t('chainlink.nodeAnalytics.rank')}
                  </th>
                  <th className="text-left py-2 text-gray-600 font-medium">
                    {t('chainlink.nodeAnalytics.nodeName')}
                  </th>
                  <th className="text-right py-2 text-gray-600 font-medium">
                    {t('chainlink.nodeAnalytics.response')}
                  </th>
                  <th className="text-right py-2 text-gray-600 font-medium">
                    {t('chainlink.nodeAnalytics.successRate')}
                  </th>
                  <th className="text-right py-2 text-gray-600 font-medium">
                    {t('chainlink.nodeAnalytics.reputation')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockNodes.slice(0, 10).map((node, index) => (
                  <tr key={node.name} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 text-gray-900 font-medium">#{index + 1}</td>
                    <td className="py-2 text-gray-700">{node.name}</td>
                    <td className="py-2 text-right text-gray-600">{node.responseTime}ms</td>
                    <td className="py-2 text-right text-success-600">{node.successRate}%</td>
                    <td className="py-2 text-right text-gray-900">{node.reputation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardCard>
      </div>

      {/* Staking Statistics */}
      <DashboardCard title={t('chainlink.nodeAnalytics.stakingAmount')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              ${(totalStaked / 1e6).toFixed(1)}M
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {t('chainlink.nodeAnalytics.totalStaked')}
            </div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">1,847</div>
            <div className="text-sm text-gray-500 mt-1">
              {t('chainlink.nodeAnalytics.nodeOperators')}
            </div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">45M</div>
            <div className="text-sm text-gray-500 mt-1">LINK</div>
          </div>
        </div>
      </DashboardCard>

      {/* Staking v0.2 Upgrade */}
      <DashboardCard title={t('chainlink.staking.upgradeTitle')}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm text-gray-500">
                  {t('chainlink.staking.migrationStatus')}
                </div>
                <div className="text-lg font-semibold text-success-600">
                  {t('chainlink.staking.completed')}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">{t('chainlink.staking.v0_2Staked')}</div>
                <div className="text-lg font-semibold text-gray-900">38.5M LINK</div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('chainlink.staking.participationRate')}</span>
                <span className="font-medium text-gray-900">85.2%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('chainlink.staking.communityPool')}</span>
                <span className="font-medium text-gray-900">2.1M LINK</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('chainlink.staking.lockupPeriod')}</span>
                <span className="font-medium text-gray-900">28 days</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {t('chainlink.staking.aprHistory')}
            </h4>
            <div className="space-y-2">
              {[
                { period: 'v0.1', apr: '4.75%', status: 'deprecated' },
                { period: 'v0.2 Early', apr: '4.32%', status: 'active' },
                { period: 'v0.2 Current', apr: '4.15%', status: 'active' },
                { period: 'Projected v1.0', apr: '5.2%', status: 'upcoming' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">{item.period}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">{item.apr}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        item.status === 'active'
                          ? 'bg-success-100 text-success-700'
                          : item.status === 'deprecated'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-primary-100 text-primary-700'
                      }`}
                    >
                      {t(`chainlink.staking.${item.status}`)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            {t('chainlink.staking.slashingConditions')}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 bg-danger-50 rounded-lg">
              <div className="text-xs text-danger-600 font-medium mb-1">
                {t('chainlink.staking.downtime')}
              </div>
              <div className="text-sm text-gray-700">{t('chainlink.staking.downtimeDesc')}</div>
            </div>
            <div className="p-3 bg-danger-50 rounded-lg">
              <div className="text-xs text-danger-600 font-medium mb-1">
                {t('chainlink.staking.incorrectData')}
              </div>
              <div className="text-sm text-gray-700">
                {t('chainlink.staking.incorrectDataDesc')}
              </div>
            </div>
            <div className="p-3 bg-danger-50 rounded-lg">
              <div className="text-xs text-danger-600 font-medium mb-1">
                {t('chainlink.staking.malicious')}
              </div>
              <div className="text-sm text-gray-700">{t('chainlink.staking.maliciousDesc')}</div>
            </div>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
