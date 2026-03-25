'use client';

import { useTranslations } from '@/i18n';
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
    <div className="space-y-8">
      {/* 服务概览列表 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('services.overview') || 'Service Overview'}
        </h3>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* 表头 */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-5">{t('services.service') || 'Service'}</div>
            <div className="col-span-4 text-right">{t('services.requests') || 'Requests'}</div>
            <div className="col-span-3 text-right">{t('services.uptime') || 'Uptime'}</div>
          </div>
          {/* 服务行 */}
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <div
                key={service.id}
                className={`grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-gray-50 transition-colors cursor-pointer ${
                  index !== services.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="col-span-5 flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${service.color}15` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: service.color }} />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{service.name}</span>
                </div>
                <div className="col-span-4 text-right">
                  <span className="text-sm font-semibold text-gray-900">{service.requests}</span>
                </div>
                <div className="col-span-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-sm font-semibold text-emerald-600">{service.uptime}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 服务使用分布 */}
      <div>
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
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('services.about') || 'About Chainlink Services'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
          <div className="flex items-start gap-3">
            <Activity className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-900 block mb-1">Data Feeds</span>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('services.dataFeedsDesc') || 'Decentralized price oracles for DeFi applications, providing high-quality financial market data.'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Zap className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-900 block mb-1">VRF</span>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('services.vrfDesc') || 'Verifiable Random Function for provably fair randomness in gaming and NFT applications.'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-900 block mb-1">Automation</span>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('services.automationDesc') || 'Decentralized automation for smart contracts, enabling conditional execution of on-chain functions.'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <TrendingUp className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-900 block mb-1">CCIP</span>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('services.ccipDesc') || 'Cross-Chain Interoperability Protocol for secure cross-chain messaging and token transfers.'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <BarChart3 className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-900 block mb-1">Functions</span>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('services.functionsDesc') || 'Serverless compute for smart contracts, allowing custom off-chain computations and API integrations.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
