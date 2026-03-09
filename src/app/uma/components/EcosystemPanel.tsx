'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// 集成协议数据
interface Protocol {
  id: string;
  name: string;
  category: string;
  tvs: number; // Total Value Secured
  description: string;
  logo?: string;
}

// 合约类型数据
interface ContractType {
  name: string;
  value: number;
  color: string;
}

// 区块链数据
interface Blockchain {
  id: string;
  name: string;
  chainId: number;
  status: 'active' | 'pending';
}

// 模拟生态系统数据
const mockEcosystemData = {
  protocols: [
    {
      id: 'across',
      name: 'Across Protocol',
      category: '跨链桥',
      tvs: 15000000,
      description: '快速、低成本的跨链桥接协议',
    },
    {
      id: 'polymarket',
      name: 'Polymarket',
      category: '预测市场',
      tvs: 8000000,
      description: '去中心化预测市场平台',
    },
    {
      id: 'sherlock',
      name: 'Sherlock',
      category: '保险',
      tvs: 5000000,
      description: '智能合约保险协议',
    },
    {
      id: 'superuman',
      name: 'SuperUMAn',
      category: '社区',
      tvs: 3000000,
      description: 'UMA社区治理与激励',
    },
    {
      id: 'angle',
      name: 'Angle Protocol',
      category: '稳定币',
      tvs: 2500000,
      description: '去中心化稳定币协议',
    },
    {
      id: 'malt',
      name: 'Malt Protocol',
      category: '衍生品',
      tvs: 1800000,
      description: '去中心化衍生品交易',
    },
  ] as Protocol[],

  contractTypes: [
    { name: '合成资产', value: 35, color: '#8b5cf6' },
    { name: '衍生品', value: 25, color: '#ec4899' },
    { name: '保险', value: 20, color: '#3b82f6' },
    { name: '预测市场', value: 15, color: '#10b981' },
    { name: '其他', value: 5, color: '#6b7280' },
  ] as ContractType[],

  blockchains: [
    { id: 'ethereum', name: 'Ethereum', chainId: 1, status: 'active' },
    { id: 'polygon', name: 'Polygon', chainId: 137, status: 'active' },
    { id: 'arbitrum', name: 'Arbitrum', chainId: 42161, status: 'active' },
    { id: 'optimism', name: 'Optimism', chainId: 10, status: 'active' },
    { id: 'base', name: 'Base', chainId: 8453, status: 'active' },
    { id: 'boba', name: 'Boba Network', chainId: 288, status: 'active' },
  ] as Blockchain[],

  totalTvs: 34800000,
  protocolCount: 6,
  lastUpdated: new Date(),
};

// 格式化货币
function formatCurrency(value: number, compact: boolean = false): string {
  if (compact) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

// 协议卡片组件
function ProtocolCard({ protocol, index }: { protocol: Protocol; index: number }) {
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      '跨链桥': 'bg-blue-50 text-blue-600 border-blue-200',
      '预测市场': 'bg-green-50 text-green-600 border-green-200',
      '保险': 'bg-purple-50 text-purple-600 border-purple-200',
      '社区': 'bg-pink-50 text-pink-600 border-pink-200',
      '稳定币': 'bg-yellow-50 text-yellow-600 border-yellow-200',
      '衍生品': 'bg-orange-50 text-orange-600 border-orange-200',
    };
    return colors[category] || 'bg-gray-50 text-gray-600 border-gray-200';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-300 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            {protocol.name.charAt(0)}
          </div>
          <div>
            <h4 className="text-gray-900 font-semibold text-sm">{protocol.name}</h4>
            <span className={`inline-block px-2 py-0.5 text-xs rounded-full border mt-1 ${getCategoryColor(protocol.category)}`}>
              {protocol.category}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-gray-900 font-bold text-sm">{formatCurrency(protocol.tvs, true)}</p>
          <p className="text-gray-400 text-xs">TVS</p>
        </div>
      </div>
      <p className="text-gray-500 text-xs leading-relaxed">{protocol.description}</p>
    </div>
  );
}

// 合约类型分布图表组件
function ContractTypeChart({ data }: { data: ContractType[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const onPieEnter = (_: unknown, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
          <p className="text-gray-900 font-semibold text-sm">{payload[0].name}</p>
          <p className="text-purple-600 font-bold">{payload[0].value}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">合约类型分布</p>
          <p className="text-gray-500 text-xs mt-0.5">按使用场景分类</p>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke={activeIndex === index ? '#fff' : 'none'}
                  strokeWidth={activeIndex === index ? 3 : 0}
                  style={{
                    filter: activeIndex === index ? 'brightness(1.1)' : 'none',
                    transform: activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                    transformOrigin: 'center',
                    transition: 'all 0.2s ease',
                  }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              formatter={(value: string) => <span className="text-gray-600 text-xs">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 统计摘要 */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-xs text-gray-500">合成资产</p>
          <p className="text-sm font-semibold text-purple-600">35%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">衍生品</p>
          <p className="text-sm font-semibold text-pink-600">25%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">保险</p>
          <p className="text-sm font-semibold text-blue-600">20%</p>
        </div>
      </div>
    </div>
  );
}

// TVS分布组件
function TvsDistribution({ protocols, totalTvs }: { protocols: Protocol[]; totalTvs: number }) {
  const sortedProtocols = [...protocols].sort((a, b) => b.tvs - a.tvs);
  const maxTvs = sortedProtocols[0]?.tvs || 1;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">TVS 分布</p>
          <p className="text-gray-500 text-xs mt-0.5">按协议分类的总价值保障</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalTvs, true)}</p>
          <p className="text-xs text-gray-400">总 TVS</p>
        </div>
      </div>

      <div className="space-y-3">
        {sortedProtocols.map((protocol, index) => {
          const percentage = (protocol.tvs / totalTvs) * 100;
          const barWidth = (protocol.tvs / maxTvs) * 100;

          return (
            <div key={protocol.id} className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-4">{index + 1}</span>
                  <span className="text-sm text-gray-700 font-medium">{protocol.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-900 font-semibold">{formatCurrency(protocol.tvs, true)}</span>
                  <span className="text-xs text-gray-400">({percentage.toFixed(1)}%)</span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500 group-hover:from-purple-400 group-hover:to-pink-400"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 区块链列表组件
function BlockchainList({ blockchains }: { blockchains: Blockchain[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">支持的区块链</p>
          <p className="text-gray-500 text-xs mt-0.5">UMA 已部署的链</p>
        </div>
        <div className="px-3 py-1 bg-purple-50 rounded-full">
          <span className="text-purple-600 text-xs font-semibold">{blockchains.length} 条链</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {blockchains.map((chain) => (
          <div
            key={chain.id}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-purple-50 transition-colors duration-200"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
              {chain.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{chain.name}</p>
              <p className="text-xs text-gray-400">Chain ID: {chain.chainId}</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs text-green-600 font-medium">活跃</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 主组件
export function EcosystemPanel() {
  const [ecosystemData, setEcosystemData] = useState(mockEcosystemData);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 模拟数据更新
  const simulateDataUpdate = useCallback(() => {
    setEcosystemData((prev) => {
      // 轻微波动 TVS 数据
      const fluctuation = () => (Math.random() - 0.5) * 0.05; // ±2.5% 波动

      const newProtocols = prev.protocols.map((protocol) => ({
        ...protocol,
        tvs: Math.max(1000000, Math.round(protocol.tvs * (1 + fluctuation()))),
      }));

      const newTotalTvs = newProtocols.reduce((sum, p) => sum + p.tvs, 0);

      return {
        ...prev,
        protocols: newProtocols,
        totalTvs: newTotalTvs,
        lastUpdated: new Date(),
      };
    });
    setLastUpdated(new Date());
  }, []);

  // 定时更新数据（每60秒）
  useEffect(() => {
    intervalRef.current = setInterval(simulateDataUpdate, 60000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [simulateDataUpdate]);

  return (
    <div className="space-y-6">
      {/* 头部统计 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">总 TVS</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(ecosystemData.totalTvs, true)}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">集成协议</p>
              <p className="text-2xl font-bold text-gray-900">{ecosystemData.protocolCount}+</p>
            </div>
            <div className="p-3 bg-pink-50 rounded-xl">
              <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">支持链数</p>
              <p className="text-2xl font-bold text-gray-900">{ecosystemData.blockchains.length}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 中部：合约类型图表 + TVS分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ContractTypeChart data={ecosystemData.contractTypes} />
        <TvsDistribution protocols={ecosystemData.protocols} totalTvs={ecosystemData.totalTvs} />
      </div>

      {/* 底部：集成协议列表 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-gray-900 text-sm font-semibold">集成协议</p>
            <p className="text-gray-500 text-xs mt-0.5">使用 UMA 的主要 DeFi 协议</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">最后更新</p>
            <p className="text-sm text-gray-600 font-mono">
              {lastUpdated.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ecosystemData.protocols.map((protocol, index) => (
            <ProtocolCard key={protocol.id} protocol={protocol} index={index} />
          ))}
        </div>
      </div>

      {/* 区块链列表 */}
      <BlockchainList blockchains={ecosystemData.blockchains} />
    </div>
  );
}
