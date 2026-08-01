export function formatAsText(data: unknown): string {
  if (data === null || data === undefined) {
    return 'No data available.';
  }

  if (typeof data === 'string') {
    return data;
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return String(data);
  }

  return JSON.stringify(data, null, 2);
}

export function formatPrice(price: number, decimals = 4): string {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}
