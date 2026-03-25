'use client';

import { useTranslations } from 'next-intl';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Activity,
  Zap,
  Clock,
  TrendingUp,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';

// 核心服务数据
const services = [
  { id: 'data-feeds', name: 'Data Feeds', color: '#3b82f6', icon: Activity, requests: '12.4M', uptime: 99.97 },
  { id: 'vrf', name: 'VRF', color: '#8b5cf6', icon: Zap, requests: '4.5M', uptime: 99.95 },
  { id: 'automation', name: 'Automation', color: '#10b981', icon: Clock, requests: '3.9M', uptime: 99.92 },
  { id: 'ccip', name: 'CCIP', color: '#f59e0b', icon: TrendingUp, requests: '1.8M', uptime: 99.89 },
  { id: 'functions', name: 'Functions', color: '#ef4444', icon: BarChart3, requests: '980K', uptime: 99.85 },
];

const serviceUsageData = [
  { name: 'Data Feeds', value: 12400000, color: '#3b82f6' },
  { name: 'VRF', value: 4500000, color: '#8b5cf6' },
  { name: 'Automation', value: 3890000, color: '#10b981' },
  { name: 'CCIP', value: 1850000, color: '#f59e0b' },
  { name: 'Functions', value: 980000, color: '#ef4444' },
];

export function ChainlinkServicesView() {
  const t = useTranslations('chainlink');

  return (
    <div className="space-y-6">
      {/* 服务概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {services.map((service) => {
          const Icon = service.icon;
          return (
            <div
              key={service.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: `${service.color}15` }}
                >
                  <Icon className="w-4 h-4" style={{ color: service.color }} />
                </div>
                <span className="text-sm font-medium text-gray-900">{service.name}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{t('services.requests') || 'Requests'}</span>
                  <span className="text-sm font-semibold text-gray-900">{service.requests}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{t('services.uptime') || 'Uptime'}</span>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span className="text-sm font-semibold text-emerald-600">{service.uptime}%</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 服务使用分布 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('services.usageDistribution') || 'Service Usage Distribution'}
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serviceUsageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
                tickFormatter={(value) =>
                  value >= 1000000 ? `${(value / 1000000).toFixed(0)}M` : `${(value / 1000).toFixed(0)}K`
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                formatter={(value) =>
                  typeof value === 'number'
                    ? value >= 1000000
                      ? `${(value / 1000000).toFixed(2)}M`
                      : `${(value / 1000).toFixed(0)}K`
                    : value
                }
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {serviceUsageData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 服务说明 */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          {t('services.about') || 'About Chainlink Services'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-900">Data Feeds</span>
            </div>
            <p className="text-xs text-gray-600">
              {t('services.dataFeedsDesc') || 'Decentralized price oracles for DeFi applications, providing high-quality financial market data.'}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-900">VRF</span>
            </div>
            <p className="text-xs text-gray-600">
              {t('services.vrfDesc') || 'Verifiable Random Function for provably fair randomness in gaming and NFT applications.'}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-gray-900">Automation</span>
            </div>
            <p className="text-xs text-gray-600">
              {t('services.automationDesc') || 'Decentralized automation for smart contracts, enabling conditional execution of on-chain functions.'}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-gray-900">CCIP</span>
            </div>
            <p className="text-xs text-gray-600">
              {t('services.ccipDesc') || 'Cross-Chain Interoperability Protocol for secure cross-chain messaging and token transfers.'}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-gray-900">Functions</span>
            </div>
            <p className="text-xs text-gray-600">
              {t('services.functionsDesc') || 'Serverless compute for smart contracts, allowing custom off-chain computations and API integrations.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
