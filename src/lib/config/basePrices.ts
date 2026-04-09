import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('BasePrices');

export interface BasePrices {
  BTC: number;
  ETH: number;
  SOL: number;
  LINK: number;
  API3: number;
  PYTH: number;
  UMA: number;
  USDC: number;
  ATOM: number;
  OSMO: number;
  JUNO: number;
  AVAX: number;
  MATIC: number;
  DOT: number;
  UNI: number;
  CRO: number;
  FTM: number;
  DAI: number;
  WBTC: number;
  WETH: number;
  AAVE: number;
  MKR: number;
  SNX: number;
  COMP: number;
  YFI: number;
  CRV: number;
  NEAR: number;
  ARB: number;
  OP: number;
  ADA: number;
  LDO: number;
  SUSHI: number;
  '1INCH': number;
  BAL: number;
  FXS: number;
  RPL: number;
  GMX: number;
  DYDX: number;
  USDT: number;
  WIN: number;
  [key: string]: number;
}

const DEFAULT_BASE_PRICES: BasePrices = {
  BTC: 65000,
  ETH: 2000,
  SOL: 80,
  LINK: 15,
  API3: 2.5,
  PYTH: 0.5,
  UMA: 3,
  USDC: 1,
  ATOM: 8,
  OSMO: 0.5,
  JUNO: 0.3,
  AVAX: 35,
  MATIC: 0.5,
  DOT: 7,
  UNI: 8,
  CRO: 0.1,
  FTM: 0.6,
  DAI: 1,
  WBTC: 65000,
  WETH: 2000,
  AAVE: 95,
  MKR: 1500,
  SNX: 2,
  COMP: 55,
  YFI: 7500,
  CRV: 0.4,
  NEAR: 5,
  ARB: 0.6,
  OP: 1.8,
  ADA: 0.4,
  LDO: 1.5,
  SUSHI: 1.2,
  '1INCH': 0.4,
  BAL: 2.5,
  FXS: 2,
  RPL: 20,
  GMX: 45,
  DYDX: 1.5,
  USDT: 1,
  WIN: 0.0001,
} as BasePrices;

function getBasePrices(): BasePrices {
  const envPrices = process.env.BASE_PRICES;

  if (envPrices) {
    try {
      const parsed = JSON.parse(envPrices);
      return parsed as BasePrices;
    } catch (_e) {
      logger.warn('Failed to parse BASE_PRICES env');
    }
  }

  return DEFAULT_BASE_PRICES;
}

export const UNIFIED_BASE_PRICES: BasePrices = getBasePrices();

export function updateBasePrices(newPrices: Partial<BasePrices>): void {
  Object.assign(UNIFIED_BASE_PRICES, newPrices);
}

export function resetBasePrices(): void {
  Object.assign(UNIFIED_BASE_PRICES, DEFAULT_BASE_PRICES);
}

export { DEFAULT_BASE_PRICES };
