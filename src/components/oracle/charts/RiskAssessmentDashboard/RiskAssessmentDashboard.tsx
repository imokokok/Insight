'use client';

import { useState, useEffect, useMemo } from 'react';

import {
  AlertTriangle,
  Shield,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

import { Skeleton } from '@/components/ui';

interface RiskFactor {
  id: string;
  name: string;
  score: number;
  weight: number;
  status: 'good' | 'warning' | 'critical';
  description: string;
  trend: 'up' | 'down' | 'stable';
}

interface RiskScore {
  overall: number;
  timestamp: number;
  factors: RiskFactor[];
}

interface RiskHistoryPoint {
  timestamp: number;
  date: string;
  score: number;
}

interface RiskAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  message: string;
  timestamp: number;
  factor?: string;
}

const RISK_THRESHOLDS = {
  low: { min: 0, max: 30, color: '#10b981', label: 'Low Risk' },
  medium: { min: 30, max: 60, color: '#f59e0b', label: 'Medium Risk' },
  high: { min: 60, max: 80, color: '#f97316', label: 'High Risk' },
  critical: { min: 80, max: 100, color: '#ef4444', label: 'Critical Risk' },
};

const DEFAULT_RISK_FACTORS: RiskFactor[] = [
  {
    id: 'data_freshness',
    name: 'Data Freshness',
    score: 15,
    weight: 0.2,
    status: 'good',
    description: 'Time since last price update',
    trend: 'stable',
  },
  {
    id: 'source_diversity',
    name: 'Source Diversity',
    score: 25,
    weight: 0.15,
    status: 'warning',
    description: 'Number of independent data sources',
    trend: 'up',
  },
  {
    id: 'price_deviation',
    name: 'Price Deviation',
    score: 10,
    weight: 0.25,
    status: 'good',
    description: 'Deviation from median price across sources',
    trend: 'down',
  },
  {
    id: 'liquidity_depth',
    name: 'Liquidity Depth',
    score: 35,
    weight: 0.15,
    status: 'warning',
    description: 'Available liquidity for price feeds',
    trend: 'stable',
  },
  {
    id: 'network_health',
    name: 'Network Health',
    score: 20,
    weight: 0.15,
    status: 'good',
    description: 'Overall network and node health',
    trend: 'down',
  },
  {
    id: 'manipulation_risk',
    name: 'Manipulation Risk',
    score: 12,
    weight: 0.1,
    status: 'good',
    description: 'Risk of price manipulation attacks',
    trend: 'stable',
  },
];

interface RiskAssessmentDashboardProps {
  symbol?: string;
  refreshInterval?: number;
  onAlert?: (alert: RiskAlert) => void;
}

export function RiskAssessmentDashboard({
  symbol = 'DIA',
  refreshInterval = 60000,
  onAlert,
}: RiskAssessmentDashboardProps) {
  const [riskScore, setRiskScore] = useState<RiskScore | null>(null);
  const [riskHistory, setRiskHistory] = useState<RiskHistoryPoint[]>([]);
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const calculateOverallRisk = (factors: RiskFactor[]): number => {
    return factors.reduce((total, factor) => total + factor.score * factor.weight, 0);
  };

  const generateMockHistory = (): RiskHistoryPoint[] => {
    const history: RiskHistoryPoint[] = [];
    const now = Date.now();
    const baseScore = 20;

    for (let i = 24; i >= 0; i--) {
      const timestamp = now - i * 60 * 60 * 1000;
      const variation = (Math.random() - 0.5) * 15;
      const trend = Math.sin(i / 6) * 5;

      history.push({
        timestamp,
        date: new Date(timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        score: Math.max(0, Math.min(100, baseScore + variation + trend)),
      });
    }

    return history;
  };

  const generateRiskFactors = (): RiskFactor[] => {
    return DEFAULT_RISK_FACTORS.map((factor) => {
      const variation = (Math.random() - 0.5) * 10;
      const newScore = Math.max(0, Math.min(100, factor.score + variation));

      let status: RiskFactor['status'] = 'good';
      if (newScore > 60) status = 'critical';
      else if (newScore > 30) status = 'warning';

      const trends: RiskFactor['trend'][] = ['up', 'down', 'stable'];
      const trend = trends[Math.floor(Math.random() * 3)];

      return {
        ...factor,
        score: newScore,
        status,
        trend,
      };
    });
  };

  const checkForAlerts = (factors: RiskFactor[], overallScore: number): RiskAlert[] => {
    const newAlerts: RiskAlert[] = [];
    const now = Date.now();

    factors.forEach((factor) => {
      if (factor.status === 'critical') {
        newAlerts.push({
          id: `${factor.id}-${now}`,
          type: 'critical',
          message: `${factor.name} has reached critical risk level (${factor.score.toFixed(1)})`,
          timestamp: now,
          factor: factor.id,
        });
      } else if (factor.status === 'warning' && factor.trend === 'up') {
        newAlerts.push({
          id: `${factor.id}-${now}`,
          type: 'warning',
          message: `${factor.name} is trending upward (${factor.score.toFixed(1)})`,
          timestamp: now,
          factor: factor.id,
        });
      }
    });

    if (overallScore > 60) {
      newAlerts.push({
        id: `overall-${now}`,
        type: 'critical',
        message: `Overall risk score is high (${overallScore.toFixed(1)})`,
        timestamp: now,
      });
    }

    return newAlerts;
  };

  const fetchData = async () => {
    setIsRefreshing(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const factors = generateRiskFactors();
      const overall = calculateOverallRisk(factors);
      const newAlerts = checkForAlerts(factors, overall);

      setRiskScore({
        overall,
        timestamp: Date.now(),
        factors,
      });

      setRiskHistory((prev) => {
        const newHistory = [
          ...prev.slice(-23),
          {
            timestamp: Date.now(),
            date: new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            score: overall,
          },
        ];
        return newHistory.length > 0 ? newHistory : generateMockHistory();
      });

      if (newAlerts.length > 0) {
        setAlerts((prev) => [...newAlerts, ...prev].slice(0, 10));
        newAlerts.forEach((alert) => onAlert?.(alert));
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setRiskHistory(generateMockHistory());
    fetchData();

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const riskLevel = useMemo(() => {
    if (!riskScore) return RISK_THRESHOLDS.low;

    const score = riskScore.overall;
    if (score >= RISK_THRESHOLDS.critical.min) return RISK_THRESHOLDS.critical;
    if (score >= RISK_THRESHOLDS.high.min) return RISK_THRESHOLDS.high;
    if (score >= RISK_THRESHOLDS.medium.min) return RISK_THRESHOLDS.medium;
    return RISK_THRESHOLDS.low;
  }, [riskScore]);

  const radarData = useMemo(() => {
    if (!riskScore) return [];
    return riskScore.factors.map((factor) => ({
      factor: factor.name,
      score: factor.score,
      fullMark: 100,
    }));
  }, [riskScore]);

  const getStatusIcon = (status: RiskFactor['status']) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'critical':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getTrendIcon = (trend: RiskFactor['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-red-500" />;
      case 'down':
        return <TrendingDown className="w-3 h-3 text-emerald-500" />;
      case 'stable':
        return <Activity className="w-3 h-3 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!riskScore) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Risk Assessment Dashboard</h3>
          <p className="text-sm text-gray-500 mt-0.5">Real-time risk monitoring for {symbol}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-500">Last updated</p>
            <p className="text-sm font-medium text-gray-900">
              {new Date(riskScore.timestamp).toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div
            className="p-6 rounded-lg border-2 text-center"
            style={{ borderColor: riskLevel.color }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="w-5 h-5" style={{ color: riskLevel.color }} />
              <span className="text-sm font-medium" style={{ color: riskLevel.color }}>
                {riskLevel.label}
              </span>
            </div>
            <div className="text-5xl font-bold text-gray-900 mb-2">
              {riskScore.overall.toFixed(1)}
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${riskScore.overall}%`,
                  backgroundColor: riskLevel.color,
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Risk score (0-100, lower is better)</p>
          </div>

          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="factor" tick={{ fontSize: 9, fill: '#6b7280' }} />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fontSize: 8, fill: '#9ca3af' }}
                />
                <Radar
                  name="Risk"
                  dataKey="score"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h4 className="text-sm font-medium text-gray-900">Risk Factors</h4>
            </div>
            <div className="divide-y divide-gray-200">
              {riskScore.factors.map((factor) => (
                <div key={factor.id} className="px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(factor.status)}
                      <span className="font-medium text-gray-900">{factor.name}</span>
                      {getTrendIcon(factor.trend)}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${factor.score}%`,
                            backgroundColor:
                              factor.status === 'good'
                                ? '#10b981'
                                : factor.status === 'warning'
                                  ? '#f59e0b'
                                  : '#ef4444',
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-10 text-right">
                        {factor.score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-6">{factor.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Risk Score Trend (24h)</h4>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={riskHistory} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    stroke="#9ca3af"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} domain={[0, 100]} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [value.toFixed(1), 'Risk Score']}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">Recent Alerts</h4>
            <span className="text-xs text-gray-500">{alerts.length} alerts</span>
          </div>
          <div className="divide-y divide-gray-200 max-h-48 overflow-y-auto">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={`px-4 py-2 flex items-start gap-2 ${
                  alert.type === 'critical'
                    ? 'bg-red-50'
                    : alert.type === 'warning'
                      ? 'bg-amber-50'
                      : 'bg-blue-50'
                }`}
              >
                {alert.type === 'critical' ? (
                  <XCircle className="w-4 h-4 text-red-500 mt-0.5" />
                ) : alert.type === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{alert.message}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default RiskAssessmentDashboard;
