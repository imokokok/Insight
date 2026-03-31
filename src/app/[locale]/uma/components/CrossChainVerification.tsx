'use client';

import { useState, useEffect, useMemo } from 'react';

import {
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Clock,
  Shield,
  Activity,
  Zap,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ChevronRight,
  Info,
  Loader2,
} from 'lucide-react';

import { useTranslations } from '@/i18n';
import {
  type SupportedChain,
  type CrossChainMessage,
  type ValidatorStatus,
  type BridgeHealthStatus,
  type PendingMessageQueue,
  type CrossChainTransactionStats,
  type SecurityScore,
  type RiskPoint,
  type SecurityEvent,
  type SecurityRecommendation,
  CHAIN_CONFIGS,
} from '@/lib/oracles/uma/crossChainTypes';
import { cn } from '@/lib/utils';

const generateMockMessages = (): CrossChainMessage[] => {
  const chains: SupportedChain[] = ['ethereum', 'arbitrum', 'optimism', 'polygon', 'base'];
  const statuses: CrossChainMessage['status'][] = ['pending', 'validating', 'confirmed', 'failed'];
  const messages: CrossChainMessage[] = [];

  for (let i = 0; i < 8; i++) {
    const sourceChain = chains[Math.floor(Math.random() * chains.length)];
    let targetChain = chains[Math.floor(Math.random() * chains.length)];
    while (targetChain === sourceChain) {
      targetChain = chains[Math.floor(Math.random() * chains.length)];
    }

    messages.push({
      id: `msg-${i}-${Date.now()}`,
      sourceChain,
      targetChain,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      timestamp: Date.now() - Math.floor(Math.random() * 3600000),
      payload: `0x${Math.random().toString(16).slice(2, 10)}...`,
      txHash: `0x${Math.random().toString(16).slice(2, 66)}`,
      confirmations: Math.floor(Math.random() * 12),
      requiredConfirmations: 12,
      estimatedTime: Math.floor(Math.random() * 300) + 60,
      actualTime: Math.random() > 0.3 ? Math.floor(Math.random() * 300) + 60 : undefined,
    });
  }

  return messages;
};

const generateMockValidators = (): ValidatorStatus[] => {
  const chains: SupportedChain[] = ['ethereum', 'arbitrum', 'optimism', 'polygon', 'base'];

  return chains.map((chain) => ({
    chainId: chain,
    chainName: CHAIN_CONFIGS[chain].name,
    activeValidators: Math.floor(Math.random() * 20) + 80,
    totalValidators: 100,
    avgResponseTime: Math.floor(Math.random() * 100) + 50,
    uptime: 95 + Math.random() * 5,
    lastBlock: Math.floor(Math.random() * 1000000) + 18000000,
    syncStatus: Math.random() > 0.1 ? 'synced' : 'syncing',
  }));
};

const generateMockBridgeHealth = (): BridgeHealthStatus[] => {
  const chains: SupportedChain[] = ['ethereum', 'arbitrum', 'optimism', 'polygon', 'base'];
  const health: BridgeHealthStatus[] = [];

  for (let i = 0; i < chains.length; i++) {
    for (let j = 0; j < chains.length; j++) {
      if (i !== j) {
        health.push({
          sourceChain: chains[i],
          targetChain: chains[j],
          status: Math.random() > 0.9 ? 'degraded' : 'healthy',
          latency: Math.floor(Math.random() * 500) + 100,
          successRate: 95 + Math.random() * 5,
          lastChecked: Date.now() - Math.floor(Math.random() * 60000),
          pendingMessages: Math.floor(Math.random() * 10),
        });
      }
    }
  }

  return health;
};

const generateMockPendingQueue = (): PendingMessageQueue[] => {
  const chains: SupportedChain[] = ['ethereum', 'arbitrum', 'optimism', 'polygon', 'base'];

  return chains.map((chain) => ({
    chain,
    pending: Math.floor(Math.random() * 15),
    processing: Math.floor(Math.random() * 5),
    avgWaitTime: Math.floor(Math.random() * 120) + 30,
    oldestMessage: Date.now() - Math.floor(Math.random() * 1800000),
  }));
};

const generateMockTransactionStats = (): CrossChainTransactionStats => {
  const chains: SupportedChain[] = ['ethereum', 'arbitrum', 'optimism', 'polygon', 'base'];

  return {
    totalTransactions: 125847,
    successfulTransactions: 124523,
    failedTransactions: 1324,
    avgLatency: 187,
    volume24h: 12500000,
    volumeChange: 12.5,
    byChain: chains.map((chain) => ({
      chain,
      sent: Math.floor(Math.random() * 10000) + 5000,
      received: Math.floor(Math.random() * 10000) + 5000,
      volume: Math.floor(Math.random() * 5000000) + 1000000,
    })),
    byTime: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: Math.floor(Math.random() * 500) + 100,
      avgLatency: Math.floor(Math.random() * 100) + 150,
    })),
  };
};

const generateMockSecurityScore = (): SecurityScore => ({
  overall: 87,
  components: [
    { name: 'Bridge Security', score: 92, weight: 0.3, status: 'good' },
    { name: 'Validator Consensus', score: 88, weight: 0.25, status: 'good' },
    { name: 'Message Integrity', score: 95, weight: 0.2, status: 'good' },
    { name: 'Network Liveness', score: 78, weight: 0.15, status: 'warning' },
    { name: 'Slashing Conditions', score: 85, weight: 0.1, status: 'good' },
  ],
  lastUpdated: Date.now(),
});

const generateMockRiskPoints = (): RiskPoint[] => [
  {
    id: 'risk-1',
    severity: 'medium',
    title: 'High Pending Messages on Arbitrum',
    description: 'Arbitrum bridge experiencing higher than normal message queue',
    affectedChains: ['arbitrum', 'ethereum'],
    timestamp: Date.now() - 3600000,
    resolved: false,
  },
  {
    id: 'risk-2',
    severity: 'low',
    title: 'Validator Rotation Scheduled',
    description: 'Scheduled validator rotation on Optimism may cause brief delays',
    affectedChains: ['optimism'],
    timestamp: Date.now() - 7200000,
    resolved: false,
  },
  {
    id: 'risk-3',
    severity: 'low',
    title: 'Gas Price Spike',
    description: 'Ethereum gas prices elevated, may affect cross-chain costs',
    affectedChains: ['ethereum'],
    timestamp: Date.now() - 1800000,
    resolved: true,
    resolution: 'Gas prices normalized',
  },
];

const generateMockSecurityEvents = (): SecurityEvent[] => [
  {
    id: 'event-1',
    type: 'upgrade',
    title: 'Bridge Contract Upgrade',
    description: 'Successfully upgraded bridge contracts on Base',
    chains: ['base'],
    timestamp: Date.now() - 86400000,
    resolved: true,
    impact: 'low',
  },
  {
    id: 'event-2',
    type: 'alert',
    title: 'Unusual Transaction Pattern',
    description: 'Detected unusual cross-chain transaction volume',
    chains: ['ethereum', 'arbitrum'],
    timestamp: Date.now() - 43200000,
    resolved: true,
    impact: 'medium',
  },
  {
    id: 'event-3',
    type: 'maintenance',
    title: 'Scheduled Maintenance',
    description: 'Routine maintenance for Polygon bridge',
    chains: ['polygon'],
    timestamp: Date.now() - 172800000,
    resolved: true,
    impact: 'low',
  },
];

const generateMockRecommendations = (): SecurityRecommendation[] => [
  {
    id: 'rec-1',
    priority: 'high',
    title: 'Increase Validator Set',
    description: 'Consider increasing validator count on Optimism for better decentralization',
    action: 'Review validator onboarding process',
    category: 'configuration',
  },
  {
    id: 'rec-2',
    priority: 'medium',
    title: 'Update Monitoring Thresholds',
    description: 'Adjust alert thresholds based on recent traffic patterns',
    action: 'Update Grafana dashboards',
    category: 'monitoring',
  },
  {
    id: 'rec-3',
    priority: 'low',
    title: 'Document Incident Response',
    description: 'Create detailed runbooks for bridge failure scenarios',
    action: 'Draft documentation',
    category: 'process',
  },
];

function ChainNode({
  chain,
  isActive,
  onClick,
  messageCount,
}: {
  chain: SupportedChain;
  isActive: boolean;
  onClick: () => void;
  messageCount?: number;
}) {
  const config = CHAIN_CONFIGS[chain];

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center p-3 transition-all duration-200 border',
        isActive ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white hover:border-gray-300'
      )}
    >
      <div
        className="w-10 h-10 flex items-center justify-center text-lg font-bold"
        style={{ color: config.color }}
      >
        {config.icon}
      </div>
      <span className="text-xs font-medium text-gray-700 mt-1">{config.name}</span>
      {messageCount !== undefined && messageCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs font-medium text-white bg-amber-500 rounded-full">
          {messageCount}
        </span>
      )}
    </button>
  );
}

function MessageFlowAnimation({
  sourceChain,
  targetChain,
  status,
}: {
  sourceChain: SupportedChain;
  targetChain: SupportedChain;
  status: CrossChainMessage['status'];
}) {
  const sourceColor = CHAIN_CONFIGS[sourceChain].color;
  const targetColor = CHAIN_CONFIGS[targetChain].color;

  return (
    <div className="relative h-8 flex items-center justify-center">
      <div className="absolute w-full h-0.5 bg-gray-200" />
      <div
        className="absolute h-0.5 animate-pulse"
        style={{
          background: `linear-gradient(90deg, ${sourceColor}, ${targetColor})`,
          width: status === 'confirmed' ? '100%' : '60%',
        }}
      />
      <div
        className={cn(
          'absolute w-2 h-2 rounded-full transition-all duration-1000',
          status === 'confirmed' ? 'right-0' : 'left-1/3'
        )}
        style={{ backgroundColor: status === 'failed' ? '#ef4444' : targetColor }}
      />
    </div>
  );
}

function MessageStatusBadge({
  status,
  t,
}: {
  status: CrossChainMessage['status'];
  t: ReturnType<typeof useTranslations>;
}) {
  const config = {
    pending: {
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      label: t('uma.crossChain.pending'),
    },
    validating: {
      icon: RefreshCw,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      label: t('uma.crossChain.processing'),
    },
    confirmed: {
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      label: t('uma.crossChain.confirmed'),
    },
    failed: {
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      label: t('uma.crossChain.failed'),
    },
  };

  const { icon: Icon, color, bg, label } = config[status];

  return (
    <span
      className={cn('inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium', bg, color)}
    >
      <Icon className={cn('w-3 h-3', status === 'validating' && 'animate-spin')} />
      {label}
    </span>
  );
}

function SecurityScoreRing({ score }: { score: number }) {
  const radius = 15.9155;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${score}, 100`;

  const getColor = (s: number) => {
    if (s >= 80) return 'text-emerald-500';
    if (s >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="w-16 h-16 relative">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
        <path
          className="text-gray-200"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className={getColor(score)}
          strokeDasharray={strokeDasharray}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-gray-900">{score}</span>
      </div>
    </div>
  );
}

function SeverityBadge({
  severity,
  t,
}: {
  severity: RiskPoint['severity'];
  t: ReturnType<typeof useTranslations>;
}) {
  const config = {
    low: { color: 'text-blue-600', bg: 'bg-blue-50', label: t('uma.risk.statusLow') },
    medium: { color: 'text-amber-600', bg: 'bg-amber-50', label: t('uma.risk.statusMedium') },
    high: { color: 'text-orange-600', bg: 'bg-orange-50', label: t('uma.risk.statusHigh') },
    critical: { color: 'text-red-600', bg: 'bg-red-50', label: t('uma.risk.statusCritical') },
  };

  const { color, bg, label } = config[severity];

  return <span className={cn('px-2 py-0.5 text-xs font-medium', bg, color)}>{label}</span>;
}

export function CrossChainVerification({ isLoading = false }: { isLoading?: boolean }) {
  const t = useTranslations();
  const [selectedChain, setSelectedChain] = useState<SupportedChain | null>(null);
  const [activeSection, setActiveSection] = useState<'messages' | 'monitoring' | 'security'>(
    'messages'
  );
  const [messages, setMessages] = useState<CrossChainMessage[]>([]);
  const [validators, setValidators] = useState<ValidatorStatus[]>([]);
  const [bridgeHealth, setBridgeHealth] = useState<BridgeHealthStatus[]>([]);
  const [pendingQueue, setPendingQueue] = useState<PendingMessageQueue[]>([]);
  const [transactionStats, setTransactionStats] = useState<CrossChainTransactionStats | null>(null);
  const [securityScore, setSecurityScore] = useState<SecurityScore | null>(null);
  const [riskPoints, setRiskPoints] = useState<RiskPoint[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [recommendations, setRecommendations] = useState<SecurityRecommendation[]>([]);

  useEffect(() => {
    setMessages(generateMockMessages());
    setValidators(generateMockValidators());
    setBridgeHealth(generateMockBridgeHealth());
    setPendingQueue(generateMockPendingQueue());
    setTransactionStats(generateMockTransactionStats());
    setSecurityScore(generateMockSecurityScore());
    setRiskPoints(generateMockRiskPoints());
    setSecurityEvents(generateMockSecurityEvents());
    setRecommendations(generateMockRecommendations());

    const interval = setInterval(() => {
      setMessages(generateMockMessages());
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  const chains: SupportedChain[] = ['ethereum', 'arbitrum', 'optimism', 'polygon', 'base'];

  const filteredMessages = useMemo(() => {
    if (!selectedChain) return messages.slice(0, 6);
    return messages
      .filter((m) => m.sourceChain === selectedChain || m.targetChain === selectedChain)
      .slice(0, 6);
  }, [messages, selectedChain]);

  const chainMessageCounts = useMemo(() => {
    const counts: Record<SupportedChain, number> = {
      ethereum: 0,
      arbitrum: 0,
      optimism: 0,
      polygon: 0,
      base: 0,
    };
    messages.forEach((m) => {
      if (m.status === 'pending' || m.status === 'validating') {
        counts[m.sourceChain]++;
      }
    });
    return counts;
  }, [messages]);

  const avgLatency = useMemo(() => {
    if (!transactionStats) return 0;
    return transactionStats.avgLatency;
  }, [transactionStats]);

  const totalPending = useMemo(() => {
    return pendingQueue.reduce((sum, q) => sum + q.pending + q.processing, 0);
  }, [pendingQueue]);

  const activeRisks = useMemo(() => {
    return riskPoints.filter((r) => !r.resolved);
  }, [riskPoints]);

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return t('timeAgo.minutes', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('timeAgo.hours', { count: hours });
    return t('timeAgo.days', { count: Math.floor(hours / 24) });
  };

  const getSecurityStatusText = (score: number) => {
    if (score >= 80) return t('uma.crossChain.crossChainSecure');
    if (score >= 60) return t('uma.crossChain.someSecurityConcerns');
    return t('uma.crossChain.criticalSecurityIssues');
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{t('uma.crossChain.title')}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{t('uma.crossChain.subtitle')}</p>
        </div>
        <div className="flex items-center border-b border-gray-200">
          {(['messages', 'monitoring', 'security'] as const).map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors',
                activeSection === section
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {t(`uma.crossChain.${section}`)}
            </button>
          ))}
        </div>
      </div>

      {activeSection === 'messages' && (
        <>
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">
              {t('uma.crossChain.supportedChains')}
            </h4>
            <div className="flex flex-wrap gap-3">
              {chains.map((chain) => (
                <ChainNode
                  key={chain}
                  chain={chain}
                  isActive={selectedChain === chain}
                  onClick={() => setSelectedChain(selectedChain === chain ? null : chain)}
                  messageCount={chainMessageCounts[chain]}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-900">
                {t('uma.crossChain.activeMessages')}
              </h4>
              <span className="text-xs text-gray-500">
                {filteredMessages.length} {t('uma.crossChain.messagesCount')}
              </span>
            </div>
            <div className="space-y-3">
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className="border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="text-lg font-bold"
                        style={{ color: CHAIN_CONFIGS[message.sourceChain].color }}
                      >
                        {CHAIN_CONFIGS[message.sourceChain].icon}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <span
                        className="text-lg font-bold"
                        style={{ color: CHAIN_CONFIGS[message.targetChain].color }}
                      >
                        {CHAIN_CONFIGS[message.targetChain].icon}
                      </span>
                      <span className="text-sm text-gray-600">
                        {CHAIN_CONFIGS[message.sourceChain].name} →{' '}
                        {CHAIN_CONFIGS[message.targetChain].name}
                      </span>
                    </div>
                    <MessageStatusBadge status={message.status} t={t} />
                  </div>
                  <MessageFlowAnimation
                    sourceChain={message.sourceChain}
                    targetChain={message.targetChain}
                    status={message.status}
                  />
                  <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                    <span>{formatTime(message.timestamp)}</span>
                    <span>
                      {message.confirmations}/{message.requiredConfirmations} confirmations
                    </span>
                    <span>~{message.estimatedTime}s</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200" />

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">
              {t('uma.crossChain.messageLatencyStats')}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-gray-500">{t('uma.crossChain.avgLatency')}</p>
                <p className="text-xl font-semibold text-gray-900">{avgLatency}ms</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('uma.crossChain.pendingMessages')}</p>
                <p className="text-xl font-semibold text-gray-900">{totalPending}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('uma.crossChain.successRate')}</p>
                <p className="text-xl font-semibold text-emerald-600">
                  {transactionStats
                    ? (
                        (transactionStats.successfulTransactions /
                          transactionStats.totalTransactions) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('uma.crossChain.volume24h')}</p>
                <p className="text-xl font-semibold text-gray-900">
                  ${transactionStats ? (transactionStats.volume24h / 1e6).toFixed(1) : 0}M
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {activeSection === 'monitoring' && (
        <>
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">
              {t('uma.crossChain.validatorStatusByChain')}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {validators.map((validator) => (
                <div key={validator.chainId} className="border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-lg font-bold"
                        style={{ color: CHAIN_CONFIGS[validator.chainId].color }}
                      >
                        {CHAIN_CONFIGS[validator.chainId].icon}
                      </span>
                      <span className="font-medium text-gray-900">{validator.chainName}</span>
                    </div>
                    <span
                      className={cn(
                        'px-2 py-0.5 text-xs font-medium',
                        validator.syncStatus === 'synced'
                          ? 'bg-emerald-50 text-emerald-600'
                          : validator.syncStatus === 'syncing'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-red-50 text-red-600'
                      )}
                    >
                      {t(`uma.syncStatus.${validator.syncStatus}`)}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('uma.stats.activeValidators')}</span>
                      <span className="font-medium text-gray-900">
                        {validator.activeValidators}/{validator.totalValidators}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('uma.networkHealth.responseTime')}</span>
                      <span className="font-medium text-gray-900">
                        {validator.avgResponseTime}ms
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('uma.stats.validatorUptime')}</span>
                      <span className="font-medium text-emerald-600">
                        {validator.uptime.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200" />

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">
              {t('uma.crossChain.bridgeHealthStatus')}
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-700">
                      {t('uma.crossChain.route')}
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">
                      {t('uma.disputes.status')}
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">
                      {t('uma.networkHealth.responseTime')}
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">
                      {t('uma.crossChain.successRate')}
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">
                      {t('uma.crossChain.pending')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bridgeHealth.slice(0, 10).map((health, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span style={{ color: CHAIN_CONFIGS[health.sourceChain].color }}>
                            {CHAIN_CONFIGS[health.sourceChain].icon}
                          </span>
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                          <span style={{ color: CHAIN_CONFIGS[health.targetChain].color }}>
                            {CHAIN_CONFIGS[health.targetChain].icon}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium',
                            health.status === 'healthy'
                              ? 'bg-emerald-50 text-emerald-600'
                              : health.status === 'degraded'
                                ? 'bg-amber-50 text-amber-600'
                                : 'bg-red-50 text-red-600'
                          )}
                        >
                          {health.status === 'healthy' && <CheckCircle className="w-3 h-3" />}
                          {health.status === 'degraded' && <AlertTriangle className="w-3 h-3" />}
                          {health.status === 'down' && <AlertCircle className="w-3 h-3" />}
                          {t(`uma.bridgeStatus.${health.status}`)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-600">{health.latency}ms</td>
                      <td className="py-2 px-3 text-gray-600">{health.successRate.toFixed(1)}%</td>
                      <td className="py-2 px-3 text-gray-600">{health.pendingMessages}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t border-gray-200" />

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">
              {t('uma.crossChain.pendingQueue')}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {pendingQueue.map((queue) => (
                <div key={queue.chain} className="border border-gray-200 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ color: CHAIN_CONFIGS[queue.chain].color }}>
                      {CHAIN_CONFIGS[queue.chain].icon}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {CHAIN_CONFIGS[queue.chain].name}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('uma.crossChain.pending')}</span>
                      <span className="font-medium text-amber-600">{queue.pending}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('uma.crossChain.processing')}</span>
                      <span className="font-medium text-blue-600">{queue.processing}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('uma.crossChain.avgWait')}</span>
                      <span className="font-medium text-gray-900">{queue.avgWaitTime}s</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200" />

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">
              {t('uma.crossChain.transactionStats')}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-gray-500">{t('uma.crossChain.totalTransactions')}</p>
                <p className="text-xl font-semibold text-gray-900">
                  {transactionStats?.totalTransactions.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('uma.crossChain.successRate')}</p>
                <p className="text-xl font-semibold text-emerald-600">
                  {transactionStats
                    ? (
                        (transactionStats.successfulTransactions /
                          transactionStats.totalTransactions) *
                        100
                      ).toFixed(2)
                    : 0}
                  %
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('uma.crossChain.volume24h')}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl font-semibold text-gray-900">
                    ${transactionStats ? (transactionStats.volume24h / 1e6).toFixed(1) : 0}M
                  </p>
                  <span
                    className={cn(
                      'text-xs font-medium',
                      (transactionStats?.volumeChange ?? 0) >= 0
                        ? 'text-emerald-600'
                        : 'text-red-600'
                    )}
                  >
                    {(transactionStats?.volumeChange ?? 0) >= 0 ? '+' : ''}
                    {transactionStats?.volumeChange}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('uma.crossChain.failedTransactions')}</p>
                <p className="text-xl font-semibold text-red-600">
                  {transactionStats?.failedTransactions.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {activeSection === 'security' && (
        <>
          <div className="flex items-start gap-6">
            <SecurityScoreRing score={securityScore?.overall ?? 0} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-900">
                  {t('uma.crossChain.overallSecurityScore')}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {securityScore && getSecurityStatusText(securityScore.overall)}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200" />

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">
              {t('uma.crossChain.securityComponents')}
            </h4>
            <div className="space-y-3">
              {securityScore?.components.map((component, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">{component.name}</span>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5',
                        component.status === 'good'
                          ? 'bg-emerald-50 text-emerald-600'
                          : component.status === 'warning'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-red-50 text-red-600'
                      )}
                    >
                      {t(`uma.componentStatus.${component.status}`)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          component.score >= 80
                            ? 'bg-emerald-500'
                            : component.score >= 60
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                        )}
                        style={{ width: `${component.score}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8 text-right">
                      {component.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-900">
                {t('uma.crossChain.activeRiskPoints')}
              </h4>
              <span className="text-xs text-gray-500">
                {activeRisks.length} {t('uma.crossChain.activeCount')}
              </span>
            </div>
            <div className="space-y-3">
              {activeRisks.map((risk) => (
                <div key={risk.id} className="border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={risk.severity} t={t} />
                      <span className="text-sm font-medium text-gray-900">{risk.title}</span>
                    </div>
                    <span className="text-xs text-gray-500">{formatTime(risk.timestamp)}</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{risk.description}</p>
                  <div className="flex items-center gap-2">
                    {risk.affectedChains.map((chain) => (
                      <span
                        key={chain}
                        className="text-xs px-2 py-0.5 border border-gray-200"
                        style={{ color: CHAIN_CONFIGS[chain].color }}
                      >
                        {CHAIN_CONFIGS[chain].name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {activeRisks.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                  {t('uma.crossChain.noActiveRiskPoints')}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200" />

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">
              {t('uma.crossChain.securityEventHistory')}
            </h4>
            <div className="space-y-2">
              {securityEvents.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full',
                        event.type === 'alert'
                          ? 'bg-amber-500'
                          : event.type === 'incident'
                            ? 'bg-red-500'
                            : event.type === 'maintenance'
                              ? 'bg-blue-500'
                              : 'bg-emerald-500'
                      )}
                    />
                    <span className="text-sm text-gray-900">{event.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{formatTime(event.timestamp)}</span>
                    {event.resolved ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200" />

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">
              {t('uma.crossChain.securityRecommendations')}
            </h4>
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <div key={rec.id} className="flex items-start gap-3 p-3 border border-gray-200">
                  <div
                    className={cn(
                      'w-6 h-6 flex items-center justify-center text-xs font-medium flex-shrink-0',
                      rec.priority === 'high'
                        ? 'bg-red-50 text-red-600'
                        : rec.priority === 'medium'
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-blue-50 text-blue-600'
                    )}
                  >
                    {rec.priority.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">{rec.title}</span>
                      <span className="text-xs text-gray-400">{rec.category}</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{rec.description}</p>
                    <p className="text-xs text-gray-500">
                      <span className="font-medium">{t('uma.crossChain.action')}:</span>{' '}
                      {rec.action}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default CrossChainVerification;
