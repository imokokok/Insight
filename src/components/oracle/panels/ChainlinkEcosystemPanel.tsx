'use client';

import { useTranslations } from '@/i18n';
import { DashboardCard } from '@/components/oracle/common/DashboardCard';

interface Protocol {
  name: string;
  category: string;
  tvs: number;
  logo?: string;
}

interface ChainData {
  name: string;
  feeds: number;
  tvs: number;
}

const protocols: Protocol[] = [
  { name: 'Aave', category: 'Lending', tvs: 8500000000 },
  { name: 'Compound', category: 'Lending', tvs: 3200000000 },
  { name: 'MakerDAO', category: 'Stablecoin', tvs: 6500000000 },
  { name: 'Synthetix', category: 'Derivatives', tvs: 1200000000 },
  { name: 'Uniswap', category: 'DEX', tvs: 4800000000 },
  { name: 'Curve', category: 'DEX', tvs: 2100000000 },
  { name: 'SushiSwap', category: 'DEX', tvs: 450000000 },
  { name: 'Balancer', category: 'DEX', tvs: 890000000 },
  { name: 'dYdX', category: 'Derivatives', tvs: 780000000 },
  { name: 'GMX', category: 'Derivatives', tvs: 650000000 },
];

const chainData: ChainData[] = [
  { name: 'Ethereum', feeds: 485, tvs: 18500000000 },
  { name: 'Arbitrum', feeds: 156, tvs: 2800000000 },
  { name: 'Polygon', feeds: 142, tvs: 1200000000 },
  { name: 'Optimism', feeds: 98, tvs: 950000000 },
  { name: 'Avalanche', feeds: 87, tvs: 780000000 },
  { name: 'Base', feeds: 76, tvs: 650000000 },
  { name: 'BNB Chain', feeds: 124, tvs: 520000000 },
  { name: 'Fantom', feeds: 75, tvs: 180000000 },
];

export function ChainlinkEcosystemPanel() {
  const t = useTranslations();

  const totalTVS = protocols.reduce((sum, p) => sum + p.tvs, 0);
  const totalProtocols = protocols.length;
  const totalChains = chainData.length;
  const totalFeeds = chainData.reduce((sum, c) => sum + c.feeds, 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard title={t('chainlink.ecosystem.totalIntegratedProtocols')}>
          <div className="text-3xl font-bold text-gray-900">{totalProtocols}+</div>
          <div className="text-sm text-gray-500 mt-1">{t('chainlink.ecosystem.acrossDefi')}</div>
        </DashboardCard>

        <DashboardCard title={t('chainlink.ecosystem.totalValueSecured')}>
          <div className="text-3xl font-bold text-gray-900">${(totalTVS / 1e9).toFixed(1)}B</div>
          <div className="text-sm text-gray-500 mt-1">
            {t('chainlink.ecosystem.acrossAllProtocols')}
          </div>
        </DashboardCard>

        <DashboardCard title={t('chainlink.ecosystem.supportedBlockchains')}>
          <div className="text-3xl font-bold text-gray-900">{totalChains}+</div>
          <div className="text-sm text-gray-500 mt-1">
            {t('chainlink.ecosystem.multiChainCoverage')}
          </div>
        </DashboardCard>

        <DashboardCard title={t('chainlink.ecosystem.activeDataSources')}>
          <div className="text-3xl font-bold text-gray-900">{totalFeeds}</div>
          <div className="text-sm text-gray-500 mt-1">
            {t('chainlink.ecosystem.realtimePriceFeeds')}
          </div>
        </DashboardCard>
      </div>

      {/* TVS Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title={t('chainlink.ecosystem.protocolIntegrations')}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 text-gray-600 font-medium">
                    {t('chainlink.ecosystem.protocol')}
                  </th>
                  <th className="text-left py-3 text-gray-600 font-medium">
                    {t('chainlink.ecosystem.category')}
                  </th>
                  <th className="text-right py-3 text-gray-600 font-medium">
                    {t('chainlink.ecosystem.tvs')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {protocols.map((protocol) => (
                  <tr key={protocol.name} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 text-gray-900 font-medium">{protocol.name}</td>
                    <td className="py-3">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        {protocol.category}
                      </span>
                    </td>
                    <td className="py-3 text-right text-gray-600">
                      ${(protocol.tvs / 1e9).toFixed(2)}B
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardCard>

        <DashboardCard title={t('chainlink.ecosystem.supportedBlockchainsTitle')}>
          <div className="space-y-4">
            {chainData.map((chain) => (
              <div key={chain.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-primary-500"></div>
                  <span className="text-sm text-gray-700">{chain.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">{chain.feeds} feeds</span>
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full"
                      style={{ width: `${(chain.tvs / totalTVS) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-16 text-right">
                    ${(chain.tvs / 1e9).toFixed(1)}B
                  </span>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      {/* CCIP Cross-Chain Bridge */}
      <DashboardCard title={t('chainlink.ecosystem.ccipIntegration')}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-3xl font-bold text-gray-900">$12.8B+</div>
                <div className="text-sm text-gray-500">
                  {t('chainlink.ecosystem.ccipValueTransferred')}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">2.4M+</div>
                <div className="text-sm text-gray-500">{t('chainlink.ecosystem.ccipMessages')}</div>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { chain: 'Ethereum ↔ Arbitrum', volume: '$5.2B', messages: '980K' },
                { chain: 'Ethereum ↔ Optimism', volume: '$3.1B', messages: '620K' },
                { chain: 'Ethereum ↔ Base', volume: '$2.8B', messages: '450K' },
                { chain: 'Ethereum ↔ Polygon', volume: '$1.7B', messages: '350K' },
              ].map((route, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">{route.chain}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-900">{route.volume}</span>
                    <span className="text-xs text-gray-500">{route.messages} msgs</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {t('chainlink.ecosystem.ccipProtocols')}
            </h4>
            <div className="space-y-2">
              {[
                { name: 'Synthetix', useCase: 'Cross-chain synths', tvs: '$450M' },
                { name: 'Aave', useCase: 'Cross-chain governance', tvs: '$280M' },
                { name: 'GMX', useCase: 'Multi-chain liquidity', tvs: '$195M' },
                { name: 'Radiant Capital', useCase: 'Omnichain lending', tvs: '$165M' },
                { name: 'Stargate', useCase: 'Cross-chain transfers', tvs: '$420M' },
              ].map((protocol, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">{protocol.name}</div>
                    <div className="text-xs text-gray-500">{protocol.useCase}</div>
                  </div>
                  <span className="text-sm font-medium text-primary-600">{protocol.tvs}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DashboardCard>

      {/* Chainlink Features */}
      <DashboardCard title={t('chainlink.ecosystem.chainlinkFeatures')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
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
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
              </div>
              <h4 className="font-medium text-gray-900">
                {t('chainlink.ecosystem.multiChainOracle')}
              </h4>
            </div>
            <p className="text-sm text-gray-600">
              Secure and reliable data feeds across {totalChains}+ blockchain networks
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-success-600"
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
              <h4 className="font-medium text-gray-900">Decentralized Security</h4>
            </div>
            <p className="text-sm text-gray-600">
              1,847+ independent node operators ensuring data integrity
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h4 className="font-medium text-gray-900">{t('chainlink.ecosystem.dataSources')}</h4>
            </div>
            <p className="text-sm text-gray-600">
              {totalFeeds}+ data feeds covering crypto, forex, commodities, and more
            </p>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
