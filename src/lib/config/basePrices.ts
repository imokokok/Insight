import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('BasePrices');

export interface BasePrices {
  BTC: number;
  ETH: number;
  SOL: number;
  LINK: number;
  BAND: number;
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
  [key: string]: number;
}

const DEFAULT_BASE_PRICES: BasePrices = {} as BasePrices;

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
