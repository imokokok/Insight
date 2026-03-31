'use client';

import {
  Shield,
  CheckCircle,
  Clock,
  AlertTriangle,
  Info,
  Users,
  Key,
  Vote,
  Activity,
  AlertCircle,
  Server,
  Network,
  Zap,
  Lock,
  TrendingUp,
  XCircle,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

import { ChronicleDataTable } from './ChronicleDataTable';

interface ValidatorVote {
  id: string;
  validator: string;
  vote: 'approve' | 'reject' | 'pending';
  weight: number;
  timestamp: number;
  signature: string;
}

interface IdentityStatus {
  id: string;
  validator: string;
  status: 'verified' | 'pending' | 'revoked';
  keyType: string;
  lastVerified: number;
  expiryDate: number;
}

interface SlashingRecord {
  id: string;
  validator: string;
  reason: string;
  amount: number;
  timestamp: number;
  status: 'executed' | 'pending' | 'disputed';
}

interface AlertEvent {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  source: string;
  timestamp: number;
  resolved: boolean;
}

interface NodeHealth {
  id: string;
  node: string;
  status: 'healthy' | 'degraded' | 'offline';
  uptime: number;
  lastCheck: number;
  responseTime: number;
}

interface ChronicleScuttlebuttDeepViewProps {
  consensusData?: {
    consensusTime: number;
    totalVotes: number;
    approvedVotes: number;
    forkStatus: 'stable' | 'detected' | 'resolving';
    votingPowerDistribution: Array<{ validator: string; power: number }>;
  };
  isLoading?: boolean;
}

const mockValidatorVotes: ValidatorVote[] = [
  {
    id: '1',
    validator: 'Validator Alpha',
    vote: 'approve',
    weight: 15.2,
    timestamp: Date.now() - 120000,
    signature: '0x8f2a...3b4c',
  },
  {
    id: '2',
    validator: 'Validator Beta',
    vote: 'approve',
    weight: 12.8,
    timestamp: Date.now() - 115000,
    signature: '0x7c1d...9e2f',
  },
  {
    id: '3',
    validator: 'Validator Gamma',
    vote: 'pending',
    weight: 10.5,
    timestamp: Date.now() - 60000,
    signature: 'pending...',
  },
  {
    id: '4',
    validator: 'Validator Delta',
    vote: 'approve',
    weight: 8.3,
    timestamp: Date.now() - 90000,
    signature: '0x3a5b...7c8d',
  },
  {
    id: '5',
    validator: 'Validator Epsilon',
    vote: 'reject',
    weight: 6.1,
    timestamp: Date.now() - 80000,
    signature: '0x9d2e...1f4a',
  },
];

const mockIdentityStatuses: IdentityStatus[] = [
  {
    id: '1',
    validator: 'Validator Alpha',
    status: 'verified',
    keyType: 'ECDSA-P256',
    lastVerified: Date.now() - 86400000,
    expiryDate: Date.now() + 86400000 * 90,
  },
  {
    id: '2',
    validator: 'Validator Beta',
    status: 'verified',
    keyType: 'Ed25519',
    lastVerified: Date.now() - 172800000,
    expiryDate: Date.now() + 86400000 * 60,
  },
  {
    id: '3',
    validator: 'Validator Gamma',
    status: 'pending',
    keyType: 'ECDSA-P256',
    lastVerified: Date.now() - 259200000,
    expiryDate: Date.now() + 86400000 * 30,
  },
  {
    id: '4',
    validator: 'Validator Delta',
    status: 'verified',
    keyType: 'BLS12-381',
    lastVerified: Date.now() - 43200000,
    expiryDate: Date.now() + 86400000 * 120,
  },
];

const mockSlashingRecords: SlashingRecord[] = [
  {
    id: '1',
    validator: 'Validator Omega',
    reason: 'Double signing detected',
    amount: 5000,
    timestamp: Date.now() - 86400000 * 15,
    status: 'executed',
  },
  {
    id: '2',
    validator: 'Validator Sigma',
    reason: 'Extended downtime (>4h)',
    amount: 2500,
    timestamp: Date.now() - 86400000 * 7,
    status: 'executed',
  },
  {
    id: '3',
    validator: 'Validator Lambda',
    reason: 'Invalid price submission',
    amount: 1000,
    timestamp: Date.now() - 86400000 * 3,
    status: 'disputed',
  },
];

const mockAlerts: AlertEvent[] = [
  {
    id: '1',
    type: 'warning',
    message: 'Validator response time exceeding threshold',
    source: 'Monitor Node 3',
    timestamp: Date.now() - 300000,
    resolved: false,
  },
  {
    id: '2',
    type: 'info',
    message: 'Routine key rotation completed',
    source: 'Key Management System',
    timestamp: Date.now() - 3600000,
    resolved: true,
  },
  {
    id: '3',
    type: 'critical',
    message: 'Potential network partition detected',
    source: 'Network Monitor',
    timestamp: Date.now() - 180000,
    resolved: false,
  },
];

const mockNodeHealth: NodeHealth[] = [
  {
    id: '1',
    node: 'Primary Node 1',
    status: 'healthy',
    uptime: 99.97,
    lastCheck: Date.now() - 30000,
    responseTime: 45,
  },
  {
    id: '2',
    node: 'Primary Node 2',
    status: 'healthy',
    uptime: 99.95,
    lastCheck: Date.now() - 30000,
    responseTime: 52,
  },
  {
    id: '3',
    node: 'Backup Node 1',
    status: 'degraded',
    uptime: 98.5,
    lastCheck: Date.now() - 30000,
    responseTime: 180,
  },
  {
    id: '4',
    node: 'Backup Node 2',
    status: 'offline',
    uptime: 0,
    lastCheck: Date.now() - 300000,
    responseTime: 0,
  },
];

export function ChronicleScuttlebuttDeepView({
  consensusData,
  isLoading,
}: ChronicleScuttlebuttDeepViewProps) {
  const t = useTranslations();

  const consensus = consensusData ?? {
    consensusTime: 2.4,
    totalVotes: 5,
    approvedVotes: 3,
    forkStatus: 'stable' as const,
    votingPowerDistribution: [
      { validator: 'Alpha', power: 25 },
      { validator: 'Beta', power: 20 },
      { validator: 'Gamma', power: 18 },
      { validator: 'Delta', power: 15 },
      { validator: 'Epsilon', power: 12 },
      { validator: 'Others', power: 10 },
    ],
  };

  const stakingThreshold = 10000;
  const totalStaked = 850000;
  const avgReputation = 87;

  const getVoteColor = (vote: string) => {
    switch (vote) {
      case 'approve':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'reject':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
      case 'healthy':
      case 'executed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'pending':
      case 'degraded':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'revoked':
      case 'offline':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'disputed':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'info':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-600" />;
      default:
        return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  const getForkStatusColor = (status: string) => {
    switch (status) {
      case 'stable':
        return 'bg-emerald-100 text-emerald-700';
      case 'detected':
        return 'bg-red-100 text-red-700';
      case 'resolving':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const voteColumns = [
    {
      key: 'validator',
      header: t('chronicle.scuttlebutt.validator'),
      sortable: true,
      render: (item: ValidatorVote) => (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="font-medium">{item.validator}</span>
        </div>
      ),
    },
    {
      key: 'vote',
      header: t('chronicle.scuttlebutt.vote'),
      sortable: true,
      render: (item: ValidatorVote) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${getVoteColor(item.vote)}`}
        >
          {item.vote === 'approve' && <CheckCircle className="w-3 h-3" />}
          {item.vote === 'reject' && <XCircle className="w-3 h-3" />}
          {item.vote === 'pending' && <Clock className="w-3 h-3" />}
          <span className="capitalize">{item.vote}</span>
        </span>
      ),
    },
    {
      key: 'weight',
      header: t('chronicle.scuttlebutt.weight'),
      sortable: true,
      render: (item: ValidatorVote) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${Math.min(item.weight * 5, 100)}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{item.weight}%</span>
        </div>
      ),
    },
    {
      key: 'signature',
      header: t('chronicle.scuttlebutt.signature'),
      render: (item: ValidatorVote) => (
        <code className="text-xs bg-gray-50 px-2 py-0.5 rounded font-mono">{item.signature}</code>
      ),
    },
  ];

  const identityColumns = [
    {
      key: 'validator',
      header: t('chronicle.scuttlebutt.validator'),
      sortable: true,
      render: (item: IdentityStatus) => (
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-gray-400" />
          <span className="font-medium">{item.validator}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('chronicle.scuttlebutt.status'),
      sortable: true,
      render: (item: IdentityStatus) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}
        >
          {item.status === 'verified' && <CheckCircle className="w-3 h-3" />}
          {item.status === 'pending' && <Clock className="w-3 h-3" />}
          {item.status === 'revoked' && <XCircle className="w-3 h-3" />}
          <span className="capitalize">{item.status}</span>
        </span>
      ),
    },
    {
      key: 'keyType',
      header: t('chronicle.scuttlebutt.keyType'),
      render: (item: IdentityStatus) => (
        <code className="text-xs bg-gray-50 px-2 py-0.5 rounded">{item.keyType}</code>
      ),
    },
    {
      key: 'expiryDate',
      header: t('chronicle.scuttlebutt.expiry'),
      render: (item: IdentityStatus) => {
        const days = Math.ceil((item.expiryDate - Date.now()) / 86400000);
        return <span className={days < 30 ? 'text-amber-600' : 'text-gray-600'}>{days} days</span>;
      },
    },
  ];

  const slashingColumns = [
    {
      key: 'validator',
      header: t('chronicle.scuttlebutt.validator'),
      sortable: true,
      render: (item: SlashingRecord) => <span className="font-medium">{item.validator}</span>,
    },
    {
      key: 'reason',
      header: t('chronicle.scuttlebutt.reason'),
      render: (item: SlashingRecord) => (
        <span className="text-sm text-gray-700">{item.reason}</span>
      ),
    },
    {
      key: 'amount',
      header: t('chronicle.scuttlebutt.amount'),
      sortable: true,
      render: (item: SlashingRecord) => (
        <span className="font-medium text-red-600">-{item.amount.toLocaleString()}</span>
      ),
    },
    {
      key: 'timestamp',
      header: t('chronicle.scuttlebutt.date'),
      sortable: true,
      render: (item: SlashingRecord) => formatTime(item.timestamp),
    },
    {
      key: 'status',
      header: t('chronicle.scuttlebutt.status'),
      render: (item: SlashingRecord) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}
        >
          <span className="capitalize">{item.status}</span>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* 共识机制可视化区域 */}
      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Vote className="w-5 h-5 text-blue-600" />
          {t('chronicle.scuttlebutt.consensusMechanism')}
        </h3>

        {/* 共识状态概览 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">{t('chronicle.scuttlebutt.consensusTime')}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-semibold text-gray-900">
                {consensus.consensusTime}
              </span>
              <span className="text-sm text-gray-400">s</span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">{t('chronicle.scuttlebutt.totalVotes')}</p>
            <span className="text-2xl font-semibold text-gray-900">{consensus.totalVotes}</span>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">{t('chronicle.scuttlebutt.approvalRate')}</p>
            <span className="text-2xl font-semibold text-emerald-600">
              {Math.round((consensus.approvedVotes / consensus.totalVotes) * 100)}%
            </span>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">{t('chronicle.scuttlebutt.forkStatus')}</p>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-medium ${getForkStatusColor(consensus.forkStatus)}`}
            >
              {consensus.forkStatus === 'stable' && <CheckCircle className="w-4 h-4" />}
              {consensus.forkStatus === 'detected' && <AlertTriangle className="w-4 h-4" />}
              {consensus.forkStatus === 'resolving' && <Activity className="w-4 h-4" />}
              <span className="capitalize">{consensus.forkStatus}</span>
            </span>
          </div>
        </div>

        {/* 投票权重分布 */}
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-3">
            {t('chronicle.scuttlebutt.votingPowerDistribution')}
          </p>
          <div className="flex items-center gap-1 h-8 rounded-lg overflow-hidden">
            {consensus.votingPowerDistribution.map((v, i) => {
              const colors = [
                'bg-blue-500',
                'bg-indigo-500',
                'bg-purple-500',
                'bg-pink-500',
                'bg-rose-500',
                'bg-gray-400',
              ];
              return (
                <div
                  key={i}
                  className={`${colors[i % colors.length]} h-full flex items-center justify-center text-white text-xs font-medium`}
                  style={{ width: `${v.power}%` }}
                  title={`${v.validator}: ${v.power}%`}
                >
                  {v.power >= 15 && v.validator}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {consensus.votingPowerDistribution.map((v, i) => {
              const colors = [
                'bg-blue-500',
                'bg-indigo-500',
                'bg-purple-500',
                'bg-pink-500',
                'bg-rose-500',
                'bg-gray-400',
              ];
              return (
                <div key={i} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${colors[i % colors.length]}`} />
                  <span className="text-xs text-gray-600">
                    {v.validator}: {v.power}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 验证者投票表格 */}
        <ChronicleDataTable data={mockValidatorVotes} columns={voteColumns} />
      </div>

      <div className="border-t border-gray-200" />

      {/* 身份验证系统展示 */}
      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-purple-600" />
          {t('chronicle.scuttlebutt.identityVerification')}
        </h3>

        {/* 密钥管理状态概览 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center gap-4 bg-gray-50 rounded-lg p-4">
            <div className="p-2 bg-emerald-100 rounded-full">
              <Lock className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('chronicle.scuttlebutt.activeKeys')}</p>
              <p className="text-xl font-semibold text-gray-900">12</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-gray-50 rounded-lg p-4">
            <div className="p-2 bg-amber-100 rounded-full">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('chronicle.scuttlebutt.pendingRotation')}</p>
              <p className="text-xl font-semibold text-gray-900">2</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-gray-50 rounded-lg p-4">
            <div className="p-2 bg-blue-100 rounded-full">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('chronicle.scuttlebutt.lastKeyAudit')}</p>
              <p className="text-lg font-semibold text-gray-900">3 days ago</p>
            </div>
          </div>
        </div>

        {/* 签名验证流程说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
            <Info className="w-4 h-4" />
            {t('chronicle.scuttlebutt.signatureProcess')}
          </h4>
          <div className="flex flex-wrap items-center gap-2 text-sm text-blue-800">
            <span className="bg-white px-2 py-1 rounded border border-blue-200">
              1. Data Request
            </span>
            <span className="text-blue-400">→</span>
            <span className="bg-white px-2 py-1 rounded border border-blue-200">
              2. Sign with Private Key
            </span>
            <span className="text-blue-400">→</span>
            <span className="bg-white px-2 py-1 rounded border border-blue-200">
              3. Broadcast Signature
            </span>
            <span className="text-blue-400">→</span>
            <span className="bg-white px-2 py-1 rounded border border-blue-200">
              4. Verify with Public Key
            </span>
            <span className="text-blue-400">→</span>
            <span className="bg-white px-2 py-1 rounded border border-blue-200">
              5. Consensus Check
            </span>
          </div>
        </div>

        {/* 验证者身份认证状态表格 */}
        <ChronicleDataTable data={mockIdentityStatuses} columns={identityColumns} />
      </div>

      <div className="border-t border-gray-200" />

      {/* 抗女巫攻击机制展示 */}
      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-600" />
          {t('chronicle.scuttlebutt.sybilResistance')}
        </h3>

        {/* 质押门槛与声誉 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-200 rounded-full">
                <TrendingUp className="w-5 h-5 text-emerald-700" />
              </div>
              <p className="text-sm text-emerald-700 font-medium">
                {t('chronicle.scuttlebutt.stakingThreshold')}
              </p>
            </div>
            <p className="text-3xl font-bold text-emerald-900">
              {stakingThreshold.toLocaleString()}
            </p>
            <p className="text-sm text-emerald-600 mt-1">CHRON</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-200 rounded-full">
                <Users className="w-5 h-5 text-blue-700" />
              </div>
              <p className="text-sm text-blue-700 font-medium">
                {t('chronicle.scuttlebutt.totalStaked')}
              </p>
            </div>
            <p className="text-3xl font-bold text-blue-900">{(totalStaked / 1000).toFixed(0)}K</p>
            <p className="text-sm text-blue-600 mt-1">CHRON</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-200 rounded-full">
                <Activity className="w-5 h-5 text-purple-700" />
              </div>
              <p className="text-sm text-purple-700 font-medium">
                {t('chronicle.scuttlebutt.avgReputation')}
              </p>
            </div>
            <p className="text-3xl font-bold text-purple-900">{avgReputation}</p>
            <p className="text-sm text-purple-600 mt-1">/ 100</p>
          </div>
        </div>

        {/* 声誉系统详情 */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            {t('chronicle.scuttlebutt.reputationFactors')}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Uptime History', weight: 30, score: 92 },
              { name: 'Vote Accuracy', weight: 25, score: 88 },
              { name: 'Response Time', weight: 20, score: 85 },
              { name: 'Stake Duration', weight: 15, score: 90 },
              { name: 'Slashing History', weight: 5, score: 95 },
              { name: 'Network Participation', weight: 5, score: 87 },
            ].map((factor, i) => (
              <div key={i} className="bg-white rounded p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">{factor.name}</span>
                  <span className="text-xs text-gray-400">w: {factor.weight}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${factor.score}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{factor.score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 惩罚记录列表 */}
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          {t('chronicle.scuttlebutt.slashingRecords')}
        </h4>
        <ChronicleDataTable data={mockSlashingRecords} columns={slashingColumns} />
      </div>

      <div className="border-t border-gray-200" />

      {/* 实时监控面板 */}
      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-rose-600" />
          {t('chronicle.scuttlebutt.realtimeMonitoring')}
        </h3>

        {/* 异常检测告警 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">
              {t('chronicle.scuttlebutt.anomalyAlerts')}
            </h4>
            <span className="text-xs text-gray-500">
              {mockAlerts.filter((a) => !a.resolved).length} active
            </span>
          </div>
          <div className="space-y-2">
            {mockAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${getAlertColor(alert.type)} ${alert.resolved ? 'opacity-50' : ''}`}
              >
                {getAlertIcon(alert.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{alert.message}</p>
                  <p className="text-xs opacity-75 mt-0.5">
                    {alert.source} • {formatTime(alert.timestamp)}
                  </p>
                </div>
                {alert.resolved && (
                  <span className="text-xs bg-white/50 px-2 py-0.5 rounded">
                    {t('chronicle.scuttlebutt.resolved')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 节点健康检查状态 */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            {t('chronicle.scuttlebutt.nodeHealth')}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mockNodeHealth.map((node) => (
              <div key={node.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900">{node.node}</span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(node.status)}`}
                  >
                    {node.status === 'healthy' && <CheckCircle className="w-3 h-3" />}
                    {node.status === 'degraded' && <AlertTriangle className="w-3 h-3" />}
                    {node.status === 'offline' && <XCircle className="w-3 h-3" />}
                    <span className="capitalize">{node.status}</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">{t('chronicle.validators.uptime')}</p>
                    <p className="font-medium text-gray-900">{node.uptime}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500">{t('chronicle.networkHealth.responseTime')}</p>
                    <p className="font-medium text-gray-900">
                      {node.responseTime > 0 ? `${node.responseTime}ms` : '-'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 网络分区检测 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Network className="w-4 h-4" />
              {t('chronicle.scuttlebutt.networkPartition')}
            </h4>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700">
              <CheckCircle className="w-4 h-4" />
              {t('chronicle.scuttlebutt.noPartitionDetected')}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-semibold text-gray-900">5</p>
              <p className="text-xs text-gray-500">
                {t('chronicle.scuttlebutt.connectedPartitions')}
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-gray-900">100%</p>
              <p className="text-xs text-gray-500">
                {t('chronicle.scuttlebutt.networkConnectivity')}
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-gray-900">0</p>
              <p className="text-xs text-gray-500">{t('chronicle.scuttlebutt.isolatedNodes')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
