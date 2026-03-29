'use client';

import { useState, useMemo, useCallback } from 'react';

import {
  Wallet,
  Lock,
  Unlock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  Users,
  BarChart3,
  PieChart,
  Activity,
  ChevronRight,
  Info,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

import { useTranslations } from '@/i18n';

import {
  type StakingPoolStats,
  type RewardHistory,
  type SlashingEvent,
  type UnlockQueue,
  type OperatorStake,
} from '../types';

const LINK_PRICE = 14.5;

const MOCK_POOL_STATS: StakingPoolStats = {
  totalStaked: 42500000,
  stakingRate: 78.5,
  currentAPR: 7.2,
  communityPoolStatus: 'active',
  communityPoolSize: 8500000,
};

const MOCK_REWARD_HISTORY: RewardHistory[] = [
  { date: '2024-01', amount: 125000, type: 'base' },
  { date: '2024-02', amount: 132000, type: 'base' },
  { date: '2024-03', amount: 128000, type: 'service' },
  { date: '2024-04', amount: 145000, type: 'base' },
  { date: '2024-05', amount: 138000, type: 'service' },
  { date: '2024-06', amount: 152000, type: 'base' },
  { date: '2024-07', amount: 148000, type: 'slashing' },
  { date: '2024-08', amount: 165000, type: 'base' },
  { date: '2024-09', amount: 172000, type: 'service' },
  { date: '2024-10', amount: 158000, type: 'base' },
  { date: '2024-11', amount: 180000, type: 'base' },
  { date: '2024-12', amount: 195000, type: 'service' },
];

const MOCK_SLASHING_EVENTS: SlashingEvent[] = [
  {
    id: 'slash-001',
    node: 'ChainLink Node #42',
    reason: 'Downtime - Failed to respond within timeout window',
    amount: 2500,
    timestamp: new Date('2024-12-15T10:30:00'),
  },
  {
    id: 'slash-002',
    node: 'Oracle Operator #18',
    reason: 'Incorrect data - Price deviation exceeded threshold',
    amount: 1800,
    timestamp: new Date('2024-12-10T14:20:00'),
  },
  {
    id: 'slash-003',
    node: 'Node Runner #7',
    reason: 'Downtime - Extended maintenance without notice',
    amount: 3200,
    timestamp: new Date('2024-12-05T08:15:00'),
  },
  {
    id: 'slash-004',
    node: 'Staking Pool #3',
    reason: 'Incorrect data - Late price update submission',
    amount: 950,
    timestamp: new Date('2024-11-28T16:45:00'),
  },
];

const MOCK_UNLOCK_QUEUE: UnlockQueue[] = [
  {
    address: '0x1234...5678',
    amount: 15000,
    unlockTime: new Date('2024-12-20T00:00:00'),
    status: 'ready',
  },
  {
    address: '0xabcd...efgh',
    amount: 8500,
    unlockTime: new Date('2024-12-22T00:00:00'),
    status: 'queued',
  },
  {
    address: '0x9876...5432',
    amount: 25000,
    unlockTime: new Date('2024-12-18T00:00:00'),
    status: 'withdrawn',
  },
  {
    address: '0xdef0...1234',
    amount: 12000,
    unlockTime: new Date('2024-12-25T00:00:00'),
    status: 'queued',
  },
];

const MOCK_OPERATOR_STAKES: OperatorStake[] = [
  { rank: 1, name: 'ChainLink Labs', stakedAmount: 5200000, reputation: 98, rewards: 125000 },
  { rank: 2, name: 'Staking Facilities', stakedAmount: 3800000, reputation: 96, rewards: 92000 },
  { rank: 3, name: 'Figment Networks', stakedAmount: 3200000, reputation: 95, rewards: 78000 },
  { rank: 4, name: 'Chorus One', stakedAmount: 2900000, reputation: 94, rewards: 71000 },
  { rank: 5, name: 'Everstake', stakedAmount: 2500000, reputation: 93, rewards: 61000 },
  { rank: 6, name: 'P2P Validator', stakedAmount: 2200000, reputation: 92, rewards: 54000 },
  { rank: 7, name: 'B-Harvest', stakedAmount: 1900000, reputation: 91, rewards: 46000 },
  { rank: 8, name: 'Certus One', stakedAmount: 1600000, reputation: 90, rewards: 39000 },
];

const REWARD_COLORS = {
  base: '#375bd2',
  service: '#10b981',
  slashing: '#f59e0b',
};

const PIE_COLORS = ['#375bd2', '#10b981', '#f59e0b', '#ef4444'];

const SCENARIOS = {
  conservative: { label: 'Conservative', apy: 4.5, color: '#60a5fa' },
  moderate: { label: 'Moderate', apy: 7.2, color: '#3b82f6' },
  optimistic: { label: 'Optimistic', apy: 10.8, color: '#1d4ed8' },
};

export function ChainlinkStakingView() {
  const t = useTranslations();
  const [stakeAmount, setStakeAmount] = useState<string>('10000');
  const [selectedScenario, setSelectedScenario] = useState<
    'conservative' | 'moderate' | 'optimistic'
  >('moderate');
  const [stakingPeriod, setStakingPeriod] = useState<number>(12);

  const amount = parseFloat(stakeAmount) || 0;
  const scenario = SCENARIOS[selectedScenario];

  const rewards = useMemo(() => {
    const apyDecimal = scenario.apy / 100;
    const periodDecimal = stakingPeriod / 12;
    const yearlyReward = amount * apyDecimal;
    const periodReward = yearlyReward * periodDecimal;

    return {
      daily: yearlyReward / 365,
      monthly: yearlyReward / 12,
      yearly: yearlyReward,
      total: periodReward,
      apy: scenario.apy,
    };
  }, [amount, scenario.apy, stakingPeriod]);

  const rewardDistribution = useMemo(() => {
    const base = MOCK_REWARD_HISTORY.filter((r) => r.type === 'base').reduce(
      (sum, r) => sum + r.amount,
      0
    );
    const service = MOCK_REWARD_HISTORY.filter((r) => r.type === 'service').reduce(
      (sum, r) => sum + r.amount,
      0
    );
    const slashing = MOCK_REWARD_HISTORY.filter((r) => r.type === 'slashing').reduce(
      (sum, r) => sum + r.amount,
      0
    );
    return [
      { name: t('chainlink.staking.baseRewards'), value: base, color: REWARD_COLORS.base },
      { name: t('chainlink.staking.serviceRewards'), value: service, color: REWARD_COLORS.service },
      {
        name: t('chainlink.staking.slashingIncome'),
        value: slashing,
        color: REWARD_COLORS.slashing,
      },
    ];
  }, [t]);

  const chartData = useMemo(() => MOCK_REWARD_HISTORY, []);

  const formatNumber = useCallback((value: number): string => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
    return value.toFixed(2);
  }, []);

  const formatUsd = useCallback(
    (linkAmount: number): string => `$${(linkAmount * LINK_PRICE).toFixed(2)}`,
    []
  );

  const formatDate = useCallback((date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'active':
      case 'ready':
        return 'text-green-600 bg-green-50';
      case 'paused':
      case 'queued':
        return 'text-yellow-600 bg-yellow-50';
      case 'withdrawn':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  }, []);

  const totalSlashed = MOCK_SLASHING_EVENTS.reduce((sum, e) => sum + e.amount, 0);
  const pendingUnlock = MOCK_UNLOCK_QUEUE.filter(
    (q) => q.status === 'queued' || q.status === 'ready'
  ).reduce((sum, q) => sum + q.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Wallet className="w-5 h-5 text-gray-500" />
        <h2 className="text-lg font-semibold text-gray-900">{t('chainlink.staking.title')}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">
              {t('chainlink.staking.totalStaked')}
            </span>
            <Lock className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-xl font-bold text-gray-900">
            {formatNumber(MOCK_POOL_STATS.totalStaked)} LINK
          </div>
          <div className="text-xs text-gray-400 mt-1">
            ≈ {formatUsd(MOCK_POOL_STATS.totalStaked)}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">
              {t('chainlink.staking.stakingRate')}
            </span>
            <Activity className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-xl font-bold text-gray-900">{MOCK_POOL_STATS.stakingRate}%</div>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-3 h-3 text-green-500" />
            <span className="text-xs text-green-600">+2.3% {t('chainlink.staking.lastMonth')}</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">
              {t('chainlink.staking.currentAPR')}
            </span>
            <TrendingUp className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-xl font-bold text-gray-900">{MOCK_POOL_STATS.currentAPR}%</div>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-3 h-3 text-green-500" />
            <span className="text-xs text-green-600">+0.8% {t('chainlink.staking.lastMonth')}</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">
              {t('chainlink.staking.communityPool')}
            </span>
            <Users className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-xl font-bold text-gray-900">
            {formatNumber(MOCK_POOL_STATS.communityPoolSize)} LINK
          </div>
          <div
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${getStatusColor(MOCK_POOL_STATS.communityPoolStatus)}`}
          >
            {MOCK_POOL_STATS.communityPoolStatus === 'active'
              ? t('chainlink.staking.active')
              : t('chainlink.staking.paused')}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-900">
                {t('chainlink.staking.rewardTrend')}
              </h3>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: REWARD_COLORS.base }}
                />
                <span className="text-gray-500">{t('chainlink.staking.baseRewards')}</span>
              </div>
              <div className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: REWARD_COLORS.service }}
                />
                <span className="text-gray-500">{t('chainlink.staking.serviceRewards')}</span>
              </div>
              <div className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: REWARD_COLORS.slashing }}
                />
                <span className="text-gray-500">{t('chainlink.staking.slashingIncome')}</span>
              </div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorBase" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={REWARD_COLORS.base} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={REWARD_COLORS.base} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={formatNumber} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  formatter={(value) => [`${formatNumber(value as number)} LINK`, 'Amount']}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke={REWARD_COLORS.base}
                  fillOpacity={1}
                  fill="url(#colorBase)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-900">
              {t('chainlink.staking.rewardDistribution')}
            </h3>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={rewardDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {rewardDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  formatter={(value) => [`${formatNumber(value as number)} LINK`, 'Amount']}
                />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {rewardDistribution.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-medium text-gray-900">{formatNumber(item.value)} LINK</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Calculator className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-900">
              {t('chainlink.staking.calculator')}
            </h3>
          </div>

          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                {t('chainlink.staking.stakeAmount')}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-gray-300 focus:border-gray-300 outline-none"
                  placeholder="10000"
                  min="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
                  LINK
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-1">≈ {formatUsd(amount)}</div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                {t('chainlink.staking.stakingPeriod')}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="36"
                  value={stakingPeriod}
                  onChange={(e) => setStakingPeriod(parseInt(e.target.value))}
                  className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-500"
                />
                <span className="text-sm text-gray-600 w-16 text-right">
                  {stakingPeriod} {t('chainlink.staking.months')}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                {t('chainlink.staking.scenario')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(SCENARIOS) as Array<'conservative' | 'moderate' | 'optimistic'>).map(
                  (key) => (
                    <button
                      key={key}
                      onClick={() => setSelectedScenario(key)}
                      className={`px-2 py-2 rounded text-xs font-medium transition-all ${
                        selectedScenario === key
                          ? 'bg-gray-100 text-gray-900 border border-gray-300'
                          : 'bg-transparent text-gray-500 border border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div>{SCENARIOS[key].label}</div>
                      <div className="text-xs opacity-60">{SCENARIOS[key].apy}% APY</div>
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">
                  {t('chainlink.staking.expectedRewards')}
                </span>
                <span className="text-xs font-medium text-gray-700">{scenario.apy}% APY</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">{t('chainlink.staking.daily')}</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {formatNumber(rewards.daily)}
                  </div>
                  <div className="text-xs text-gray-400">LINK</div>
                </div>

                <div className="text-center border-x border-gray-100">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">{t('chainlink.staking.monthly')}</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {formatNumber(rewards.monthly)}
                  </div>
                  <div className="text-xs text-gray-400">LINK</div>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <TrendingUp className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">{t('chainlink.staking.yearly')}</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {formatNumber(rewards.yearly)}
                  </div>
                  <div className="text-xs text-gray-400">LINK</div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {t('chainlink.staking.totalAfter')} {stakingPeriod}{' '}
                    {t('chainlink.staking.months')}
                  </span>
                  <div className="text-right">
                    <div className="text-base font-bold text-gray-900">
                      +{formatNumber(rewards.total)} LINK
                    </div>
                    <div className="text-xs text-gray-400">≈ {formatUsd(rewards.total)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-900">
                {t('chainlink.staking.slashingEvents')}
              </h3>
            </div>
            <span className="text-xs text-gray-500">{t('chainlink.staking.last30Days')}</span>
          </div>

          <div className="space-y-3">
            {MOCK_SLASHING_EVENTS.slice(0, 4).map((event) => (
              <div key={event.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-900">{event.node}</span>
                    <span className="text-xs font-semibold text-red-600">
                      -{formatNumber(event.amount)} LINK
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{event.reason}</p>
                  <span className="text-xs text-gray-400">{formatDate(event.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{t('chainlink.staking.totalSlashed')}</span>
              <span className="text-sm font-bold text-red-600">
                {formatNumber(totalSlashed)} LINK
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Unlock className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-900">
                {t('chainlink.staking.unlockQueue')}
              </h3>
            </div>
            <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full font-medium">
              {
                MOCK_UNLOCK_QUEUE.filter((q) => q.status === 'queued' || q.status === 'ready')
                  .length
              }{' '}
              {t('chainlink.staking.pending')}
            </span>
          </div>

          <div className="space-y-2">
            {MOCK_UNLOCK_QUEUE.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">
                      {item.address.slice(2, 4)}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-900">{item.address}</div>
                    <div className="text-xs text-gray-400">{formatDate(item.unlockTime)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {formatNumber(item.amount)} LINK
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${getStatusColor(item.status)}`}
                  >
                    {t(`chainlink.staking.status.${item.status}`)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{t('chainlink.staking.pendingUnlock')}</span>
              <span className="text-sm font-bold text-gray-900">
                {formatNumber(pendingUnlock)} LINK
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-900">
                {t('chainlink.staking.operatorRanking')}
              </h3>
            </div>
            <button className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
              {t('chainlink.staking.viewAll')}
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {MOCK_OPERATOR_STAKES.slice(0, 5).map((operator) => (
              <div
                key={operator.rank}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-600">{operator.rank}</span>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-900">{operator.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">
                        {formatNumber(operator.stakedAmount)} LINK
                      </span>
                      <span className="text-xs text-gray-300">|</span>
                      <span className="text-xs text-gray-400">
                        {t('chainlink.staking.reputation')}: {operator.reputation}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">{t('chainlink.staking.rewards')}</div>
                  <div className="text-sm font-semibold text-green-600">
                    +{formatNumber(operator.rewards)} LINK
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MOCK_OPERATOR_STAKES.slice(0, 5)}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9 }}
                    stroke="#9ca3af"
                    tickFormatter={(value) => value.slice(0, 8)}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="#9ca3af"
                    tickFormatter={(v) => `${v / 1000000}M`}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
                    formatter={(value) => [`${formatNumber(value as number)} LINK`, 'Staked']}
                  />
                  <Bar dataKey="stakedAmount" fill="#375bd2" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-900">
            {t('chainlink.staking.slashingConditions')}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-red-50 rounded-lg border border-red-100">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-900">
                {t('chainlink.staking.downtime')}
              </span>
            </div>
            <p className="text-xs text-red-700">{t('chainlink.staking.downtimeDesc')}</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">
                {t('chainlink.staking.incorrectData')}
              </span>
            </div>
            <p className="text-xs text-orange-700">{t('chainlink.staking.incorrectDataDesc')}</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-900">
                {t('chainlink.staking.malicious')}
              </span>
            </div>
            <p className="text-xs text-yellow-700">{t('chainlink.staking.maliciousDesc')}</p>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-500 leading-relaxed">{t('chainlink.staking.disclaimer')}</p>
      </div>
    </div>
  );
}

export default ChainlinkStakingView;
