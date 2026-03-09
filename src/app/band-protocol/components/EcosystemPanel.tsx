'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { BandProtocolClient, CrossChainStats, ChainDataRequest } from '@/lib/oracles/bandProtocol';

// 区块链网络信息
interface NetworkInfo {
  id: string;
  name: string;
  chainId: string;
  dataSourceCount: number;
  bridgeStatus: 'active' | 'pending' | 'inactive';
  icon: string;
  color: string;
}

// DeFi 协议信息
interface DeFiProtocol {
  id: string;
  name: string;
  category: string;
  requestVolume24h: number;
  requestVolume7d: number;
  useCase: string;
  logo: string;
  status: 'active' | 'beta' | 'planning';
}

// 统计数据
interface StatsData {
  totalRequests: number;
  successRate: number;
  avgResponseTime: number;
  dataSourceCount: number;
}

// 网络配置数据
const NETWORKS: NetworkInfo[] = [
  {
    id: 'cosmos',
    name: 'Cosmos Hub',
    chainId: 'cosmoshub-4',
    dataSourceCount: 156,
    bridgeStatus: 'active',
    icon: '⚛️',
    color: '#2E3148',
  },
  {
    id: 'osmosis',
    name: 'Osmosis',
    chainId: 'osmosis-1',
    dataSourceCount: 142,
    bridgeStatus: 'active',
    icon: '🌊',
    color: '#5E12A0',
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    chainId: '1',
    dataSourceCount: 238,
    bridgeStatus: 'active',
    icon: '◆',
    color: '#627EEA',
  },
  {
    id: 'polygon',
    name: 'Polygon',
    chainId: '137',
    dataSourceCount: 128,
    bridgeStatus: 'active',
    icon: '⬡',
    color: '#8247E5',
  },
  {
    id: 'avalanche',
    name: 'Avalanche',
    chainId: '43114',
    dataSourceCount: 98,
    bridgeStatus: 'active',
    icon: '🔺',
    color: '#E84142',
  },
  {
    id: 'fantom',
    name: 'Fantom',
    chainId: '250',
    dataSourceCount: 87,
    bridgeStatus: 'active',
    icon: '👻',
    color: '#1969FF',
  },
  {
    id: 'cronos',
    name: 'Cronos',
    chainId: '25',
    dataSourceCount: 76,
    bridgeStatus: 'active',
    icon: '⛓️',
    color: '#002D72',
  },
  {
    id: 'juno',
    name: 'Juno',
    chainId: 'juno-1',
    dataSourceCount: 64,
    bridgeStatus: 'active',
    icon: '🌙',
    color: '#F0827D',
  },
];

// DeFi 协议数据
const DEFI_PROTOCOLS: DeFiProtocol[] = [
  {
    id: 'osmosis-dex',
    name: 'Osmosis DEX',
    category: 'DEX',
    requestVolume24h: 45000,
    requestVolume7d: 315000,
    useCase: '价格喂价、流动性池数据',
    logo: '🌊',
    status: 'active',
  },
  {
    id: 'injective',
    name: 'Injective',
    category: '衍生品',
    requestVolume24h: 32000,
    requestVolume7d: 224000,
    useCase: '衍生品定价、市场数据',
    logo: '⚡',
    status: 'active',
  },
  {
    id: 'cronos-defi',
    name: 'Cronos DeFi',
    category: '综合DeFi',
    requestVolume24h: 28000,
    requestVolume7d: 196000,
    useCase: '借贷协议、收益聚合',
    logo: '💰',
    status: 'active',
  },
  {
    id: 'kava',
    name: 'Kava',
    category: '借贷',
    requestVolume24h: 24000,
    requestVolume7d: 168000,
    useCase: '抵押借贷、稳定币',
    logo: '🏦',
    status: 'active',
  },
  {
    id: 'persistence',
    name: 'Persistence',
    category: '流动性质押',
    requestVolume24h: 18000,
    requestVolume7d: 126000,
    useCase: '质押衍生品定价',
    logo: '🔒',
    status: 'active',
  },
  {
    id: 'umee',
    name: 'Umee',
    category: '跨链借贷',
    requestVolume24h: 15000,
    requestVolume7d: 105000,
    useCase: '跨链利率、资产价格',
    logo: '🌐',
    status: 'beta',
  },
];

// 桥接状态指示器组件
function BridgeStatusIndicator({ status }: { status: NetworkInfo['bridgeStatus'] }) {
  const config = {
    active: {
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
      label: '已连接',
      pulseColor: 'bg-green-400',
    },
    pending: {
      color: 'bg-amber-500',
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      label: '连接中',
      pulseColor: 'bg-amber-400',
    },
    inactive: {
      color: 'bg-gray-400',
      textColor: 'text-gray-500',
      bgColor: 'bg-gray-50',
      label: '未连接',
      pulseColor: 'bg-gray-300',
    },
  };

  const cfg = config[status];

  return (
    <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full ${cfg.bgColor}`}>
      <span className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.pulseColor} opacity-75`}></span>
        <span className={`relative inline-flex rounded-full h-2 w-2 ${cfg.color}`}></span>
      </span>
      <span className={`text-xs font-medium ${cfg.textColor}`}>{cfg.label}</span>
    </div>
  );
}

// 网络卡片组件
function NetworkCard({ network }: { network: NetworkInfo }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-300 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
          style={{ backgroundColor: `${network.color}15`, color: network.color }}
        >
          {network.icon}
        </div>
        <BridgeStatusIndicator status={network.bridgeStatus} />
      </div>
      <h3 className="text-gray-900 font-semibold text-sm mb-1">{network.name}</h3>
      <p className="text-gray-400 text-xs mb-3">{network.chainId}</p>
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="text-gray-500 text-xs">数据源</span>
        <span className="text-purple-600 font-semibold text-sm">{network.dataSourceCount}+</span>
      </div>
    </div>
  );
}

// 跨链数据请求柱状图组件
function CrossChainChart({ data }: { data: ChainDataRequest[] }) {
  const chartData = data.map((chain) => ({
    name: chain.chainName.split(' ')[0],
    fullName: chain.chainName,
    requests: chain.requestCount24h,
    requests7d: chain.requestCount7d,
    requests30d: chain.requestCount30d,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
          <p className="text-gray-900 font-semibold text-sm mb-2">{data.fullName}</p>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-500">24小时:</span>
              <span className="text-purple-600 font-medium">{data.requests.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-500">7天:</span>
              <span className="text-purple-600 font-medium">{data.requests7d.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-500">30天:</span>
              <span className="text-purple-600 font-medium">{data.requests30d.toLocaleString()}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-gray-900 font-semibold text-sm">跨链数据请求分布</h3>
          <p className="text-gray-500 text-xs mt-0.5">按目标链统计的24小时请求量</p>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 11 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 11 }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F3F4F6' }} />
            <Bar
              dataKey="requests"
              fill="#7C3AED"
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// DeFi 协议卡片组件
function ProtocolCard({ protocol }: { protocol: DeFiProtocol }) {
  const statusConfig = {
    active: { bg: 'bg-green-50', text: 'text-green-600', label: '运行中' },
    beta: { bg: 'bg-amber-50', text: 'text-amber-600', label: '测试版' },
    planning: { bg: 'bg-gray-50', text: 'text-gray-500', label: '规划中' },
  };

  const status = statusConfig[protocol.status];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-300 transition-colors duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-xl">
            {protocol.logo}
          </div>
          <div>
            <h4 className="text-gray-900 font-semibold text-sm">{protocol.name}</h4>
            <span className="text-gray-400 text-xs">{protocol.category}</span>
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${status.bg} ${status.text}`}>
          {status.label}
        </span>
      </div>
      <p className="text-gray-600 text-xs mb-3 line-clamp-2">{protocol.useCase}</p>
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div>
          <p className="text-gray-400 text-xs">24h 请求</p>
          <p className="text-purple-600 font-semibold text-sm">
            {protocol.requestVolume24h.toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-xs">7天请求</p>
          <p className="text-gray-700 font-medium text-sm">
            {protocol.requestVolume7d.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

// 统计卡片组件
function StatCard({
  title,
  value,
  unit,
  trend,
  trendDirection,
  icon,
}: {
  title: string;
  value: string;
  unit?: string;
  trend: number;
  trendDirection: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}) {
  const trendColor =
    trendDirection === 'up'
      ? 'text-green-600'
      : trendDirection === 'down'
        ? 'text-red-600'
        : 'text-gray-500';

  const trendIcon = trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '→';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-purple-300 transition-colors duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{title}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-gray-900 text-2xl font-bold">{value}</span>
            {unit && <span className="text-gray-500 text-sm">{unit}</span>}
          </div>
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trendColor}`}>
            <span>{trendIcon}</span>
            <span>
              {trend > 0 ? '+' : ''}
              {trend}%
            </span>
            <span className="text-gray-400 ml-1">vs 上周</span>
          </div>
        </div>
        <div className="p-3 bg-purple-50 rounded-xl text-purple-600">{icon}</div>
      </div>
    </div>
  );
}

// 主组件
export function EcosystemPanel() {
  const [crossChainStats, setCrossChainStats] = useState<CrossChainStats | null>(null);
  const [stats, setStats] = useState<StatsData>({
    totalRequests: 12500000,
    successRate: 99.97,
    avgResponseTime: 245,
    dataSourceCount: 1280,
  });
  const [isLoading, setIsLoading] = useState(true);
  const clientRef = useRef<BandProtocolClient | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 初始化客户端
  useEffect(() => {
    clientRef.current = new BandProtocolClient();
  }, []);

  // 获取跨链统计数据
  const fetchCrossChainStats = useCallback(async () => {
    if (!clientRef.current) return;

    try {
      const data = await clientRef.current.getCrossChainStats();
      setCrossChainStats(data);

      // 更新统计数据
      setStats((prev) => ({
        ...prev,
        totalRequests: data.totalRequests30d,
      }));

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch cross-chain stats:', error);
      setIsLoading(false);
    }
  }, []);

  // 模拟数据更新
  const simulateDataUpdate = useCallback(() => {
    setStats((prev) => ({
      totalRequests: prev.totalRequests + Math.round((Math.random() - 0.3) * 1000),
      successRate: Math.min(100, Math.max(99.5, prev.successRate + (Math.random() - 0.5) * 0.1)),
      avgResponseTime: Math.max(150, Math.min(500, prev.avgResponseTime + (Math.random() - 0.5) * 20)),
      dataSourceCount: prev.dataSourceCount + (Math.random() > 0.9 ? 1 : 0),
    }));

    setCrossChainStats((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        totalRequests24h: prev.totalRequests24h + Math.round((Math.random() - 0.3) * 100),
        chains: prev.chains.map((chain) => ({
          ...chain,
          requestCount24h: chain.requestCount24h + Math.round((Math.random() - 0.3) * 20),
        })),
      };
    });
  }, []);

  // 初始加载
  useEffect(() => {
    fetchCrossChainStats();
  }, [fetchCrossChainStats]);

  // 定时更新数据
  useEffect(() => {
    intervalRef.current = setInterval(simulateDataUpdate, 30000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [simulateDataUpdate]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-48">
          <div className="flex items-center gap-2 text-gray-400">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>加载生态数据...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 统计数据卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="总请求量"
          value={(stats.totalRequests / 1000000).toFixed(2)}
          unit="M"
          trend={12.5}
          trendDirection="up"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          }
        />
        <StatCard
          title="成功率"
          value={stats.successRate.toFixed(2)}
          unit="%"
          trend={0.03}
          trendDirection="up"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          title="平均响应时间"
          value={Math.round(stats.avgResponseTime).toString()}
          unit="ms"
          trend={-5.2}
          trendDirection="down"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          title="支持数据源"
          value={stats.dataSourceCount.toString()}
          unit="+"
          trend={8.7}
          trendDirection="up"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          }
        />
      </div>

      {/* 支持的区块链网络网格 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-gray-900 font-semibold text-sm">支持的区块链网络</h3>
            <p className="text-gray-500 text-xs mt-0.5">Band Protocol 已集成的跨链网络</p>
          </div>
          <span className="text-purple-600 text-xs font-medium bg-purple-50 px-3 py-1 rounded-full">
            {NETWORKS.length} 个网络
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {NETWORKS.map((network) => (
            <NetworkCard key={network.id} network={network} />
          ))}
        </div>
      </div>

      {/* 跨链数据请求分布和 DeFi 协议集成 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 跨链数据请求柱状图 */}
        <CrossChainChart data={crossChainStats?.chains || []} />

        {/* DeFi 协议集成列表 */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-gray-900 font-semibold text-sm">DeFi 协议集成</h3>
              <p className="text-gray-500 text-xs mt-0.5">使用 Band Protocol 数据的主要协议</p>
            </div>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {DEFI_PROTOCOLS.map((protocol) => (
              <ProtocolCard key={protocol.id} protocol={protocol} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
