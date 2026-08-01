'use client';

import { Activity, Anchor, ShieldAlert } from 'lucide-react';

import { RiskTrackerLayout } from '@/components/risk';
import { ImpactCard, MetricCard } from '@/components/risk/RiskTrackerLayout';
import { STABLECOIN_RISK_THRESHOLDS } from '@/lib/risk/constants';
import { formatDuration } from '@/lib/risk/utils';
import type { StablecoinDepegSnapshot } from '@/lib/stablecoins/monitor';
import { formatPrice } from '@/lib/utils/format';

interface StablecoinDepegContentProps {
  initialSnapshots?: StablecoinDepegSnapshot[];
}

export default function StablecoinDepegContent({
  initialSnapshots = [],
}: StablecoinDepegContentProps) {
  return (
    <RiskTrackerLayout
      page="stablecoin"
      title="Stablecoin Depeg Tracker"
      description="Hourly tracking of USDC, USDT, DAI and other major stablecoins across oracle providers and chains, mapped to DeFi protocols that accept them as collateral or borrow assets."
      apiEndpoint="/api/stablecoin-depeg"
      thresholds={STABLECOIN_RISK_THRESHOLDS}
      heroIcon={<ShieldAlert className="w-7 h-7" />}
      heroEyebrow="Risk Surveillance"
      initialSnapshots={initialSnapshots}
      getDeviationValue={(s) => s.maxDeviationPercent}
      getReferencePrice={(s) => s.referencePrice}
      getAssetSubtext={(s) => `Ref ${formatPrice(s.referencePrice)}`}
      renderOverview={(snapshot) => {
        const collateral = snapshot.affectedProtocols.filter(
          (p) => p.assetRole === 'collateral' || p.assetRole === 'both'
        ).length;
        const borrow = snapshot.affectedProtocols.filter(
          (p) => p.assetRole === 'borrow' || p.assetRole === 'both'
        ).length;

        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard label="Reference Price" value={formatPrice(snapshot.referencePrice)} />
              <MetricCard
                label="Max Deviation"
                value={`${snapshot.maxDeviationPercent > 0 ? '+' : ''}${snapshot.maxDeviationPercent.toFixed(3)}%`}
                trend={snapshot.maxDeviationPercent > 0 ? 'up' : 'down'}
              />
              <MetricCard label="Source Spread" value={`${snapshot.spreadPercent.toFixed(3)}%`} />
              <MetricCard label="Duration" value={formatDuration(snapshot.durationSeconds)} />
            </div>

            {snapshot.marketReferencePrice > 0 && (
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Oracle vs DEX Market
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <MetricCard
                    label="Market Price"
                    value={formatPrice(snapshot.marketReferencePrice)}
                  />
                  <MetricCard
                    label="Oracle-Market Gap"
                    value={`${snapshot.oracleMarketDivergencePercent > 0 ? '+' : ''}${snapshot.oracleMarketDivergencePercent.toFixed(3)}%`}
                    trend={snapshot.oracleMarketDivergencePercent > 0 ? 'up' : 'down'}
                  />
                  <MetricCard
                    label="Direction"
                    value={
                      snapshot.oracleMarketDirection === 'oracle-above-market'
                        ? 'Oracle > Market'
                        : snapshot.oracleMarketDirection === 'oracle-below-market'
                          ? 'Oracle < Market'
                          : 'Aligned'
                    }
                  />
                  <MetricCard
                    label="Market Spread"
                    value={`${snapshot.marketSpreadPercent.toFixed(3)}%`}
                  />
                </div>
                <p className="text-xs text-slate-500">{snapshot.oracleMarketInterpretation}</p>
              </div>
            )}

            {snapshot.riskReason && snapshot.riskLevel !== 'normal' && (
              <div className="bg-amber-50 rounded-xl border border-amber-200 p-3">
                <p className="text-sm text-amber-800">{snapshot.riskReason}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImpactCard
                title="Collateral Exposure"
                count={collateral}
                description={`Protocols where ${snapshot.symbol} is accepted as collateral. A depeg discount erodes position Health Factor.`}
                icon={<Anchor className="w-4 h-4" />}
              />
              <ImpactCard
                title="Borrow Exposure"
                count={borrow}
                description={`Protocols where ${snapshot.symbol} can be borrowed. A depeg premium increases the real value of debt.`}
                icon={<ShieldAlert className="w-4 h-4" />}
              />
            </div>
          </div>
        );
      }}
    />
  );
}
