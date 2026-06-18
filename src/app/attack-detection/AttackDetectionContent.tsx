'use client';

import { useState, useCallback } from 'react';

import { ErrorBoundary } from '@/components/error-boundary';
import { LiveStatusBar } from '@/components/ui';

import { AttackSignaturePanel } from './components/AttackSignaturePanel';
import { ControlPanel } from './components/ControlPanel';
import { DeviationTable } from './components/DeviationTable';
import { OnboardingGuide } from './components/OnboardingGuide';
import { SpotTwapChart } from './components/SpotTwapChart';
import { StatusChangeNotice } from './components/StatusChangeNotice';
import { TabNavigation, type TabId } from './components/TabNavigation';
import { ThreatExplanation } from './components/ThreatExplanation';
import { ThreatOverview } from './components/ThreatOverview';
import { useAttackDetection } from './hooks';
import {
  type AttackDetectionConfig,
  DEFAULT_ATTACK_DETECTION_CONFIG,
  type ThreatLevel,
} from './types';

export default function AttackDetectionContent() {
  const [config, setConfig] = useState<AttackDetectionConfig>(DEFAULT_ATTACK_DETECTION_CONFIG);
  const [activeTab, setActiveTab] = useState<TabId>('deviation');

  const handleConfigChange = useCallback((partial: Partial<AttackDetectionConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  return (
    <ErrorBoundary level="page" componentName="AttackDetectionContent">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Attack Detection</h1>
              <p className="text-sm text-gray-500 mt-1">
                Oracle manipulation &amp; liquidity anomaly detection — monitors stale prices,
                low-liquidity exploitation, and cross-source divergence
              </p>
            </div>
          </div>

          {/* Main Layout: Left Panel + Right Content */}
          <div className="flex flex-col xl:flex-row gap-6">
            {/* Left Control Panel */}
            <div className="xl:w-[400px] xl:shrink-0 xl:sticky xl:top-4 xl:self-start">
              <ControlPanel config={config} onConfigChange={handleConfigChange} isLoading={false} />
            </div>

            {/* Right Content Area */}
            <div className="flex-1 min-w-0">
              <AttackDetectionMain
                config={config}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

function AttackDetectionMain({
  config,
  activeTab,
  onTabChange,
}: {
  config: AttackDetectionConfig;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}) {
  const {
    detectionResult,
    oracleDeviations,
    deviationHistory,
    error,
    lastUpdated,
    activeAlertCount,
  } = useAttackDetection({
    symbol: config.symbol,
    chain: config.chain,
    selectedOracles: config.selectedOracles,
    refreshIntervalMs: config.refreshIntervalMs,
  });

  const threatLevel: ThreatLevel = detectionResult?.threatLevel ?? 'low';
  const maxDeviation =
    oracleDeviations.length > 0
      ? Math.max(...oracleDeviations.map((d) => Math.abs(d.deviationPercent)))
      : 0;
  const acceleration = detectionResult?.signature.deviationAcceleration ?? 'stable';
  const confidence = detectionResult?.confidence ?? 0;
  const threshold =
    config.customThresholds[
      config.symbol.toUpperCase() === 'USDC' ||
      config.symbol.toUpperCase() === 'USDT' ||
      config.symbol.toUpperCase() === 'DAI'
        ? 'stablecoin'
        : ['BTC', 'ETH', 'BNB', 'SOL'].includes(config.symbol.toUpperCase())
          ? 'major'
          : 'alt'
    ];

  return (
    <div className="space-y-6">
      {/* Onboarding Guide (collapsible) */}
      <OnboardingGuide />

      {/* Live Status Bar */}
      <LiveStatusBar isConnected={!error} lastUpdate={lastUpdated ?? undefined} />

      {/* Threat Overview Cards */}
      <ThreatOverview
        threatLevel={threatLevel}
        activeAlertCount={activeAlertCount}
        maxDeviation={maxDeviation}
        acceleration={acceleration}
        confidence={confidence}
      />

      {/* Status Change Notice (shows when threat level changes) */}
      {detectionResult && (
        <StatusChangeNotice
          threatLevel={threatLevel}
          signature={detectionResult.signature}
          symbol={config.symbol}
        />
      )}

      {/* Threat Explanation — always visible, explains what's happening and what to do */}
      {detectionResult && (
        <ThreatExplanation
          threatLevel={threatLevel}
          signature={detectionResult.signature}
          recommendation={detectionResult.recommendation}
          symbol={config.symbol}
        />
      )}

      {/* Spot/TWAP Chart */}
      <SpotTwapChart
        deviationHistory={deviationHistory}
        threshold={threshold}
        symbol={config.symbol}
      />

      {/* Tab Navigation */}
      <TabNavigation activeTab={activeTab} onTabChange={onTabChange} />

      {/* Tab Content */}
      {activeTab === 'deviation' && (
        <DeviationTable deviations={oracleDeviations} threshold={threshold} />
      )}

      {activeTab === 'signature' && detectionResult && (
        <AttackSignaturePanel
          signature={detectionResult.signature}
          scores={detectionResult.scores}
          threatLevel={detectionResult.threatLevel}
          confidence={detectionResult.confidence}
          recommendation={detectionResult.recommendation}
          symbol={config.symbol}
        />
      )}
    </div>
  );
}
