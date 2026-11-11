import { roundTo } from '@/lib/utils/format';

import { evaluateHighIsBad, PRE_TRADE_THRESHOLDS } from './verdictPolicy';

import type { ContributingFactor, DepegWarning, SafetyVerdict } from './contracts';

/** Evaluate the worst active stablecoin peg alert across the trade pair. */
export function evaluateDepegRule(params: { depegWarnings: DepegWarning[] }): {
  verdict: SafetyVerdict | null;
  factors: ContributingFactor[];
  warnings: string[];
} {
  const factors: ContributingFactor[] = [];
  const warnings: string[] = [];
  const worstDepeg = params.depegWarnings.reduce<number>(
    (max, warning) => Math.max(max, Math.abs(warning.deviationPct)),
    0
  );
  const verdict = evaluateHighIsBad(worstDepeg, PRE_TRADE_THRESHOLDS.stablecoinDepegPct);
  if (!verdict) return { verdict, factors, warnings };

  const worstCoin = params.depegWarnings.reduce<string | null>(
    (pick, warning) => (Math.abs(warning.deviationPct) >= worstDepeg ? warning.stablecoin : pick),
    null
  );
  factors.push({
    rule: 'stablecoin_depeg_pct',
    value: roundTo(worstDepeg, 4),
    threshold:
      PRE_TRADE_THRESHOLDS.stablecoinDepegPct[
        verdict.toLowerCase() as 'caution' | 'danger' | 'block'
      ],
    triggeredVerdict: verdict,
    message: `Stablecoin ${worstCoin ?? ''} depeg ${worstDepeg.toFixed(2)}% exceeds ${verdict.toLowerCase()} threshold.`,
  });
  warnings.push(`Active stablecoin depeg detected (${worstDepeg.toFixed(2)}%).`);
  return { verdict, factors, warnings };
}
