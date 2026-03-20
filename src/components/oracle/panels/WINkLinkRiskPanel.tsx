'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { WINkLinkRiskMetrics } from '@/lib/oracles/winklink';
import {
  Shield,
  AlertTriangle,
  TrendingUp,
  Activity,
  Globe,
  Zap,
  Server,
  Gamepad2,
} from 'lucide-react';
import { DataFreshnessIndicator } from '@/components/oracle/common/DataFreshnessIndicator';
import { RiskScoreCard } from '@/components/oracle/common/RiskScoreCard';
import { SecurityTimeline } from '@/components/oracle/common/SecurityTimeline';
import { MitigationMeasuresGrid } from '@/components/oracle/common/MitigationMeasuresGrid';
import { DashboardCard } from '@/components/oracle/common/DashboardCard';
import { RiskEvent, MitigationMeasure, CrossChainRisk } from '@/types/risk';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface WINkLinkRiskPanelProps {
  data: WINkLinkRiskMetrics;
}

interface RiskTrendData {
  date: string;
  overall: number;
  decentralization: number;
  security: number;
  stability: number;
  dataQuality: number;
}

export function WINkLinkRiskPanel({ data }: WINkLinkRiskPanelProps) {
  const t = useTranslations();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date(data.lastUpdate));
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshTimerRef.current = setTimeout(() => {
      setLastUpdated(new Date());
      setIsRefreshing(false);
    }, 1000);
  };

  const getRiskLevel = (score: number) => {
    if (score >= 90) return { level: 'low', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (score >= 70) return { level: 'medium', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { level: 'high', color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  const getDeviationRisk = (deviation: number) => {
    if (deviation <= 0.2) return { level: 'low', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (deviation <= 0.5)
      return { level: 'medium', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { level: 'high', color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  const dataQualityRisk = getRiskLevel(data.dataQuality ?? 0);
  const deviationRisk = getDeviationRisk(data.deviation);
  const nodeRisk = getRiskLevel(data.decentralization);
  const uptimeRisk = getRiskLevel(data.uptime);

  // 四维度评分数据
  const riskScores = useMemo(
    () => [
      {
        title: t('winklink.risk.decentralization'),
        score: 78,
        description: t('winklink.risk.decentralizationDesc'),
        trend: 'up' as const,
        trendValue: '+3.2%',
      },
      {
        title: t('winklink.risk.security'),
        score: 92,
        description: t('winklink.risk.securityDesc'),
        trend: 'neutral' as const,
        trendValue: '0%',
      },
      {
        title: t('winklink.risk.stability'),
        score: 96,
        description: t('winklink.risk.stabilityDesc'),
        trend: 'up' as const,
        trendValue: '+0.5%',
      },
      {
        title: t('winklink.risk.dataQuality'),
        score: 94,
        description: t('winklink.risk.dataQualityDesc'),
        trend: 'up' as const,
        trendValue: '+1.8%',
      },
    ],
    [t]
  );

  // 风险趋势图表数据
  const riskTrendData: RiskTrendData[] = useMemo(
    () => [
      {
        date: '2024-09',
        overall: 88,
        decentralization: 72,
        security: 90,
        stability: 94,
        dataQuality: 90,
      },
      {
        date: '2024-10',
        overall: 89,
        decentralization: 74,
        security: 91,
        stability: 95,
        dataQuality: 91,
      },
      {
        date: '2024-11',
        overall: 88,
        decentralization: 75,
        security: 90,
        stability: 95,
        dataQuality: 92,
      },
      {
        date: '2024-12',
        overall: 90,
        decentralization: 76,
        security: 91,
        stability: 95,
        dataQuality: 93,
      },
      {
        date: '2025-01',
        overall: 90,
        decentralization: 78,
        security: 92,
        stability: 96,
        dataQuality: 94,
      },
      {
        date: '2025-02',
        overall: 91,
        decentralization: 78,
        security: 92,
        stability: 96,
        dataQuality: 94,
      },
      {
        date: '2025-03',
        overall: 91,
        decentralization: 78,
        security: 92,
        stability: 96,
        dataQuality: 94,
      },
    ],
    []
  );

  // 安全事件数据
  const securityEvents: RiskEvent[] = useMemo(
    () => [
      {
        date: '2024-06-15',
        type: 'upgrade',
        title: t('winklink.risk.events.nodeUpgrade'),
        description: t('winklink.risk.events.nodeUpgradeDesc'),
        status: 'resolved',
      },
      {
        date: '2024-08-22',
        type: 'vulnerability',
        title: t('winklink.risk.events.vrfPatch'),
        description: t('winklink.risk.events.vrfPatchDesc'),
        status: 'resolved',
      },
      {
        date: '2024-11-10',
        type: 'response',
        title: t('winklink.risk.events.ddosResponse'),
        description: t('winklink.risk.events.ddosResponseDesc'),
        status: 'resolved',
      },
      {
        date: '2025-01-20',
        type: 'maintenance',
        title: t('winklink.risk.events.consensusUpgrade'),
        description: t('winklink.risk.events.consensusUpgradeDesc'),
        status: 'resolved',
      },
      {
        date: '2025-02-28',
        type: 'upgrade',
        title: t('winklink.risk.events.multiChainSupport'),
        description: t('winklink.risk.events.multiChainSupportDesc'),
        status: 'resolved',
      },
    ],
    [t]
  );

  // 缓解措施数据
  const mitigationMeasures: MitigationMeasure[] = useMemo(
    () => [
      {
        name: 'winklink.risk.measures.multiNodeValidation',
        type: 'technical',
        status: 'active',
        effectiveness: 95,
      },
      {
        name: 'winklink.risk.measures.slashingMechanism',
        type: 'governance',
        status: 'active',
        effectiveness: 88,
      },
      {
        name: 'winklink.risk.measures.emergencyPause',
        type: 'operational',
        status: 'active',
        effectiveness: 92,
      },
      {
        name: 'winklink.risk.measures.auditCycle',
        type: 'technical',
        status: 'active',
        effectiveness: 90,
      },
      {
        name: 'winklink.risk.measures.decentralizationIncentive',
        type: 'governance',
        status: 'active',
        effectiveness: 75,
      },
      {
        name: 'winklink.risk.measures.realTimeMonitoring',
        type: 'operational',
        status: 'active',
        effectiveness: 94,
      },
    ],
    []
  );

  // 跨链风险数据
  const crossChainRisks: CrossChainRisk[] = useMemo(
    () => [
      {
        chain: 'TRON',
        availability: 99.92,
        latency: 110,
        riskLevel: 'low',
      },
      {
        chain: 'BSC',
        availability: 99.85,
        latency: 145,
        riskLevel: 'low',
      },
    ],
    []
  );

  const getChainRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'high':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Data Freshness Indicator */}
      <DataFreshnessIndicator
        lastUpdated={lastUpdated}
        thresholdMinutes={5}
        onRefresh={handleRefresh}
        isLoading={isRefreshing}
      />

      {/* Original 4 Basic Metric Cards */}
      <DashboardCard title={t('winklink.risk.title')}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-green-600" />
              <p className="text-xs text-gray-500">{t('winklink.risk.dataQuality')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{data.dataQuality}%</p>
            <span
              className={`text-xs px-2 py-1 rounded-md ${dataQualityRisk.bgColor} ${dataQualityRisk.color}`}
            >
              {t(`winklink.risk.${dataQualityRisk.level}Risk`)}
            </span>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-gray-500">{t('winklink.risk.priceDeviation')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{data.deviation}%</p>
            <span
              className={`text-xs px-2 py-1 rounded-md ${deviationRisk.bgColor} ${deviationRisk.color}`}
            >
              {t(`winklink.risk.${deviationRisk.level}Risk`)}
            </span>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <p className="text-xs text-gray-500">{t('winklink.risk.nodeConcentration')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{data.decentralization}%</p>
            <span className={`text-xs px-2 py-1 rounded-md ${nodeRisk.bgColor} ${nodeRisk.color}`}>
              {t(`winklink.risk.${nodeRisk.level}Risk`)}
            </span>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-purple-600" />
              <p className="text-xs text-gray-500">{t('winklink.risk.uptime')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {data.uptime.toFixed(2)}%
            </p>
            <span
              className={`text-xs px-2 py-1 rounded-md ${uptimeRisk.bgColor} ${uptimeRisk.color}`}
            >
              {t(`winklink.risk.${uptimeRisk.level}Risk`)}
            </span>
          </div>
        </div>
      </DashboardCard>

      {/* Four-Dimension Risk Score Cards */}
      <DashboardCard title={t('winklink.risk.fourDimensions')}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {riskScores.map((score, index) => (
            <RiskScoreCard
              key={index}
              title={score.title}
              score={score.score}
              description={score.description}
              trend={score.trend}
              trendValue={score.trendValue}
            />
          ))}
        </div>
      </DashboardCard>

      {/* Risk Trend Chart */}
      <DashboardCard title={t('winklink.risk.trendTitle')}>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={riskTrendData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 12 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} domain={[60, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="overall"
                name={t('winklink.risk.trend.overall')}
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="decentralization"
                name={t('winklink.risk.trend.decentralization')}
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="security"
                name={t('winklink.risk.trend.security')}
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="stability"
                name={t('winklink.risk.trend.stability')}
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="dataQuality"
                name={t('winklink.risk.trend.dataQuality')}
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>

      {/* Security Timeline */}
      <SecurityTimeline events={securityEvents} />

      {/* Cross-Chain Risk Assessment */}
      <DashboardCard title={t('winklink.risk.crossChainTitle')}>
        <div className="space-y-4">
          {crossChainRisks.map((chain, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100">
                  <Globe className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{chain.chain}</h4>
                  <p className="text-xs text-gray-500">
                    {t('winklink.risk.chainLatency')}: {chain.latency}ms
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-gray-500">{t('winklink.risk.availability')}</p>
                  <p className="text-sm font-medium text-gray-900">{chain.availability}%</p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium ${getChainRiskColor(chain.riskLevel)}`}
                >
                  {chain.riskLevel}
                </span>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* Gaming Data Specific Risk */}
      <DashboardCard title={t('winklink.risk.gamingRiskTitle')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-yellow-600" />
              <h4 className="text-sm font-medium text-gray-900">
                {t('winklink.risk.gamingLatency')}
              </h4>
            </div>
            <p className="text-2xl font-bold text-gray-900">85ms</p>
            <p className="text-xs text-gray-500 mt-1">{t('winklink.risk.gamingLatencyDesc')}</p>
            <div className="mt-3">
              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700">
                {t('winklink.risk.lowRisk')}
              </span>
            </div>
          </div>
          <div className="p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Gamepad2 className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-medium text-gray-900">
                {t('winklink.risk.gamingAccuracy')}
              </h4>
            </div>
            <p className="text-2xl font-bold text-gray-900">99.97%</p>
            <p className="text-xs text-gray-500 mt-1">{t('winklink.risk.gamingAccuracyDesc')}</p>
            <div className="mt-3">
              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700">
                {t('winklink.risk.excellent')}
              </span>
            </div>
          </div>
          <div className="p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Server className="w-4 h-4 text-purple-600" />
              <h4 className="text-sm font-medium text-gray-900">
                {t('winklink.risk.tronDependency')}
              </h4>
            </div>
            <p className="text-2xl font-bold text-gray-900">78%</p>
            <p className="text-xs text-gray-500 mt-1">{t('winklink.risk.tronDependencyDesc')}</p>
            <div className="mt-3">
              <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700">
                {t('winklink.risk.mediumRisk')}
              </span>
            </div>
          </div>
        </div>
      </DashboardCard>

      {/* Mitigation Measures */}
      <MitigationMeasuresGrid measures={mitigationMeasures} />

      {/* Risk Details */}
      <DashboardCard title={t('winklink.risk.details')}>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">
              {t('winklink.risk.dataQualityDescription')}
            </span>
            <span className="text-sm font-medium text-green-600">
              {t('winklink.risk.excellent')}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">{t('winklink.risk.priceStability')}</span>
            <span className="text-sm font-medium text-green-600">{t('winklink.risk.stable')}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">{t('winklink.risk.nodeDistribution')}</span>
            <span className="text-sm font-medium text-yellow-600">
              {t('winklink.risk.moderate')}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">{t('winklink.risk.serviceReliability')}</span>
            <span className="text-sm font-medium text-green-600">{t('winklink.risk.high')}</span>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
