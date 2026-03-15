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
  [key: string]: number;
}

const DEFAULT_BASE_PRICES: BasePrices = {
  BTC: 68000,
  ETH: 3500,
  SOL: 180,
  LINK: 18,
  BAND: 2.5,
  API3: 2.8,
  PYTH: 1.2,
  UMA: 8.5,
  USDC: 1,
  ATOM: 10,
  OSMO: 4,
  JUNO: 3,
  AVAX: 35,
  MATIC: 0.6,
  DOT: 7,
  UNI: 10,
  CRO: 0.08,
  FTM: 0.3,
  DAI: 1,
  WBTC: 68000,
  WETH: 3500,
  AAVE: 95,
  MKR: 1650,
  SNX: 2.8,
  COMP: 65,
  YFI: 7500,
  CRV: 0.45,
};

function getBasePrices(): BasePrices {
  const envPrices = process.env.BASE_PRICES;

  if (envPrices) {
    try {
      const parsed = JSON.parse(envPrices);
      return {
        ...DEFAULT_BASE_PRICES,
        ...parsed,
      };
    } catch (e) {
      logger.warn('Failed to parse BASE_PRICES env, using defaults');
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
