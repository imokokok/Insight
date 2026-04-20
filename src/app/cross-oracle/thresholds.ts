type VolatilityCategory = 'stablecoin' | 'major' | 'alt' | 'micro';

function getVolatilityCategory(symbol: string): VolatilityCategory {
  const upper = symbol.toUpperCase();
  if (/^(USDT|USDC|DAI|BUSD|TUSD|USDD|FRAX|GUSD|PAX|USDP)/.test(upper)) {
    return 'stablecoin';
  }
  if (/^(BTC|ETH)\//.test(upper)) {
    return 'major';
  }
  if (/^(SHIB|PEPE|FLOKI|BONK|DOGE|MEME|TRUMP)/.test(upper)) {
    return 'micro';
  }
  return 'alt';
}

const DYNAMIC_DEVIATION_THRESHOLDS: Record<
  VolatilityCategory,
  { NORMAL: number; WARNING: number; DANGER: number; CRITICAL: number }
> = {
  stablecoin: { NORMAL: 0.05, WARNING: 0.1, DANGER: 0.3, CRITICAL: 0.5 },
  major: { NORMAL: 0.3, WARNING: 0.8, DANGER: 2.0, CRITICAL: 4.0 },
  alt: { NORMAL: 0.5, WARNING: 1.5, DANGER: 4.0, CRITICAL: 8.0 },
  micro: { NORMAL: 1.0, WARNING: 3.0, DANGER: 8.0, CRITICAL: 15.0 },
} as const;

function getDeviationThresholds(symbol: string) {
  const category = getVolatilityCategory(symbol);
  return DYNAMIC_DEVIATION_THRESHOLDS[category];
}

export const DEVIATION_THRESHOLDS = {
  NORMAL: 0.3,
  WARNING: 0.8,
  DANGER: 2.0,
  CRITICAL: 4.0,
} as const;

export const ANOMALY_DEVIATION_THRESHOLD = DEVIATION_THRESHOLDS.WARNING;

export const SEVERITY_THRESHOLDS = {
  HIGH: DEVIATION_THRESHOLDS.DANGER,
  MEDIUM: DEVIATION_THRESHOLDS.WARNING,
} as const;

export const FRESHNESS_THRESHOLDS = {
  FRESH: 30,
  NORMAL: 60,
  DELAYED: 120,
  SEVERELY_DELAYED: 300,
} as const;

export const CONFIDENCE_THRESHOLDS = {
  LOW: 0.5,
  MEDIUM: 0.8,
} as const;
