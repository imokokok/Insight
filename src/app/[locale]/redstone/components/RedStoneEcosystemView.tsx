'use client';

import { useState, useMemo } from 'react';

import { TrendingUp, Layers, Globe, Zap } from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

import { useRedStoneEcosystem } from '@/hooks/oracles/redstone';
import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';

import { type RedStoneEcosystemViewProps, type EcosystemIntegration } from '../types';

const tvlTrendData = [
  {
    month: '2024-01',
    ethereum: 0.8,
    arbitrum: 0.3,
    polygon: 0.2,
    optimism: 0.15,
    avalanche: 0.1,
    base: 0.05,
    total: 1.6,
  },
  {
    month: '2024-02',
    ethereum: 1.0,
    arbitrum: 0.4,
    polygon: 0.25,
    optimism: 0.2,
    avalanche: 0.12,
    base: 0.08,
    total: 2.05,
  },
  {
    month: '2024-03',
    ethereum: 1.3,
    arbitrum: 0.55,
    polygon: 0.35,
    optimism: 0.28,
    avalanche: 0.15,
    base: 0.12,
    total: 2.75,
  },
  {
    month: '2024-04',
    ethereum: 1.5,
    arbitrum: 0.7,
    polygon: 0.4,
    optimism: 0.35,
    avalanche: 0.18,
    base: 0.15,
    total: 3.28,
  },
  {
    month: '2024-05',
    ethereum: 1.8,
    arbitrum: 0.85,
    polygon: 0.5,
    optimism: 0.42,
    avalanche: 0.22,
    base: 0.2,
    total: 3.99,
  },
  {
    month: '2024-06',
    ethereum: 2.1,
    arbitrum: 1.0,
    polygon: 0.6,
    optimism: 0.5,
    avalanche: 0.28,
    base: 0.25,
    total: 4.73,
  },
  {
    month: '2024-07',
    ethereum: 2.4,
    arbitrum: 1.2,
    polygon: 0.7,
    optimism: 0.6,
    avalanche: 0.32,
    base: 0.32,
    total: 5.54,
  },
  {
    month: '2024-08',
    ethereum: 2.8,
    arbitrum: 1.4,
    polygon: 0.85,
    optimism: 0.72,
    avalanche: 0.38,
    base: 0.4,
    total: 6.55,
  },
  {
    month: '2024-09',
    ethereum: 3.2,
    arbitrum: 1.6,
    polygon: 1.0,
    optimism: 0.85,
    avalanche: 0.45,
    base: 0.5,
    total: 7.6,
  },
  {
    month: '2024-10',
    ethereum: 3.6,
    arbitrum: 1.85,
    polygon: 1.15,
    optimism: 1.0,
    avalanche: 0.52,
    base: 0.62,
    total: 8.74,
  },
  {
    month: '2024-11',
    ethereum: 4.1,
    arbitrum: 2.1,
    polygon: 1.35,
    optimism: 1.15,
    avalanche: 0.6,
    base: 0.75,
    total: 10.05,
  },
  {
    month: '2024-12',
    ethereum: 4.6,
    arbitrum: 2.4,
    polygon: 1.55,
    optimism: 1.32,
    avalanche: 0.7,
    base: 0.9,
    total: 11.47,
  },
];

const projectsByChainData = [
  { chain: 'Ethereum', projects: 145, color: '#627eea' },
  { chain: 'Arbitrum', projects: 85, color: '#28a0f0' },
  { chain: 'Polygon', projects: 62, color: '#8247e5' },
  { chain: 'Optimism', projects: 48, color: '#ff0420' },
  { chain: 'Base', projects: 38, color: '#0052ff' },
  { chain: 'Avalanche', projects: 32, color: '#e84142' },
];

const chainColors: Record<string, string> = {
  ethereum: '#627eea',
  arbitrum: '#28a0f0',
  polygon: '#8247e5',
  optimism: '#ff0420',
  avalanche: '#e84142',
  base: '#0052ff',
};

const FALLBACK_ECOSYSTEM_INTEGRATIONS: EcosystemIntegration[] = [
  { name: 'Arweave', description: 'Permanent data storage', category: 'infrastructure' },
  { name: 'Ethereum', description: 'Smart contract platform', category: 'infrastructure' },
  { name: 'Avalanche', description: 'High-throughput blockchain', category: 'infrastructure' },
  { name: 'Aave', description: 'Decentralized lending protocol', category: 'defi' },
  { name: 'Compound', description: 'Algorithmic money markets', category: 'defi' },
  { name: 'Uniswap', description: 'Decentralized exchange', category: 'defi' },
  { name: 'GMX', description: 'Decentralized perpetual exchange', category: 'defi' },
  { name: 'Pendle', description: 'Yield tokenization protocol', category: 'defi' },
  { name: 'Stargate', description: 'Cross-chain liquidity transport', category: 'defi' },
  { name: 'Radiant', description: 'Cross-chain lending protocol', category: 'defi' },
  { name: 'OpenSea', description: 'NFT marketplace', category: 'nft' },
  { name: 'Blur', description: 'NFT marketplace for pro traders', category: 'nft' },
];

function TimeRangeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1 text-xs font-medium transition-colors',
        active ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-700'
      )}
    >
      {children}
    </button>
  );
}

export function RedStoneEcosystemView({ isLoading }: RedStoneEcosystemViewProps) {
  const t = useTranslations();
  const { ecosystem, isLoading: ecosystemLoading } = useRedStoneEcosystem(!isLoading);

  const [selectedChains, setSelectedChains] = useState<string[]>([
    'ethereum',
    'arbitrum',
    'polygon',
  ]);
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y'>('1Y');

  const showLoading = isLoading || ecosystemLoading;

  const ecosystemIntegrations = useMemo(() => {
    if (ecosystem?.integrations && ecosystem.integrations.length > 0) {
      return ecosystem.integrations.map((integration) => ({
        name: integration.name,
        description: integration.description,
        category: 'defi' as const,
      }));
    }
    return FALLBACK_ECOSYSTEM_INTEGRATIONS;
  }, [ecosystem]);

  const filteredTvlData = useMemo(() => {
    const months = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 };
    return tvlTrendData.slice(-months[timeRange]);
  }, [timeRange]);

  const tvlStats = useMemo(() => {
    const latest = filteredTvlData[filteredTvlData.length - 1];
    const previous = filteredTvlData[0];
    const change = ((latest.total - previous.total) / previous.total) * 100;
    return {
      current: latest.total,
      change,
      breakdown: [
        { chain: 'Ethereum', value: latest.ethereum, color: chainColors.ethereum },
        { chain: 'Arbitrum', value: latest.arbitrum, color: chainColors.arbitrum },
        { chain: 'Polygon', value: latest.polygon, color: chainColors.polygon },
        { chain: 'Optimism', value: latest.optimism, color: chainColors.optimism },
        { chain: 'Avalanche', value: latest.avalanche, color: chainColors.avalanche },
        { chain: 'Base', value: latest.base, color: chainColors.base },
      ],
    };
  }, [filteredTvlData]);

  const ecosystemByCategory = useMemo(() => {
    const categories: Record<string, typeof ecosystemIntegrations> = {};
    ecosystemIntegrations.forEach((item) => {
      if (!categories[item.category]) {
        categories[item.category] = [];
      }
      categories[item.category].push(item);
    });
    return categories;
  }, [ecosystemIntegrations]);

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-gray-900">TVL Analysis</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Total Value Locked across RedStone ecosystem
            </p>
          </div>
          <div className="flex items-center border-b border-gray-200">
            {(['1M', '3M', '6M', '1Y'] as const).map((range) => (
              <TimeRangeButton
                key={range}
                active={timeRange === range}
                onClick={() => setTimeRange(range)}
              >
                {range}
              </TimeRangeButton>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-4 mb-6">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total TVL</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-bold text-gray-900">
                {showLoading ? '-' : `$${tvlStats.current.toFixed(2)}B`}
              </p>
              <span
                className={cn(
                  'text-sm font-medium',
                  tvlStats.change >= 0 ? 'text-emerald-600' : 'text-red-600'
                )}
              >
                {tvlStats.change >= 0 ? '+' : ''}
                {tvlStats.change.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="h-8 w-px bg-gray-200 hidden sm:block" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Ethereum</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-xl font-semibold text-gray-900">
                ${tvlStats.breakdown[0].value.toFixed(2)}B
              </p>
              <span className="text-xs text-gray-500">
                {((tvlStats.breakdown[0].value / tvlStats.current) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">L2 Networks</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-xl font-semibold text-gray-900">
                $
                {(
                  tvlStats.breakdown[1].value +
                  tvlStats.breakdown[3].value +
                  tvlStats.breakdown[5].value
                ).toFixed(2)}
                B
              </p>
              <span className="text-xs text-gray-500">
                {(
                  ((tvlStats.breakdown[1].value +
                    tvlStats.breakdown[3].value +
                    tvlStats.breakdown[5].value) /
                    tvlStats.current) *
                  100
                ).toFixed(1)}
                %
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Alt L1</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-xl font-semibold text-gray-900">
                ${(tvlStats.breakdown[2].value + tvlStats.breakdown[4].value).toFixed(2)}B
              </p>
              <span className="text-xs text-gray-500">
                {(
                  ((tvlStats.breakdown[2].value + tvlStats.breakdown[4].value) / tvlStats.current) *
                  100
                ).toFixed(1)}
                %
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs text-gray-400 mr-1">Filter by Chain:</span>
          {tvlStats.breakdown.map((item) => (
            <button
              key={item.chain}
              onClick={() => {
                setSelectedChains((prev) =>
                  prev.includes(item.chain.toLowerCase())
                    ? prev.filter((c) => c !== item.chain.toLowerCase())
                    : [...prev, item.chain.toLowerCase()]
                );
              }}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 text-xs transition-all border',
                selectedChains.includes(item.chain.toLowerCase())
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              )}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: selectedChains.includes(item.chain.toLowerCase())
                    ? 'white'
                    : item.color,
                }}
              />
              {item.chain}
            </button>
          ))}
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredTvlData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEthereum" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chainColors.ethereum} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={chainColors.ethereum} stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorArbitrum" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chainColors.arbitrum} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={chainColors.arbitrum} stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorPolygon" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chainColors.polygon} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={chainColors.polygon} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="month"
                stroke="#9ca3af"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => value.slice(5)}
              />
              <YAxis
                stroke="#9ca3af"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `$${value}B`}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                formatter={(value) => [`$${Number(value).toFixed(2)}B`, '']}
              />
              {selectedChains.includes('ethereum') && (
                <Area
                  type="monotone"
                  dataKey="ethereum"
                  name="Ethereum"
                  stackId="1"
                  stroke={chainColors.ethereum}
                  fill="url(#colorEthereum)"
                />
              )}
              {selectedChains.includes('arbitrum') && (
                <Area
                  type="monotone"
                  dataKey="arbitrum"
                  name="Arbitrum"
                  stackId="1"
                  stroke={chainColors.arbitrum}
                  fill="url(#colorArbitrum)"
                />
              )}
              {selectedChains.includes('polygon') && (
                <Area
                  type="monotone"
                  dataKey="polygon"
                  name="Polygon"
                  stackId="1"
                  stroke={chainColors.polygon}
                  fill="url(#colorPolygon)"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900">Projects by Chain</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Distribution of projects across supported networks
            </p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectsByChainData} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="chain"
                  stroke="#9ca3af"
                  tick={{ fontSize: 11 }}
                  width={60}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="projects" radius={[0, 4, 4, 0]}>
                  {projectsByChainData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 text-sm">
            <span className="text-gray-500">
              Total Projects: <span className="font-medium text-gray-900">410+</span>
            </span>
            <span className="text-emerald-600 font-medium">+42 this month</span>
          </div>
        </section>

        <div className="border-t border-gray-200 lg:hidden" />

        <section>
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900">Ecosystem Growth</h3>
            <p className="text-sm text-gray-500 mt-0.5">Key performance indicators</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">New Projects</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">42</p>
                <p className="text-xs text-emerald-600">+28.5%</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Integrations</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">
                  {ecosystemIntegrations.length}
                </p>
                <p className="text-xs text-emerald-600">+22.3%</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Community</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">12.8K</p>
                <p className="text-xs text-emerald-600">+35.2%</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Revenue</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">$485K</p>
                <p className="text-xs text-emerald-600">+42.1%</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900">Ecosystem Integrations</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Projects and protocols integrated with RedStone
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(ecosystemByCategory).map(([category, items]) => (
            <div key={category} className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 capitalize">{category}</h4>
              <div className="space-y-2">
                {items.map((integration, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{integration.name}</p>
                      <p className="text-xs text-gray-500">{integration.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default RedStoneEcosystemView;
