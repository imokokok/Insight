'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

// ==================== 类型定义 ====================

type Protocol = {
  id: string;
  name: string;
  tvs: number; // Total Value Secured in billions
  features: string[];
  category: 'Lending' | 'DEX' | 'Derivatives' | 'Stablecoin';
};

type BlockchainNetwork = {
  id: string;
  name: string;
  dataSources: number;
  status: 'active' | 'syncing' | 'maintenance';
  tvs: number;
};

type EcosystemStats = {
  totalProtocols: number;
  totalTVS: number;
  supportedChains: number;
  activeDataSources: number;
};

// ==================== 模拟数据 ====================

const mockEcosystemData = {
  // DeFi 协议数据（按 TVS 降序排列）
  protocols: [
    {
      id: 'aave',
      name: 'Aave',
      tvs: 12.5,
      features: ['Price Feeds', 'VRF', 'Automation'],
      category: 'Lending',
    },
    {
      id: 'compound',
      name: 'Compound',
      tvs: 4.8,
      features: ['Price Feeds', 'Proof of Reserve'],
      category: 'Lending',
    },
    {
      id: 'synthetix',
      name: 'Synthetix',
      tvs: 2.3,
      features: ['Price Feeds', 'Keepers'],
      category: 'Derivatives',
    },
    {
      id: 'makerdao',
      name: 'MakerDAO',
      tvs: 6.2,
      features: ['Price Feeds', 'Proof of Reserve', 'Automation'],
      category: 'Stablecoin',
    },
    {
      id: 'uniswap',
      name: 'Uniswap',
      tvs: 3.9,
      features: ['Price Feeds', 'TWAP'],
      category: 'DEX',
    },
    {
      id: 'sushiswap',
      name: 'SushiSwap',
      tvs: 0.8,
      features: ['Price Feeds'],
      category: 'DEX',
    },
    {
      id: 'curve',
      name: 'Curve',
      tvs: 2.1,
      features: ['Price Feeds', 'Automation'],
      category: 'DEX',
    },
    {
      id: 'balancer',
      name: 'Balancer',
      tvs: 1.4,
      features: ['Price Feeds', 'VRF'],
      category: 'DEX',
    },
  ] as Protocol[],

  // 区块链网络数据
  networks: [
    { id: 'ethereum', name: 'Ethereum', dataSources: 485, status: 'active', tvs: 25.4 },
    { id: 'arbitrum', name: 'Arbitrum', dataSources: 156, status: 'active', tvs: 4.2 },
    { id: 'optimism', name: 'Optimism', dataSources: 98, status: 'active', tvs: 2.1 },
    { id: 'polygon', name: 'Polygon', dataSources: 234, status: 'active', tvs: 1.8 },
    { id: 'avalanche', name: 'Avalanche', dataSources: 127, status: 'active', tvs: 1.2 },
    { id: 'bnb-chain', name: 'BNB Chain', dataSources: 189, status: 'active', tvs: 0.9 },
    { id: 'base', name: 'Base', dataSources: 76, status: 'syncing', tvs: 0.6 },
    { id: 'fantom', name: 'Fantom', dataSources: 89, status: 'active', tvs: 0.4 },
  ] as BlockchainNetwork[],

  // 统计数据
  stats: {
    totalProtocols: 450,
    totalTVS: 34.0,
    supportedChains: 20,
    activeDataSources: 1454,
  } as EcosystemStats,
};

// ==================== 颜色配置 ====================

const PIE_COLORS = [
  '#3B82F6', // blue-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#F59E0B', // amber-500
  '#10B981', // emerald-500
  '#06B6D4', // cyan-500
  '#F97316', // orange-500
  '#6366F1', // indigo-500
];

const CATEGORY_COLORS: Record<string, string> = {
  Lending: 'bg-blue-50 text-blue-600 border-blue-200',
  DEX: 'bg-violet-50 text-violet-600 border-violet-200',
  Derivatives: 'bg-pink-50 text-pink-600 border-pink-200',
  Stablecoin: 'bg-amber-50 text-amber-600 border-amber-200',
};

const NETWORK_STATUS_COLORS = {
  active: { bg: 'bg-emerald-500', text: 'text-emerald-600', label: 'Active' },
  syncing: { bg: 'bg-amber-500', text: 'text-amber-600', label: 'Syncing' },
  maintenance: { bg: 'bg-rose-500', text: 'text-rose-600', label: 'Maintenance' },
};

// ==================== 辅助函数 ====================

// 生成渐变色背景
function getGradientColors(name: string): string {
  const gradients = [
    'from-blue-500 to-cyan-400',
    'from-violet-500 to-purple-400',
    'from-pink-500 to-rose-400',
    'from-amber-500 to-orange-400',
    'from-emerald-500 to-teal-400',
    'from-indigo-500 to-blue-400',
    'from-cyan-500 to-blue-400',
    'from-fuchsia-500 to-pink-400',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

// 格式化 TVS 显示
function formatTVS(value: number): string {
  return `$${value.toFixed(1)}B`;
}

// ==================== 子组件 ====================

// 协议 Logo 组件
function ProtocolLogo({ name }: { name: string }) {
  const gradient = getGradientColors(name);
  const initial = name.charAt(0).toUpperCase();

  return (
    <div
      className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm shadow-lg`}
    >
      {initial}
    </div>
  );
}

// 协议功能标签组件
function FeatureTag({ feature }: { feature: string }) {
  return (
    <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full border border-gray-200">
      {feature}
    </span>
  );
}

// 协议类别标签组件
function CategoryTag({ category }: { category: string }) {
  const colorClass = CATEGORY_COLORS[category] || 'bg-gray-200 text-gray-600 border-gray-200';
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full border ${colorClass}`}>{category}</span>
  );
}

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
            <p
              className={`text-xs mt-2 font-medium ${trend.positive ? 'text-emerald-600' : 'text-rose-600'}`}
            >
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        <div className="p-3 bg-gray-100 rounded-lg text-gray-700">{icon}</div>
      </div>
    </div>
  );
}

// TVS 饼图自定义 Tooltip
interface TooltipPayloadItem {
  payload: {
    name: string;
    tvs: number;
  };
}

function CustomPieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const percent = ((data.tvs / mockEcosystemData.stats.totalTVS) * 100).toFixed(1);
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-xl">
        <p className="text-gray-900 font-medium">{data.name}</p>
        <p className="text-gray-600 text-sm">TVS: {formatTVS(data.tvs)}</p>
        <p className="text-gray-600 text-sm">占比: {percent}%</p>
      </div>
    );
  }
  return null;
}

// ==================== 主要组件 ====================

// 统计卡片区域
function StatsSection() {
  const { stats } = mockEcosystemData;

  const statItems = [
    {
      title: 'Total Integrated Protocols',
      value: `${stats.totalProtocols}+`,
      subValue: 'Across DeFi ecosystem',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
      trend: { value: '12% this month', positive: true },
    },
    {
      title: 'Total Value Secured',
      value: formatTVS(stats.totalTVS),
      subValue: 'Across all protocols',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      ),
      trend: { value: '8.5% this month', positive: true },
    },
    {
      title: 'Supported Blockchains',
      value: `${stats.supportedChains}+`,
      subValue: 'Multi-chain coverage',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
      ),
      trend: { value: '2 new this month', positive: true },
    },
    {
      title: 'Active Data Sources',
      value: `${stats.activeDataSources.toLocaleString()}+`,
      subValue: 'Real-time price feeds',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      trend: { value: '5.2% this month', positive: true },
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
}

// TVS 分布饼图组件
function TVSDistributionChart() {
  const { protocols, stats } = mockEcosystemData;

  // 按 TVS 排序并准备图表数据
  const chartData = useMemo(() => {
    return [...protocols]
      .sort((a, b) => b.tvs - a.tvs)
      .map((protocol) => ({
        name: protocol.name,
        tvs: protocol.tvs,
        value: protocol.tvs,
      }));
  }, [protocols]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-gray-900 text-sm font-semibold">TVS Distribution</h3>
          <p className="text-gray-500 text-xs mt-0.5">By DeFi Protocol</p>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="tvs"
              nameKey="name"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip content={<CustomPieTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 图例 */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {chartData.map((item, index) => {
          const percent = ((item.tvs / stats.totalTVS) * 100).toFixed(1);
          return (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
              />
              <span className="text-xs text-gray-600 truncate">{item.name}</span>
              <span className="text-xs text-gray-500 ml-auto">{percent}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// DeFi 协议列表组件
function ProtocolList() {
  const { protocols } = mockEcosystemData;

  // 按 TVS 降序排序
  const sortedProtocols = useMemo(() => {
    return [...protocols].sort((a, b) => b.tvs - a.tvs);
  }, [protocols]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200">
        <h3 className="text-gray-900 text-sm font-semibold">DeFi Protocol Integrations</h3>
        <p className="text-gray-500 text-xs mt-0.5">Major protocols using Chainlink</p>
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
                TVS
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider hidden md:table-cell">
                Chainlink Features
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedProtocols.map((protocol) => (
              <tr key={protocol.id} className="hover:bg-gray-50 transition-colors duration-200">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <ProtocolLogo name={protocol.name} />
                    <span className="text-sm font-medium text-gray-900">{protocol.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <CategoryTag category={protocol.category} />
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatTVS(protocol.tvs)}
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
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
          {/* 网络 Logo（使用首字母） */}
          <div
            className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getGradientColors(network.name)} flex items-center justify-center text-white font-bold text-sm shadow-lg group-hover:scale-110 transition-transform duration-200`}
          >
            {network.name.charAt(0)}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{network.name}</h4>
            <p className="text-xs text-gray-500">TVS: {formatTVS(network.tvs)}</p>
          </div>
        </div>
        {/* 状态指示器 */}
        <div className="flex items-center gap-1.5">
          <span className={`relative flex h-2.5 w-2.5`}>
            <span
              className={`${network.status === 'active' ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full ${statusConfig.bg} opacity-75`}
            />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${statusConfig.bg}`} />
          </span>
          <span className={`text-xs ${statusConfig.text}`}>{statusConfig.label}</span>
        </div>
      </div>

      {/* 数据源数量 */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <span className="text-xs text-gray-600">Data Sources</span>
        </div>
        <span className="text-sm font-semibold text-gray-900">{network.dataSources}</span>
      </div>
    </div>
  );
}

// 区块链网络网格组件
function NetworkGrid() {
  const { networks } = mockEcosystemData;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-gray-900 text-sm font-semibold">Supported Blockchains</h3>
          <p className="text-gray-500 text-xs mt-0.5">Multi-chain oracle network</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {networks.map((network) => (
          <NetworkCard key={network.id} network={network} />
        ))}
      </div>
    </div>
  );
}

// ==================== 主面板组件 ====================

export function EcosystemPanel() {
  return (
    <div className="space-y-6">
      {/* 统计卡片区域 */}
      <StatsSection />

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
