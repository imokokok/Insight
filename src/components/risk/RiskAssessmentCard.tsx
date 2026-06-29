'use client';

import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';

import { RISK_LEVELS } from '@/lib/risk/constants';
import type { RiskLevel } from '@/lib/risk/types';
import { cn } from '@/lib/utils';

interface RiskAssessmentCardProps {
  assetSymbol: string;
  riskLevel: RiskLevel;
  deviationPercent: number;
  durationSeconds: number;
  affectedProtocolCount: number;
  type: 'stablecoin' | 'wrapped';
  className?: string;
}

function getRiskIcon(level: RiskLevel) {
  switch (level) {
    case 'normal':
      return <CheckCircle2 className="w-5 h-5" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5" />;
    case 'critical':
    case 'severe':
      return <ShieldAlert className="w-5 h-5" />;
  }
}

function getRiskDescription(props: RiskAssessmentCardProps): string {
  const { assetSymbol, riskLevel, deviationPercent, affectedProtocolCount, type } = props;

  if (type === 'stablecoin') {
    const direction = deviationPercent > 0 ? 'premium' : 'discount';
    switch (riskLevel) {
      case 'normal':
        return `${assetSymbol} is trading within the normal range. The current ${direction} of ${Math.abs(deviationPercent).toFixed(3)}% is within acceptable thresholds.`;
      case 'warning':
        return `${assetSymbol} shows a mild ${direction} of ${Math.abs(deviationPercent).toFixed(3)}% that has persisted for some time. Monitor positions using ${assetSymbol} across ${affectedProtocolCount} protocol(s).`;
      case 'critical':
        return `${assetSymbol} has a significant ${direction} of ${Math.abs(deviationPercent).toFixed(3)}% and has been in an elevated risk state. Positions using ${assetSymbol} in ${affectedProtocolCount} protocol(s) face increased liquidation risk.`;
      case 'severe':
        return `${assetSymbol} is severely depegged with a ${direction} of ${Math.abs(deviationPercent).toFixed(3)}%. Immediate attention is required for positions using ${assetSymbol} across ${affectedProtocolCount} protocol(s).`;
    }
  }

  // wrapped asset
  const direction = deviationPercent > 0 ? 'premium' : 'discount';
  switch (riskLevel) {
    case 'normal':
      return `${assetSymbol} is closely tracking its underlying asset. The current ${direction} of ${Math.abs(deviationPercent).toFixed(3)}% is within the expected range.`;
    case 'warning':
      return `${assetSymbol} is trading at a ${direction} of ${Math.abs(deviationPercent).toFixed(3)}%. Collateral positions in ${affectedProtocolCount} protocol(s) should be monitored.`;
    case 'critical':
      return `${assetSymbol} shows a notable ${direction} of ${Math.abs(deviationPercent).toFixed(3)}%. Collateralized positions in ${affectedProtocolCount} protocol(s) are at elevated risk of liquidation.`;
    case 'severe':
      return `${assetSymbol} is severely misaligned with its underlying asset (${direction} ${Math.abs(deviationPercent).toFixed(3)}%). Urgent review is recommended for positions using ${assetSymbol} in ${affectedProtocolCount} protocol(s).`;
  }
}

function getKeyTakeaways(props: RiskAssessmentCardProps): string[] {
  const { assetSymbol, deviationPercent, durationSeconds, affectedProtocolCount, type } = props;
  const takeaways: string[] = [];

  if (type === 'stablecoin') {
    if (deviationPercent > 0.5) {
      takeaways.push(
        `${assetSymbol} is trading above its $1 peg, which increases the effective debt burden for borrowers.`
      );
    } else if (deviationPercent < -0.5) {
      takeaways.push(
        `${assetSymbol} is trading below its $1 peg, eroding the collateral value of positions using it as collateral.`
      );
    }
  } else {
    if (deviationPercent < -0.5) {
      takeaways.push(
        `${assetSymbol} is trading at a discount to its underlying asset, directly reducing collateral value.`
      );
    } else if (deviationPercent > 0.5) {
      takeaways.push(
        `${assetSymbol} is trading at a premium to its underlying asset, which is generally favorable for collateral but still indicates market stress.`
      );
    }
  }

  if (durationSeconds > 300) {
    takeaways.push(
      `The current risk level has persisted for over ${Math.floor(durationSeconds / 60)} minutes, suggesting more than a short-lived price dislocation.`
    );
  }

  if (affectedProtocolCount > 0) {
    takeaways.push(
      `${affectedProtocolCount} protocol(s) list ${assetSymbol} and may have user positions exposed to this price movement.`
    );
  }

  if (takeaways.length === 0) {
    takeaways.push(
      'No immediate action required. Continue monitoring for any sustained deviation.'
    );
  }

  return takeaways;
}

export function RiskAssessmentCard(props: RiskAssessmentCardProps) {
  const { riskLevel } = props;
  const config = RISK_LEVELS[riskLevel];

  return (
    <div
      className={cn(
        'rounded-xl border bg-white p-5 shadow-sm',
        riskLevel === 'critical' || riskLevel === 'severe'
          ? 'border-red-200'
          : riskLevel === 'warning'
            ? 'border-amber-200'
            : 'border-emerald-200',
        props.className
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn('p-2.5 rounded-xl shrink-0', config.bg, config.color)}>
          {getRiskIcon(riskLevel)}
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Risk Assessment</h3>
          <p className={cn('text-sm leading-relaxed mb-3', config.color)}>
            {getRiskDescription(props)}
          </p>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <Info className="w-3.5 h-3.5" />
              Key Takeaways
            </div>
            <ul className="space-y-2">
              {getKeyTakeaways(props).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
