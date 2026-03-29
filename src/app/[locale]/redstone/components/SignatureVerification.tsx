'use client';

import { useState, useEffect, useCallback } from 'react';

import {
  Package,
  Key,
  Shield,
  CheckCircle,
  AlertTriangle,
  Clock,
  Hash,
  Zap,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  TrendingUp,
  Users,
  Award,
  Activity,
  Eye,
  EyeOff,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

interface DataPackage {
  symbol: string;
  value: number;
  timestamp: number;
  dataPoints: number;
}

interface Signature {
  provider: string;
  address: string;
  signature: string;
  timestamp: number;
  reputation: number;
  status: 'verified' | 'pending' | 'failed';
}

interface VerificationStep {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  icon: React.ComponentType<{ className?: string }>;
}

export function SignatureVerification() {
  const t = useTranslations();

  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const [expandedPackage, setExpandedPackage] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showFullSignature, setShowFullSignature] = useState(false);
  const [anomalyDetected, setAnomalyDetected] = useState(false);
  const [trustScore, setTrustScore] = useState(0);

  const dataPackage: DataPackage = {
    symbol: 'ETH/USD',
    value: 3245.67,
    timestamp: Date.now(),
    dataPoints: 128,
  };

  const signatures: Signature[] = [
    {
      provider: 'RedStone Alpha',
      address: '0x7a250d...4f88',
      signature: '0x3045022100f7b3c...8e2d',
      timestamp: Date.now() - 100,
      reputation: 98,
      status: 'verified',
    },
    {
      provider: 'RedStone Beta',
      address: '0x68b3e5...9c12',
      signature: '0x304402207a2f1...3d4e',
      timestamp: Date.now() - 150,
      reputation: 95,
      status: 'verified',
    },
    {
      provider: 'RedStone Gamma',
      address: '0x91d4f2...7a8b',
      signature: '0x30450221008c3e...1f2a',
      timestamp: Date.now() - 200,
      reputation: 92,
      status: 'verified',
    },
    {
      provider: 'RedStone Delta',
      address: '0x55f3a1...2e5c',
      signature: '0x304402206b7d...9c1f',
      timestamp: Date.now() - 250,
      reputation: 89,
      status: 'verified',
    },
    {
      provider: 'RedStone Epsilon',
      address: '0x3a2c8d...6b4f',
      signature: '0x3045022100d5e...7a3b',
      timestamp: Date.now() - 300,
      reputation: 87,
      status: 'pending',
    },
  ];

  const verificationSteps: VerificationStep[] = [
    {
      id: 1,
      title: t('redstone.signature.step1Title') || 'Data Received',
      description: t('redstone.signature.step1Desc') || 'Price data received from providers',
      status: 'pending',
      icon: Package,
    },
    {
      id: 2,
      title: t('redstone.signature.step2Title') || 'Signature Extracted',
      description:
        t('redstone.signature.step2Desc') || 'ECDSA signatures extracted from data package',
      status: 'pending',
      icon: Key,
    },
    {
      id: 3,
      title: t('redstone.signature.step3Title') || 'Public Key Recovery',
      description: t('redstone.signature.step3Desc') || 'Recover public keys from signatures',
      status: 'pending',
      icon: Hash,
    },
    {
      id: 4,
      title: t('redstone.signature.step4Title') || 'Threshold Verification',
      description: t('redstone.signature.step4Desc') || 'Verify minimum 3 of 5 signatures',
      status: 'pending',
      icon: Shield,
    },
    {
      id: 5,
      title: t('redstone.signature.step5Title') || 'Confirmation',
      description: t('redstone.signature.step5Desc') || 'Data verified and accepted',
      status: 'pending',
      icon: CheckCircle,
    },
  ];

  const [steps, setSteps] = useState(verificationSteps);

  const requiredSignatures = 3;
  const verifiedCount = signatures.filter((s) => s.status === 'verified').length;

  const copyToClipboard = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        const next = prev + 1;
        if (next >= verificationSteps.length) {
          setTimeout(() => {
            setSteps(verificationSteps.map((s) => ({ ...s, status: 'pending' })));
          }, 1000);
          return 0;
        }
        return next;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isAnimating, verificationSteps.length]);

  useEffect(() => {
    setSteps((prev) =>
      prev.map((step, index) => ({
        ...step,
        status: index < currentStep ? 'completed' : index === currentStep ? 'active' : 'pending',
      }))
    );
  }, [currentStep]);

  useEffect(() => {
    const targetScore =
      verifiedCount * 20 +
      signatures.reduce((acc, s) => acc + s.reputation, 0) / signatures.length / 5;
    const interval = setInterval(() => {
      setTrustScore((prev) => {
        if (prev < targetScore) return Math.min(prev + 1, targetScore);
        return prev;
      });
    }, 20);
    return () => clearInterval(interval);
  }, [verifiedCount, signatures]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnomalyDetected(Math.random() > 0.95);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500';
      case 'active':
        return 'bg-red-500 animate-pulse';
      case 'error':
        return 'bg-red-600';
      default:
        return 'bg-gray-200';
    }
  };

  const getStepBorderColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-emerald-500';
      case 'active':
        return 'border-red-500';
      case 'error':
        return 'border-red-600';
      default:
        return 'border-gray-200';
    }
  };

  const avgReputation = signatures.reduce((acc, s) => acc + s.reputation, 0) / signatures.length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <button
          onClick={() => setExpandedPackage(!expandedPackage)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <Package className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-900">
                {t('redstone.signature.dataPackage') || 'Data Package Structure'}
              </h3>
              <p className="text-xs text-gray-500">
                {t('redstone.signature.dataPackageDesc') || 'Signed price data package details'}
              </p>
            </div>
          </div>
          {expandedPackage ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {expandedPackage && (
          <div className="p-4 pt-0 border-t border-gray-100">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">
                      {t('redstone.signature.priceData') || 'Price Data'}
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                      {t('redstone.signature.verified') || 'Verified'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">
                        {t('redstone.signature.symbol') || 'Symbol'}
                      </p>
                      <p className="text-lg font-semibold text-gray-900">{dataPackage.symbol}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">
                        {t('redstone.signature.value') || 'Value'}
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        ${dataPackage.value.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-xs text-gray-500 uppercase tracking-wider">
                      {t('redstone.signature.timestamp') || 'Timestamp'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-mono text-gray-900">
                        {new Date(dataPackage.timestamp).toISOString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {t('redstone.signature.unix') || 'Unix'}:{' '}
                        {Math.floor(dataPackage.timestamp / 1000)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {t('redstone.signature.age') || 'Age'}
                      </p>
                      <p className="text-sm font-medium text-emerald-600">
                        {Math.floor((Date.now() - dataPackage.timestamp) / 1000)}s
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-gray-500" />
                    <span className="text-xs text-gray-500 uppercase tracking-wider">
                      {t('redstone.signature.dataPoints') || 'Data Points'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(dataPackage.dataPoints / 200) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {dataPackage.dataPoints}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">
                      {t('redstone.signature.providerSignatures') || 'Provider Signatures'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {verifiedCount}/{signatures.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {signatures.slice(0, 3).map((sig, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
                      >
                        <div className="flex items-center gap-2">
                          {sig.status === 'verified' ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          ) : sig.status === 'pending' ? (
                            <Clock className="w-4 h-4 text-amber-500" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          )}
                          <span className="text-sm text-gray-700">{sig.provider}</span>
                        </div>
                        <span className="text-xs text-gray-500 font-mono">
                          {sig.signature.substring(0, 12)}...
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Hash className="w-4 h-4 text-gray-500" />
                    <span className="text-xs text-gray-500 uppercase tracking-wider">
                      {t('redstone.signature.signatureAggregation') || 'Signature Aggregation'}
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded border border-gray-200 font-mono text-xs break-all">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">
                        {showFullSignature
                          ? '0x3045022100f7b3c8e2d4f6a8b1c3e5d7f9a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0...'
                          : '0x3045022100f7b3c8e2d4f6...'}
                      </span>
                      <button
                        onClick={() => setShowFullSignature(!showFullSignature)}
                        className="ml-2 text-gray-400 hover:text-gray-600"
                      >
                        {showFullSignature ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard('0x3045022100f7b3c...', 'aggregation')}
                    className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    {copiedField === 'aggregation' ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>{t('redstone.signature.copied') || 'Copied!'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>{t('redstone.signature.copyHash') || 'Copy hash'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                <Zap className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {t('redstone.signature.verificationFlow') || 'Signature Verification Flow'}
                </h3>
                <p className="text-xs text-gray-500">
                  {t('redstone.signature.verificationFlowDesc') ||
                    'Step-by-step verification process'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isAnimating
                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {isAnimating
                ? t('redstone.signature.pause') || 'Pause'
                : t('redstone.signature.play') || 'Play'}
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="relative">
            <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-200" />
            <div className="flex justify-between relative">
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center z-10">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${getStepBorderColor(
                      step.status
                    )} ${getStepColor(step.status)}`}
                  >
                    <step.icon
                      className={`w-5 h-5 ${
                        step.status === 'pending' ? 'text-gray-400' : 'text-white'
                      }`}
                    />
                  </div>
                  <div className="mt-3 text-center max-w-[100px]">
                    <p
                      className={`text-xs font-medium ${
                        step.status === 'active'
                          ? 'text-red-600'
                          : step.status === 'completed'
                            ? 'text-emerald-600'
                            : 'text-gray-500'
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 hidden lg:block">
                      {step.description}
                    </p>
                  </div>
                  {step.status === 'active' && (
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600">
                {t('redstone.signature.thresholdVerification') || 'Threshold Verification'}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {verifiedCount}/{signatures.length}{' '}
                {t('redstone.signature.signatures') || 'signatures'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-red-500 to-red-400 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(verifiedCount / signatures.length) * 100}%` }}
                />
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 rounded-full">
                <CheckCircle className="w-3 h-3 text-emerald-600" />
                <span className="text-xs text-emerald-700 font-medium">
                  {t('redstone.signature.passed') || 'Passed'}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {t('redstone.signature.thresholdNote') ||
                `Minimum ${requiredSignatures} signatures required. ${verifiedCount} verified.`}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Award className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {t('redstone.signature.trustScore') || 'Trust Score & Anomaly Detection'}
              </h3>
              <p className="text-xs text-gray-500">
                {t('redstone.signature.trustScoreDesc') || 'Reputation-weighted confidence metrics'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-4 bg-gradient-to-br from-red-50 to-white rounded-lg border border-red-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500 uppercase tracking-wider">
                  {t('redstone.signature.trustScore') || 'Trust Score'}
                </span>
                <TrendingUp className="w-4 h-4 text-red-500" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-gray-900">{Math.round(trustScore)}</span>
                <span className="text-lg text-gray-400 mb-1">/100</span>
              </div>
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-red-500 to-red-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${trustScore}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {t('redstone.signature.weightedByReputation') || 'Weighted by provider reputation'}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">
                  {t('redstone.signature.signerMetrics') || 'Signer Metrics'}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {t('redstone.signature.totalSigners') || 'Total Signers'}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{signatures.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {t('redstone.signature.verifiedSigners') || 'Verified'}
                  </span>
                  <span className="text-sm font-semibold text-emerald-600">{verifiedCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {t('redstone.signature.avgReputation') || 'Avg Reputation'}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {avgReputation.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">
                  {t('redstone.signature.anomalyDetection') || 'Anomaly Detection'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    anomalyDetected ? 'bg-red-100' : 'bg-emerald-100'
                  }`}
                >
                  {anomalyDetected ? (
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                  ) : (
                    <CheckCircle className="w-6 h-6 text-emerald-500" />
                  )}
                </div>
                <div>
                  <p
                    className={`text-sm font-medium ${
                      anomalyDetected ? 'text-red-600' : 'text-emerald-600'
                    }`}
                  >
                    {anomalyDetected
                      ? t('redstone.signature.anomalyDetected') || 'Anomaly Detected'
                      : t('redstone.signature.noAnomalies') || 'No Anomalies'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {anomalyDetected
                      ? t('redstone.signature.reviewRequired') || 'Review required'
                      : t('redstone.signature.allClear') || 'All clear'}
                  </p>
                </div>
              </div>
              <div className="mt-3 p-2 bg-white rounded border border-gray-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    {t('redstone.signature.priceDeviation') || 'Price Deviation'}
                  </span>
                  <span className="text-emerald-600 font-medium">0.02%</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-gray-500">
                    {t('redstone.signature.timestampDrift') || 'Timestamp Drift'}
                  </span>
                  <span className="text-emerald-600 font-medium">45ms</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              {t('redstone.signature.confidenceMeter') || 'Confidence Meter'}
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-sm text-gray-600">
                    {t('redstone.signature.signatureValidity') || 'Signature Validity'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '100%' }} />
                  </div>
                  <span className="text-xs text-gray-500">100%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-sm text-gray-600">
                    {t('redstone.signature.dataConsistency') || 'Data Consistency'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '98%' }} />
                  </div>
                  <span className="text-xs text-gray-500">98%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-sm text-gray-600">
                    {t('redstone.signature.providerDiversity') || 'Provider Diversity'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '95%' }} />
                  </div>
                  <span className="text-xs text-gray-500">95%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-sm text-gray-600">
                    {t('redstone.signature.timestampFreshness') || 'Timestamp Freshness'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className="bg-amber-500 h-2 rounded-full" style={{ width: '85%' }} />
                  </div>
                  <span className="text-xs text-gray-500">85%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
