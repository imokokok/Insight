export const REDSTONE_API_BASE = 'https://api.redstone.finance';

export const SPREAD_PERCENTAGES: Record<string, number> = {
  BTC: 0.02,
  ETH: 0.03,
  SOL: 0.05,
  REDSTONE: 0.08,
  USDC: 0.01,
  // Forex spreads (typically tighter)
  EUR: 0.005,
  GBP: 0.005,
  JPY: 0.005,
  CHF: 0.005,
  AUD: 0.005,
  CAD: 0.005,
  NZD: 0.005,
  // Commodity spreads
  XAU: 0.01,
  XAG: 0.015,
};
