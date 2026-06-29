import { STABLECOINS } from '../stablecoins/config';
import { WRAPPED_ASSETS } from '../wrapped-assets/config';

export function isStablecoin(symbol: string): boolean {
  return STABLECOINS.some((config) => config.symbol.toUpperCase() === symbol.toUpperCase());
}

export function isWrappedAsset(symbol: string): boolean {
  return WRAPPED_ASSETS.some((config) => config.symbol.toUpperCase() === symbol.toUpperCase());
}

export function getRiskPageForSymbol(symbol: string): {
  type: 'stablecoin' | 'wrapped' | null;
  href: string;
} {
  if (isStablecoin(symbol)) {
    return { type: 'stablecoin', href: `/stablecoin-depeg?symbol=${symbol}` };
  }
  if (isWrappedAsset(symbol)) {
    return { type: 'wrapped', href: `/wrapped-assets?symbol=${symbol}` };
  }
  return { type: null, href: '' };
}
