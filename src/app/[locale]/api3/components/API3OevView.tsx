'use client';

import { useState } from 'react';

import {
  Zap,
  Trophy,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  DollarSign,
  Activity,
  BarChart3,
  Info,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

import { useAPI3OEVAuctions } from '@/hooks/oracles/api3';
import { useTranslations } from '@/i18n';

import { type API3OevViewProps } from '../types';

interface TimeRangeButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TimeRangeButton({ active, onClick, children }: TimeRangeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
        active ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

const oevTrendData = [
  { date: '03-23', value: 420000, auctions: 24 },
  { date: '03-24', value: 380000, auctions: 18 },
  { date: '03-25', value: 520000, auctions: 32 },
  { date: '03-26', value: 480000, auctions: 28 },
  { date: '03-27', value: 610000, auctions: 35 },
  { date: '03-28', value: 550000, auctions: 30 },
  { date: '03-29', value: 892000, auctions: 42 },
];

const distributionData = [
  { name: 'Searchers', value: 45, color: '#10b981' },
  { name: 'dApps', value: 35, color: '#3b82f6' },
  { name: 'Protocol', value: 15, color: '#8b5cf6' },
  { name: 'Stakers', value: 5, color: '#f59e0b' },
];

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value}`;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    case 'pending':
      return <Clock className="w-4 h-4 text-amber-500" />;
    case 'cancelled':
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return <AlertCircle className="w-4 h-4 text-gray-500" />;
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-50 text-emerald-700';
    case 'pending':
      return 'bg-amber-50 text-amber-700';
    case 'cancelled':
      return 'bg-red-50 text-red-700';
    default:
      return 'bg-gray-50 text-gray-700';
  }
};

export function API3OevView({ oevStats, isLoading }: API3OevViewProps) {
  const t = useTranslations();
  const [selectedTab, setSelectedTab] = useState<'auctions' | 'participants'>('auctions');
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('30d');
  const { auctions } = useAPI3OEVAuctions(10);

  const statsCards = [
    {
      id: 'totalOev',
      label: t('api3.oev.totalOevCaptured'),
      value: oevStats?.totalOevCaptured ?? 0,
      icon: <DollarSign className="w-5 h-5" />,
      format: 'currency',
    },
    {
      id: 'activeAuctions',
      label: t('api3.oev.activeAuctions'),
      value: oevStats?.activeAuctions ?? 0,
      icon: <Activity className="w-5 h-5" />,
      format: 'number',
    },
    {
      id: 'totalDapps',
      label: t('api3.oev.totalDapps'),
      value: oevStats?.totalDapps ?? 0,
      icon: <Users className="w-5 h-5" />,
      format: 'number',
    },
    {
      id: 'avgAuction',
      label: t('api3.oev.avgAuctionValue'),
      value: oevStats?.avgAuctionValue ?? 0,
      icon: <BarChart3 className="w-5 h-5" />,
      format: 'currency',
    },
  ];

  const displayAuctions = oevStats?.recentAuctions ?? auctions;

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('api3.oev.overview.title') || 'OEV Network Overview'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('api3.oev.overview.description') ||
              'Oracle Extractable Value (OEV) Network captures value from oracle updates and redistributes it to dApps and searchers'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((card) => (
            <div
              key={card.id}
              className="bg-white border border-gray-100 rounded-lg p-4 hover:border-emerald-200 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">{card.label}</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  {card.icon}
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {isLoading ? (
                  <div className="h-8 w-24 bg-gray-100 rounded animate-pulse" />
                ) : card.format === 'currency' ? (
                  formatCurrency(card.value)
                ) : (
                  card.value.toLocaleString()
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t('api3.oev.trendAnalysis')}</h2>
            <p className="text-sm text-gray-500 mt-1">{t('api3.oev.trendDesc')}</p>
          </div>
          <div className="flex items-center gap-2">
            {(['24h', '7d', '30d', '90d'] as const).map((range) => (
              <TimeRangeButton
                key={range}
                active={timeRange === range}
                onClick={() => setTimeRange(range)}
              >
                {range}
              </TimeRangeButton>
            ))}
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={oevTrendData}>
              <defs>
                <linearGradient id="oevGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis
                tickFormatter={(value) => `$${value / 1000}K`}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(Number(value)), 'OEV Value']}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#oevGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('api3.oev.realtime.title') || 'Real-time Auctions'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('api3.oev.realtime.description') || 'Latest OEV auctions across the network'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedTab('auctions')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                selectedTab === 'auctions'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('api3.oev.tabs.auctions') || 'Auctions'}
            </button>
            <button
              onClick={() => setSelectedTab('participants')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                selectedTab === 'participants'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('api3.oev.tabs.participants') || 'Participants'}
            </button>
          </div>
        </div>

        {selectedTab === 'auctions' && (
          <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('api3.oev.table.dapp') || 'dApp'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('api3.oev.table.dapi') || 'dAPI'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('api3.oev.table.amount') || 'Amount'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('api3.oev.table.winner') || 'Winner'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('api3.oev.table.status') || 'Status'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('api3.oev.table.time') || 'Time'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 6 }).map((_, j) => (
                            <td key={j} className="px-4 py-3">
                              <div className="h-4 bg-gray-100 rounded animate-pulse" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : displayAuctions.slice(0, 8).map((auction) => (
                        <tr key={auction.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-gray-900">
                              {auction.dappName}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">{auction.dapiName}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-emerald-600">
                              {formatCurrency(auction.auctionAmount)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-500 font-mono">
                              {auction.winner}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(auction.status)}`}
                            >
                              {getStatusIcon(auction.status)}
                              {auction.status.charAt(0).toUpperCase() + auction.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-500">
                              {new Date(auction.timestamp).toLocaleTimeString('zh-CN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedTab === 'participants' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-4">
                {t('api3.oev.participants.leaderboard')}
              </h3>
              <div className="space-y-3">
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                    ))
                  : oevStats?.participantList.map((participant, index) => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              index === 0
                                ? 'bg-amber-100 text-amber-700'
                                : index === 1
                                  ? 'bg-gray-200 text-gray-700'
                                  : index === 2
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{participant.name}</p>
                            <p className="text-xs text-gray-500">
                              {participant.type === 'searcher'
                                ? t('api3.oev.participants.searcher')
                                : t('api3.oev.participants.dapp')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-emerald-600">
                            {formatCurrency(participant.totalVolume)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {participant.auctionsWon} {t('api3.oev.wins') || 'wins'}
                          </p>
                        </div>
                      </div>
                    ))}
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-4">
                {t('api3.oev.distribution.title') || 'Value Distribution'}
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distributionData} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      width={80}
                    />
                    <Tooltip
                      formatter={(value) => [`${value}%`, 'Share']}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">{t('api3.oev.auctionProcess')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('api3.oev.auctionDesc')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-lg p-5">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              {t('api3.oev.mechanism.step1.title') || '1. OEV Detection'}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {t('api3.oev.mechanism.step1.description') ||
                'When oracle price updates occur, the OEV Network detects extractable value opportunities before they can be exploited by MEV bots.'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-lg p-5">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              {t('api3.oev.mechanism.step2.title') || '2. Auction Process'}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {t('api3.oev.mechanism.step2.description') ||
                'Searchers bid in transparent auctions for the right to capture OEV. The highest bidder wins and their bid goes to the dApp.'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-lg p-5">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
              <Trophy className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              {t('api3.oev.mechanism.step3.title') || '3. Value Distribution'}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {t('api3.oev.mechanism.step3.description') ||
                'Captured value is distributed to dApps, searchers, and protocol participants, creating a fair and transparent MEV ecosystem.'}
            </p>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section className="flex items-start gap-4 py-2">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {t('api3.oev.info.title') || 'About OEV Network'}
          </h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            {t('api3.oev.info.description') ||
              "OEV (Oracle Extractable Value) Network is API3's solution for capturing and redistributing value from oracle updates. Unlike traditional MEV that benefits only miners/validators, OEV Network ensures that dApps and their users receive the value generated by oracle price movements."}
          </p>
          <a
            href="https://docs.api3.org/oev-network/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 mt-2"
          >
            {t('api3.oev.learnMore') || 'Learn more about OEV Network'}
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </section>
    </div>
  );
}
