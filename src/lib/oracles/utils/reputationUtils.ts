import { semanticColors } from '@/lib/config/colors';

export function getScoreColor(score: number): string {
  if (score >= 90) return semanticColors.success.DEFAULT;
  if (score >= 75) return semanticColors.info.DEFAULT;
  if (score >= 60) return semanticColors.warning.DEFAULT;
  if (score >= 40) return '#f97316';
  return semanticColors.danger.DEFAULT;
}

export function getScoreBadge(score: number): {
  label: string;
  bgClass: string;
  textClass: string;
} {
  if (score >= 90)
    return { label: 'Excellent', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700' };
  if (score >= 75) return { label: 'Good', bgClass: 'bg-blue-50', textClass: 'text-blue-700' };
  if (score >= 60) return { label: 'Fair', bgClass: 'bg-amber-50', textClass: 'text-amber-700' };
  if (score >= 40) return { label: 'Poor', bgClass: 'bg-orange-50', textClass: 'text-orange-700' };
  return { label: 'Unrated', bgClass: 'bg-gray-50', textClass: 'text-gray-500' };
}

export function formatTimeAgo(isoString: string | null): { text: string; color: string } | null {
  if (!isoString) return null;
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return { text: 'just now', color: 'text-emerald-600' };
  if (minutes < 60) return { text: `${minutes}m ago`, color: 'text-emerald-600' };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { text: `${hours}h ago`, color: 'text-gray-500' };
  const days = Math.floor(hours / 24);
  return { text: `${days}d ago`, color: 'text-gray-400' };
}

export const SCORE_WEIGHTS = [
  { key: 'accuracy', label: 'Accuracy', weight: 25, color: '#3b82f6' },
  { key: 'uptime', label: 'Uptime', weight: 20, color: '#10b981' },
  { key: 'reliability', label: 'Reliability', weight: 20, color: '#8b5cf6' },
  { key: 'freshness', label: 'Freshness', weight: 15, color: '#f59e0b' },
  { key: 'latency', label: 'Latency', weight: 10, color: '#06b6d4' },
  { key: 'deviation', label: 'Deviation', weight: 10, color: '#f43f5e' },
] as const;

export const SCORE_FORMULAS = [
  {
    key: 'accuracy',
    label: 'Accuracy',
    weight: 25,
    color: '#3b82f6',
    formula: '100 − min(|deviation_pct| × 20, 90)',
    description:
      'Measures how close each oracle price is to the consensus price. A deviation of 0% yields 100; deviations above 4.5% floor the score at 10.',
    unit: '0–100',
  },
  {
    key: 'uptime',
    label: 'Uptime',
    weight: 20,
    color: '#10b981',
    formula: '(successful_queries / total_queries) × 100',
    description:
      'The ratio of successful price fetches to total attempts over the 7-day window. 100% means zero failures.',
    unit: '%',
  },
  {
    key: 'reliability',
    label: 'Reliability',
    weight: 20,
    color: '#8b5cf6',
    formula: '100 − min(|deviation_pct| × 25, 80)',
    description:
      'A stricter consistency metric than Accuracy. Penalizes deviation more aggressively (×25 vs ×20) but has a higher floor of 20.',
    unit: '0–100',
  },
  {
    key: 'freshness',
    label: 'Freshness',
    weight: 15,
    color: '#f59e0b',
    formula: 'max(0, 100 − hours_since_update × 20)',
    description:
      'How recently the oracle data was updated. Data less than 1 hour old scores near 100; data older than 5 hours scores 0.',
    unit: '0–100',
  },
  {
    key: 'latency',
    label: 'Latency',
    weight: 10,
    color: '#06b6d4',
    formula: 'max(0, 100 − avg_latency_ms / 50)',
    description:
      'Response speed normalized to a 0–100 scale. 0 ms → 100; 5000 ms → 0. Each 50 ms of latency costs 1 point.',
    unit: '0–100',
  },
  {
    key: 'deviation',
    label: 'Deviation',
    weight: 10,
    color: '#f43f5e',
    formula: 'max(0, 100 − avg_deviation_pct × 20)',
    description:
      'Average absolute deviation from consensus across all snapshots. A 5% average deviation yields a score of 0.',
    unit: '0–100',
  },
] as const;

export const OVERALL_SCORE_FORMULA =
  'Accuracy × 0.25 + Uptime × 0.20 + Reliability × 0.20 + Freshness × 0.15 + Latency × 0.10 + Deviation × 0.10';

export const SCORING_METHODOLOGY = {
  lookbackDays: 7,
  updateFrequency: '1 hour',
  symbols: ['BTC', 'ETH', 'SOL', 'BNB', 'USDC', 'USDT', 'DAI', 'XAU', 'EUR'],
  consensusMethods: [
    {
      category: 'Stablecoin',
      method: 'IQR Filtered Median',
      description:
        'Filters outliers using Interquartile Range before computing the median. Tight 0.5% deviation threshold.',
      threshold: '0.5%',
    },
    {
      category: 'Major',
      method: 'Weighted Median',
      description:
        'Weights each provider by confidence (40%), freshness (35%), and confidence interval width (25%).',
      threshold: '5%',
    },
    {
      category: 'Alt',
      method: 'Trimmed Mean',
      description:
        'Removes the top and bottom 25% of prices, then averages the remaining. Tolerates higher volatility.',
      threshold: '15%',
    },
    {
      category: 'Micro',
      method: 'Simple Median',
      description:
        'Takes the middle value after sorting. Most robust against extreme outliers for low-liquidity assets.',
      threshold: '30%',
    },
  ],
} as const;

export const ARCHITECTURE_STANDARDIZATION = [
  {
    dimension: 'Data Delivery',
    challenge: 'Push vs. Pull architectures deliver data differently',
    approach:
      'Both models are queried at the same API endpoint (getPrice). Push oracles report their latest on-chain value; pull oracles are triggered on-demand. Latency is measured from request to response regardless of model.',
    examples: [
      { provider: 'Chainlink', type: 'Push' },
      { provider: 'Pyth', type: 'Pull' },
      { provider: 'API3', type: 'Push' },
      { provider: 'RedStone', type: 'Pull' },
    ],
  },
  {
    dimension: 'Aggregation Method',
    challenge: 'Each oracle aggregates source data differently',
    approach:
      'The consensus price is computed independently using our own aggregation (median / trimmed mean / weighted median / IQR filtered). Each oracle is then measured by its deviation from this consensus, making the comparison architecture-agnostic.',
    examples: [
      { provider: 'Chainlink', type: 'Median' },
      { provider: 'Pyth', type: 'Weighted Avg' },
      { provider: 'API3', type: 'Simple Avg' },
      { provider: 'DIA', type: 'Weighted Avg' },
    ],
  },
  {
    dimension: 'Update Frequency',
    challenge: 'Update triggers vary from sub-second to hourly',
    approach:
      'Freshness score normalizes update frequency into a time-based metric. A pull oracle updating every second and a push oracle updating hourly are both scored by how recent their latest data is at query time, not by their theoretical update interval.',
    examples: [
      { provider: 'Pyth', type: '~1s' },
      { provider: 'RedStone', type: '~1s' },
      { provider: 'Chainlink', type: '~1h' },
      { provider: 'WINkLink', type: '~30m' },
    ],
  },
  {
    dimension: 'Verification Model',
    challenge: 'On-chain vs. API-only verification',
    approach:
      'Both on-chain and API-verified data are scored identically on accuracy and reliability. Verification type is displayed separately (🛡️ on-chain / 🌐 API) for transparency but does not affect the numerical score.',
    examples: [
      { provider: 'Chainlink', type: 'On-chain' },
      { provider: 'Pyth', type: 'On-chain' },
      { provider: 'DIA', type: 'API' },
      { provider: 'WINkLink', type: 'API' },
    ],
  },
  {
    dimension: 'Chain Coverage',
    challenge: 'Providers support different numbers of chains',
    approach:
      'Chain coverage is tracked (supported_chains_count) but not weighted in the overall score. This ensures oracles focused on fewer chains are not penalized for depth vs. breadth.',
    examples: [
      { provider: 'Chainlink', type: '22 chains' },
      { provider: 'DIA', type: '15 chains' },
      { provider: 'Pyth', type: '12 chains' },
      { provider: 'WINkLink', type: '1 chain' },
    ],
  },
] as const;
