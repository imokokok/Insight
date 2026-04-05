'use client';

import { useState, useMemo } from 'react';

import {
  Activity,
  CheckCircle2,
  Clock,
  Shield,
  Zap,
  Hash,
  Search,
  ArrowRight,
  Lock,
  FileCheck,
  Database,
  RefreshCw,
  AlertCircle,
  Copy,
  ExternalLink,
  Gamepad2,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type WinklinkVRFViewProps, type VRFRequest, type VRFUseCase } from '../types';

import { WinklinkDataTable } from './WinklinkDataTable';

const VRF_USE_CASES: VRFUseCase[] = [
  {
    id: '1',
    name: 'Casino Games',
    category: 'Gaming',
    description:
      'Provably fair random outcomes for dice, slots, roulette, and card games with on-chain verification',
    usageCount: 5200000,
    reliability: 99.95,
    avgLatency: 95,
  },
  {
    id: '2',
    name: 'Lottery Systems',
    category: 'Gaming',
    description:
      'Transparent and verifiable lottery number generation with cryptographic proof of fairness',
    usageCount: 1850000,
    reliability: 99.98,
    avgLatency: 110,
  },
  {
    id: '3',
    name: 'NFT Minting',
    category: 'DeFi',
    description:
      'Random NFT attribute and rarity generation ensuring fair distribution of digital assets',
    usageCount: 980000,
    reliability: 99.9,
    avgLatency: 120,
  },
  {
    id: '4',
    name: 'Tournament Seeding',
    category: 'Esports',
    description: 'Fair tournament bracket generation and matchmaking with verifiable randomness',
    usageCount: 320000,
    reliability: 99.92,
    avgLatency: 100,
  },
  {
    id: '5',
    name: 'Governance Selection',
    category: 'DAO',
    description:
      'Random selection of committee members and proposal reviewers for decentralized governance',
    usageCount: 150000,
    reliability: 99.97,
    avgLatency: 130,
  },
  {
    id: '6',
    name: 'Airdrop Distribution',
    category: 'DeFi',
    description:
      'Fair and transparent selection of airdrop recipients with verifiable random selection',
    usageCount: 420000,
    reliability: 99.93,
    avgLatency: 105,
  },
];

const VERIFICATION_STEPS = [
  {
    step: 1,
    title: 'Request Initiation',
    description: 'Consumer contract calls VRF coordinator with seed and callback parameters',
    icon: Hash,
  },
  {
    step: 2,
    title: 'Oracle Processing',
    description: 'VRF oracle generates randomness using private key and seed',
    icon: RefreshCw,
  },
  {
    step: 3,
    title: 'Proof Generation',
    description: 'Cryptographic proof is created to verify the randomness',
    icon: Lock,
  },
  {
    step: 4,
    title: 'On-chain Verification',
    description: 'Proof is verified on-chain using VRF public key',
    icon: FileCheck,
  },
  {
    step: 5,
    title: 'Randomness Delivery',
    description: 'Verified random value is delivered to consumer contract',
    icon: CheckCircle2,
  },
];

const SECURITY_MECHANISMS = [
  {
    title: 'Cryptographic Security',
    description:
      'Uses elliptic curve cryptography (ECVRF) to generate verifiable random outputs that cannot be predicted or manipulated.',
    icon: Lock,
  },
  {
    title: 'On-chain Verification',
    description:
      'Every random value comes with a cryptographic proof that can be verified on-chain by anyone.',
    icon: FileCheck,
  },
  {
    title: 'Decentralized Oracle Network',
    description:
      'Multiple independent oracle nodes participate in randomness generation, eliminating single points of failure.',
    icon: Database,
  },
  {
    title: 'Replay Protection',
    description:
      'Each request includes a unique nonce and consumer address to prevent replay attacks.',
    icon: Shield,
  },
];

// 空状态数据 - 当没有真实数据时使用
const EMPTY_VRF_DATA = {
  totalRequests: 0,
  dailyRequests: 0,
  averageResponseTime: 0,
  successRate: 0,
  activeConsumers: 0,
  totalRandomnessGenerated: '256 bits',
  recentRequests: [] as VRFRequest[],
};

export function WinklinkVRFView({ vrf, isLoading }: WinklinkVRFViewProps) {
  const t = useTranslations();
  const [requestIdInput, setRequestIdInput] = useState('');
  const [verificationResult, setVerificationResult] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    data?: {
      requestId: string;
      randomValue: string;
      proof: string;
      verified: boolean;
      timestamp: number;
      consumer: string;
    };
    error?: string;
  }>({ status: 'idle' });

  // 使用真实数据，如果没有则显示空状态
  const vrfData = vrf || EMPTY_VRF_DATA;

  const handleVerify = async () => {
    if (!requestIdInput.trim()) return;

    setVerificationResult({ status: 'loading' });

    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (requestIdInput.startsWith('0x') && requestIdInput.length === 66) {
      setVerificationResult({
        status: 'success',
        data: {
          requestId: requestIdInput,
          randomValue: '0x7f3a9c2e8b1d4f6a5c3b2e1d0f9a8c7b6d5e4f3a2b1c0d9e8f7a6b5c4d',
          proof: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890',
          verified: true,
          timestamp: Date.now() - 300000,
          consumer: 'TV6MuMXfmLbBqPZvBHdwFsDnQAaY4zQ4Qc',
        },
      });
    } else {
      setVerificationResult({
        status: 'error',
        error: 'Invalid request ID format. Expected 66-character hex string starting with 0x',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const requestColumns = useMemo(
    () => [
      {
        key: 'requestId',
        header: t('winklink.vrf.requestId'),
        sortable: true,
        render: (item: VRFRequest) => (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-gray-600">
              {item.requestId.slice(0, 10)}...{item.requestId.slice(-6)}
            </span>
            <button
              onClick={() => copyToClipboard(item.requestId)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <Copy className="w-3 h-3 text-gray-400" />
            </button>
          </div>
        ),
      },
      {
        key: 'consumer',
        header: t('winklink.vrf.consumer'),
        sortable: true,
        render: (item: VRFRequest) => (
          <span className="font-mono text-xs text-gray-600">
            {item.consumer.slice(0, 8)}...{item.consumer.slice(-6)}
          </span>
        ),
      },
      {
        key: 'randomValue',
        header: t('winklink.vrf.randomValue'),
        render: (item: VRFRequest) => (
          <span className="font-mono text-xs text-gray-600">
            {item.randomValue
              ? `${item.randomValue.slice(0, 8)}...${item.randomValue.slice(-4)}`
              : '-'}
          </span>
        ),
      },
      {
        key: 'status',
        header: t('winklink.vrf.status'),
        sortable: true,
        render: (item: VRFRequest) => {
          const statusConfig = {
            fulfilled: { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
            pending: { color: 'bg-amber-100 text-amber-700', icon: Clock },
            failed: { color: 'bg-red-100 text-red-700', icon: AlertCircle },
          };
          const config = statusConfig[item.status as keyof typeof statusConfig];
          const Icon = config.icon;
          return (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}
            >
              <Icon className="w-3 h-3" />
              {item.status}
            </span>
          );
        },
      },
      {
        key: 'timestamp',
        header: t('winklink.vrf.timestamp'),
        sortable: true,
        render: (item: VRFRequest) => {
          const diff = Date.now() - item.timestamp;
          const minutes = Math.floor(diff / 60000);
          const hours = Math.floor(diff / 3600000);
          if (hours > 0) return t('winklink.hero.hoursAgo', { count: hours });
          if (minutes > 0) return t('winklink.hero.minutesAgo', { count: minutes });
          return t('winklink.hero.justNow');
        },
      },
    ],
    [t]
  );

  // 空状态显示
  if (!vrf && !isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Gamepad2 className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('winklink.vrf.noData')}</h3>
          <p className="text-sm text-gray-500 max-w-md">{t('winklink.vrf.noDataDescription')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="flex flex-wrap items-center gap-6 md:gap-8">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('winklink.vrf.totalRequests')}
            </p>
            <p className="text-xl font-semibold text-gray-900">
              {vrfData.totalRequests > 0 ? `${(vrfData.totalRequests / 1e6).toFixed(1)}M` : '-'}
            </p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('winklink.vrf.dailyRequests')}
            </p>
            <p className="text-xl font-semibold text-emerald-600">
              {vrfData.dailyRequests > 0 ? `${(vrfData.dailyRequests / 1e3).toFixed(0)}K` : '-'}
            </p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('winklink.vrf.avgResponseTime')}
            </p>
            <p className="text-xl font-semibold text-gray-900">
              {vrfData.averageResponseTime > 0 ? `${vrfData.averageResponseTime}ms` : '-'}
            </p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('winklink.vrf.successRate')}
            </p>
            <p className="text-xl font-semibold text-gray-900">
              {vrfData.successRate > 0 ? `${vrfData.successRate}%` : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* VRF Verification Flow Diagram */}
      <div className="border-t border-gray-200 pt-8">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-6">
          {t('winklink.vrf.verificationFlow')}
        </h3>
        <div className="relative">
          <div className="flex items-start justify-between overflow-x-auto pb-4">
            {VERIFICATION_STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className="flex items-center flex-1 min-w-[180px]">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5 text-pink-600" />
                    </div>
                    <span className="text-xs font-medium text-pink-600 mb-1">Step {step.step}</span>
                    <h4 className="text-sm font-medium text-gray-900 text-center mb-1">
                      {step.title}
                    </h4>
                    <p className="text-xs text-gray-500 text-center max-w-[140px]">
                      {step.description}
                    </p>
                  </div>
                  {index < VERIFICATION_STEPS.length - 1 && (
                    <ArrowRight className="w-5 h-5 text-gray-300 mx-2 flex-shrink-0 mt-5" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Random Number Verification Tool */}
      <div className="border-t border-gray-200 pt-8">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            {t('winklink.vrf.verificationTool')}
          </h3>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3 h-3" />
            {t('winklink.vrf.demoMode')}
          </span>
        </div>
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('winklink.vrf.enterRequestId') || 'Enter Request ID'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={requestIdInput}
                  onChange={(e) => setRequestIdInput(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
              <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {t('winklink.vrf.demoNotice')}
              </p>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleVerify}
                disabled={verificationResult.status === 'loading' || !requestIdInput.trim()}
                className="px-6 py-2.5 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {verificationResult.status === 'loading' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {t('winklink.vrf.verifying')}
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    {t('winklink.vrf.verify')}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Verification Result */}
          {verificationResult.status !== 'idle' && (
            <div className="mt-6">
              {verificationResult.status === 'success' && verificationResult.data && (
                <div className="bg-white rounded-lg border border-emerald-200 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="font-medium text-emerald-700">
                      {t('winklink.vrf.verificationSuccess')}
                    </span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-start">
                      <span className="text-gray-500">Request ID:</span>
                      <span className="font-mono text-gray-900 flex items-center gap-2">
                        {verificationResult.data.requestId.slice(0, 20)}...
                        <button onClick={() => copyToClipboard(verificationResult.data!.requestId)}>
                          <Copy className="w-3 h-3 text-gray-400" />
                        </button>
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-gray-500">Random Value:</span>
                      <span className="font-mono text-gray-900 flex items-center gap-2">
                        {verificationResult.data.randomValue.slice(0, 20)}...
                        <button
                          onClick={() => copyToClipboard(verificationResult.data!.randomValue)}
                        >
                          <Copy className="w-3 h-3 text-gray-400" />
                        </button>
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-gray-500">Proof:</span>
                      <span className="font-mono text-gray-900 flex items-center gap-2">
                        {verificationResult.data.proof.slice(0, 20)}...
                        <button onClick={() => copyToClipboard(verificationResult.data!.proof)}>
                          <Copy className="w-3 h-3 text-gray-400" />
                        </button>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Consumer:</span>
                      <span className="font-mono text-gray-900">
                        {verificationResult.data.consumer}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Verified:</span>
                      <span className="text-emerald-600 font-medium">Yes ✓</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <a
                      href="https://tronscan.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-pink-600 hover:text-pink-700 font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {t('winklink.vrf.verifyOnTronScan')}
                    </a>
                  </div>
                </div>
              )}

              {verificationResult.status === 'error' && (
                <div className="bg-white rounded-lg border border-red-200 p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-700">
                      {t('winklink.vrf.verificationFailed')}
                    </span>
                  </div>
                  <p className="text-sm text-red-600 mt-2">{verificationResult.error}</p>
                  <div className="mt-3 pt-3 border-t border-red-100">
                    <p className="text-xs text-gray-500">
                      <span className="font-medium text-gray-700">{t('winklink.vrf.tip')}:</span>{' '}
                      {t('winklink.vrf.invalidRequestIdHint')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* VRF Security Proof Mechanism */}
      <div className="border-t border-gray-200 pt-8">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-6">
          {t('winklink.vrf.securityMechanism')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SECURITY_MECHANISMS.map((mechanism, index) => {
            const Icon = mechanism.icon;
            return (
              <div key={index} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">{mechanism.title}</h4>
                  <p className="text-xs text-gray-600 leading-relaxed">{mechanism.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent VRF Requests Table */}
      {vrfData.recentRequests.length > 0 && (
        <div className="border-t border-gray-200 pt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              {t('winklink.vrf.recentRequests')}
            </h3>
            <button className="text-sm text-pink-600 hover:text-pink-700 flex items-center gap-1">
              {t('winklink.vrf.viewAll')}
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          <WinklinkDataTable
            data={vrfData.recentRequests as unknown as Record<string, unknown>[]}
            columns={
              requestColumns as unknown as Array<{
                key: string;
                header: string;
                width?: string;
                sortable?: boolean;
                render?: (item: Record<string, unknown>) => React.ReactNode;
              }>
            }
            isLoading={isLoading}
          />
        </div>
      )}

      {/* VRF Use Cases */}
      <div className="border-t border-gray-200 pt-8">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-6">
          {t('winklink.vrf.useCases')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {VRF_USE_CASES.map((useCase) => (
            <div
              key={useCase.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-pink-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{useCase.name}</h4>
                  <span className="text-xs text-pink-600">{useCase.category}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-pink-600" />
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-4 leading-relaxed">{useCase.description}</p>
              <div className="flex items-center justify-between text-xs border-t border-gray-100 pt-3">
                <div>
                  <span className="text-gray-400">Usage: </span>
                  <span className="font-medium text-gray-900">
                    {(useCase.usageCount / 1e6).toFixed(1)}M
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Reliability: </span>
                  <span className="font-medium text-emerald-600">{useCase.reliability}%</span>
                </div>
                <div>
                  <span className="text-gray-400">Latency: </span>
                  <span className="font-medium text-gray-900">{useCase.avgLatency}ms</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* About Section */}
      <div className="border-t border-gray-200 pt-8">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          {t('winklink.vrf.about')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm text-gray-600">
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900">{t('winklink.vrf.whatIsVrf')}:</span>{' '}
              {t('winklink.vrf.whatIsVrfDesc')}
            </p>
            <p>
              <span className="font-medium text-gray-900">
                {t('winklink.vrf.unpredictability')}:
              </span>{' '}
              {t('winklink.vrf.unpredictabilityDesc')}
            </p>
          </div>
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900">{t('winklink.vrf.verifiability')}:</span>{' '}
              {t('winklink.vrf.verifiabilityDesc')}
            </p>
            <p>
              <span className="font-medium text-gray-900">{t('winklink.vrf.tamperProof')}:</span>{' '}
              {t('winklink.vrf.tamperProofDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
