'use client';

import { useState, useMemo } from 'react';

import {
  Clock,
  Zap,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  BarChart3,
  PieChart,
  Calendar,
  Timer,
  Wallet,
  ChevronRight,
  Info,
  Settings,
  Pause,
  Play,
  Trash2,
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
  LineChart,
  Line,
} from 'recharts';

import { useTranslations } from '@/i18n';

interface AutomationStats {
  registeredTasks: number;
  dailyExecutions: number;
  gasSaved: number;
  uptime: number;
}

interface UpkeepTask {
  id: string;
  name: string;
  triggerType: 'time' | 'logic' | 'log';
  executionCount: number;
  status: 'active' | 'paused' | 'cancelled';
  lastExecution: Date;
  balance: number;
}

interface ExecutionHistory {
  timestamp: Date;
  success: boolean;
  gasUsed: number;
  latency: number;
}

const MOCK_STATS: AutomationStats = {
  registeredTasks: 2847,
  dailyExecutions: 156420,
  gasSaved: 38.5,
  uptime: 99.97,
};

const MOCK_UPKEEP_TASKS: UpkeepTask[] = [
  {
    id: 'upkeep-001',
    name: 'Aave Liquidation Bot',
    triggerType: 'logic',
    executionCount: 12450,
    status: 'active',
    lastExecution: new Date('2024-12-18T10:30:00'),
    balance: 45.8,
  },
  {
    id: 'upkeep-002',
    name: 'Compound Harvest Strategy',
    triggerType: 'time',
    executionCount: 8920,
    status: 'active',
    lastExecution: new Date('2024-12-18T09:45:00'),
    balance: 32.1,
  },
  {
    id: 'upkeep-003',
    name: 'Uniswap V3 Rebalancer',
    triggerType: 'logic',
    executionCount: 6780,
    status: 'active',
    lastExecution: new Date('2024-12-18T11:15:00'),
    balance: 28.5,
  },
  {
    id: 'upkeep-004',
    name: 'Lido Rewards Claimer',
    triggerType: 'time',
    executionCount: 4320,
    status: 'paused',
    lastExecution: new Date('2024-12-17T18:00:00'),
    balance: 15.2,
  },
  {
    id: 'upkeep-005',
    name: 'GMX Position Monitor',
    triggerType: 'log',
    executionCount: 9850,
    status: 'active',
    lastExecution: new Date('2024-12-18T10:55:00'),
    balance: 52.3,
  },
  {
    id: 'upkeep-006',
    name: 'Curve Pool Rebalancer',
    triggerType: 'logic',
    executionCount: 3210,
    status: 'cancelled',
    lastExecution: new Date('2024-12-15T14:30:00'),
    balance: 0,
  },
];

const MOCK_EXECUTION_HISTORY: ExecutionHistory[] = Array.from({ length: 24 }, (_, i) => ({
  timestamp: new Date(Date.now() - (23 - i) * 3600000),
  success: Math.random() > 0.05,
  gasUsed: Math.floor(150000 + Math.random() * 100000),
  latency: Math.floor(200 + Math.random() * 300),
}));

const MOCK_GAS_TREND = Array.from({ length: 30 }, (_, i) => ({
  date: `Day ${i + 1}`,
  gasUsed: Math.floor(150000 + Math.random() * 80000),
  gasSaved: Math.floor(20000 + Math.random() * 15000),
}));

const MOCK_LATENCY_DISTRIBUTION = [
  { range: '0-100ms', count: 2450, percentage: 35 },
  { range: '100-200ms', count: 2100, percentage: 30 },
  { range: '200-300ms', count: 1400, percentage: 20 },
  { range: '300-500ms', count: 700, percentage: 10 },
  { range: '500ms+', count: 350, percentage: 5 },
];

const MOCK_CANCEL_QUEUE = [
  {
    id: 'upkeep-006',
    name: 'Curve Pool Rebalancer',
    requestedAt: new Date('2024-12-16'),
    status: 'pending',
  },
  {
    id: 'upkeep-007',
    name: 'Deprecated Strategy',
    requestedAt: new Date('2024-12-14'),
    status: 'processing',
  },
];

const TRIGGER_COLORS = {
  time: '#375bd2',
  logic: '#10b981',
  log: '#f59e0b',
};

const STATUS_COLORS = {
  active: { bg: 'bg-green-50', text: 'text-green-600', dot: 'bg-green-500' },
  paused: { bg: 'bg-yellow-50', text: 'text-yellow-600', dot: 'bg-yellow-500' },
  cancelled: { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-500' },
};

export function ChainlinkAutomationView() {
  const t = useTranslations();
  const [selectedTrigger, setSelectedTrigger] = useState<'all' | 'time' | 'logic' | 'log'>('all');

  const filteredTasks = useMemo(() => {
    if (selectedTrigger === 'all') return MOCK_UPKEEP_TASKS;
    return MOCK_UPKEEP_TASKS.filter((task) => task.triggerType === selectedTrigger);
  }, [selectedTrigger]);

  const successRate = useMemo(() => {
    const success = MOCK_EXECUTION_HISTORY.filter((h) => h.success).length;
    return ((success / MOCK_EXECUTION_HISTORY.length) * 100).toFixed(2);
  }, []);

  const avgGasUsed = useMemo(() => {
    const total = MOCK_EXECUTION_HISTORY.reduce((sum, h) => sum + h.gasUsed, 0);
    return Math.floor(total / MOCK_EXECUTION_HISTORY.length);
  }, []);

  const avgLatency = useMemo(() => {
    const total = MOCK_EXECUTION_HISTORY.reduce((sum, h) => sum + h.latency, 0);
    return Math.floor(total / MOCK_EXECUTION_HISTORY.length);
  }, []);

  const triggerDistribution = useMemo(() => {
    const time = MOCK_UPKEEP_TASKS.filter((t) => t.triggerType === 'time').length;
    const logic = MOCK_UPKEEP_TASKS.filter((t) => t.triggerType === 'logic').length;
    const log = MOCK_UPKEEP_TASKS.filter((t) => t.triggerType === 'log').length;
    return [
      { name: t('chainlink.automation.triggerTime'), value: time, color: TRIGGER_COLORS.time },
      { name: t('chainlink.automation.triggerLogic'), value: logic, color: TRIGGER_COLORS.logic },
      { name: t('chainlink.automation.triggerLog'), value: log, color: TRIGGER_COLORS.log },
    ];
  }, [t]);

  const formatNumber = (value: number): string => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
    return value.toFixed(2);
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTriggerIcon = (type: 'time' | 'logic' | 'log') => {
    switch (type) {
      case 'time':
        return <Clock className="w-3.5 h-3.5" />;
      case 'logic':
        return <Zap className="w-3.5 h-3.5" />;
      case 'log':
        return <Activity className="w-3.5 h-3.5" />;
    }
  };

  const activeTasks = MOCK_UPKEEP_TASKS.filter((t) => t.status === 'active').length;
  const pausedTasks = MOCK_UPKEEP_TASKS.filter((t) => t.status === 'paused').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="w-5 h-5 text-gray-500" />
        <h2 className="text-lg font-semibold text-gray-900">{t('chainlink.automation.title')}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">
              {t('chainlink.automation.registeredTasks')}
            </span>
            <Settings className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-xl font-bold text-gray-900">
            {formatNumber(MOCK_STATS.registeredTasks)}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3 text-green-500" />
            <span className="text-xs text-green-600">
              +124 {t('chainlink.automation.thisWeek')}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">
              {t('chainlink.automation.dailyExecutions')}
            </span>
            <Activity className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-xl font-bold text-gray-900">
            {formatNumber(MOCK_STATS.dailyExecutions)}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3 text-green-500" />
            <span className="text-xs text-green-600">
              +8.3% {t('chainlink.automation.vsYesterday')}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">
              {t('chainlink.automation.gasSaved')}
            </span>
            <Zap className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-xl font-bold text-gray-900">{MOCK_STATS.gasSaved}%</div>
          <div className="text-xs text-gray-400 mt-1">
            ~$2.4M {t('chainlink.automation.savedMonthly')}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">
              {t('chainlink.automation.uptime')}
            </span>
            <CheckCircle className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-xl font-bold text-gray-900">{MOCK_STATS.uptime}%</div>
          <div className="flex items-center gap-1 mt-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-green-600">{t('chainlink.automation.excellent')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-900">
                {t('chainlink.automation.gasTrend')}
              </h3>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-gray-500">{t('chainlink.automation.gasUsed')}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-gray-500">{t('chainlink.automation.gasSaved')}</span>
              </div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_GAS_TREND}>
                <defs>
                  <linearGradient id="colorGas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#375bd2" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#375bd2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="#9ca3af"
                  tickFormatter={(v) => `${v / 1000}K`}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  formatter={(value) => [formatNumber(value as number), 'Gas']}
                />
                <Area
                  type="monotone"
                  dataKey="gasUsed"
                  stroke="#375bd2"
                  fillOpacity={1}
                  fill="url(#colorGas)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="gasSaved"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-900">
              {t('chainlink.automation.triggerDistribution')}
            </h3>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={triggerDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {triggerDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  formatter={(value) => [value, t('chainlink.automation.tasks')]}
                />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {triggerDistribution.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-medium text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-900">
              {t('chainlink.automation.taskList')}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedTrigger('all')}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                selectedTrigger === 'all'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('chainlink.automation.all')}
            </button>
            {(['time', 'logic', 'log'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedTrigger(type)}
                className={`px-3 py-1 text-xs rounded-md transition-all ${
                  selectedTrigger === type
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t(`chainlink.automation.trigger${type.charAt(0).toUpperCase() + type.slice(1)}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 pb-3">
                  {t('chainlink.automation.taskId')}
                </th>
                <th className="text-left text-xs font-medium text-gray-500 pb-3">
                  {t('chainlink.automation.taskName')}
                </th>
                <th className="text-left text-xs font-medium text-gray-500 pb-3">
                  {t('chainlink.automation.triggerType')}
                </th>
                <th className="text-left text-xs font-medium text-gray-500 pb-3">
                  {t('chainlink.automation.executions')}
                </th>
                <th className="text-left text-xs font-medium text-gray-500 pb-3">
                  {t('chainlink.automation.status')}
                </th>
                <th className="text-left text-xs font-medium text-gray-500 pb-3">
                  {t('chainlink.automation.lastExecution')}
                </th>
                <th className="text-left text-xs font-medium text-gray-500 pb-3">
                  {t('chainlink.automation.balance')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr key={task.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-3 text-xs text-gray-600 font-mono">{task.id}</td>
                  <td className="py-3 text-xs font-medium text-gray-900">{task.name}</td>
                  <td className="py-3">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: `${TRIGGER_COLORS[task.triggerType]}15`,
                        color: TRIGGER_COLORS[task.triggerType],
                      }}
                    >
                      {getTriggerIcon(task.triggerType)}
                      {t(
                        `chainlink.automation.trigger${task.triggerType.charAt(0).toUpperCase() + task.triggerType.slice(1)}`
                      )}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-gray-600">
                    {formatNumber(task.executionCount)}
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        STATUS_COLORS[task.status].bg
                      } ${STATUS_COLORS[task.status].text}`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[task.status].dot}`}
                      />
                      {t(
                        `chainlink.automation.status${task.status.charAt(0).toUpperCase() + task.status.slice(1)}`
                      )}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-gray-500">{formatDate(task.lastExecution)}</td>
                  <td className="py-3 text-xs font-medium text-gray-900">
                    {task.balance > 0 ? `${task.balance} LINK` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-900">
                {t('chainlink.automation.executionHistory')}
              </h3>
            </div>
            <span className="text-xs text-gray-500">{t('chainlink.automation.last24Hours')}</span>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-gray-900">{successRate}%</div>
              <div className="text-xs text-gray-500">{t('chainlink.automation.successRate')}</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-gray-900">{formatNumber(avgGasUsed)}</div>
              <div className="text-xs text-gray-500">{t('chainlink.automation.avgGas')}</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-gray-900">{avgLatency}ms</div>
              <div className="text-xs text-gray-500">{t('chainlink.automation.avgLatency')}</div>
            </div>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_EXECUTION_HISTORY.slice(-12)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 10 }}
                  stroke="#9ca3af"
                  tickFormatter={(v) =>
                    new Date(v).toLocaleTimeString('en-US', { hour: '2-digit' })
                  }
                />
                <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  formatter={(value, name) => [
                    value,
                    name === 'gasUsed'
                      ? t('chainlink.automation.gasUsed')
                      : t('chainlink.automation.latency'),
                  ]}
                  labelFormatter={(v) => new Date(v).toLocaleString()}
                />
                <Bar dataKey="gasUsed" fill="#375bd2" radius={[4, 4, 0, 0]} name="gasUsed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Timer className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-900">
              {t('chainlink.automation.latencyAnalysis')}
            </h3>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_LATENCY_DISTRIBUTION} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                <YAxis
                  dataKey="range"
                  type="category"
                  tick={{ fontSize: 10 }}
                  stroke="#9ca3af"
                  width={70}
                />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  formatter={(value) => [value, t('chainlink.automation.executions')]}
                />
                <Bar dataKey="count" fill="#375bd2" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">{t('chainlink.automation.p95Latency')}</span>
              <span className="font-medium text-gray-900">285ms</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-2">
              <span className="text-gray-500">{t('chainlink.automation.p99Latency')}</span>
              <span className="font-medium text-gray-900">412ms</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-900">
                {t('chainlink.automation.upkeepManagement')}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="text-xs text-blue-600 mb-1">
                {t('chainlink.automation.registrationFee')}
              </div>
              <div className="text-lg font-bold text-blue-900">5 LINK</div>
              <div className="text-xs text-blue-500 mt-1">{t('chainlink.automation.oneTime')}</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
              <div className="text-xs text-green-600 mb-1">
                {t('chainlink.automation.minBalance')}
              </div>
              <div className="text-lg font-bold text-green-900">1 LINK</div>
              <div className="text-xs text-green-500 mt-1">
                {t('chainlink.automation.recommended')}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-900">
                    {t('chainlink.automation.activeTasks')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {t('chainlink.automation.currentlyRunning')}
                  </div>
                </div>
              </div>
              <span className="text-lg font-bold text-gray-900">{activeTasks}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Pause className="w-4 h-4 text-yellow-600" />
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-900">
                    {t('chainlink.automation.pausedTasks')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {t('chainlink.automation.temporarilyStopped')}
                  </div>
                </div>
              </div>
              <span className="text-lg font-bold text-gray-900">{pausedTasks}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-900">
                {t('chainlink.automation.cancelQueue')}
              </h3>
            </div>
            <span className="text-xs px-2 py-1 bg-orange-50 text-orange-600 rounded-full font-medium">
              {MOCK_CANCEL_QUEUE.length} {t('chainlink.automation.pending')}
            </span>
          </div>

          <div className="space-y-3">
            {MOCK_CANCEL_QUEUE.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-400">{item.id}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${
                      item.status === 'pending'
                        ? 'bg-yellow-50 text-yellow-600'
                        : 'bg-blue-50 text-blue-600'
                    }`}
                  >
                    {t(
                      `chainlink.automation.cancel${item.status.charAt(0).toUpperCase() + item.status.slice(1)}`
                    )}
                  </span>
                  <div className="text-xs text-gray-400 mt-1">{formatDate(item.requestedAt)}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg border border-orange-100">
              <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-orange-700">{t('chainlink.automation.cancelWarning')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-900">{t('chainlink.automation.about')}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                {t('chainlink.automation.feature1Title')}
              </span>
            </div>
            <p className="text-xs text-blue-700">{t('chainlink.automation.feature1Desc')}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-100">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">
                {t('chainlink.automation.feature2Title')}
              </span>
            </div>
            <p className="text-xs text-green-700">{t('chainlink.automation.feature2Desc')}</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">
                {t('chainlink.automation.feature3Title')}
              </span>
            </div>
            <p className="text-xs text-purple-700">{t('chainlink.automation.feature3Desc')}</p>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-500 leading-relaxed">
          {t('chainlink.automation.disclaimer')}
        </p>
      </div>
    </div>
  );
}

export default ChainlinkAutomationView;
