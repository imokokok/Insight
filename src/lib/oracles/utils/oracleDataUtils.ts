export function extractBaseSymbol(symbol: string): string {
  return symbol.split('/')[0];
}

const USD_EQUIVALENT_QUOTES = new Set(['USD', 'USDT', 'USDC']);

/**
 * Whether a registry symbol can be consumed as a USD-denominated price.
 * Bare symbols are the provider's canonical USD feed. Explicit pairs are only
 * accepted when the quote is USD or one of the two liquid USD equivalents used
 * by the realtime resolver.
 */
export function isUsdDenominatedFeedSymbol(symbol: string): boolean {
  const parts = symbol.toUpperCase().split('/');
  if (parts.length === 1) return parts[0].length > 0;
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  return USD_EQUIVALENT_QUOTES.has(parts[1]);
}

export function bigIntToPrice(rawValue: bigint, decimals: number): number {
  const isNegative = rawValue < BigInt(0);
  const absValue = isNegative ? -rawValue : rawValue;
  const absStr = absValue.toString();

  let priceStr: string;
  if (absStr.length > decimals) {
    const intPart = absStr.slice(0, absStr.length - decimals) || '0';
    const decPart = absStr.slice(absStr.length - decimals).replace(/0+$/, '');
    priceStr = decPart ? `${intPart}.${decPart}` : intPart;
  } else {
    const paddedDec = absStr.padStart(decimals, '0');
    const trimmedDec = paddedDec.replace(/0+$/, '');
    priceStr = trimmedDec ? `0.${trimmedDec}` : '0';
  }

  const price = parseFloat(priceStr);
  return isNegative ? -price : price;
}

export function stringToPrice(rawStr: string, decimals: number): number {
  const isNegative = rawStr.startsWith('-');
  const absStr = isNegative ? rawStr.slice(1) : rawStr;

  let priceStr: string;
  if (absStr.length > decimals) {
    const intPart = absStr.slice(0, absStr.length - decimals) || '0';
    const decPart = absStr.slice(absStr.length - decimals).replace(/0+$/, '');
    priceStr = decPart ? `${intPart}.${decPart}` : intPart;
  } else {
    const paddedDec = absStr.padStart(decimals, '0');
    const trimmedDec = paddedDec.replace(/0+$/, '');
    priceStr = trimmedDec ? `0.${trimmedDec}` : '0';
  }

  const price = parseFloat(priceStr);
  return isNegative ? -price : price;
}
