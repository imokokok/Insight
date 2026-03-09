'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { API3Client } from '@/lib/oracles/api3';
import { useI18n } from '@/lib/i18n/context';

const api3Client = new API3Client();

const COLORS = ['#1E40AF', '#3B82F6', '#6366F1', '#8B5CF6'];
const CHAIN_COLORS = ['#1E40AF', '#10B981', '#8B5CF6'];

export function FirstPartyOraclePanel() {
  const { t } = useI18n();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fpData = await api3Client.getFirstPartyOracleData();
        setData(fpData);
      } catch (error) {
        console.error('Error fetching first party oracle data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-400">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>{t('api3.loading')}</span>
        </div>
      </div>
    );
  }

  // 地理分布数据
  const regionData = [
    { name: t('api3.firstParty.regions.northAmerica'), value: data.airnodeDeployments.byRegion.northAmerica },
    { name: t('api3.firstParty.regions.europe'), value: data.airnodeDeployments.byRegion.europe },
    { name: t('api3.firstParty.regions.asia'), value: data.airnodeDeployments.byRegion.asia },
    { name: t('api3.firstParty.regions.others'), value: data.airnodeDeployments.byRegion.others },
  ];

  // 区块链分布数据
  const chainData = [
    { name: 'Ethereum', value: data.airnodeDeployments.byChain.ethereum },
    { name: 'Arbitrum', value: data.airnodeDeployments.byChain.arbitrum },
    { name: 'Polygon', value: data.airnodeDeployments.byChain.polygon },
  ];

  // API 提供商类型数据
  const providerTypeData = [
    { name: t('api3.firstParty.providerTypes.exchanges'), value: data.airnodeDeployments.byProviderType.exchanges },
    { name: t('api3.firstParty.providerTypes.traditionalFinance'), value: data.airnodeDeployments.byProviderType.traditionalFinance },
    { name: t('api3.firstParty.providerTypes.others'), value: data.airnodeDeployments.byProviderType.others },
  ];

  // dAPI 资产类型数据
  const assetTypeData = [
    { name: t('api3.firstParty.assetTypes.crypto'), value: data.dapiCoverage.byAssetType.crypto },
    { name: t('api3.firstParty.assetTypes.forex'), value: data.dapiCoverage.byAssetType.forex },
    { name: t('api3.firstParty.assetTypes.commodities'), value: data.dapiCoverage.byAssetType.commodities },
    { name: t('api3.firstParty.assetTypes.stocks'), value: data.dapiCoverage.byAssetType.stocks },
  ];

  return (
    <div className="space-y-6">
      {/* 第一方优势指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">{t('api3.firstParty.advantages.noMiddlemen')}</h3>
          </div>
          <p className="text-sm text-gray-600">{t('api3.firstParty.advantages.noMiddlemenDesc')}</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-600 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">{t('api3.firstParty.advantages.sourceTransparency')}</h3>
          </div>
          <p className="text-sm text-gray-600">{t('api3.firstParty.advantages.sourceTransparencyDesc')}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-600 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">{t('api3.firstParty.advantages.fastResponse')}</h3>
          </div>
          <p className="text-sm text-gray-600">{t('api3.firstParty.advantages.fastResponseDesc')} {data.advantages.responseTime}ms</p>
        </div>
      </div>

      {/* Airnode 统计 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('api3.firstParty.airnodeStats')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{data.airnodeDeployments.total}</p>
            <p className="text-xs text-gray-500 mt-1">{t('api3.firstParty.activeAirnodes')}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{data.dapiCoverage.totalDapis}</p>
            <p className="text-xs text-gray-500 mt-1">{t('api3.firstParty.activeDapis')}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">3</p>
            <p className="text-xs text-gray-500 mt-1">{t('api3.firstParty.supportedChains')}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-orange-600">156</p>
            <p className="text-xs text-gray-500 mt-1">{t('api3.firstParty.apiProviders')}</p>
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 地理分布 */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('api3.firstParty.geographicDistribution')}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={regionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {regionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 区块链分布 */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('api3.firstParty.chainDistribution')}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chainData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#1E40AF" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* API 提供商类型 */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('api3.firstParty.providerTypes.title')}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={providerTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {providerTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* dAPI 资产类型分布 */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('api3.firstParty.dapiAssetTypes')}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assetTypeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
