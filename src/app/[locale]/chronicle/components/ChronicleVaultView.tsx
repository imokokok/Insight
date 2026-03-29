'use client';

import { useState } from 'react';

import {
  Landmark,
  Shield,
  TrendingUp,
  AlertTriangle,
  Coins,
  Percent,
  Activity,
} from 'lucide-react';

import { useTranslations } from '@/i18n';
import { formatCompactCurrency } from '@/lib/utils/format';

import { ChronicleDataTable } from './ChronicleDataTable';

interface VaultTypeData {
  id: string;
  type: string;
  name: string;
  totalVaults: number;
  collateralValue: number;
  debtValue: number;
  collateralRatio: number;
  stabilityFee: number;
  debtCeiling: number;
  debtCeilingUsed: number;
}

interface AuctionData {
  id: string;
  vaultId: string;
  collateralType: string;
  collateralAmount: number;
  debtAmount: number;
  startTime: string;
  status: 'active' | 'completed' | 'pending';
  currentBid?: number;
}

interface LiquidationHistory {
  id: string;
  vaultId: string;
  collateralType: string;
  liquidatedCollateral: number;
  debtCovered: number;
  liquidationDate: string;
  price: number;
}

interface VaultData {
  totalVaults: number;
  totalCollateralValue: number;
  totalDebtValue: number;
  averageCollateralRatio: number;
  vaultTypes: VaultTypeData[];
  activeAuctions: AuctionData[];
  liquidationHistory: LiquidationHistory[];
}

interface ChronicleVaultViewProps {
  vaultData: VaultData | null;
  isLoading: boolean;
}

const mockVaultTypes: VaultTypeData[] = [
  {
    id: '1',
    type: 'ETH-A',
    name: 'Ethereum-A',
    totalVaults: 1250,
    collateralValue: 1850000000,
    debtValue: 980000000,
    collateralRatio: 189,
    stabilityFee: 2.5,
    debtCeiling: 2500000000,
    debtCeilingUsed: 39.2,
  },
  {
    id: '2',
    type: 'WBTC-A',
    name: 'Wrapped Bitcoin-A',
    totalVaults: 856,
    collateralValue: 1250000000,
    debtValue: 620000000,
    collateralRatio: 202,
    stabilityFee: 2.0,
    debtCeiling: 1500000000,
    debtCeilingUsed: 41.3,
  },
  {
    id: '3',
    type: 'USDC-A',
    name: 'USD Coin-A',
    totalVaults: 432,
    collateralValue: 450000000,
    debtValue: 380000000,
    collateralRatio: 118,
    stabilityFee: 0.5,
    debtCeiling: 800000000,
    debtCeilingUsed: 47.5,
  },
  {
    id: '4',
    type: 'LINK-A',
    name: 'Chainlink-A',
    totalVaults: 128,
    collateralValue: 85000000,
    debtValue: 42000000,
    collateralRatio: 202,
    stabilityFee: 3.0,
    debtCeiling: 150000000,
    debtCeilingUsed: 28.0,
  },
];

const mockAuctions: AuctionData[] = [
  {
    id: '1',
    vaultId: 'VLT-2847',
    collateralType: 'ETH-A',
    collateralAmount: 125.5,
    debtAmount: 285000,
    startTime: '2 hours ago',
    status: 'active',
    currentBid: 282500,
  },
  {
    id: '2',
    vaultId: 'VLT-1923',
    collateralType: 'WBTC-A',
    collateralAmount: 8.25,
    debtAmount: 425000,
    startTime: '5 hours ago',
    status: 'active',
    currentBid: 420000,
  },
  {
    id: '3',
    vaultId: 'VLT-3102',
    collateralType: 'ETH-A',
    collateralAmount: 45.0,
    debtAmount: 98000,
    startTime: '1 day ago',
    status: 'completed',
  },
];

const mockLiquidationHistory: LiquidationHistory[] = [
  {
    id: '1',
    vaultId: 'VLT-2847',
    collateralType: 'ETH-A',
    liquidatedCollateral: 125.5,
    debtCovered: 285000,
    liquidationDate: '2024-01-15',
    price: 2270.45,
  },
  {
    id: '2',
    vaultId: 'VLT-1923',
    collateralType: 'WBTC-A',
    liquidatedCollateral: 8.25,
    debtCovered: 425000,
    liquidationDate: '2024-01-14',
    price: 51515.15,
  },
  {
    id: '3',
    vaultId: 'VLT-3102',
    collateralType: 'ETH-A',
    liquidatedCollateral: 45.0,
    debtCovered: 98000,
    liquidationDate: '2024-01-12',
    price: 2177.78,
  },
  {
    id: '4',
    vaultId: 'VLT-1456',
    collateralType: 'LINK-A',
    liquidatedCollateral: 12500,
    debtCovered: 125000,
    liquidationDate: '2024-01-10',
    price: 10.0,
  },
];

// Categories will be created in component with translations

export function ChronicleVaultView({ vaultData, isLoading }: ChronicleVaultViewProps) {
  const t = useTranslations();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Categories with translations
  const vaultCategories = [
    { id: 'all', label: t('chronicle.makerdao.allAssets'), count: mockVaultTypes.length },
    { id: 'ETH-A', label: 'ETH-A', count: mockVaultTypes.filter((v) => v.type === 'ETH-A').length },
    {
      id: 'WBTC-A',
      label: 'WBTC-A',
      count: mockVaultTypes.filter((v) => v.type === 'WBTC-A').length,
    },
    {
      id: 'USDC-A',
      label: 'USDC-A',
      count: mockVaultTypes.filter((v) => v.type === 'USDC-A').length,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'pending':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getCollateralRatioColor = (ratio: number) => {
    if (ratio >= 200) return 'text-emerald-600';
    if (ratio >= 150) return 'text-amber-600';
    return 'text-red-600';
  };

  const filteredVaultTypes =
    selectedCategory === 'all'
      ? mockVaultTypes
      : mockVaultTypes.filter((v) => v.type === selectedCategory);

  const keyMetrics = [
    {
      label: t('chronicle.vault.totalVaults'),
      value: (vaultData?.totalVaults || 2666).toLocaleString(),
      icon: Landmark,
    },
    {
      label: t('chronicle.vault.totalCollateral'),
      value: formatCompactCurrency(vaultData?.totalCollateralValue || 3635000000),
      icon: Shield,
    },
    {
      label: t('chronicle.vault.totalDebt'),
      value: formatCompactCurrency(vaultData?.totalDebtValue || 2022000000),
      icon: Coins,
    },
    {
      label: t('chronicle.vault.avgCollateralRatio'),
      value: `${vaultData?.averageCollateralRatio || 180}%`,
      icon: TrendingUp,
      highlight: true,
    },
  ];

  const vaultTypeColumns = [
    {
      key: 'type',
      header: t('chronicle.vault.collateralType'),
      sortable: true,
      render: (item: VaultTypeData) => (
        <div>
          <span className="font-semibold text-gray-900">{item.type}</span>
          <span className="text-sm text-gray-500 ml-2">{item.name}</span>
        </div>
      ),
    },
    {
      key: 'totalVaults',
      header: t('chronicle.vault.vaultCount'),
      sortable: true,
      render: (item: VaultTypeData) => item.totalVaults.toLocaleString(),
    },
    {
      key: 'collateralValue',
      header: t('chronicle.vault.collateralValue'),
      sortable: true,
      render: (item: VaultTypeData) => formatCompactCurrency(item.collateralValue),
    },
    {
      key: 'debtValue',
      header: t('chronicle.vault.debtValue'),
      sortable: true,
      render: (item: VaultTypeData) => formatCompactCurrency(item.debtValue),
    },
    {
      key: 'collateralRatio',
      header: t('chronicle.vault.collateralRatio'),
      sortable: true,
      render: (item: VaultTypeData) => (
        <span className={`font-medium ${getCollateralRatioColor(item.collateralRatio)}`}>
          {item.collateralRatio}%
        </span>
      ),
    },
    {
      key: 'stabilityFee',
      header: t('chronicle.vault.stabilityFee'),
      sortable: true,
      render: (item: VaultTypeData) => `${item.stabilityFee}%`,
    },
    {
      key: 'debtCeilingUsed',
      header: t('chronicle.vault.debtCeilingUsed'),
      sortable: true,
      render: (item: VaultTypeData) => (
        <div className="flex items-center gap-2">
          <div className="w-16 bg-gray-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${
                item.debtCeilingUsed > 80
                  ? 'bg-red-500'
                  : item.debtCeilingUsed > 60
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(item.debtCeilingUsed, 100)}%` }}
            />
          </div>
          <span className="text-sm text-gray-600">{item.debtCeilingUsed}%</span>
        </div>
      ),
    },
  ];

  const auctionColumns = [
    {
      key: 'vaultId',
      header: t('chronicle.vault.vaultId'),
      sortable: true,
      render: (item: AuctionData) => <span className="font-mono text-sm">{item.vaultId}</span>,
    },
    {
      key: 'collateralType',
      header: t('chronicle.vault.collateralType'),
      sortable: true,
      render: (item: AuctionData) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          {item.collateralType}
        </span>
      ),
    },
    {
      key: 'collateralAmount',
      header: t('chronicle.vault.collateralAmount'),
      sortable: true,
      render: (item: AuctionData) => item.collateralAmount.toLocaleString(),
    },
    {
      key: 'debtAmount',
      header: t('chronicle.vault.debtAmount'),
      sortable: true,
      render: (item: AuctionData) => formatCompactCurrency(item.debtAmount),
    },
    {
      key: 'status',
      header: t('chronicle.vault.status'),
      sortable: true,
      render: (item: AuctionData) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}
        >
          {item.status === 'active' ? t('chronicle.status.active') : item.status === 'completed' ? t('chronicle.vault.completed') : t('chronicle.vault.pending')}
        </span>
      ),
    },
    {
      key: 'startTime',
      header: t('chronicle.vault.startTime'),
      sortable: true,
      render: (item: AuctionData) => item.startTime,
    },
  ];

  const liquidationColumns = [
    {
      key: 'vaultId',
      header: t('chronicle.vault.vaultId'),
      sortable: true,
      render: (item: LiquidationHistory) => (
        <span className="font-mono text-sm">{item.vaultId}</span>
      ),
    },
    {
      key: 'collateralType',
      header: t('chronicle.vault.collateralType'),
      sortable: true,
      render: (item: LiquidationHistory) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          {item.collateralType}
        </span>
      ),
    },
    {
      key: 'liquidatedCollateral',
      header: t('chronicle.vault.liquidatedCollateral'),
      sortable: true,
      render: (item: LiquidationHistory) => item.liquidatedCollateral.toLocaleString(),
    },
    {
      key: 'debtCovered',
      header: t('chronicle.vault.debtCovered'),
      sortable: true,
      render: (item: LiquidationHistory) => formatCompactCurrency(item.debtCovered),
    },
    {
      key: 'price',
      header: t('chronicle.vault.liquidationPrice'),
      sortable: true,
      render: (item: LiquidationHistory) => `$${item.price.toLocaleString()}`,
    },
    {
      key: 'liquidationDate',
      header: t('chronicle.vault.date'),
      sortable: true,
      render: (item: LiquidationHistory) => item.liquidationDate,
    },
  ];

  const riskParameters = [
    {
      asset: 'ETH-A',
      minCollateralRatio: 145,
      liquidationPenalty: 13,
      stabilityFee: 2.5,
      debtCeiling: 2500000000,
      debtCeilingUsed: 39.2,
    },
    {
      asset: 'WBTC-A',
      minCollateralRatio: 145,
      liquidationPenalty: 13,
      stabilityFee: 2.0,
      debtCeiling: 1500000000,
      debtCeilingUsed: 41.3,
    },
    {
      asset: 'USDC-A',
      minCollateralRatio: 101,
      liquidationPenalty: 3,
      stabilityFee: 0.5,
      debtCeiling: 800000000,
      debtCeilingUsed: 47.5,
    },
    {
      asset: 'LINK-A',
      minCollateralRatio: 165,
      liquidationPenalty: 13,
      stabilityFee: 3.0,
      debtCeiling: 150000000,
      debtCeilingUsed: 28.0,
    },
  ];

  return (
    <div className="space-y-8">
      {/* 金库概览统计 */}
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

      <div className="border-t border-gray-200" />

      {/* 金库类型分布 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-gray-900">
            {t('chronicle.vault.vaultTypeDistribution')}
          </h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {mockVaultTypes.slice(0, 4).map((vault, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{vault.type}</span>
                <span className="text-sm text-gray-500">{vault.totalVaults} {t('chronicle.vault.vaultCount')}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('chronicle.vault.collateral')}</span>
                  <span className="font-medium text-gray-900">
                    {formatCompactCurrency(vault.collateralValue)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('chronicle.vault.debt')}</span>
                  <span className="font-medium text-gray-900">
                    {formatCompactCurrency(vault.debtValue)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('chronicle.vault.ratio')}</span>
                  <span className={`font-medium ${getCollateralRatioColor(vault.collateralRatio)}`}>
                    {vault.collateralRatio}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 分类筛选 */}
        <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-4 mb-4">
          {vaultCategories.map((category) => (
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

        <ChronicleDataTable data={filteredVaultTypes} columns={vaultTypeColumns} />
      </div>

      <div className="border-t border-gray-200" />

      {/* 清算监控面板 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 活跃拍卖列表 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-900">
              {t('chronicle.vault.activeAuctions')}
            </h3>
            <div className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">
                {mockAuctions.filter((a) => a.status === 'active').length} {t('chronicle.status.active')}
              </span>
            </div>
          </div>
          <ChronicleDataTable data={mockAuctions} columns={auctionColumns} />
        </div>

        {/* 清算价格预警 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-900">
              {t('chronicle.vault.liquidationWarnings')}
            </h3>
          </div>
          <div className="space-y-3">
            {mockVaultTypes.map((vault, index) => {
              const warningLevel =
                vault.collateralRatio < 150
                  ? 'high'
                  : vault.collateralRatio < 170
                    ? 'medium'
                    : 'low';
              const warningColor =
                warningLevel === 'high'
                  ? 'bg-red-50 border-red-200'
                  : warningLevel === 'medium'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-emerald-50 border-emerald-200';
              const warningText =
                warningLevel === 'high'
                  ? 'text-red-700'
                  : warningLevel === 'medium'
                    ? 'text-amber-700'
                    : 'text-emerald-700';
              const warningCount =
                warningLevel === 'high'
                  ? Math.floor(Math.random() * 5) + 1
                  : warningLevel === 'medium'
                    ? Math.floor(Math.random() * 10) + 5
                    : 0;

              return (
                <div key={index} className={`p-3 rounded-lg border ${warningColor}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{vault.type}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${warningText} bg-white/50`}
                      >
                        {warningLevel === 'high'
                          ? t('chronicle.risk.highRisk')
                          : warningLevel === 'medium'
                            ? t('chronicle.risk.mediumRisk')
                            : t('chronicle.risk.lowRisk')}
                      </span>
                    </div>
                    {warningCount > 0 && (
                      <span className={`text-sm font-medium ${warningText}`}>
                        {warningCount} {t('chronicle.vault.vaultsAtRisk')}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                    <span>
                      {t('chronicle.vault.currentRatio')}:{' '}
                      <span
                        className={`font-medium ${getCollateralRatioColor(vault.collateralRatio)}`}
                      >
                        {vault.collateralRatio}%
                      </span>
                    </span>
                    <span>
                      {t('chronicle.vault.minRequired')}:{' '}
                      {vault.type === 'USDC-A' ? 101 : vault.type === 'LINK-A' ? 165 : 145}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 清算历史记录 */}
      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('chronicle.vault.liquidationHistory')}
        </h3>
        <ChronicleDataTable data={mockLiquidationHistory} columns={liquidationColumns} />
      </div>

      <div className="border-t border-gray-200" />

      {/* 风险参数展示 */}
      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('chronicle.vault.riskParameters')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {riskParameters.map((param, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Percent className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-900">{param.asset}</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('chronicle.vault.minCollateralRatio')}</span>
                  <span className="font-medium text-gray-900">{param.minCollateralRatio}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('chronicle.vault.liquidationPenalty')}</span>
                  <span className="font-medium text-gray-900">{param.liquidationPenalty}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('chronicle.vault.stabilityFee')}</span>
                  <span className="font-medium text-gray-900">{param.stabilityFee}%</span>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">{t('chronicle.vault.debtCeilingUsed')}</span>
                    <span className="font-medium text-gray-900">{param.debtCeilingUsed}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        param.debtCeilingUsed > 80
                          ? 'bg-red-500'
                          : param.debtCeilingUsed > 60
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(param.debtCeilingUsed, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {t('chronicle.vault.ceiling')}: {formatCompactCurrency(param.debtCeiling)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200" />

      {/* 系统健康状态 */}
      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('chronicle.vault.systemHealth')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">{t('chronicle.vault.totalActiveAuctions')}</p>
            <p className="text-xl font-semibold text-gray-900">
              {mockAuctions.filter((a) => a.status === 'active').length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">{t('chronicle.vault.liquidations30d')}</p>
            <p className="text-xl font-semibold text-gray-900">{mockLiquidationHistory.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">{t('chronicle.vault.avgLiquidationPrice')}</p>
            <p className="text-xl font-semibold text-gray-900">$2,450</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">{t('chronicle.vault.systemSurplus')}</p>
            <p className="text-xl font-semibold text-emerald-600">$85.2M</p>
          </div>
        </div>
      </div>
    </div>
  );
}
