'use client';

import { useState } from 'react';

import {
  Database,
  HardDrive,
  Shield,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Search,
  FileText,
  Clock,
  Coins,
  BarChart3,
  Layers,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

import { useTranslations } from '@/i18n';
import { chartColors } from '@/lib/config/colors';

import { type RedStoneArweaveViewProps } from '../types';

const storageTrendData = [
  { date: '2024-01', size: 12.5 },
  { date: '2024-02', size: 14.2 },
  { date: '2024-03', size: 16.8 },
  { date: '2024-04', size: 19.3 },
  { date: '2024-05', size: 22.1 },
  { date: '2024-06', size: 25.6 },
  { date: '2024-07', size: 28.9 },
  { date: '2024-08', size: 32.4 },
  { date: '2024-09', size: 36.7 },
  { date: '2024-10', size: 41.2 },
  { date: '2024-11', size: 45.8 },
  { date: '2024-12', size: 52.3 },
];

const dataTypeDistribution = [
  { name: 'Price Data', value: 45, color: '#ef4444' },
  { name: 'Historical Records', value: 25, color: '#f97316' },
  { name: 'Audit Logs', value: 15, color: '#eab308' },
  { name: 'Provider Signatures', value: 10, color: '#22c55e' },
  { name: 'Metadata', value: 5, color: '#3b82f6' },
];

const recentTransactions = [
  {
    id: 'tx-001',
    txHash: '0x8a7b3c...f2e1d4',
    dataType: 'Price Data',
    size: '2.4 MB',
    timestamp: '2024-12-15 14:32:18',
    status: 'confirmed',
    cost: '0.0025 AR',
  },
  {
    id: 'tx-002',
    txHash: '0x6c9d2e...a8b7c5',
    dataType: 'Historical Records',
    size: '5.1 MB',
    timestamp: '2024-12-15 12:18:45',
    status: 'confirmed',
    cost: '0.0052 AR',
  },
  {
    id: 'tx-003',
    txHash: '0x4f8a1b...d3c2e6',
    dataType: 'Audit Logs',
    size: '1.8 MB',
    timestamp: '2024-12-15 10:05:33',
    status: 'confirmed',
    cost: '0.0018 AR',
  },
  {
    id: 'tx-004',
    txHash: '0x2e7c4f...b9a8d1',
    dataType: 'Provider Signatures',
    size: '0.9 MB',
    timestamp: '2024-12-15 08:42:11',
    status: 'confirmed',
    cost: '0.0009 AR',
  },
  {
    id: 'tx-005',
    txHash: '0x9d3a5c...e7f6b2',
    dataType: 'Price Data',
    size: '3.2 MB',
    timestamp: '2024-12-15 06:28:59',
    status: 'confirmed',
    cost: '0.0033 AR',
  },
  {
    id: 'tx-006',
    txHash: '0x1b6e8d...c4a3f5',
    dataType: 'Metadata',
    size: '0.5 MB',
    timestamp: '2024-12-15 04:15:27',
    status: 'pending',
    cost: '0.0005 AR',
  },
];

const auditLogs = [
  {
    id: 'audit-001',
    date: '2024-12-14',
    type: 'verification',
    title: 'Data Integrity Verified',
    description: 'All stored price data verified against provider signatures',
    status: 'success',
  },
  {
    id: 'audit-002',
    date: '2024-12-13',
    type: 'query',
    title: 'Historical Data Query',
    description: 'Retrieved 30-day price history for ETH/USD',
    status: 'info',
  },
  {
    id: 'audit-003',
    date: '2024-12-12',
    type: 'storage',
    title: 'Batch Storage Complete',
    description: 'Stored 1,248 price data points permanently',
    status: 'success',
  },
  {
    id: 'audit-004',
    date: '2024-12-11',
    type: 'verification',
    title: 'Signature Verification',
    description: 'Verified 15,000+ provider signatures',
    status: 'success',
  },
];

const costOptimizationData = [
  { method: 'Direct Upload', cost: 100 },
  { method: 'Batch Storage', cost: 35 },
  { method: 'Compression', cost: 25 },
  { method: 'Optimized (RedStone)', cost: 15 },
];

export function RedStoneArweaveView({ isLoading }: RedStoneArweaveViewProps) {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedTx, setCopiedTx] = useState<string | null>(null);

  const totalDataStored = storageTrendData[storageTrendData.length - 1].size;
  const totalTransactions = 15420;
  const avgCostPerMB = 0.001;
  const dataIntegrityScore = 99.97;

  const handleCopyTx = (txHash: string) => {
    navigator.clipboard.writeText(txHash);
    setCopiedTx(txHash);
    setTimeout(() => setCopiedTx(null), 2000);
  };

  const filteredTransactions = recentTransactions.filter(
    (tx) =>
      tx.dataType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.txHash.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-8 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-red-50 rounded-lg">
            <Database className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('redstone.arweave.storageOverview') || 'Arweave Storage Overview'}
            </h2>
            <p className="text-sm text-gray-500">
              {t('redstone.arweave.storageOverviewDesc') ||
                'Permanent decentralized storage for oracle data'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">
                {t('redstone.arweave.totalDataStored') || 'Total Data Stored'}
              </span>
              <HardDrive className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalDataStored} GB</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <span className="text-xs text-emerald-600">
                +18.5% {t('redstone.arweave.lastMonth') || 'last month'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">
                {t('redstone.arweave.totalTransactions') || 'Total Transactions'}
              </span>
              <Activity className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {totalTransactions.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <span className="text-xs text-emerald-600">
                +245 {t('redstone.arweave.today') || 'today'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">
                {t('redstone.arweave.avgCostPerMB') || 'Avg Cost per MB'}
              </span>
              <Coins className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{avgCostPerMB} AR</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingDown className="w-3 h-3 text-emerald-500" />
              <span className="text-xs text-emerald-600">
                {t('redstone.arweave.oneTimePayment') || 'One-time payment'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">
                {t('redstone.arweave.dataIntegrity') || 'Data Integrity'}
              </span>
              <Shield className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{dataIntegrityScore}%</div>
            <div className="flex items-center gap-1 mt-1">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              <span className="text-xs text-emerald-600">
                {t('redstone.arweave.verified') || 'Cryptographically verified'}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('redstone.arweave.whatIsArweave') || 'What is Arweave?'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('redstone.arweave.whatIsArweaveDesc') ||
              'Understanding permanent decentralized storage'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg p-6 border border-red-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Database className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="font-semibold text-gray-900">
                {t('redstone.arweave.permanentStorage') || 'Permanent Storage'}
              </h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              {t('redstone.arweave.permanentStorageDesc') ||
                'Arweave provides truly permanent data storage with a one-time payment model. Data stored on Arweave is replicated across a decentralized network of nodes, ensuring availability for centuries without ongoing costs.'}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-white/60 rounded-md p-3">
                <div className="text-xs text-gray-500">
                  {t('redstone.arweave.storageDuration') || 'Storage Duration'}
                </div>
                <div className="text-lg font-semibold text-gray-900">200+ years</div>
              </div>
              <div className="bg-white/60 rounded-md p-3">
                <div className="text-xs text-gray-500">
                  {t('redstone.arweave.networkNodes') || 'Network Nodes'}
                </div>
                <div className="text-lg font-semibold text-gray-900">1,200+</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Shield className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="font-semibold text-gray-900">
                {t('redstone.arweave.dataVerifiability') || 'Data Verifiability'}
              </h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-600">1</span>
                </div>
                <p className="text-sm text-gray-600">
                  {t('redstone.arweave.verStep1') ||
                    'Historical price data stored with cryptographic proofs'}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-600">2</span>
                </div>
                <p className="text-sm text-gray-600">
                  {t('redstone.arweave.verStep2') ||
                    'Anyone can verify data integrity without trusting third parties'}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-600">3</span>
                </div>
                <p className="text-sm text-gray-600">
                  {t('redstone.arweave.verStep3') ||
                    'Complete audit trail for all oracle data operations'}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-600">4</span>
                </div>
                <p className="text-sm text-gray-600">
                  {t('redstone.arweave.verStep4') ||
                    'Immutable records enable transparent historical analysis'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('redstone.arweave.storageGrowth') || 'Storage Growth Trend'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('redstone.arweave.storageGrowthDesc') || 'Historical data storage growth over time'}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={storageTrendData}>
                <defs>
                  <linearGradient id="storageGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickFormatter={(value) => `${value} GB`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                  }}
                  formatter={(value) => [`${value} GB`, 'Storage']}
                />
                <Area
                  type="monotone"
                  dataKey="size"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#storageGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('redstone.arweave.dataTypeDistribution') || 'Data Type Distribution'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('redstone.arweave.dataTypeDistributionDesc') || 'Breakdown of stored data by type'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataTypeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {dataTypeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                    }}
                    formatter={(value) => [`${value}%`, 'Percentage']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-3">
            {dataTypeDistribution.map((item, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm font-medium text-gray-900">{item.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">{item.value}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${item.value}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('redstone.arweave.technicalArchitecture') || 'Technical Architecture'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('redstone.arweave.technicalArchitectureDesc') ||
              'How RedStone integrates with Arweave'}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex-1 text-center">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-3">
                <Layers className="w-8 h-8 text-red-500" />
              </div>
              <h4 className="font-medium text-gray-900 mb-1">
                {t('redstone.arweave.dataCollection') || 'Data Collection'}
              </h4>
              <p className="text-xs text-gray-500">
                {t('redstone.arweave.dataCollectionDesc') ||
                  'Oracle providers collect and sign data'}
              </p>
            </div>

            <ArrowRight className="w-6 h-6 text-gray-300 hidden lg:block" />

            <div className="flex-1 text-center">
              <div className="w-16 h-16 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-3">
                <Shield className="w-8 h-8 text-orange-500" />
              </div>
              <h4 className="font-medium text-gray-900 mb-1">
                {t('redstone.arweave.dataValidation') || 'Data Validation'}
              </h4>
              <p className="text-xs text-gray-500">
                {t('redstone.arweave.dataValidationDesc') || 'Multi-signature verification'}
              </p>
            </div>

            <ArrowRight className="w-6 h-6 text-gray-300 hidden lg:block" />

            <div className="flex-1 text-center">
              <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <Database className="w-8 h-8 text-blue-500" />
              </div>
              <h4 className="font-medium text-gray-900 mb-1">
                {t('redstone.arweave.arweaveStorage') || 'Arweave Storage'}
              </h4>
              <p className="text-xs text-gray-500">
                {t('redstone.arweave.arweaveStorageDesc') || 'Permanent on-chain storage'}
              </p>
            </div>

            <ArrowRight className="w-6 h-6 text-gray-300 hidden lg:block" />

            <div className="flex-1 text-center">
              <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h4 className="font-medium text-gray-900 mb-1">
                {t('redstone.arweave.verification') || 'Verification'}
              </h4>
              <p className="text-xs text-gray-500">
                {t('redstone.arweave.verificationDesc') || 'Anyone can verify data integrity'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('redstone.arweave.costOptimization') || 'Cost Optimization'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('redstone.arweave.costOptimizationDesc') ||
              'RedStone optimized storage costs compared to traditional methods'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costOptimizationData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis
                    dataKey="method"
                    type="category"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                    }}
                    formatter={(value) => [`${value}%`, 'Relative Cost']}
                  />
                  <Bar dataKey="cost" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-4 border border-emerald-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <TrendingDown className="w-5 h-5 text-emerald-500" />
                </div>
                <h4 className="font-medium text-gray-900">
                  {t('redstone.arweave.costSavings') || '85% Cost Reduction'}
                </h4>
              </div>
              <p className="text-sm text-gray-600">
                {t('redstone.arweave.costSavingsDesc') ||
                  'RedStone achieves significant cost savings through batch storage, compression, and intelligent data management.'}
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h4 className="font-medium text-gray-900 mb-3">
                {t('redstone.arweave.optimizationMethods') || 'Optimization Methods'}
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-gray-600">
                    {t('redstone.arweave.batchStorage') || 'Batch storage for multiple data points'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-gray-600">
                    {t('redstone.arweave.dataCompression') || 'Advanced data compression'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-gray-600">
                    {t('redstone.arweave.smartDeduplication') || 'Smart deduplication'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-gray-600">
                    {t('redstone.arweave.optimalTiming') || 'Optimal storage timing'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {t('redstone.arweave.recentTransactions') || 'Recent Storage Transactions'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {t('redstone.arweave.recentTransactionsDesc') ||
                  'Latest data stored on Arweave network'}
              </p>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('redstone.arweave.searchTransactions') || 'Search transactions...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    {t('redstone.arweave.txHash') || 'Transaction Hash'}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    {t('redstone.arweave.dataType') || 'Data Type'}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    {t('redstone.arweave.size') || 'Size'}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    {t('redstone.arweave.cost') || 'Cost'}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    {t('redstone.arweave.timestamp') || 'Timestamp'}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                    {t('redstone.arweave.status') || 'Status'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-gray-900">{tx.txHash}</span>
                        <button
                          onClick={() => handleCopyTx(tx.txHash)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          {copiedTx === tx.txHash ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-900">{tx.dataType}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm text-gray-900">{tx.size}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm font-medium text-gray-900">{tx.cost}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-500">{tx.timestamp}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center">
                        {tx.status === 'confirmed' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs">
                            <CheckCircle className="w-3 h-3" />
                            {t('redstone.arweave.confirmed') || 'Confirmed'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-xs">
                            <Clock className="w-3 h-3" />
                            {t('redstone.arweave.pending') || 'Pending'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('redstone.arweave.auditLogs') || 'Audit Logs'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('redstone.arweave.auditLogsDesc') || 'Recent data verification and query activities'}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      log.status === 'success'
                        ? 'bg-emerald-100'
                        : log.status === 'warning'
                          ? 'bg-amber-100'
                          : 'bg-blue-100'
                    }`}
                  >
                    {log.type === 'verification' && <Shield className="w-4 h-4 text-emerald-600" />}
                    {log.type === 'query' && <Search className="w-4 h-4 text-blue-600" />}
                    {log.type === 'storage' && <Database className="w-4 h-4 text-purple-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900">{log.title}</h4>
                      <span className="text-xs text-gray-500">{log.date}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{log.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-6 border border-red-100">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <FileText className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-2">
              {t('redstone.arweave.dataIntegrityProofs') || 'Data Integrity Proofs'}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              {t('redstone.arweave.dataIntegrityProofsDesc') ||
                'All data stored on Arweave includes cryptographic proofs that enable anyone to verify the authenticity and integrity of the data without relying on trusted third parties.'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/60 rounded-md p-3">
                <div className="text-xs text-gray-500 mb-1">
                  {t('redstone.arweave.proofType') || 'Proof Type'}
                </div>
                <div className="text-lg font-semibold text-gray-900">Merkle Proof</div>
              </div>
              <div className="bg-white/60 rounded-md p-3">
                <div className="text-xs text-gray-500 mb-1">
                  {t('redstone.arweave.verificationCount') || 'Verifications'}
                </div>
                <div className="text-lg font-semibold text-gray-900">1.2M+</div>
              </div>
              <div className="bg-white/60 rounded-md p-3">
                <div className="text-xs text-gray-500 mb-1">
                  {t('redstone.arweave.successRate') || 'Success Rate'}
                </div>
                <div className="text-lg font-semibold text-gray-900">100%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <ExternalLink className="w-4 h-4" />
          <span>{t('redstone.arweave.learnMore') || 'Learn more about'}</span>
          <a
            href="https://www.arweave.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-500 hover:text-red-600 font-medium"
          >
            Arweave
          </a>
        </div>
        <div className="text-xs text-gray-400">
          {t('redstone.arweave.lastUpdated') || 'Last updated'}: {new Date().toLocaleString()}
        </div>
      </section>
    </div>
  );
}
