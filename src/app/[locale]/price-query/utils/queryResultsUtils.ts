export function formatPrice(price: number): string {
  if (price <= 0) return '-';
  const absPrice = Math.abs(price);
  if (absPrice >= 1000) {
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (absPrice >= 1) {
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }
  if (absPrice >= 0.0001) {
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    });
  }
  if (absPrice >= 0.000001) {
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 6,
      maximumFractionDigits: 8,
    });
  }
  return price.toLocaleString(undefined, {
    minimumFractionDigits: 8,
    maximumFractionDigits: 12,
  });
}

export function formatLargeNumber(num: number): string {
  if (num >= 1e12) {
    return `$${(num / 1e12).toFixed(2)}T`;
  }
  if (num >= 1e9) {
    return `$${(num / 1e9).toFixed(2)}B`;
  }
  if (num >= 1e6) {
    return `$${(num / 1e6).toFixed(2)}M`;
  }
  if (num >= 1e3) {
    return `$${(num / 1e3).toFixed(2)}K`;
  }
  return `$${num.toFixed(2)}`;
}
