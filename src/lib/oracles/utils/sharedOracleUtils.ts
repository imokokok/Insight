import type { ConfidenceInterval, OracleErrorCode } from '@/types/oracle';

const STABLECOIN_SYMBOLS = new Set([
  'USDT',
  'USDC',
  'DAI',
  'FRAX',
  'TUSD',
  'BUSD',
  'LUSD',
  'USDD',
  'USDJ',
  'USDP',
]);

export function isStablecoin(symbol: string): boolean {
  return STABLECOIN_SYMBOLS.has(symbol.toUpperCase());
}

export function createStablecoinPriceData(
  symbol: string,
  providerName: string,
  chain: string,
  timestamp: number = Date.now()
) {
  return {
    provider: providerName,
    chain,
    symbol: symbol.toUpperCase(),
    price: 1.0,
    timestamp,
    decimals: 8,
    confidence: 1.0,
    change24h: 0,
    change24hPercent: 0,
    source: 'hardcoded',
  };
}

export function convertBigIntToDecimalPrice(rawValue: bigint, decimals: number): number {
  const rawStr = rawValue.toString();
  if (rawStr.length > decimals) {
    const intPart = rawStr.slice(0, rawStr.length - decimals) || '0';
    const decPart = rawStr.slice(rawStr.length - decimals);
    return parseFloat(`${intPart}.${decPart}`);
  }
  const paddedDec = rawStr.padStart(decimals, '0');
  return parseFloat(`0.${paddedDec}`);
}

export function classifyOracleError(error: unknown): OracleErrorCode {
  if (error instanceof Error) {
    if (error.message.includes('HTTP 429') || error.message.includes('rate limit')) {
      return 'RATE_LIMIT_ERROR';
    }
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return 'TIMEOUT_ERROR';
    }
    if (
      error.message.includes('network') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ENOTFOUND')
    ) {
      return 'NETWORK_ERROR';
    }
    if (error.message.includes('parse') || error.message.includes('JSON')) {
      return 'INVALID_RESPONSE';
    }
    if (error.message.includes('not found') || error.message.includes('SYMBOL_NOT_FOUND')) {
      return 'SYMBOL_NOT_SUPPORTED';
    }
  }
  return 'FETCH_ERROR';
}

export function generateConfidenceInterval(
  price: number,
  symbol: string,
  spreadPercentages: Record<string, number> = {},
  defaultSpread: number = 0.1
): ConfidenceInterval {
  const baseSpread = spreadPercentages[symbol?.toUpperCase()] ?? defaultSpread;

  let priceAdjustedSpread = baseSpread;
  if (price > 10000) {
    priceAdjustedSpread = baseSpread * 0.5;
  } else if (price > 1000) {
    priceAdjustedSpread = baseSpread * 0.7;
  } else if (price > 100) {
    priceAdjustedSpread = baseSpread * 0.85;
  }

  const halfSpread = price * (priceAdjustedSpread / 100 / 2);

  return {
    bid: Number((price - halfSpread).toFixed(4)),
    ask: Number((price + halfSpread).toFixed(4)),
    widthPercentage: Number(priceAdjustedSpread.toFixed(4)),
  };
}

export function validateGetPriceParams(
  symbol: string,
  options?: { signal?: AbortSignal },
  providerName: string = 'unknown'
): { valid: true } | { valid: false; error: Error } {
  if (!symbol) {
    return { valid: false, error: new Error(`Symbol is required for ${providerName}`) };
  }
  if (options?.signal?.aborted) {
    return {
      valid: false,
      error: new Error(`Request was aborted for ${providerName}`),
    };
  }
  return { valid: true };
}
