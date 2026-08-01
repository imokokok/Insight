'use client';

import { Anchor, TrendingDown } from 'lucide-react';

import { RiskTrackerLayout } from '@/components/risk';
import { ImpactCard, MetricCard } from '@/components/risk/RiskTrackerLayout';
import { WRAPPED_ASSET_RISK_THRESHOLDS } from '@/lib/risk/constants';
import { formatDuration } from '@/lib/risk/utils';
import { formatPrice } from '@/lib/utils/format';
import type { WrappedAssetSnapshot } from '@/lib/wrapped-assets/monitor';

const TYPE_LABELS: Record<string, string> = {
  'wrapped-btc': 'Wrapped BTC',
  'wrapped-eth': 'Wrapped ETH',
  'lst-eth': 'Liquid Staking ETH',
};

interface WrappedAssetsContentProps {
  initialSnapshots?: WrappedAssetSnapshot[];
}

export default function WrappedAssetsContent({ initialSnapshots = [] }: WrappedAssetsContentProps) {
  return (
    <RiskTrackerLayout
      page="wrapped"
      title="Wrapped Asset Peg Tracker"
      description="Tracking WBTC, wstETH, cbETH and other wrapped or liquid-staking tokens for peg deviations against their underlying assets, with protocol impact analysis."
      apiEndpoint="/api/wrapped-assets"
      thresholds={WRAPPED_ASSET_RISK_THRESHOLDS}
      heroIcon={<Anchor className="w-7 h-7" />}
      heroEyebrow="Risk Surveillance"
      initialSnapshots={initialSnapshots}
      typeLabels={TYPE_LABELS}
      getDeviationValue={(s) => s.deviationPercent}
      getReferencePrice={(s) => s.underlyingReferencePrice}
      getAssetSubtext={(s) => TYPE_LABELS[s.type]}
      renderOverview={(snapshot) => (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard label="Market Price" value={formatPrice(snapshot.wrappedMarketPrice)} />
            <MetricCard
              label="Fair Value"
              value={`${formatPrice(snapshot.fairUnderlyingPrice)} ${snapshot.underlyingSymbol}`}
            />
            <MetricCard label="Exchange Rate" value={snapshot.exchangeRate.toFixed(4)} />
            <MetricCard label="Duration" value={formatDuration(snapshot.durationSeconds)} />
          </div>

          {snapshot.type === 'lst-eth' && (
            <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                Liquid Staking Token Note
              </h4>
              <p className="text-sm text-blue-700 leading-relaxed">
                {snapshot.symbol} is a liquid staking token. Its fair value is computed as market
                price divided by the current on-chain exchange rate (
                {snapshot.exchangeRate.toFixed(4)} {snapshot.underlyingSymbol} per {snapshot.symbol}
                ). Deviations reflect both secondary-market demand/supply stress and the underlying
                staking yield accrual.
              </p>
            </div>
          )}

          <ImpactCard
            title="Collateral Exposure"
            count={snapshot.affectedProtocols.length}
            description={`Protocols where ${snapshot.symbol} is accepted as collateral. A discount to the underlying asset directly reduces the Health Factor of collateralized positions.`}
            icon={<TrendingDown className="w-4 h-4" />}
          />
        </div>
      )}
    />
  );
}
