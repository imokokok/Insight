export function extractBaseSymbol(symbol: string): string {
  return symbol.split('/')[0];
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
