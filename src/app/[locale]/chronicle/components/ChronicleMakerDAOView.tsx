'use client';

import { useState } from 'react';

import { Database, Coins, TrendingUp, Shield } from 'lucide-react';

import { useTranslations } from '@/i18n';
import { formatCompactCurrency } from '@/lib/utils/format';

import { type ChronicleMakerDAOViewProps } from '../types';

import { ChronicleDataTable } from './ChronicleDataTable';

interface AssetData {
  id: string;
  symbol: string;
  name: string;
  type: 'stablecoin' | 'crypto' | 'rwa';
  price: number;
  collateralRatio: number;
  stabilityFee: number;
  debtCeiling: number;
}

const mockAssets: AssetData[] = [
  {
    id: '1',
    symbol: 'ETH',
    name: 'Ethereum',
    type: 'crypto',
    price: 3250.45,
    collateralRatio: 145,
    stabilityFee: 2.5,
    debtCeiling: 500000000,
  },
  {
    id: '2',
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    type: 'crypto',
    price: 67500.2,
    collateralRatio: 145,
    stabilityFee: 2.0,
    debtCeiling: 300000000,
  },
  {
    id: '3',
    symbol: 'USDC',
    name: 'USD Coin',
    type: 'stablecoin',
    price: 1.0,
    collateralRatio: 101,
    stabilityFee: 0.5,
    debtCeiling: 800000000,
  },
  {
    id: '4',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    type: 'stablecoin',
    price: 1.0,
    collateralRatio: 0,
    stabilityFee: 0,
    debtCeiling: 0,
  },
  {
    id: '5',
    symbol: 'RWA001',
    name: 'Real World Asset',
    type: 'rwa',
    price: 1000000.0,
    collateralRatio: 110,
    stabilityFee: 3.5,
    debtCeiling: 100000000,
  },
  {
    id: '6',
    symbol: 'LINK',
    name: 'Chainlink',
    type: 'crypto',
    price: 14.85,
    collateralRatio: 165,
    stabilityFee: 3.0,
    debtCeiling: 50000000,
  },
];

// Categories will be created in component with translations

export function ChronicleMakerDAOView({ makerDAO, isLoading }: ChronicleMakerDAOViewProps) {
  const t = useTranslations();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Categories with translations
  const categories = [
    { id: 'all', label: t('chronicle.makerdao.allAssets'), count: mockAssets.length },
    { id: 'crypto', label: t('chronicle.assetType.crypto'), count: mockAssets.filter((f) => f.type === 'crypto').length },
    {
      id: 'stablecoin',
      label: t('chronicle.assetType.stablecoin'),
      count: mockAssets.filter((f) => f.type === 'stablecoin').length,
    },
    { id: 'rwa', label: t('chronicle.assetType.rwa'), count: mockAssets.filter((f) => f.type === 'rwa').length },
  ];

  const getAssetTypeColor = (type: string) => {
    switch (type) {
      case 'stablecoin':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'crypto':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'rwa':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const filteredAssets =
    selectedCategory === 'all'
      ? mockAssets
      : mockAssets.filter((asset) => asset.type === selectedCategory);

  const columns = [
    {
      key: 'symbol',
      header: t('chronicle.makerdao.asset'),
      sortable: true,
      render: (item: AssetData) => (
        <div>
          <span className="font-semibold text-gray-900">{item.symbol}</span>
          <span className="text-sm text-gray-500 ml-2">{item.name}</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: t('chronicle.makerdao.type'),
      sortable: true,
      render: (item: AssetData) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize`}
        >
          {item.type}
        </span>
      ),
    },
    {
      key: 'price',
      header: t('chronicle.makerdao.price'),
      sortable: true,
      render: (item: AssetData) => `$${item.price.toLocaleString()}`,
    },
    {
      key: 'collateralRatio',
      header: t('chronicle.makerdao.collateralRatio'),
      sortable: true,
      render: (item: AssetData) => (item.collateralRatio > 0 ? `${item.collateralRatio}%` : '-'),
    },
    {
      key: 'stabilityFee',
      header: t('chronicle.makerdao.stabilityFee'),
      sortable: true,
      render: (item: AssetData) => (item.stabilityFee > 0 ? `${item.stabilityFee}%` : '-'),
    },
    {
      key: 'debtCeiling',
      header: t('chronicle.makerdao.debtCeiling'),
      sortable: true,
      render: (item: AssetData) => (item.debtCeiling > 0 ? formatCompactCurrency(item.debtCeiling) : '-'),
    },
  ];

  const keyMetrics = [
    {
      label: t('chronicle.makerdao.tvl'),
      value: formatCompactCurrency(makerDAO?.totalValueLocked || 4500000000),
      icon: Database,
    },
    {
      label: t('chronicle.makerdao.daiSupply'),
      value: formatCompactCurrency(makerDAO?.daiSupply || 3200000000),
      icon: Coins,
    },
    {
      label: t('chronicle.makerdao.systemSurplus'),
      value: formatCompactCurrency(makerDAO?.systemSurplus || 85000000),
      icon: TrendingUp,
      highlight: true,
    },
    {
      label: t('chronicle.makerdao.debtCeiling'),
      value: formatCompactCurrency(makerDAO?.globalDebtCeiling || 5000000000),
      icon: Shield,
    },
  ];

  return (
    <div className="space-y-8">
      {/* 关键指标 - 4列内联布局 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {keyMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={index} className="py-2">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Icon className="w-4 h-4" />
                <span className="text-sm">{metric.label}</span>
              </div>
              <p
                className={`text-2xl font-semibold tracking-tight ${metric.highlight ? 'text-emerald-600' : 'text-gray-900'}`}
              >
                {metric.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 分类筛选 */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-4">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              selectedCategory === category.id
                ? 'text-gray-900 bg-gray-100'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {category.label}
            <span
              className={`text-xs ${
                selectedCategory === category.id ? 'text-gray-600' : 'text-gray-400'
              }`}
            >
              {category.count}
            </span>
          </button>
        ))}
      </div>

      {/* 数据表格 */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          {t('chronicle.makerdao.supportedAssets')}
        </h3>
        <ChronicleDataTable data={filteredAssets} columns={columns} />
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 集成信息说明 */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          {t('chronicle.makerdao.integrationInfo')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm text-gray-600">
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900">
                {t('chronicle.makerdao.integrationVersion')}:
              </span>{' '}
              {makerDAO?.integrationVersion || '2.5.1'}
            </p>
            <p>
              <span className="font-medium text-gray-900">
                {t('chronicle.makerdao.lastUpdate')}:
              </span>{' '}
              {t('chronicle.timeAgo.hours', { count: 2 })}
            </p>
          </div>
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900">
                {t('chronicle.makerdao.oracleType')}:
              </span>{' '}
              {t('chronicle.makerdao.primaryPriceFeed')}
            </p>
            <p>
              <span className="font-medium text-gray-900">
                {t('chronicle.makerdao.updateFrequency')}:
              </span>{' '}
              ~60s
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
