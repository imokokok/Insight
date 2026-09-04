import { Activity, Anchor, ShieldAlert, TrendingDown } from 'lucide-react';

import { STABLECOIN_RISK_THRESHOLDS, WRAPPED_ASSET_RISK_THRESHOLDS } from '@/lib/risk/constants';
import { formatDuration } from '@/lib/risk/utils';
import type { StablecoinDepegSnapshot } from '@/lib/stablecoins/monitor';
import { formatPrice } from '@/lib/utils/format';
import type { WrappedAssetSnapshot } from '@/lib/wrapped-assets/monitor';

import { ImpactCard, MetricCard } from './RiskTrackerLayout';

import type { PegMonitorConfig } from './PegMonitorContent';

const WRAPPED_TYPE_LABELS: Record<string, string> = {
  'wrapped-btc': 'Wrapped BTC',
  'wrapped-eth': 'Wrapped ETH',
  'lst-eth': 'Liquid Staking ETH',
};

export const pegMonitorConfigs = {
  stablecoin: {
    page: 'stablecoin',
    title: 'See the peg before the protocol feels it.',
    description:
      '15-minute tracking of USDC, USDT, DAI and other major stablecoins across oracle providers and chains, mapped to DeFi protocols that accept them as collateral or borrow assets.',
    apiEndpoint: '/api/stablecoin-depeg',
    thresholds: STABLECOIN_RISK_THRESHOLDS,
    heroIcon: <ShieldAlert className="w-7 h-7" />,
    heroEyebrow: 'Risk Surveillance',
    getDeviationValue: (s: StablecoinDepegSnapshot) => s.maxDeviationPercent,
    getReferencePrice: (s: StablecoinDepegSnapshot) => s.referencePrice,
    getAssetSubtext: (s: StablecoinDepegSnapshot) => `Ref ${formatPrice(s.referencePrice)}`,
    renderOverview: (snapshot: StablecoinDepegSnapshot) => {
      const collateral = snapshot.affectedProtocols.filter(
        (p) => p.assetRole === 'collateral' || p.assetRole === 'both'
      ).length;
      const borrow = snapshot.affectedProtocols.filter(
        (p) => p.assetRole === 'borrow' || p.assetRole === 'both'
      ).length;

      return (
        <div className="space-y-5">
          <div className="grid grid-cols-2 border-y border-slate-900/15 sm:grid-cols-4">
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
            <div className="border-y border-slate-900/15 bg-slate-50/60 p-4">
              <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                Oracle vs DEX Market
              </h4>
              <div className="mb-3 grid grid-cols-2 border-y border-slate-900/15 sm:grid-cols-4">
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
            <div className="border-l-2 border-amber-500 bg-amber-50 p-3">
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
    },
  } as PegMonitorConfig<StablecoinDepegSnapshot>,

  wrapped: {
    page: 'wrapped',
    title: 'Measure what the wrapper is really worth.',
    description:
      'Tracking WBTC, wstETH, cbETH and other wrapped or liquid-staking tokens for peg deviations against their underlying assets, with protocol impact analysis.',
    apiEndpoint: '/api/wrapped-assets',
    thresholds: WRAPPED_ASSET_RISK_THRESHOLDS,
    heroIcon: <Anchor className="w-7 h-7" />,
    heroEyebrow: 'Risk Surveillance',
    typeLabels: WRAPPED_TYPE_LABELS,
    getDeviationValue: (s: WrappedAssetSnapshot) => s.deviationPercent,
    getReferencePrice: (s: WrappedAssetSnapshot) => s.underlyingReferencePrice,
    getAssetSubtext: (s: WrappedAssetSnapshot) => WRAPPED_TYPE_LABELS[s.type],
    renderOverview: (snapshot: WrappedAssetSnapshot) => (
      <div className="space-y-5">
        <div className="grid grid-cols-2 border-y border-slate-900/15 sm:grid-cols-4">
          <MetricCard label="Market Price" value={formatPrice(snapshot.wrappedMarketPrice)} />
          <MetricCard
            label="Fair Value"
            value={`${formatPrice(snapshot.fairUnderlyingPrice)} ${snapshot.underlyingSymbol}`}
          />
          <MetricCard label="Exchange Rate" value={snapshot.exchangeRate.toFixed(4)} />
          <MetricCard label="Duration" value={formatDuration(snapshot.durationSeconds)} />
        </div>

        {snapshot.type === 'lst-eth' && (
          <div className="border-l-2 border-blue-600 bg-blue-50 p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Liquid Staking Token Note</h4>
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
    ),
  } as PegMonitorConfig<WrappedAssetSnapshot>,
};
