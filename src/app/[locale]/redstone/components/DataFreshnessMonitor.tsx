'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

import {
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  FileSignature,
  Radio,
  Database,
  Shield,
  ArrowRight,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

export interface DataFeedInfo {
  id: string;
  symbol: string;
  price: number;
  lastUpdate: Date;
  provider: string;
}

export interface SignatureProvider {
  id: number;
  name: string;
  status: 'signed' | 'pending' | 'failed';
  latency: number;
  signedAt?: Date;
}

export interface LifecycleStage {
  id: string;
  name: string;
  icon: React.ElementType;
  completed: boolean;
  active: boolean;
  timestamp?: Date;
  duration?: number;
}

export interface DataFreshnessMonitorProps {
  dataFeeds?: DataFeedInfo[];
  providers?: SignatureProvider[];
  lastUpdated?: Date | null;
  autoRefreshInterval?: number;
  onRefresh?: () => void;
}

type FreshnessLevel = 'fresh' | 'stale' | 'expired';

function getFreshnessLevel(secondsAgo: number): FreshnessLevel {
  if (secondsAgo < 30) return 'fresh';
  if (secondsAgo < 120) return 'stale';
  return 'expired';
}

function getFreshnessColor(level: FreshnessLevel): string {
  switch (level) {
    case 'fresh':
      return 'text-emerald-500';
    case 'stale':
      return 'text-amber-500';
    case 'expired':
      return 'text-red-500';
  }
}

function getFreshnessBgColor(level: FreshnessLevel): string {
  switch (level) {
    case 'fresh':
      return 'bg-emerald-50 border-emerald-200';
    case 'stale':
      return 'bg-amber-50 border-amber-200';
    case 'expired':
      return 'bg-red-50 border-red-200';
  }
}

function formatTimeAgo(seconds: number): string {
  if (seconds < 60) {
    return `${Math.floor(seconds)}s ago`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ago`;
  } else {
    return `${Math.floor(seconds / 3600)}h ago`;
  }
}

export function DataFreshnessMonitor({
  dataFeeds: externalDataFeeds,
  providers: externalProviders,
  lastUpdated: externalLastUpdated,
  autoRefreshInterval = 5000,
  onRefresh,
}: DataFreshnessMonitorProps) {
  const t = useTranslations();

  const [isConnected, setIsConnected] = useState(true);
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0);
  const [currentLifecycleStage, setCurrentLifecycleStage] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const dataFeeds = useMemo(() => {
    if (externalDataFeeds) return externalDataFeeds;
    const now = Date.now();
    return [
      {
        id: '1',
        symbol: 'ETH/USD',
        price: 3245.67,
        lastUpdate: new Date(now - 5000),
        provider: 'Provider A',
      },
      {
        id: '2',
        symbol: 'BTC/USD',
        price: 67234.89,
        lastUpdate: new Date(now - 8000),
        provider: 'Provider B',
      },
      {
        id: '3',
        symbol: 'ARB/USD',
        price: 1.23,
        lastUpdate: new Date(now - 12000),
        provider: 'Provider C',
      },
      {
        id: '4',
        symbol: 'SOL/USD',
        price: 178.45,
        lastUpdate: new Date(now - 15000),
        provider: 'Provider D',
      },
    ];
  }, [externalDataFeeds]);

  const providers = useMemo(() => {
    if (externalProviders) return externalProviders;
    return [
      {
        id: 1,
        name: 'Provider A',
        status: 'signed' as const,
        latency: 45,
        signedAt: new Date(Date.now() - 3000),
      },
      {
        id: 2,
        name: 'Provider B',
        status: 'signed' as const,
        latency: 52,
        signedAt: new Date(Date.now() - 2500),
      },
      {
        id: 3,
        name: 'Provider C',
        status: 'signed' as const,
        latency: 38,
        signedAt: new Date(Date.now() - 4000),
      },
      {
        id: 4,
        name: 'Provider D',
        status: 'signed' as const,
        latency: 61,
        signedAt: new Date(Date.now() - 3500),
      },
      { id: 5, name: 'Provider E', status: 'pending' as const, latency: 55 },
    ];
  }, [externalProviders]);

  const lastUpdated = useMemo(() => {
    return externalLastUpdated || new Date();
  }, [externalLastUpdated]);

  const signedCount = useMemo(() => {
    return providers.filter((p) => p.status === 'signed').length;
  }, [providers]);

  const requiredSignatures = 3;

  const verificationStatus = useMemo(() => {
    if (signedCount >= requiredSignatures) return 'verified';
    if (signedCount > 0) return 'pending';
    return 'failed';
  }, [signedCount, requiredSignatures]);

  const lifecycleStages: LifecycleStage[] = useMemo(() => {
    const now = Date.now();
    return [
      {
        id: 'creation',
        name: t('redstone.freshness.stageCreation') || 'Data Creation',
        icon: Database,
        completed: true,
        active: currentLifecycleStage === 0,
        timestamp: new Date(now - 4000),
        duration: 150,
      },
      {
        id: 'signing',
        name: t('redstone.freshness.stageSigning') || 'Provider Signing',
        icon: FileSignature,
        completed: currentLifecycleStage >= 1,
        active: currentLifecycleStage === 1,
        timestamp: currentLifecycleStage >= 1 ? new Date(now - 3000) : undefined,
        duration: 280,
      },
      {
        id: 'broadcast',
        name: t('redstone.freshness.stageBroadcast') || 'Broadcasting',
        icon: Radio,
        completed: currentLifecycleStage >= 2,
        active: currentLifecycleStage === 2,
        timestamp: currentLifecycleStage >= 2 ? new Date(now - 2000) : undefined,
        duration: 120,
      },
      {
        id: 'confirmation',
        name: t('redstone.freshness.stageConfirmation') || 'On-chain Confirmation',
        icon: Shield,
        completed: currentLifecycleStage >= 3,
        active: currentLifecycleStage === 3,
        timestamp: currentLifecycleStage >= 3 ? new Date(now - 1000) : undefined,
        duration: 350,
      },
    ];
  }, [currentLifecycleStage, t]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsSinceUpdate((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLifecycleStage((prev) => (prev + 1) % 4);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (autoRefreshInterval > 0 && onRefresh) {
      const interval = setInterval(() => {
        handleRefresh();
      }, autoRefreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefreshInterval, onRefresh]);

  const handleRefresh = useCallback(() => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      onRefresh();
      setSecondsSinceUpdate(0);
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }, [onRefresh, isRefreshing]);

  const overallFreshnessLevel = getFreshnessLevel(secondsSinceUpdate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-emerald-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          <span className="text-sm text-gray-600">
            {isConnected
              ? t('redstone.freshness.connected') || 'Connected'
              : t('redstone.freshness.disconnected') || 'Disconnected'}
          </span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{t('redstone.freshness.refresh') || 'Refresh'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg border ${getFreshnessBgColor(overallFreshnessLevel)}`}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className={`w-4 h-4 ${getFreshnessColor(overallFreshnessLevel)}`} />
            <span className="text-xs text-gray-500">
              {t('redstone.freshness.lastUpdate') || 'Last Update'}
            </span>
          </div>
          <p className="text-lg font-semibold text-gray-900">{lastUpdated.toLocaleTimeString()}</p>
          <p className={`text-sm font-medium ${getFreshnessColor(overallFreshnessLevel)}`}>
            {formatTimeAgo(secondsSinceUpdate)}
          </p>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-gray-500">
              {t('redstone.freshness.freshnessScore') || 'Freshness Score'}
            </span>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {Math.max(0, 100 - secondsSinceUpdate).toFixed(1)}/100
          </p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                overallFreshnessLevel === 'fresh'
                  ? 'bg-emerald-500'
                  : overallFreshnessLevel === 'stale'
                    ? 'bg-amber-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${Math.max(0, 100 - secondsSinceUpdate)}%` }}
            />
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500">
              {t('redstone.freshness.avgLatency') || 'Avg Latency'}
            </span>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {Math.round(providers.reduce((acc, p) => acc + p.latency, 0) / providers.length)}ms
          </p>
          <p className="text-xs text-gray-500">
            {t('redstone.freshness.acrossProviders') || `Across ${providers.length} providers`}
          </p>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          {t('redstone.freshness.dataFeeds') || 'Data Feed Timestamps'}
        </h4>
        <div className="space-y-2">
          {dataFeeds.map((feed) => {
            const feedSecondsAgo = Math.floor((Date.now() - feed.lastUpdate.getTime()) / 1000);
            const feedFreshness = getFreshnessLevel(feedSecondsAgo);

            return (
              <div
                key={feed.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${getFreshnessBgColor(feedFreshness)}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      feedFreshness === 'fresh'
                        ? 'bg-emerald-500'
                        : feedFreshness === 'stale'
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{feed.symbol}</p>
                    <p className="text-xs text-gray-500">{feed.provider}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    ${feed.price.toLocaleString()}
                  </p>
                  <p className={`text-xs ${getFreshnessColor(feedFreshness)}`}>
                    {formatTimeAgo(feedSecondsAgo)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          {t('redstone.freshness.signatureStatus') || 'Signature Verification Status'}
        </h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      provider.status === 'signed'
                        ? 'bg-emerald-100'
                        : provider.status === 'pending'
                          ? 'bg-amber-100'
                          : 'bg-red-100'
                    }`}
                  >
                    {provider.status === 'signed' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : provider.status === 'pending' ? (
                      <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{provider.name}</p>
                    <p className="text-xs text-gray-500">
                      {t('redstone.freshness.latency') || 'Latency'}: {provider.latency}ms
                    </p>
                  </div>
                </div>
                <div>
                  {provider.status === 'signed' ? (
                    <span className="text-xs text-emerald-600 font-medium px-2 py-1 bg-emerald-50 rounded">
                      {t('redstone.freshness.signed') || 'Signed'}
                    </span>
                  ) : provider.status === 'pending' ? (
                    <span className="text-xs text-amber-600 font-medium px-2 py-1 bg-amber-50 rounded">
                      {t('redstone.freshness.pending') || 'Pending'}
                    </span>
                  ) : (
                    <span className="text-xs text-red-600 font-medium px-2 py-1 bg-red-50 rounded">
                      {t('redstone.freshness.failed') || 'Failed'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-600">
                {t('redstone.freshness.signaturesCollected') || 'Signatures Collected'}
              </span>
              <span className="text-lg font-semibold text-gray-900">
                {signedCount}/{providers.length}
              </span>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{t('redstone.freshness.progress') || 'Progress'}</span>
                <span>{Math.round((signedCount / providers.length) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    verificationStatus === 'verified'
                      ? 'bg-emerald-500'
                      : verificationStatus === 'pending'
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${(signedCount / providers.length) * 100}%` }}
                />
              </div>
            </div>

            <div
              className={`p-3 rounded-lg ${
                verificationStatus === 'verified'
                  ? 'bg-emerald-50 border border-emerald-200'
                  : verificationStatus === 'pending'
                    ? 'bg-amber-50 border border-amber-200'
                    : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {verificationStatus === 'verified' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                ) : verificationStatus === 'pending' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <div>
                  <p
                    className={`text-sm font-medium ${
                      verificationStatus === 'verified'
                        ? 'text-emerald-700'
                        : verificationStatus === 'pending'
                          ? 'text-amber-700'
                          : 'text-red-700'
                    }`}
                  >
                    {verificationStatus === 'verified'
                      ? t('redstone.freshness.verificationComplete') || 'Verification Complete'
                      : verificationStatus === 'pending'
                        ? t('redstone.freshness.verificationPending') || 'Verification Pending'
                        : t('redstone.freshness.verificationFailed') || 'Verification Failed'}
                  </p>
                  <p
                    className={`text-xs ${
                      verificationStatus === 'verified'
                        ? 'text-emerald-600'
                        : verificationStatus === 'pending'
                          ? 'text-amber-600'
                          : 'text-red-600'
                    }`}
                  >
                    {t('redstone.freshness.minSignatures') ||
                      `Minimum ${requiredSignatures} signatures required`}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="p-2 bg-white rounded border border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {t('redstone.freshness.required') || 'Required'}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-900 mt-1">{requiredSignatures}</p>
              </div>
              <div className="p-2 bg-white rounded border border-gray-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs text-gray-500">
                    {t('redstone.freshness.collected') || 'Collected'}
                  </span>
                </div>
                <p className="text-sm font-semibold text-emerald-600 mt-1">{signedCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          {t('redstone.freshness.lifecycle') || 'Data Package Lifecycle'}
        </h4>
        <div className="relative">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-5 left-10 right-10 h-0.5 bg-gray-200" />
            <div
              className="absolute top-5 left-10 h-0.5 bg-red-500 transition-all duration-500"
              style={{
                width: `${(currentLifecycleStage / (lifecycleStages.length - 1)) * 100}%`,
              }}
            />
            {lifecycleStages.map((stage, index) => (
              <div key={stage.id} className="relative flex flex-col items-center z-10">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    stage.completed
                      ? 'bg-red-500 text-white'
                      : stage.active
                        ? 'bg-red-100 text-red-500 border-2 border-red-500'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <stage.icon className="w-5 h-5" />
                </div>
                <div className="mt-2 text-center">
                  <p className="text-xs font-medium text-gray-900">{stage.name}</p>
                  {stage.duration && <p className="text-xs text-gray-500">{stage.duration}ms</p>}
                </div>
                {index < lifecycleStages.length - 1 && (
                  <ArrowRight className="absolute top-5 -right-4 w-3 h-3 text-gray-300 z-0" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {t('redstone.freshness.currentStage') || 'Current Stage'}:
              </span>
              <span className="font-medium text-red-500">
                {lifecycleStages[currentLifecycleStage]?.name}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-500">
                {t('redstone.freshness.totalTime') || 'Total Time'}:
              </span>
              <span className="font-medium text-gray-900">
                {lifecycleStages.reduce((acc, s) => acc + (s.duration || 0), 0)}ms
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
        <span>
          {t('redstone.freshness.autoRefresh') || 'Auto-refresh'}: {autoRefreshInterval / 1000}s
        </span>
        <span>
          {t('redstone.freshness.lastChecked') || 'Last checked'}: {new Date().toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
