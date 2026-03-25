'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TimelineChart,
  TimelineEvent,
} from '@/components/oracle/charts/TimelineChart';
import { chartColors } from '@/lib/config/colors';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Award,
  Info,
} from 'lucide-react';

// 历史风险事件
const historicalRiskEvents: TimelineEvent[] = [
  {
    date: '2024-01-15T10:30:00',
    title: '安全审计完成',
    description: 'Chainlink 核心合约通过 Trail of Bits 和 OpenZeppelin 的联合安全审计，未发现重大漏洞。',
    type: 'success',
  },
  {
    date: '2023-11-08T14:20:00',
    title: '节点网络升级',
    description: '完成节点软件 v2.5.0 升级，引入新的共识机制和增强的故障恢复能力。',
    type: 'info',
  },
  {
    date: '2023-09-22T09:15:00',
    title: '潜在漏洞披露',
    description: '白帽黑客通过 Bug Bounty 计划报告了一个中等严重程度的漏洞。团队已在 48 小时内修复并部署补丁。',
    type: 'warning',
  },
  {
    date: '2023-07-14T16:45:00',
    title: '去中心化里程碑',
    description: '节点运营商数量突破 1000 个，分布在 45 个国家和地区。',
    type: 'success',
  },
  {
    date: '2023-05-03T11:30:00',
    title: '价格延迟事件',
    description: '由于以太坊网络拥堵，部分价格喂送出现 2-3 分钟延迟。触发自动故障转移机制。',
    type: 'warning',
  },
  {
    date: '2023-02-28T08:00:00',
    title: '质押合约发布',
    description: 'Chainlink Staking v0.2 正式上线，引入惩罚机制和更高的安全保证金要求。',
    type: 'success',
  },
];

// 行业基准对比数据
const benchmarkData = [
  { metric: '去中心化', chainlink: 95, pyth: 78, band: 65, api3: 70 },
  { metric: '安全性', chainlink: 98, pyth: 85, band: 72, api3: 80 },
  { metric: '可靠性', chainlink: 99.9, pyth: 97.5, band: 94.2, api3: 96.8 },
  { metric: '透明度', chainlink: 92, pyth: 88, band: 70, api3: 85 },
  { metric: '历史记录', chainlink: 98, pyth: 75, band: 82, api3: 78 },
];

// 风险指标
const riskMetrics = [
  {
    id: 'decentralization',
    name: 'Decentralization Score',
    value: 95,
    max: 100,
    description: 'Based on node operator diversity and geographic distribution',
    status: 'low',
  },
  {
    id: 'security',
    name: 'Security Rating',
    value: 98,
    max: 100,
    description: 'Based on audit history, bug bounty programs, and incident response',
    status: 'low',
  },
  {
    id: 'reliability',
    name: 'Network Reliability',
    value: 99.9,
    max: 100,
    description: 'Uptime and successful response rate over the last 30 days',
    status: 'low',
  },
  {
    id: 'transparency',
    name: 'Transparency Score',
    value: 92,
    max: 100,
    description: 'Based on documentation quality and open-source availability',
    status: 'low',
  },
];

// 风险因素
const riskFactors = [
  {
    category: 'Smart Contract Risk',
    level: 'low',
    description: 'Multiple audits by leading security firms',
  },
  {
    category: 'Oracle Risk',
    level: 'low',
    description: 'Decentralized node network with reputation system',
  },
  {
    category: 'Market Risk',
    level: 'medium',
    description: 'LINK token price volatility affects staking economics',
  },
  {
    category: 'Regulatory Risk',
    level: 'medium',
    description: 'Potential regulatory changes in DeFi sector',
  },
];

export function ChainlinkRiskView() {
  const t = useTranslations();
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'medium':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // 计算综合风险评分
  const overallScore = riskMetrics.reduce((sum, m) => sum + m.value, 0) / riskMetrics.length;

  return (
    <div className="space-y-6">
      {/* 风险指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {riskMetrics.map((metric) => (
          <div key={metric.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">{metric.name}</h3>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRiskColor(
                  metric.status
                )}`}
              >
                {metric.status.charAt(0).toUpperCase() + metric.status.slice(1)} Risk
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-gray-900">{metric.value}</span>
              <span className="text-sm text-gray-500">/ {metric.max}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${(metric.value / metric.max) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">{metric.description}</p>
          </div>
        ))}
      </div>

      {/* 综合评分和对比 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 综合评分卡片 */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-6 h-6" />
            <span className="text-lg font-medium">{t('chainlink.risk.overallScore') || 'Overall Risk Score'}</span>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-5xl font-bold">{overallScore.toFixed(1)}</span>
            <span className="text-blue-100">/ 100</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-100" />
              <span className="text-sm text-blue-100">{t('chainlink.risk.audited') || 'Audited by leading firms'}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-100" />
              <span className="text-sm text-blue-100">{t('chainlink.risk.decentralized') || 'Decentralized network'}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-100" />
              <span className="text-sm text-blue-100">{t('chainlink.risk.bugBounty') || 'Active bug bounty program'}</span>
            </div>
          </div>
        </div>

        {/* 行业对比雷达图 */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-semibold text-gray-900">
              {t('chainlink.risk.benchmark') || 'Industry Benchmark Comparison'}
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={benchmarkData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Radar
                  name="Chainlink"
                  dataKey="chainlink"
                  stroke={chartColors.oracle.chainlink}
                  fill={chartColors.oracle.chainlink}
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Radar
                  name="Pyth"
                  dataKey="pyth"
                  stroke={chartColors.oracle.pyth}
                  fill={chartColors.oracle.pyth}
                  fillOpacity={0.1}
                  strokeWidth={1.5}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 历史风险事件时间线 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {t('chainlink.risk.timeline') || 'Historical Risk Events'}
              </h3>
              <p className="text-sm text-gray-500">
                {t('chainlink.risk.timelineDesc') || 'Security audits, incidents and upgrades over the past 24 months'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {t('chainlink.risk.success') || 'Success'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {t('chainlink.risk.info') || 'Info'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {t('chainlink.risk.warning') || 'Warning'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 时间线 */}
          <div className="lg:col-span-2">
            <TimelineChart
              events={historicalRiskEvents}
              onEventClick={(event) => setSelectedEvent(event)}
              showDateLabels={true}
              compact={false}
            />
          </div>

          {/* 事件详情面板 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {t('chainlink.risk.eventDetails') || 'Event Details'}
            </h4>
            {selectedEvent ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {selectedEvent.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {selectedEvent.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                  {selectedEvent.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
                  {selectedEvent.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-500" />}
                  <span className="text-sm font-medium text-gray-900">{selectedEvent.title}</span>
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(selectedEvent.date).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-sm text-gray-600 leading-relaxed">{selectedEvent.description}</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Info className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">{t('chainlink.risk.clickEvent') || 'Click an event to view details'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 风险因素 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('chainlink.risk.factors')}
        </h3>
        <div className="space-y-3">
          {riskFactors.map((factor, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{factor.category}</p>
                <p className="text-xs text-gray-500 mt-0.5">{factor.description}</p>
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getRiskColor(
                  factor.level
                )}`}
              >
                {factor.level.charAt(0).toUpperCase() + factor.level.slice(1)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 免责声明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900">{t('chainlink.risk.disclaimer')}</h4>
            <p className="text-sm text-blue-700 mt-1">{t('chainlink.risk.disclaimerText')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
