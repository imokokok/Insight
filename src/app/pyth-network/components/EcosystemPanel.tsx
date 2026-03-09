'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

// ==================== 类型定义 ====================

type ProtocolCategory = 'Lending' | 'DEX' | 'Derivatives' | 'Perpetuals' | 'Options';

interface Protocol {
  id: string;
  name: string;
  tvs: number; // Total Value Secured in billions
  category: ProtocolCategory;
  chain: string;
  features: string[];
  logoGradient: string;
}

interface BlockchainNetwork {
  id: string;
  name: string;
  logo: string;
  status: 'active' | 'syncing' | 'maintenance';
  feedsCount: number;
}

interface EcosystemStats {
  totalProtocols: number;
  totalTVS: number;
  supportedChains: number;
  activePublishers: number;
}

// ==================== 模拟数据 ====================

const mockProtocols: Protocol[] = [
  {
    id: 'drift',
    name: 'Drift Protocol',
    tvs: 2.8,
    category: 'Perpetuals',
    chain: 'Solana',
    features: ['Perp Trading', 'Spot Trading', 'Lending'],
    logoGradient: 'from-violet-500 to-purple-600',
  },
  {
    id: 'synthetix',
    name: 'Synthetix',
    tvs: 1.9,
    category: 'Derivatives',
    chain: 'Ethereum',
    features: ['Synth Assets', 'Perp Trading', 'Staking'],
    logoGradient: 'from-teal-500 to-emerald-600',
  },
  {
    id: 'marginfi',
    name: 'MarginFi',
    tvs: 1.2,
    category: 'Lending',
    chain: 'Solana',
    features: ['Lending', 'Borrowing', 'Flash Loans'],
    logoGradient: 'from-blue-500 to-cyan-600',
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    tvs: 3.5,
    category: 'DEX',
    chain: 'Solana',
    features: ['Swap Aggregator', 'Perp Trading', 'DCA'],
    logoGradient: 'from-orange-500 to-amber-600',
  },
  {
    id: 'zeta',
    name: 'Zeta Markets',
    tvs: 0.8,
    category: 'Options',
    chain: 'Solana',
    features: ['Options', 'Futures', 'Structured Products'],
    logoGradient: 'from-pink-500 to-rose-600',
  },
  {
    id: '01',
    name: '01 Exchange',
    tvs: 0.6,
    category: 'Perpetuals',
    chain: 'Solana',
    features: ['Perp Trading', 'Orderbook', 'Cross-Margin'],
    logoGradient: 'from-indigo-500 to-blue-600',
  },
  {
    id: 'flash-trade',
    name: 'Flash Trade',
    tvs: 0.4,
    category: 'Perpetuals',
    chain: 'Solana',
    features: ['Perp Trading', 'Zero Slippage', 'Instant Settlement'],
    logoGradient: 'from-yellow-500 to-orange-600',
  },
  {
    id: 'kamino',
    name: 'Kamino Finance',
    tvs: 1.8,
    category: 'Lending',
    chain: 'Solana',
    features: ['Lending', 'Vaults', 'Yield Farming'],
    logoGradient: 'from-green-500 to-emerald-600',
  },
  {
    id: 'solend',
    name: 'Solend',
    tvs: 2.1,
    category: 'Lending',
    chain: 'Solana',
    features: ['Lending', 'Borrowing', 'Isolated Pools'],
    logoGradient: 'from-cyan-500 to-teal-600',
  },
  {
    id: 'raydium',
    name: 'Raydium',
    tvs: 1.5,
    category: 'DEX',
    chain: 'Solana',
    features: ['AMM', 'Orderbook', 'Yield Farming'],
    logoGradient: 'from-fuchsia-500 to-purple-600',
  },
  {
    id: 'orca',
    name: 'Orca',
    tvs: 1.3,
    category: 'DEX',
    chain: 'Solana',
    features: ['AMM', 'Concentrated Liquidity', 'Whirlpools'],
    logoGradient: 'from-sky-500 to-blue-600',
  },
  {
    id: 'uxd',
    name: 'UXD Protocol',
    tvs: 0.5,
    category: 'Derivatives',
    chain: 'Solana',
    features: ['Stablecoin', 'Delta Neutral', 'Yield'],
    logoGradient: 'from-lime-500 to-green-600',
  },
];

const mockNetworks: BlockchainNetwork[] = [
  { id: 'solana', name: 'Solana', logo: 'SOL', status: 'active', feedsCount: 156 },
  { id: 'ethereum', name: 'Ethereum', logo: 'ETH', status: 'active', feedsCount: 142 },
  { id: 'arbitrum', name: 'Arbitrum', logo: 'ARB', status: 'active', feedsCount: 128 },
  { id: 'optimism', name: 'Optimism', logo: 'OP', status: 'active', feedsCount: 115 },
  { id: 'base', name: 'Base', logo: 'BASE', status: 'active', feedsCount: 98 },
  { id: 'avalanche', name: 'Avalanche', logo: 'AVAX', status: 'active', feedsCount: 87 },
  { id: 'bnb', name: 'BNB Chain', logo: 'BNB', status: 'active', feedsCount: 76 },
  { id: 'polygon', name: 'Polygon', logo: 'MATIC', status: 'active', feedsCount: 72 },
  { id: 'fantom', name: 'Fantom', logo: 'FTM', status: 'active', feedsCount: 65 },
  { id: 'mantle', name: 'Mantle', logo: 'MNT', status: 'active', feedsCount: 58 },
  { id: 'scroll', name: 'Scroll', logo: 'SCR', status: 'active', feedsCount: 52 },
  { id: 'linea', name: 'Linea', logo: 'LIN', status: 'active', feedsCount: 48 },
  { id: 'zksync', name: 'zkSync', logo: 'ZKS', status: 'active', feedsCount: 45 },
  { id: 'starknet', name: 'StarkNet', logo: 'STRK', status: 'syncing', feedsCount: 38 },
  { id: 'sui', name: 'Sui', logo: 'SUI', status: 'active', feedsCount: 42 },
  { id: 'aptos', name: 'Aptos', logo: 'APT', status: 'active', feedsCount: 39 },
  { id: 'injective', name: 'Injective', logo: 'INJ', status: 'active', feedsCount: 35 },
  { id: 'sei', name: 'Sei', logo: 'SEI', status: 'active', feedsCount: 32 },
  { id: 'neutron', name: 'Neutron', logo: 'NTRN', status: 'active', feedsCount: 28 },
  { id: 'osmosis', name: 'Osmosis', logo: 'OSMO', status: 'active', feedsCount: 25 },
];

const mockStats: EcosystemStats = {
  totalProtocols: 280,
  totalTVS: 18.5,
  supportedChains: 50,
  activePublishers: 95,
};

// ==================== 颜色配置 ====================

const CATEGORY_COLORS: Record<ProtocolCategory, { bg: string; text: string; border: string; chart: string }> = {
  Lending: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', chart: '#3B82F6' },
  DEX: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', chart: '#8B5CF6' },
  Derivatives: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200', chart: '#EC4899' },
  Perpetuals: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', chart: '#F59E0B' },
  Options: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', chart: '#10B981' },
};

const NETWORK_STATUS_COLORS = {
  active: { bg: 'bg-emerald-500', text: 'text-emerald-600', label: 'Active' },
  syncing: { bg: 'bg-amber-500', text: 'text-amber-600', label: 'Syncing' },
  maintenance: { bg: 'bg-rose-500', text: 'text-rose-600', label: 'Maintenance' },
};

// ==================== 辅助函数 ====================

function formatTVS(value: number): string {
  return `$${value.toFixed(1)}B`;
}

// ==================== 子组件 ====================

// 统计卡片组件
function StatCard({
  title,
  value,
  subValue,
  icon,
  trend,
}: {
  title: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  trend?: { value: string; positive: boolean };
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:bg-gray-50 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 text-xs uppercase tracking-wider mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subValue && <p className="text-sm text-gray-500 mt-1">{subValue}</p>}
          {trend && (
            <p className={`text-xs mt-2 font-medium ${trend.positive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        <div className="p-3 bg-gray-100 rounded-lg text-gray-700">{icon}</div>
      </div>
    </div>
  );
}

// 协议 Logo 组件
function ProtocolLogo({ name, gradient }: { name: string; gradient: string }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div
      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm shadow-lg`}
    >
      {initial}
    </div>
  );
}

// 类别标签组件
function CategoryTag({ category }: { category: ProtocolCategory }) {
  const colors = CATEGORY_COLORS[category];
  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
      {category}
    </span>
  );
}

// 功能标签组件
function FeatureTag({ feature }: { feature: string }) {
  return (
    <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full border border-gray-200">
      {feature}
    </span>
  );
}

// TVS 分布饼图
function TVSDistributionChart() {
  const chartData = useMemo(() => {
    const categoryTVS: Record<ProtocolCategory, number> = {
      Lending: 0,
      DEX: 0,
      Derivatives: 0,
      Perpetuals: 0,
      Options: 0,
    };
    
    mockProtocols.forEach((protocol) => {
      categoryTVS[protocol.category] += protocol.tvs;
    });

    return Object.entries(categoryTVS)
      .filter(([, tvs]) => tvs > 0)
      .map(([category, tvs]) => ({
        name: category,
        value: tvs,
        color: CATEGORY_COLORS[category as ProtocolCategory].chart,
      }));
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-gray-900 text-sm font-semibold">TVS Distribution</h3>
          <p className="text-gray-500 text-xs mt-0.5">By protocol category</p>
        </div>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <RechartsTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-xl">
                      <p className="text-gray-900 font-medium">{data.name}</p>
                      <p className="text-gray-600 text-sm">TVS: {formatTVS(data.value)}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 图例 */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-gray-600 truncate">{item.name}</span>
            <span className="text-xs text-gray-500 ml-auto">{formatTVS(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 协议列表组件
function ProtocolList() {
  const sortedProtocols = useMemo(() => {
    return [...mockProtocols].sort((a, b) => b.tvs - a.tvs);
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200">
        <h3 className="text-gray-900 text-sm font-semibold">DeFi Protocol Integrations</h3>
        <p className="text-gray-500 text-xs mt-0.5">Major protocols powered by Pyth</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Protocol
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Chain
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                TVS
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                Features
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedProtocols.map((protocol) => (
              <tr key={protocol.id} className="hover:bg-gray-50 transition-colors duration-200">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <ProtocolLogo name={protocol.name} gradient={protocol.logoGradient} />
                    <span className="text-sm font-medium text-gray-900">{protocol.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <CategoryTag category={protocol.category} />
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-700">{protocol.chain}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-semibold text-gray-900">{formatTVS(protocol.tvs)}</span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {protocol.features.map((feature) => (
                      <FeatureTag key={feature} feature={feature} />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 区块链网络卡片组件
function NetworkCard({ network }: { network: BlockchainNetwork }) {
  const statusConfig = NETWORK_STATUS_COLORS[network.status];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 group cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* 网络 Logo */}
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-lg group-hover:scale-110 transition-transform duration-200">
            {network.logo}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{network.name}</h4>
            <p className="text-xs text-gray-500">{network.feedsCount} price feeds</p>
          </div>
        </div>
        {/* 状态指示器 */}
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`${network.status === 'active' ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full ${statusConfig.bg} opacity-75`}
            />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${statusConfig.bg}`} />
          </span>
          <span className={`text-xs ${statusConfig.text}`}>{statusConfig.label}</span>
        </div>
      </div>
    </div>
  );
}

// 区块链网络网格组件
function NetworkGrid() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-gray-900 text-sm font-semibold">Supported Blockchains</h3>
          <p className="text-gray-500 text-xs mt-0.5">50+ blockchain networks integrated</p>
        </div>
        <span className="text-xs text-violet-600 font-medium bg-violet-50 px-2 py-1 rounded-full">
          {mockNetworks.length} Chains
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {mockNetworks.map((network) => (
          <NetworkCard key={network.id} network={network} />
        ))}
      </div>
    </div>
  );
}

// 主要集成项目卡片
function FeaturedIntegrations() {
  const featured = mockProtocols.slice(0, 4);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {featured.map((protocol) => (
        <div
          key={protocol.id}
          className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-violet-300 transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-start justify-between mb-3">
            <ProtocolLogo name={protocol.name} gradient={protocol.logoGradient} />
            <CategoryTag category={protocol.category} />
          </div>
          <h4 className="text-gray-900 font-semibold text-sm mb-1 group-hover:text-violet-600 transition-colors">
            {protocol.name}
          </h4>
          <p className="text-xs text-gray-500 mb-3">{protocol.chain}</p>
          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <span className="text-xs text-gray-500">TVS</span>
            <span className="text-sm font-bold text-gray-900">{formatTVS(protocol.tvs)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== 主面板组件 ====================

export function EcosystemPanel() {
  return (
    <div className="space-y-6">
      {/* 统计卡片区域 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Integrated Protocols"
          value={`${mockStats.totalProtocols}+`}
          subValue="Across DeFi ecosystem"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          }
          trend={{ value: '15% this month', positive: true }}
        />
        <StatCard
          title="Total Value Secured"
          value={formatTVS(mockStats.totalTVS)}
          subValue="Across all protocols"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          }
          trend={{ value: '22% this month', positive: true }}
        />
        <StatCard
          title="Supported Blockchains"
          value={`${mockStats.supportedChains}+`}
          subValue="Multi-chain coverage"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          }
          trend={{ value: '5 new this month', positive: true }}
        />
        <StatCard
          title="Active Publishers"
          value={mockStats.activePublishers.toString()}
          subValue="First-party data providers"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          }
          trend={{ value: '8 new this month', positive: true }}
        />
      </div>

      {/* 主要集成项目 */}
      <div>
        <h3 className="text-gray-900 font-semibold text-sm mb-3">Featured Integrations</h3>
        <FeaturedIntegrations />
      </div>

      {/* TVS 分布和协议列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TVS 分布饼图 */}
        <div className="lg:col-span-1">
          <TVSDistributionChart />
        </div>

        {/* DeFi 协议列表 */}
        <div className="lg:col-span-2">
          <ProtocolList />
        </div>
      </div>

      {/* 区块链网络网格 */}
      <NetworkGrid />
    </div>
  );
}

export default EcosystemPanel;
