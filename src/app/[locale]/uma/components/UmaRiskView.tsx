'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
  TrendingUp,
  TrendingDown,
  FileCode,
  Coins,
  Users,
  Settings,
  Clock,
  ArrowRight,
  Lightbulb,
  AlertCircle,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type UmaRiskViewProps } from '../types';

interface RiskAnalysis {
  category: string;
  icon: React.ElementType;
  score: number;
  status: 'low' | 'medium' | 'high';
  factors: {
    name: string;
    value: string;
    status: 'low' | 'medium' | 'high';
  }[];
  description: string;
}

interface RiskTrend {
  date: string;
  score: number;
  events: string[];
}

interface RiskEvent {
  id: string;
  date: string;
  type: 'warning' | 'critical' | 'resolved';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
}

interface MitigationRecommendation {
  id: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actions: string[];
  impact: string;
}

const generateRiskTrend = (): RiskTrend[] => {
  const trends: RiskTrend[] = [];
  const baseDate = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() - i);
    const score = 75 + Math.random() * 20 - (i < 5 ? Math.random() * 5 : 0);
    trends.push({
      date: date.toISOString().split('T')[0],
      score: Math.min(100, Math.max(60, score)),
      events: i === 5 ? ['Smart contract upgrade'] : i === 15 ? ['Validator set change'] : [],
    });
  }
  
  return trends;
};

const generateRiskEvents = (): RiskEvent[] => [
  {
    id: '1',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    type: 'warning',
    title: 'Validator Uptime Drop',
    description: 'Validator #12 uptime dropped below 95% threshold',
    impact: 'medium',
  },
  {
    id: '2',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    type: 'resolved',
    title: 'Smart Contract Audit Completed',
    description: 'Third-party security audit completed with no critical findings',
    impact: 'low',
  },
  {
    id: '3',
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    type: 'critical',
    title: 'Governance Proposal Controversy',
    description: 'Contentious governance proposal detected with high opposition',
    impact: 'high',
  },
  {
    id: '4',
    date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    type: 'resolved',
    title: 'Network Congestion Resolved',
    description: 'Transaction backlog cleared after fee market adjustment',
    impact: 'medium',
  },
];

const detailedRiskAnalysis: RiskAnalysis[] = [
  {
    category: 'Smart Contract Risk',
    icon: FileCode,
    score: 88,
    status: 'low',
    factors: [
      { name: 'Code Audit Status', value: 'Audited', status: 'low' },
      { name: 'Upgrade Frequency', value: 'Low', status: 'low' },
      { name: 'Bug Bounty Program', value: 'Active', status: 'low' },
      { name: 'Code Complexity', value: 'Medium', status: 'medium' },
    ],
    description: 'Smart contracts have undergone comprehensive security audits with active bug bounty programs.',
  },
  {
    category: 'Economic Model Risk',
    icon: Coins,
    score: 82,
    status: 'low',
    factors: [
      { name: 'Token Distribution', value: 'Decentralized', status: 'low' },
      { name: 'Staking Ratio', value: '68%', status: 'low' },
      { name: 'Inflation Rate', value: '2.5%', status: 'low' },
      { name: 'Liquidity Depth', value: 'High', status: 'low' },
    ],
    description: 'Economic model shows strong decentralization with healthy staking participation.',
  },
  {
    category: 'Governance Risk',
    icon: Users,
    score: 75,
    status: 'medium',
    factors: [
      { name: 'Voter Participation', value: '45%', status: 'medium' },
      { name: 'Proposal Quality', value: 'High', status: 'low' },
      { name: 'Whale Concentration', value: 'Moderate', status: 'medium' },
      { name: 'Timelock Period', value: '48h', status: 'low' },
    ],
    description: 'Governance is functional but could benefit from increased voter participation.',
  },
  {
    category: 'Operational Risk',
    icon: Settings,
    score: 90,
    status: 'low',
    factors: [
      { name: 'Team Experience', value: 'High', status: 'low' },
      { name: 'Documentation', value: 'Comprehensive', status: 'low' },
      { name: 'Incident Response', value: 'Established', status: 'low' },
      { name: 'Monitoring Coverage', value: '95%', status: 'low' },
    ],
    description: 'Strong operational practices with experienced team and comprehensive monitoring.',
  },
];

const mitigationRecommendations: MitigationRecommendation[] = [
  {
    id: '1',
    category: 'Governance',
    priority: 'high',
    title: 'Increase Voter Participation',
    description: 'Implement delegation incentives and improve governance UX to boost participation rates.',
    actions: [
      'Launch delegation rewards program',
      'Simplify voting interface',
      'Add governance notifications',
      'Create educational content',
    ],
    impact: 'Expected 20% increase in voter participation within 3 months',
  },
  {
    id: '2',
    category: 'Economic',
    priority: 'medium',
    title: 'Enhance Staking Incentives',
    description: 'Review and optimize staking rewards to maintain healthy staking ratio.',
    actions: [
      'Analyze current reward distribution',
      'Implement dynamic reward adjustment',
      'Add staking derivatives support',
    ],
    impact: 'Improved network security and reduced centralization risk',
  },
  {
    id: '3',
    category: 'Operational',
    priority: 'medium',
    title: 'Expand Validator Set',
    description: 'Increase validator diversity to improve network resilience.',
    actions: [
      'Lower validator entry barrier',
      'Provide validator onboarding support',
      'Implement geographic distribution requirements',
    ],
    impact: 'Enhanced network decentralization and fault tolerance',
  },
  {
    id: '4',
    category: 'Security',
    priority: 'low',
    title: 'Continuous Security Monitoring',
    description: 'Maintain proactive security posture with regular assessments.',
    actions: [
      'Schedule quarterly audits',
      'Expand bug bounty scope',
      'Implement automated vulnerability scanning',
    ],
    impact: 'Early detection and prevention of potential security issues',
  },
];

export function UmaRiskView({ networkStats, disputes }: UmaRiskViewProps) {
  const t = useTranslations();

  const resolvedDisputes = disputes.filter((d) => d.status === 'resolved');
  const avgResolutionTime =
    resolvedDisputes.length > 0 && resolvedDisputes.some((d) => d.resolutionTime)
      ? resolvedDisputes.reduce((sum, d) => sum + (d.resolutionTime || 0), 0) /
        resolvedDisputes.filter((d) => d.resolutionTime).length
      : 0;

  const [riskTrend, setRiskTrend] = useState<RiskTrend[]>([]);
  const [riskEvents, setRiskEvents] = useState<RiskEvent[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<RiskAnalysis | null>(null);
  const [predictionScore, setPredictionScore] = useState(0);

  useEffect(() => {
    setRiskTrend(generateRiskTrend());
    setRiskEvents(generateRiskEvents());
    
    const trend = generateRiskTrend();
    const lastScores = trend.slice(-7).map(t => t.score);
    const avgScore = lastScores.reduce((a, b) => a + b, 0) / lastScores.length;
    const trendDirection = lastScores[lastScores.length - 1] - lastScores[0];
    setPredictionScore(Math.min(100, Math.max(0, avgScore + trendDirection * 0.5)));
  }, []);

  const riskScore = 85;

  const riskMetrics = [
    {
      label: t('uma.risk.disputeSuccessRate'),
      value: `${networkStats?.disputeSuccessRate ?? 78}%`,
      status: 'low' as const,
    },
    {
      label: t('uma.risk.avgResolutionTime'),
      value: `${avgResolutionTime.toFixed(1)}h`,
      status: 'medium' as const,
    },
    {
      label: t('uma.risk.validatorUptime'),
      value: `${networkStats?.validatorUptime ?? 99.5}%`,
      status: 'low' as const,
    },
    {
      label: t('uma.risk.activeDisputes'),
      value: (networkStats?.activeDisputes ?? 23).toString(),
      status: 'low' as const,
    },
  ];

  const mitigationMeasures = [
    t('uma.risk.multiLayerValidation'),
    t('uma.risk.economicIncentives'),
    t('uma.risk.timelyResolution'),
    t('uma.risk.transparentProcess'),
  ];

  const getStatusDotColor = (status: string) => {
    switch (status) {
      case 'low':
        return 'bg-emerald-500';
      case 'medium':
        return 'bg-amber-500';
      case 'high':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'low':
        return 'text-emerald-600';
      case 'medium':
        return 'text-amber-600';
      case 'high':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return t('uma.risk.lowRisk');
    if (score >= 60) return t('uma.risk.mediumRisk');
    return t('uma.risk.highRisk');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return AlertTriangle;
      case 'critical':
        return AlertCircle;
      case 'resolved':
        return CheckCircle;
      default:
        return Info;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'text-amber-500 bg-amber-50';
      case 'critical':
        return 'text-red-500 bg-red-50';
      case 'resolved':
        return 'text-emerald-500 bg-emerald-50';
      default:
        return 'text-gray-500 bg-gray-50';
    }
  };

  const radius = 15.9155;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${riskScore}, 100`;

  const maxTrendScore = Math.max(...riskTrend.map(t => t.score));
  const minTrendScore = Math.min(...riskTrend.map(t => t.score));

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 relative flex-shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-gray-200"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className={getScoreColor(riskScore)}
              strokeDasharray={strokeDasharray}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-gray-900">{riskScore}</span>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-900">{t('uma.risk.overallScore')}</span>
          </div>
          <p className={`text-sm font-semibold mt-1 ${getScoreColor(riskScore)}`}>
            {getScoreLabel(riskScore)}
          </p>
          <p className="text-xs text-gray-500 mt-1 max-w-sm">{t('uma.risk.scoreDescription')}</p>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">{t('uma.risk.overview')}</h3>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          {riskMetrics.map((metric, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{metric.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">{metric.value}</span>
                <div className={`w-2 h-2 rounded-full ${getStatusDotColor(metric.status)}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            {t('uma.risk.detailedAnalysis') || 'Detailed Risk Analysis'}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {detailedRiskAnalysis.map((analysis, index) => {
            const Icon = analysis.icon;
            return (
              <div
                key={index}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedAnalysis?.category === analysis.category
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() =>
                  setSelectedAnalysis(
                    selectedAnalysis?.category === analysis.category ? null : analysis
                  )
                }
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${getScoreColor(analysis.score)}`} />
                    <span className="text-sm font-medium text-gray-900">{analysis.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-semibold ${getScoreColor(analysis.score)}`}>
                      {analysis.score}
                    </span>
                    <div className={`w-2 h-2 rounded-full ${getStatusDotColor(analysis.status)}`} />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-3">{analysis.description}</p>
                <div className="grid grid-cols-2 gap-2">
                  {analysis.factors.slice(0, 4).map((factor, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(factor.status)}`} />
                      <span className="text-xs text-gray-600">{factor.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {selectedAnalysis && (
          <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900">{selectedAnalysis.category}</h4>
              <button
                onClick={() => setSelectedAnalysis(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {selectedAnalysis.factors.map((factor, idx) => (
                <div key={idx} className="p-3 bg-white rounded border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${getStatusDotColor(factor.status)}`} />
                    <span className="text-xs text-gray-500">{factor.name}</span>
                  </div>
                  <p className={`text-sm font-semibold ${getStatusTextColor(factor.status)}`}>
                    {factor.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">
              {t('uma.risk.trendHistory') || 'Risk Score Trend'}
            </h3>
          </div>
          <span className="text-xs text-gray-500">{t('uma.dataQuality.last30DaysTrend')}</span>
        </div>

        <div className="relative h-48 border border-gray-200 rounded-lg p-4">
          <svg width="100%" height="100%" viewBox="0 0 600 150" preserveAspectRatio="none">
            <defs>
              <linearGradient id="riskGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>

            {riskTrend.length > 0 && (
              <>
                <path
                  d={`M 0 ${150 - ((riskTrend[0].score - minTrendScore) / (maxTrendScore - minTrendScore + 10)) * 130} ${riskTrend.map((t, i) => `L ${(i / (riskTrend.length - 1)) * 600} ${150 - ((t.score - minTrendScore) / (maxTrendScore - minTrendScore + 10)) * 130}`).join(' ')} L 600 150 L 0 150 Z`}
                  fill="url(#riskGradient)"
                />
                <path
                  d={`M 0 ${150 - ((riskTrend[0].score - minTrendScore) / (maxTrendScore - minTrendScore + 10)) * 130} ${riskTrend.map((t, i) => `L ${(i / (riskTrend.length - 1)) * 600} ${150 - ((t.score - minTrendScore) / (maxTrendScore - minTrendScore + 10)) * 130}`).join(' ')}`}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                />
                {riskTrend.map((t, i) => {
                  if (t.events.length > 0) {
                    return (
                      <g key={i}>
                        <circle
                          cx={(i / (riskTrend.length - 1)) * 600}
                          cy={150 - ((t.score - minTrendScore) / (maxTrendScore - minTrendScore + 10)) * 130}
                          r="4"
                          fill="#f59e0b"
                          stroke="white"
                          strokeWidth="2"
                        />
                      </g>
                    );
                  }
                  return null;
                })}
              </>
            )}
          </svg>

          <div className="absolute left-4 top-2 text-xs text-gray-400">{maxTrendScore.toFixed(0)}</div>
          <div className="absolute left-4 bottom-2 text-xs text-gray-400">{minTrendScore.toFixed(0)}</div>

          <div className="absolute bottom-2 right-4 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-emerald-500" />
              <span className="text-gray-500">{t('uma.risk.overallScore')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-gray-500">{t('uma.crossChain.securityEventHistory')}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-900">
                  {t('uma.risk.prediction') || 'Risk Prediction'}
                </span>
              </div>
              <p className="text-xs text-gray-500">{t('uma.risk.disputeSuccessRateDescription', { rate: '0' })}</p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${getScoreColor(predictionScore)}`}>
                {predictionScore.toFixed(0)}
              </p>
              <p className="text-xs text-gray-500">{t('uma.governance.stage4Execution')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            {t('uma.risk.eventTimeline') || 'Risk Event Timeline'}
          </h3>
        </div>
        <div className="space-y-3">
          {riskEvents.slice(0, 4).map((event) => {
            const EventIcon = getEventIcon(event.type);
            return (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className={`p-2 rounded-lg ${getEventColor(event.type)}`}>
                  <EventIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{event.title}</span>
                    <span className="text-xs text-gray-400">{event.date}</span>
                  </div>
                  <p className="text-xs text-gray-500">{event.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        event.impact === 'high'
                          ? 'bg-red-100 text-red-700'
                          : event.impact === 'medium'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {t(`uma.risk.status${event.impact.charAt(0).toUpperCase() + event.impact.slice(1)}`)} {t('uma.crossChain.activeCount')}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        event.type === 'resolved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : event.type === 'warning'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {t(`uma.disputeVoting.${event.type === 'resolved' ? 'passed' : event.type === 'warning' ? 'statusInProgress' : 'statusRejected'}`)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            {t('uma.risk.mitigationRecommendations') || 'Risk Mitigation Recommendations'}
          </h3>
        </div>
        <div className="space-y-4">
          {mitigationRecommendations.map((rec) => (
            <div key={rec.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded border ${getPriorityColor(rec.priority)}`}
                  >
                    {rec.priority}
                  </span>
                  <span className="text-xs text-gray-400">{rec.category}</span>
                </div>
              </div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">{rec.title}</h4>
              <p className="text-xs text-gray-500 mb-3">{rec.description}</p>
              <div className="space-y-1.5 mb-3">
                {rec.actions.map((action, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-600">{action}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle className="w-3 h-3" />
                <span>{rec.impact}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">{t('uma.risk.mitigation')}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {mitigationMeasures.map((measure, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 border border-gray-200"
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>{measure}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
