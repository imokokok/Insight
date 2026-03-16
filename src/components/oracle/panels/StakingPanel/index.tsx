'use client';

import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { UMAClient } from '@/lib/oracles/uma';
import { DashboardCard } from '../../common/DashboardCard';
import { StakingCalculator } from '../../common/StakingCalculator';
import { createLogger } from '@/lib/utils/logger';
import { chartColors, baseColors, semanticColors } from '@/lib/config/colors';

const logger = createLogger('StakingPanel');
const umaClient = new UMAClient();

interface StakingStats {
  totalStaked: number;
  stakingRate: number;
  averageAPY: number;
  validatorCount: number;
  totalRewardsDistributed: number;
}

interface StakingHistory {
  date: string;
  totalStaked: number;
  rewardsDistributed: number;
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: string; positive: boolean };
}) {
  return (
    <div className="bg-white border border-gray-200 p-5 hover:border-gray-300 transition-colors duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{title}</p>
          <p className="text-gray-900 text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-gray-400 text-xs mt-1">{subtitle}</p>}
          {trend && (
            <p
              className={`text-xs mt-2 font-medium ${trend.positive ? 'text-green-600' : 'text-red-600'}`}
            >
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        <div className="p-2.5 bg-blue-50 text-blue-600">{icon}</div>
      </div>
    </div>
  );
}

function StakingHistoryChart({ data }: { data: StakingHistory[] }) {
  const { t } = useI18n();
  const maxValue = Math.max(...data.map((d) => d.totalStaked));

  return (
    <DashboardCard title={t('uma.staking.historyTitle') || '质押历史趋势'}>
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500"></div>
            <span className="text-gray-600">{t('uma.staking.totalStaked') || '总质押量'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500"></div>
            <span className="text-gray-600">{t('uma.staking.rewards') || '奖励分发'}</span>
          </div>
        </div>

        <div className="h-48 flex items-end justify-between gap-2">
          {data.map((item, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center gap-0.5 h-36">
                <div
                  className="w-full bg-blue-500 transition-all duration-300"
                  style={{ height: `${(item.totalStaked / maxValue) * 100}%` }}
                  title={`${t('uma.staking.totalStaked')}: ${item.totalStaked.toLocaleString()} UMA`}
                />
                <div
                  className="w-full bg-green-500 transition-all duration-300"
                  style={{ height: `${(item.rewardsDistributed / maxValue) * 30}%` }}
                  title={`${t('uma.staking.rewards')}: ${item.rewardsDistributed.toLocaleString()} UMA`}
                />
              </div>
              <span className="text-xs text-gray-500">{item.date}</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardCard>
  );
}

function StakingGuide() {
  const { t } = useI18n();

  const steps = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      title: t('uma.staking.step1Title') || '获取UMA代币',
      description: t('uma.staking.step1Desc') || '从交易所购买UMA代币并转入您的钱包',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      title: t('uma.staking.step2Title') || '选择验证者',
      description: t('uma.staking.step2Desc') || '根据收益率、信誉度和成功率选择合适的验证者',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      title: t('uma.staking.step3Title') || '质押代币',
      description: t('uma.staking.step3Desc') || '将UMA代币质押到选定的验证者节点',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      title: t('uma.staking.step4Title') || '获得奖励',
      description: t('uma.staking.step4Desc') || '参与争议解决获得UMA奖励',
    },
  ];

  return (
    <DashboardCard title={t('uma.staking.guideTitle') || '质押指南'}>
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={index} className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-50 text-blue-600 flex items-center justify-center">
              {step.icon}
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-900">
                {index + 1}. {step.title}
              </h4>
              <p className="text-sm text-gray-500 mt-1">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

function RiskWarning() {
  const { t } = useI18n();

  const risks = [
    {
      title: t('uma.staking.risk1Title') || '质押锁定期',
      description: t('uma.staking.risk1Desc') || '解除质押后需要等待一段时间才能取回代币',
    },
    {
      title: t('uma.staking.risk2Title') || '验证者风险',
      description: t('uma.staking.risk2Desc') || '选择不可靠的验证者可能影响收益',
    },
    {
      title: t('uma.staking.risk3Title') || '市场波动',
      description: t('uma.staking.risk3Desc') || 'UMA代币价格波动会影响实际收益',
    },
  ];

  return (
    <div className="bg-amber-50 border border-amber-200 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-amber-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-amber-800">
            {t('uma.staking.riskTitle') || '风险提示'}
          </h4>
          <ul className="mt-2 space-y-2">
            {risks.map((risk, index) => (
              <li key={index} className="text-sm text-amber-700">
                <span className="font-medium">{risk.title}:</span> {risk.description}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function StakingPanel() {
  const { t } = useI18n();
  const [stats, setStats] = useState<StakingStats | null>(null);
  const [history, setHistory] = useState<StakingHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // 模拟获取质押统计数据
      const mockStats: StakingStats = {
        totalStaked: 45000000,
        stakingRate: 45.2,
        averageAPY: 12.5,
        validatorCount: 850,
        totalRewardsDistributed: 12500000,
      };

      // 模拟获取质押历史数据
      const mockHistory: StakingHistory[] = [
        { date: '1月', totalStaked: 38000000, rewardsDistributed: 850000 },
        { date: '2月', totalStaked: 39500000, rewardsDistributed: 920000 },
        { date: '3月', totalStaked: 41000000, rewardsDistributed: 980000 },
        { date: '4月', totalStaked: 42500000, rewardsDistributed: 1050000 },
        { date: '5月', totalStaked: 43800000, rewardsDistributed: 1120000 },
        { date: '6月', totalStaked: 45000000, rewardsDistributed: 1180000 },
      ];

      setStats(mockStats);
      setHistory(mockHistory);
    } catch (error) {
      logger.error('Failed to fetch staking data', error as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          <p className="text-gray-500 text-sm">{t('uma.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 质押统计概览 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('uma.staking.totalStaked') || '总质押量'}
          value={`${((stats?.totalStaked || 0) / 1000000).toFixed(1)}M`}
          subtitle="UMA"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          trend={{ value: '+5.2%', positive: true }}
        />
        <StatCard
          title={t('uma.staking.stakingRate') || '质押率'}
          value={`${stats?.stakingRate || 0}%`}
          subtitle={t('uma.staking.ofTotalSupply') || '占总供应量'}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          }
          trend={{ value: '+2.1%', positive: true }}
        />
        <StatCard
          title={t('uma.staking.averageAPY') || '平均年化收益率'}
          value={`${stats?.averageAPY || 0}%`}
          subtitle="APY"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          }
          trend={{ value: '-0.3%', positive: false }}
        />
        <StatCard
          title={t('uma.staking.validatorCount') || '验证者数量'}
          value={`${stats?.validatorCount || 0}`}
          subtitle={t('uma.staking.activeValidators') || '活跃验证者'}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          }
          trend={{ value: '+12', positive: true }}
        />
      </div>

      {/* 质押收益计算器 */}
      <StakingCalculator />

      {/* 质押历史图表 */}
      <StakingHistoryChart data={history} />

      {/* 质押指南和风险提示 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StakingGuide />
        <RiskWarning />
      </div>
    </div>
  );
}

export default StakingPanel;
