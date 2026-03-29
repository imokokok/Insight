'use client';

import { useState } from 'react';

import {
  Coins,
  Wallet,
  Vote,
  PieChart,
  TrendingUp,
  TrendingDown,
  Lock,
  Unlock,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  BarChart3,
  Activity,
  Shield,
  ChevronRight,
} from 'lucide-react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';

import { useTranslations } from '@/i18n';
import { chartColors } from '@/lib/config/colors';

import { type RedStoneTokenViewProps } from '../types';

const tokenDistributionData = [
  { name: 'Community', value: 35, color: '#ef4444' },
  { name: 'Team & Advisors', value: 20, color: '#f97316' },
  { name: 'Investors', value: 18, color: '#eab308' },
  { name: 'Ecosystem Fund', value: 15, color: '#22c55e' },
  { name: 'Treasury', value: 7, color: '#3b82f6' },
  { name: 'Airdrop', value: 5, color: '#8b5cf6' },
];

const priceHistoryData = [
  { date: '2024-01', price: 0.45 },
  { date: '2024-03', price: 0.52 },
  { date: '2024-05', price: 0.48 },
  { date: '2024-07', price: 0.61 },
  { date: '2024-09', price: 0.55 },
  { date: '2024-11', price: 0.72 },
  { date: '2025-01', price: 0.85 },
  { date: '2025-03', price: 0.92 },
];

const unlockScheduleData = [
  { month: 'Jan 2025', amount: 2.5, cumulative: 2.5 },
  { month: 'Apr 2025', amount: 3.2, cumulative: 5.7 },
  { month: 'Jul 2025', amount: 4.1, cumulative: 9.8 },
  { month: 'Oct 2025', amount: 5.0, cumulative: 14.8 },
  { month: 'Jan 2026', amount: 6.2, cumulative: 21.0 },
  { month: 'Apr 2026', amount: 7.5, cumulative: 28.5 },
];

const governanceProposals = [
  {
    id: 'PROP-001',
    title: 'Increase Staking Rewards Pool',
    status: 'active',
    votesFor: 12500000,
    votesAgainst: 3200000,
    quorum: 20000000,
    endTime: '2025-04-15',
    category: 'Tokenomics',
  },
  {
    id: 'PROP-002',
    title: 'Add New Data Feed Categories',
    status: 'passed',
    votesFor: 18200000,
    votesAgainst: 1500000,
    quorum: 15000000,
    endTime: '2025-03-20',
    category: 'Protocol',
  },
  {
    id: 'PROP-003',
    title: 'Treasury Diversification Strategy',
    status: 'pending',
    votesFor: 0,
    votesAgainst: 0,
    quorum: 25000000,
    endTime: '2025-05-01',
    category: 'Treasury',
  },
  {
    id: 'PROP-004',
    title: 'Reduce Governance Voting Period',
    status: 'rejected',
    votesFor: 8500000,
    votesAgainst: 12000000,
    quorum: 18000000,
    endTime: '2025-02-28',
    category: 'Governance',
  },
];

const majorHolders = [
  { address: '0x1234...5678', balance: 45000000, percentage: 4.5, type: 'Team' },
  { address: '0xabcd...efgh', balance: 38000000, percentage: 3.8, type: 'Investor' },
  { address: '0x9876...5432', balance: 25000000, percentage: 2.5, type: 'Treasury' },
  { address: '0xdef0...1234', balance: 18000000, percentage: 1.8, type: 'DAO' },
  { address: '0x5555...aaaa', balance: 15000000, percentage: 1.5, type: 'Exchange' },
];

export function RedStoneTokenView({ isLoading }: RedStoneTokenViewProps) {
  const t = useTranslations();
  const [activeSection, setActiveSection] = useState<
    'overview' | 'staking' | 'governance' | 'distribution'
  >('overview');

  const tokenData = {
    price: 0.92,
    priceChange24h: 5.2,
    marketCap: 920000000,
    circulatingSupply: 1000000000,
    totalSupply: 1000000000,
    maxSupply: 1000000000,
    holders: 125000,
    stakingAPR: 12.5,
    totalStaked: 320000000,
    stakers: 45000,
  };

  const formatNumber = (num: number): string => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

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
            <Coins className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('redstone.token.overview') || 'RED Token Overview'}
            </h2>
            <p className="text-sm text-gray-500">
              {t('redstone.token.overviewDesc') || 'Native token of the RedStone ecosystem'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">
                {t('redstone.token.currentPrice') || 'Current Price'}
              </span>
              <Coins className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(tokenData.price)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {tokenData.priceChange24h >= 0 ? (
                <>
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  <span className="text-xs text-emerald-600">+{tokenData.priceChange24h}% 24h</span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-3 h-3 text-red-500" />
                  <span className="text-xs text-red-600">{tokenData.priceChange24h}% 24h</span>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">
                {t('redstone.token.marketCap') || 'Market Cap'}
              </span>
              <BarChart3 className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(tokenData.marketCap)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-gray-500">
                #{Math.floor(Math.random() * 50 + 100)} by market cap
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">
                {t('redstone.token.circulatingSupply') || 'Circulating Supply'}
              </span>
              <Activity className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatNumber(tokenData.circulatingSupply)} RED
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-gray-500">100% of total supply</span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">
                {t('redstone.token.holders') || 'Token Holders'}
              </span>
              <Users className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatNumber(tokenData.holders)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <span className="text-xs text-emerald-600">+2.3k this week</span>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('redstone.token.priceHistory') || 'Price History'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('redstone.token.priceHistoryDesc') || 'RED token price performance over time'}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={priceHistoryData}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickFormatter={(value) => `$${value}`}
                  domain={[0, 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                  }}
                  formatter={(value) => [formatCurrency(value as number), 'Price']}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#priceGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-50 rounded-lg">
            <Lock className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('redstone.token.stakingMechanism') || 'Staking Mechanism'}
            </h2>
            <p className="text-sm text-gray-500">
              {t('redstone.token.stakingMechanismDesc') || 'Secure the network and earn rewards'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg p-6 border border-red-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Shield className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="font-semibold text-gray-900">
                {t('redstone.token.stakingPool') || 'Staking Pool Status'}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">
                  {t('redstone.token.totalStaked') || 'Total Staked'}
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {formatNumber(tokenData.totalStaked)} RED
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">
                  {t('redstone.token.stakingRatio') || 'Staking Ratio'}
                </div>
                <div className="text-xl font-bold text-gray-900">32%</div>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{ width: '32%', backgroundColor: chartColors.oracle.redstone }}
              />
            </div>
            <p className="text-xs text-gray-500">
              {formatNumber(tokenData.stakers)} active stakers
            </p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-6 border border-emerald-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <h3 className="font-semibold text-gray-900">
                {t('redstone.token.stakingRewards') || 'Staking Rewards'}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">
                  {t('redstone.token.currentAPR') || 'Current APR'}
                </div>
                <div className="text-xl font-bold text-emerald-600">{tokenData.stakingAPR}%</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">
                  {t('redstone.token.currentAPY') || 'Current APY'}
                </div>
                <div className="text-xl font-bold text-emerald-600">
                  {((Math.pow(1 + tokenData.stakingAPR / 100 / 12, 12) - 1) * 100) | 0}%
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>
                {t('redstone.token.rewardDistribution') ||
                  'Rewards distributed every epoch (7 days)'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            {t('redstone.token.stakingParameters') || 'Staking Parameters'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500">
                  {t('redstone.token.unlockPeriod') || 'Unlock Period'}
                </span>
              </div>
              <div className="text-lg font-semibold text-gray-900">21 days</div>
              <p className="text-xs text-gray-500 mt-1">
                {t('redstone.token.unlockPeriodDesc') || 'Unbonding period for withdrawals'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500">
                  {t('redstone.token.minStake') || 'Minimum Stake'}
                </span>
              </div>
              <div className="text-lg font-semibold text-gray-900">100 RED</div>
              <p className="text-xs text-gray-500 mt-1">
                {t('redstone.token.minStakeDesc') || 'Minimum amount to stake'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500">
                  {t('redstone.token.slashingConditions') || 'Slashing Conditions'}
                </span>
              </div>
              <div className="text-lg font-semibold text-gray-900">Up to 10%</div>
              <p className="text-xs text-gray-500 mt-1">
                {t('redstone.token.slashingConditionsDesc') || 'For malicious behavior'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-50 rounded-lg">
            <Vote className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('redstone.token.governance') || 'Governance'}
            </h2>
            <p className="text-sm text-gray-500">
              {t('redstone.token.governanceDesc') || 'Participate in protocol decisions'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">
                {t('redstone.token.activeProposals') || 'Active Proposals'}
              </span>
              <Vote className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {governanceProposals.filter((p) => p.status === 'active').length}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">
                {t('redstone.token.totalVotes') || 'Total Votes Cast'}
              </span>
              <BarChart3 className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatNumber(
                governanceProposals.reduce((sum, p) => sum + p.votesFor + p.votesAgainst, 0)
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">
                {t('redstone.token.quorumThreshold') || 'Quorum Threshold'}
              </span>
              <Users className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">15M RED</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">
              {t('redstone.token.recentProposals') || 'Recent Proposals'}
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {governanceProposals.map((proposal) => {
              const totalVotes = proposal.votesFor + proposal.votesAgainst;
              const forPercentage = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 0;

              return (
                <div key={proposal.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-500">{proposal.id}</span>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            proposal.status === 'active'
                              ? 'bg-blue-100 text-blue-700'
                              : proposal.status === 'passed'
                                ? 'bg-emerald-100 text-emerald-700'
                                : proposal.status === 'rejected'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {proposal.status}
                        </span>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                          {proposal.category}
                        </span>
                      </div>
                      <h4 className="text-sm font-medium text-gray-900">{proposal.title}</h4>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>

                  {proposal.status !== 'pending' && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>
                          {t('redstone.token.votesFor') || 'For'}: {formatNumber(proposal.votesFor)}
                        </span>
                        <span>
                          {t('redstone.token.votesAgainst') || 'Against'}:{' '}
                          {formatNumber(proposal.votesAgainst)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-emerald-500"
                          style={{ width: `${forPercentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                        <span>
                          {forPercentage.toFixed(1)}% {t('redstone.token.inFavor') || 'in favor'}
                        </span>
                        <span>
                          {t('redstone.token.endsOn') || 'Ends'}: {proposal.endTime}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">
            {t('redstone.token.governanceParams') || 'Governance Parameters'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">
                {t('redstone.token.votingPeriod') || 'Voting Period'}
              </div>
              <div className="text-sm font-medium text-gray-900">7 days</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">
                {t('redstone.token.executionDelay') || 'Execution Delay'}
              </div>
              <div className="text-sm font-medium text-gray-900">2 days</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">
                {t('redstone.token.proposalThreshold') || 'Proposal Threshold'}
              </div>
              <div className="text-sm font-medium text-gray-900">100K RED</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">
                {t('redstone.token.quorum') || 'Quorum'}
              </div>
              <div className="text-sm font-medium text-gray-900">15M RED</div>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-50 rounded-lg">
            <PieChart className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('redstone.token.distribution') || 'Token Distribution'}
            </h2>
            <p className="text-sm text-gray-500">
              {t('redstone.token.distributionDesc') || 'Allocation and unlock schedule'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">
              {t('redstone.token.allocationChart') || 'Allocation Chart'}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={tokenDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {tokenDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                    }}
                    formatter={(value) => [`${value}%`, 'Allocation']}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {tokenDistributionData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-gray-600">
                    {item.name}: {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">
              {t('redstone.token.unlockSchedule') || 'Unlock Schedule'}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={unlockScheduleData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickFormatter={(value) => `${value}M`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                    }}
                    formatter={(value) => [`${value}M RED`, 'Tokens']}
                  />
                  <Bar dataKey="amount" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {t('redstone.token.totalUnlocked') || 'Total Unlocked by 2026'}
                </span>
                <span className="font-medium text-gray-900">28.5M RED</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('redstone.token.majorHolders') || 'Major Token Holders'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('redstone.token.majorHoldersDesc') || 'Top holders by balance'}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    {t('redstone.token.address') || 'Address'}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    {t('redstone.token.balance') || 'Balance'}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    {t('redstone.token.percentage') || 'Percentage'}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                    {t('redstone.token.type') || 'Type'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {majorHolders.map((holder, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-orange-400 flex items-center justify-center">
                          <Wallet className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-mono text-gray-900">{holder.address}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {formatNumber(holder.balance)} RED
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-sm text-gray-900">{holder.percentage}%</span>
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${holder.percentage * 10}%`,
                              backgroundColor: chartColors.oracle.redstone,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            holder.type === 'Team'
                              ? 'bg-purple-100 text-purple-700'
                              : holder.type === 'Investor'
                                ? 'bg-blue-100 text-blue-700'
                                : holder.type === 'Treasury'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {holder.type}
                        </span>
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

      <section className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-6 border border-red-100">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <Coins className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-2">
              {t('redstone.token.tokenUtility') || 'RED Token Utility'}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              {t('redstone.token.tokenUtilityDesc') ||
                'RED token serves multiple purposes within the RedStone ecosystem: staking for network security, governance participation, and fee payments for premium data services.'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/60 rounded-md p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-medium text-gray-900">
                    {t('redstone.token.staking') || 'Staking'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {t('redstone.token.stakingDesc') || 'Secure the network and earn rewards'}
                </p>
              </div>
              <div className="bg-white/60 rounded-md p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Vote className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-medium text-gray-900">
                    {t('redstone.token.governanceRight') || 'Governance'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {t('redstone.token.governanceRightDesc') || 'Vote on protocol decisions'}
                </p>
              </div>
              <div className="bg-white/60 rounded-md p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-medium text-gray-900">
                    {t('redstone.token.feePayment') || 'Fee Payment'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {t('redstone.token.feePaymentDesc') || 'Pay for premium data services'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <ExternalLink className="w-4 h-4" />
          <span>{t('redstone.token.learnMore') || 'Learn more about'}</span>
          <a
            href="https://redstone.finance/docs/tokenomics"
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-500 hover:text-red-600 font-medium"
          >
            RED Tokenomics
          </a>
        </div>
        <div className="text-xs text-gray-400">
          {t('redstone.token.lastUpdated') || 'Last updated'}: {new Date().toLocaleString()}
        </div>
      </section>
    </div>
  );
}
